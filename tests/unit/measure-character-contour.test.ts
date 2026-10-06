import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import {
  BODY_PARTS,
  CALIBRATION,
  CONTOUR_RANGE,
  CONTOUR_TARGET,
  NOISY_CALIBRATION,
  measureContours,
  measureSample,
  type ContourSample,
  type Raster,
} from '../../.github/skills/generate-character-openai/scripts/measure-contour.ts';

type Point = [number, number];
type Color = [number, number, number];
const execFileAsync = promisify(execFile);

// Independent area rasterizer: clip a square pixel against an analytic half-plane.
// It does not use the measurement function's profile or color inference.
function coverage(x: number, y: number, slope: number, intercept: number): number {
  const polygon: Point[] = [
    [x, y],
    [x + 1, y],
    [x + 1, y + 1],
    [x, y + 1],
  ];
  const clipped: Point[] = [];
  const signed = (p: Point) => p[0] - slope * p[1] - intercept;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const da = signed(a);
    const db = signed(b);
    if (da >= 0) clipped.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      clipped.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return (
    Math.abs(
      clipped.reduce((sum, a, i) => {
        const b = clipped[(i + 1) % clipped.length];
        return sum + a[0] * b[1] - a[1] * b[0];
      }, 0),
    ) / 2
  );
}

function fixture(
  options: {
    width?: number;
    slope?: number;
    phase?: number;
    axis?: 'x' | 'y';
    direction?: 1 | -1;
    ink?: Color;
    fill?: Color;
    supersample?: boolean;
  } = {},
): { raster: Raster; sample: ContourSample } {
  const {
    width = 4,
    slope = 0,
    phase = 0,
    axis = 'x',
    direction = 1,
    ink = [18, 20, 24],
    fill = [190, 130, 90],
    supersample = false,
  } = options;
  const data = new Uint8Array(64 * 64 * 4);
  // Include nonzero invisible RGB to ensure it never changes the result.
  for (let i = 0; i < data.length; i += 4) data.set([255, 20, 170, 0], i);
  const outer = 12 + phase - slope * 32;
  const inner = outer + width * Math.hypot(1, slope);
  for (let v = 29; v <= 35; v++)
    for (let u = 0; u < 64; u++) {
      let alpha: number;
      let fillArea: number;
      if (supersample) {
        let inside = 0;
        let filled = 0;
        for (let sy = 0; sy < 64; sy++)
          for (let sx = 0; sx < 64; sx++) {
            const side = u + (sx + 0.5) / 64 - slope * (v + (sy + 0.5) / 64);
            if (side >= outer) inside++;
            if (side >= inner) filled++;
          }
        alpha = inside / 4096;
        fillArea = filled / 4096;
      } else {
        alpha = coverage(u, v, slope, outer);
        fillArea = coverage(u, v, slope, inner);
      }
      const coordinate = direction === 1 ? u : 63 - u;
      const x = axis === 'x' ? coordinate : v;
      const y = axis === 'y' ? coordinate : v;
      const index = (y * 64 + x) * 4;
      if (alpha > 0)
        data.set(
          [
            ...ink.map((value, i) =>
              Math.round((value * (alpha - fillArea) + fill[i] * fillArea) / alpha),
            ),
            Math.round(alpha * 255),
          ],
          index,
        );
    }
  const start = direction === 1 ? 4 : 59;
  return {
    raster: { width: 64, height: 64, data },
    sample: {
      id: 'site-1',
      part: 'head',
      x: axis === 'x' ? start : 32,
      y: axis === 'y' ? start : 32,
      axis,
      direction,
      length: 32,
    },
  };
}

