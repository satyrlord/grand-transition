import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import {
  BODY_PARTS,
  CALIBRATION,
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

describe('character contour coverage measurement', () => {
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
    const good = fixture({ width: 3.5 });
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
    expect(result.samples[0].normalizedWidth).toBeCloseTo((3.5 * 1000) / (0.94 * 1254), 2);
    expect(measureContours(large, [...samples, samples[0]]).status).toBe(
      'pending-insufficient-evidence',
    );
    // The contract assesses medians. Individual outliers still require visual review.
    for (let i = 0; i < samples.length; i++) {
      large.data.set(fixture({ width: i % 2 ? 4 : 3 }).raster.data, i * 64 * 64 * 4);
    }
    const outliers = measureContours(large, samples);
    expect(outliers.status).toBe('numeric-pass-manual-review-required');
    expect(outliers.outsideSampleIds).toHaveLength(12);
  });

  test('keeps a boundary measurement pending instead of passing its central estimate', () => {
    const { raster, sample } = fixture({ width: 3.3 });
    const large: Raster = { width: 64, height: 1254, data: new Uint8Array(64 * 1254 * 4) };
    large.data.set(raster.data);
    const result = measureSample(large, sample);
    expect(result.status).toBe('measured');
    expect(result.range).toBe('borderline');
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