function addNativeNoise(
  raster: Raster,
  sample: ContourSample,
  seed: number,
  plateau: number,
  ink: Color,
  fill: Color,
): void {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const noise = (x: number, y: number, c: number) => {
    const mixed = Math.imul(x + 31 * seed, 73856093) ^ Math.imul(y + c * 13, 19349663);
    return ((mixed >>> 0) % 9) - 4;
  };
  const original = raster.data.slice();
  for (let y = 0; y < raster.height; y++)
    for (let x = 0; x < raster.width; x++) {
      const i = (y * raster.width + x) * 4;
      const alpha = original[i + 3] / 255;
      const u = sample.axis === 'x' ? x : y;
      const inward = sample.direction === 1 ? u : 63 - u;
      const drift = Math.max(-2, Math.min(2, (inward - 20) / 8));
      raster.data[i + 3] =
        alpha === 0 ? Math.abs(noise(x, y, 3)) % 4 : clamp(alpha * plateau + noise(x, y, 3));
      if (alpha === 0) continue;
      // Mild independent-channel noise, gentle fill drift, and narrow color ringing.
      const previousX = x - (sample.axis === 'x' ? sample.direction : 0);
      const previousY = y - (sample.axis === 'y' ? sample.direction : 0);
      const previous = (previousY * raster.width + previousX) * 4;
      const atFillEdge =
        inward > 14 &&
        Math.abs(original[i] - fill[0]) <= 1 &&
        previous >= 0 &&
        previous < original.length &&
        original[previous] < fill[0] - 8;
      for (let c = 0; c < 3; c++)
        raster.data[i + c] = clamp(
          original[i + c] + noise(x, y, c) + drift + (atFillEdge ? 0.1 * (fill[c] - ink[c]) : 0),
        );
    }
}

describe('character contour coverage measurement', () => {
  test('pins the reviewed short-average master and measures two valid sites per body part', async () => {
    const source = await readFile('docs/assets/character-style-master-short-average-male.png');
    const samples = JSON.parse(
      await readFile('docs/assets/character-style-master-contour-samples.json', 'utf8'),
    ) as { sourceSha256: string; selection: string; model: 'noisy'; samples: ContourSample[] };
    const approvedHash = '577e83aef46ae5a4455ad9ae7808c8e5cbd45e55065f4933a21fc163dd78ccc3';
    expect(createHash('sha256').update(source).digest('hex')).toBe(approvedHash);
    expect(samples.sourceSha256).toBe(approvedHash);
    expect(samples.selection).toBe('manual');
    expect(samples.model).toBe('noisy');
    expect(CONTOUR_RANGE).toEqual([3.9, 4.2]);
    expect(CONTOUR_TARGET).toBe(4.1);
    const { data, info } = await sharp(source)
      .toColourspace('srgb')
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const report = measureContours(
      { width: info.width, height: info.height, data },
      samples.samples,
      samples.model,
    );
    expect(report.samples).toHaveLength(12);
    expect(report.samples.every((sample) => sample.status === 'measured')).toBe(true);
    expect(report.duplicateSites).toBe(false);
    expect(
      report.parts.every((part) => part.usableSamples === 2 && part.assessment?.range === 'inside'),
    ).toBe(true);
    expect(report.overall?.range).toBe('inside');
    expect(report.status).toBe('numeric-pass-manual-review-required');
  });

  test('bounds adversarial correlated noise without the midpoint error regression', () => {
    let count = 0,
      measured = 0,
      maximumError = 0;
    const perturb = (raster: Raster, fillLevel: number, sign: number) => {
      for (let i = 0; i < raster.data.length; i += 4) {
        const a = raster.data[i + 3] / 255;
        if (a === 0) continue;
        const value = raster.data[i];
        const mixed = value > 20 && value < fillLevel;
        const noisy = value + (mixed ? -4 : 4) * sign;
        raster.data.set(
          [
            noisy,
            noisy,
            noisy,
            a === 1 ? 249 - 4 * sign : Math.max(0, Math.min(255, Math.round(a * 249 + 4 * sign))),
          ],
          i,
        );
      }
    };
    for (const width of [2.5, 3.3, 3.5, 3.8, 4, 6, 8])
      for (const slope of [-1.2, -0.4, 0, 0.7, 1.2])
        for (let step = 0; step < 34; step++)
          for (const sign of [-1, 1])
            for (const fillLevel of [108, 180]) {
              const { raster, sample } = fixture({
                width,
                slope,
                phase: step * 0.03,
                ink: [20, 20, 20],
                fill: [fillLevel, fillLevel, fillLevel],
              });
              perturb(raster, fillLevel, sign);
              const result = measureSample(raster, sample, 'noisy');
              count++;
              if (result.status !== 'measured') continue;
              measured++;
              maximumError = Math.max(maximumError, Math.abs(result.widthPx! - width));
            }
    expect(measured).toBeGreaterThan(3000);
    expect(maximumError).toBeLessThan(NOISY_CALIBRATION.syntheticErrorBoundPx);
    console.log(
      `Adversarial correlated noise: ${count} cases; ${measured} measured; maximum absolute error ${maximumError.toFixed(6)} px.`,
    );
    const regression = fixture({
      width: 3.3,
      phase: 0.3,
      ink: [20, 20, 20],
      fill: [108, 108, 108],
    });
    perturb(regression.raster, 108, 1);
    const large: Raster = { width: 64, height: 1280, data: new Uint8Array(64 * 1280 * 4) };
    large.data.set(regression.raster.data);
    const result = measureSample(large, regression.sample, 'noisy');
    expect(result.status).toBe('measured');
    const trueNormalizedWidth = (3.3 * 1000) / (0.94 * 1280);
    expect(result.normalizedInterval![0]).toBeLessThanOrEqual(trueNormalizedWidth);
    expect(result.normalizedInterval![1]).toBeGreaterThanOrEqual(trueNormalizedWidth);
    expect(Math.abs(result.widthPx! - 3.3)).toBeLessThan(NOISY_CALIBRATION.syntheticErrorBoundPx);
  });

  test('calibrates a separate noisy model against near-opaque alpha, channel noise, drift, and ringing', () => {
    let count = 0,
      measured = 0,
      largestError = 0;
    const rejected: Record<string, number> = {};
    for (const width of [2.5, 3.3, 3.5, 3.8, 4, 6, 8])
      for (const slope of [-1.2, -0.7, 0, 0.3, 1.2])
        for (const phase of [0, 0.2, 0.4, 0.6, 0.8])
          for (const axis of ['x', 'y'] as const)
            for (const direction of [1, -1] as const)
              for (const plateau of [249, 253, 255])
                for (const [ink, fill] of [
                  [
                    [10, 12, 14],
                    [150, 160, 170],
                  ],
                  [
                    [20, 20, 20],
                    [108, 108, 108],
                  ],
                ] as [Color, Color][]) {
                  const { raster, sample } = fixture({
                    width,
                    slope,
                    phase,
                    axis,
                    direction,
                    ink,
                    fill,
                  });
                  addNativeNoise(raster, sample, count % 7, plateau, ink, fill);
                  const result = measureSample(raster, sample, 'noisy');
                  count++;
                  if (result.status === 'unmeasurable') {
                    rejected[result.reason!] = (rejected[result.reason!] ?? 0) + 1;
                    continue;
                  }
                  measured++;
                  largestError = Math.max(largestError, Math.abs(result.widthPx! - width));
                }
    console.log(
      `Noisy contour calibration: ${count} cases; ${measured} measured; maximum absolute error ${largestError.toFixed(6)} px; rejections ${JSON.stringify(rejected)}.`,
    );
    expect(count).toBe(4200);
    expect(measured).toBeGreaterThan(2500);
    expect(largestError).toBeLessThan(NOISY_CALIBRATION.syntheticErrorBoundPx);
  });

  test('keeps strict rejection and adds explicit noisy measurement without changing source pixels', () => {
    const ink: Color = [10, 12, 14],
      fill: Color = [150, 160, 170];
    const { raster, sample } = fixture({ width: 3.5, phase: 0.2, slope: 0.3, ink, fill });
    addNativeNoise(raster, sample, 2, 253, ink, fill);
    const original = raster.data.slice();
    expect(measureSample(raster, sample).status).toBe('unmeasurable');
    const result = measureSample(raster, sample, 'noisy');
    expect(result.status, JSON.stringify(result)).toBe('measured');
    expect(Math.abs(result.widthPx! - 3.5)).toBeLessThan(NOISY_CALIBRATION.syntheticErrorBoundPx);
    expect(raster.data).toEqual(original);
    const report = measureContours(raster, [sample], 'noisy');
    expect(report.model).toBe('noisy');
    expect(report.calibration.version).toBe(NOISY_CALIBRATION.version);
  });

  test('checks the noisy bound with independent supersampling and rejects a hidden interior line', () => {
    let maximumError = 0;
    let measured = 0;
    const ink: Color = [10, 12, 14],
      fill: Color = [150, 160, 170];
    for (const width of [3.3, 3.5, 3.8, 4])
      for (const slope of [-1.1, -0.35, 0, 0.6, 1.15]) {
        const { raster, sample } = fixture({
          width,
          slope,
          phase: 0.37,
          ink,
          fill,
          supersample: true,
        });
        addNativeNoise(raster, sample, 5, 253, ink, fill);
        const result = measureSample(raster, sample, 'noisy');
        if (result.status === 'unmeasurable') {
          expect(result.reason).toBe('Colors are outside the noisy ink-to-fill model.');
          continue;
        }
        measured++;
        maximumError = Math.max(maximumError, Math.abs(result.widthPx! - width));
      }
    expect(maximumError).toBeLessThan(NOISY_CALIBRATION.syntheticErrorBoundPx);
    expect(measured).toBeGreaterThan(12);
    console.log(
      `Noisy independent supersampling: 20 cases; ${measured} measured; maximum absolute error ${maximumError.toFixed(6)} px.`,
    );
    const interior = fixture();
    for (let y = 29; y <= 35; y++) {
      for (let x = 12; x <= 14; x++)
        interior.raster.data.set([190, 130, 90, 255], (y * 64 + x) * 4);
      for (let x = 15; x <= 18; x++) interior.raster.data.set([18, 20, 24, 255], (y * 64 + x) * 4);
    }
    expect(measureSample(interior.raster, interior.sample, 'noisy').reason).toMatch(
      /first opaque region/,
    );
  });

  test('rejects broad gradients and translucent fill in the noisy model', () => {
    const ramp = fixture({ ink: [20, 20, 20], fill: [180, 180, 180] });
    for (let y = 29; y <= 35; y++)
      for (let x = 14; x <= 22; x++) {
        const value = Math.round(20 + (160 * (x - 14)) / 8);
        ramp.raster.data.set([value, value, value, 255], (y * 64 + x) * 4);
      }
    expect(measureSample(ramp.raster, ramp.sample, 'noisy').status).toBe('unmeasurable');
    const translucent = fixture();
    for (let i = 3; i < translucent.raster.data.length; i += 4)
      translucent.raster.data[i] = Math.min(200, translucent.raster.data[i]);
    expect(measureSample(translucent.raster, translucent.sample, 'noisy').reason).toMatch(
      /Alpha plateaus/,
    );
  });
  test('recovers an exact 4 pixel opaque stroke instead of the old 3.5 pixel result', () => {
    const { raster, sample } = fixture();
    const result = measureSample(raster, sample);
    expect(result.status).toBe('measured');
    expect(result.widthPx).toBeCloseTo(4, 10);
  });

  test('calibrates widths, subpixel phases, slopes, orientations, alpha coverage, and color contrasts', () => {
    let largestError = 0;
    let count = 0;
    let endpointRejections = 0;
    for (const width of [2.5, 3.3, 3.5, 3.8, 4, 6, 8])
      for (const slope of [-1.25, -0.7, -0.25, 0, 0.25, 0.7, 1.25])
        for (const phase of [0, 0.13, 0.5, 0.83])
          for (const axis of ['x', 'y'] as const)
            for (const direction of [1, -1] as const)
              for (const [ink, fill] of [
                [
                  [10, 10, 10],
                  [58, 58, 58],
                ],
                [
                  [18, 20, 24],
                  [190, 130, 90],
                ],
                [
                  [40, 30, 20],
                  [100, 180, 230],
                ],
              ] as [Color, Color][]) {
                const { raster, sample } = fixture({
                  width,
                  slope,
                  phase,
                  axis,
                  direction,
                  ink,
                  fill,
                });
                const result = measureSample(raster, sample);
                count++;
                if (
                  result.status === 'unmeasurable' &&
                  (width === 2.5 || width === 8 || Math.abs(slope) === 1.25)
                ) {
                  expect(result.reason).toMatch(/outside the calibrated|slope exceeds/);
                  endpointRejections++;
                  continue;
                }
                expect(
                  result.status,
                  JSON.stringify({ width, slope, phase, axis, direction, ink, result }),
                ).toBe('measured');
                largestError = Math.max(largestError, Math.abs(result.widthPx! - width));
              }
    expect(count).toBe(2352);
    expect(endpointRejections).toBeLessThan(600);
    expect(largestError).toBeLessThan(CALIBRATION.syntheticErrorBoundPx);
    console.log(
      `Contour calibration: ${count} analytic cases; ${endpointRejections} conservative endpoint rejections; maximum absolute error ${largestError.toFixed(6)} source pixels; declared bound ${CALIBRATION.syntheticErrorBoundPx}.`,
    );
  });

  test('also measures independently supersampled strokes within the calibrated bound', () => {
    let largestError = 0;
    for (const width of [3.3, 3.5, 3.8, 4])
      for (const slope of [-1.1, -0.35, 0, 0.6, 1.15]) {
        const { raster, sample } = fixture({ width, slope, phase: 0.37, supersample: true });
        const result = measureSample(raster, sample);
        expect(result.status, JSON.stringify(result)).toBe('measured');
        largestError = Math.max(largestError, Math.abs(result.widthPx! - width));
      }
    expect(largestError).toBeLessThan(CALIBRATION.syntheticErrorBoundPx);
    console.log(
      `Contour calibration: 20 independently supersampled cases; maximum absolute error ${largestError.toFixed(6)} source pixels.`,
    );
  });

  test('rejects dark fills, translucent interiors, ambiguous colors, extra lines, and curved edges', () => {
    const dark = fixture({ fill: [40, 42, 46] });
    expect(measureSample(dark.raster, dark.sample).reason).toMatch(/Dark or low-contrast/);
    for (const defect of ['alpha', 'color', 'line', 'curve'] as const) {
      const { raster, sample } = fixture({ phase: 0.25 });
      if (defect === 'alpha') raster.data[(32 * 64 + 20) * 4 + 3] = 128;
      if (defect === 'color') raster.data.set([200, 20, 240, 255], (32 * 64 + 16) * 4);
      if (defect === 'line') raster.data.set([18, 20, 24, 255], (32 * 64 + 23) * 4);
      if (defect === 'curve') {
        const row = raster.data.slice(32 * 64 * 4, 33 * 64 * 4);
        raster.data.set(row.slice(0, 63 * 4), (32 * 64 + 1) * 4);
      }
      expect(measureSample(raster, sample).status, defect).toBe('unmeasurable');
    }
  });

  test('requires two independent usable sites per part and does not accept artwork', () => {
    const { raster, sample } = fixture();
    expect(measureContours(raster, [sample]).status).toBe('pending-insufficient-evidence');
    // Make the source reference height 1254 while preserving the measured patch.
    const large: Raster = { width: 64, height: 1254, data: new Uint8Array(64 * 1254 * 4) };
    const samples: ContourSample[] = [];
    const targetWidthPx = (CONTOUR_TARGET * (0.94 * large.height)) / 1000;
    const good = fixture({ width: targetWidthPx });
    for (const part of BODY_PARTS)
      for (let n = 0; n < 2; n++) {
        const offset = samples.length * 64;
        large.data.set(good.raster.data, offset * 64 * 4);
        samples.push({ ...good.sample, id: `${part}-${n}`, part, y: good.sample.y + offset });
      }
    expect(measureContours(large, samples.slice(0, -1)).status).toBe(
      'pending-insufficient-evidence',
    );
    const result = measureContours(large, samples);
    expect(result.status).toBe('numeric-pass-manual-review-required');
    expect(result.referenceHeight).toBe(0.94 * 1254);
    expect(result.samples[0].normalizedWidth).toBeCloseTo(CONTOUR_TARGET, 2);
    expect(measureContours(large, [...samples, samples[0]]).status).toBe(
      'pending-insufficient-evidence',
    );
    // The contract assesses medians. Individual outliers still require visual review.
    for (let i = 0; i < samples.length; i++) {
      large.data.set(
        fixture({ width: targetWidthPx + (i % 2 ? 1 : -1) }).raster.data,
        i * 64 * 64 * 4,
      );
    }
    const outliers = measureContours(large, samples);
    expect(outliers.status).toBe('numeric-pass-manual-review-required');
    expect(outliers.outsideSampleIds).toHaveLength(12);
    for (let i = 0; i < samples.length; i++) {
      large.data.set(
        fixture({ width: targetWidthPx + (i < 2 ? 1 : 0) }).raster.data,
        i * 64 * 64 * 4,
      );
    }
    const headFailure = measureContours(large, samples);
    expect(headFailure.overall?.range).toBe('inside');
    expect(headFailure.parts[0].assessment?.range).toBe('outside');
    expect(headFailure.status).toBe('numeric-fail');
  });

  test('uses central medians for the range and separately discloses overlapping uncertainty', () => {
    for (const model of ['strict', 'noisy'] as const)
      for (const offset of [-0.04, 0.04]) {
        const width = ((CONTOUR_RANGE[1] + offset) * (0.94 * 1254)) / 1000;
        const { raster, sample } = fixture({ width });
        const large: Raster = { width: 64, height: 1254, data: new Uint8Array(64 * 1254 * 4) };
        const samples: ContourSample[] = [];
        for (const part of BODY_PARTS)
          for (let n = 0; n < 2; n++) {
            const offset = samples.length * 64;
            large.data.set(raster.data, offset * 64 * 4);
            samples.push({ ...sample, id: `${part}-${n}`, part, y: sample.y + offset });
          }
        const result = measureContours(large, samples, model);
        expect(result.status).toBe(
          offset < 0 ? 'numeric-pass-manual-review-required' : 'numeric-fail',
        );
        expect(result.overall?.range).toBe(offset < 0 ? 'inside' : 'outside');
        expect(result.overall?.intervalOverlapsTargetBoundary).toBe(true);
        expect(result.parts.every((part) => part.assessment?.intervalOverlapsTargetBoundary)).toBe(
          true,
        );
        expect(
          result.overall!.normalizedInterval[1] - result.overall!.normalizedInterval[0],
        ).toBeCloseTo((2 * result.calibration.syntheticErrorBoundPx * 1000) / (0.94 * 1254), 12);
      }
  });

  test('recognizes the same silhouette site when the scan starts are eight pixels apart', () => {
    const { raster, sample } = fixture({ width: 3.5, phase: 8 });
    const report = measureContours(raster, [
      sample,
      { ...sample, id: 'shifted-start', x: sample.x + 8 },
    ]);
    expect(report.samples.every((s) => s.status === 'measured')).toBe(true);
    expect(report.samples[0].silhouettePoint).toEqual(report.samples[1].silhouettePoint);
    expect(report.duplicateSites).toBe(true);
    expect(report.status).toBe('pending-insufficient-evidence');
  });

  test('rejects a broad monotonic color ramp that could otherwise imitate a valid ink width', () => {
    const { raster, sample } = fixture({ ink: [20, 20, 20], fill: [180, 180, 180] });
    for (let y = 29; y <= 35; y++)
      for (let x = 13; x <= 18; x++) {
        const value = Math.round(20 + (160 * (x - 12)) / 6);
        raster.data.set([value, value, value, 255], (y * 64 + x) * 4);
      }
    expect(measureSample(raster, sample).reason).toMatch(/Blur and gradients are not calibrated/);
  });

  test('runs from Node with explicit manual sample input and returns coordinates and limitations', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'character-contour-'));
    try {
      const { raster, sample } = fixture();
      const source = path.join(directory, 'source.png');
      const manual = path.join(directory, 'samples.json');
      await sharp(raster.data, { raw: { width: raster.width, height: raster.height, channels: 4 } })
        .png()
        .toFile(source);
      await writeFile(manual, JSON.stringify({ selection: 'manual', samples: [sample] }));
      const { stdout } = await execFileAsync(process.execPath, [
        '.github/skills/generate-character-openai/scripts/measure-contour.ts',
        source,
        manual,
      ]);
      const report = JSON.parse(stdout);
      expect(report.samples[0].sample).toEqual(sample);
      expect(report.samples[0].widthPx).toBeCloseTo(4, 8);
      expect(report.calibration.limitation).toContain('not a confidence interval');
      await writeFile(
        manual,
        JSON.stringify({ selection: 'manual', model: 'noisy', samples: [sample] }),
      );
      const noisy = await execFileAsync(process.execPath, [
        '.github/skills/generate-character-openai/scripts/measure-contour.ts',
        source,
        manual,
      ]);
      expect(JSON.parse(noisy.stdout).calibration.version).toBe(NOISY_CALIBRATION.version);
      await expect(
        execFileAsync(process.execPath, [
          '.github/skills/generate-character-openai/scripts/measure-contour.ts',
          source,
          manual,
          '--model',
          'strict',
        ]),
      ).rejects.toThrow(/Select one measurement model/);
      await writeFile(manual, JSON.stringify({ selection: 'automatic', samples: [sample] }));
      await expect(
        execFileAsync(process.execPath, [
          '.github/skills/generate-character-openai/scripts/measure-contour.ts',
          source,
          manual,
        ]),
      ).rejects.toThrow(/Automatic sampling is exploratory only/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
