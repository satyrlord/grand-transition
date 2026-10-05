import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const BODY_PARTS = [
  'head',
  'left-arm',
  'right-arm',
  'torso',
  'left-leg',
  'right-leg',
] as const;
type BodyPart = (typeof BODY_PARTS)[number];
type Color = [number, number, number];
export interface Raster {
  width: number;
  height: number;
  data: Uint8Array;
}

// Integer pixel coordinates. Start in transparent space and scan into flat fill.
// The seven parallel scans must all contain two clear pixels, the whole stroke,
// and at least four opaque fill pixels. Use separate, straight silhouette sites.
export interface ContourSample {
  id: string;
  part: BodyPart;
  x: number;
  y: number;
  axis: 'x' | 'y';
  direction: 1 | -1;
  length: number;
}

export const CALIBRATION = {
  version: 'ink-area-v1',
  sourceWidthRangePx: [2.5, 8],
  maximumAbsoluteSlope: 1.25,
  minimumLuminanceContrast: 48,
  syntheticErrorBoundPx: 0.08,
  model:
    '8-bit straight-alpha, flat opaque ink and fill, sRGB channel coverage mixing, parallel straight boundaries',
  limitation:
    'The synthetic error bound is not a confidence interval for generated art. Visual review must confirm the model and the complete contour. Curves, textures, gradients, blur, unknown gamma mixing, and dark fill are not calibrated.',
} as const;

type Pixel = { rgb: Color; alpha: number };
type Profile = { outer: number; inkArea: number; ink: Color; fill: Color };
export type SampleResult = {
  sample: ContourSample;
  status: 'measured' | 'unmeasurable';
  reason?: string;
  widthPx?: number;
  normalizedWidth?: number;
  normalizedInterval?: [number, number];
  slope?: number;
  parallelWidthsPx?: number[];
  ink?: Color;
  fill?: Color;
  range?: 'inside' | 'outside' | 'borderline';
};

const luminance = (rgb: Color): number => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
const distance = (a: Color, b: Color): number => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;
const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
};

function pixel(raster: Raster, x: number, y: number): Pixel {
  if (x < 0 || x >= raster.width || y < 0 || y >= raster.height)
    throw new Error('Sample patch crosses the canvas edge.');
  const index = (y * raster.width + x) * 4;
  return {
    rgb: [raster.data[index], raster.data[index + 1], raster.data[index + 2]],
    alpha: raster.data[index + 3] / 255,
  };
}

function profile(pixels: Pixel[]): Profile {
  if (pixels.slice(0, 2).some((p) => p.alpha !== 0))
    throw new Error('Start each scan with at least two transparent pixels.');
  const tail = pixels.slice(-4);
  if (tail.some((p) => p.alpha !== 1))
    throw new Error('End each scan with at least four opaque fill pixels.');
  const fill = [0, 1, 2].map((i) => mean(tail.map((p) => p.rgb[i]))) as Color;
  if (tail.some((p) => distance(p.rgb, fill) > 2)) throw new Error('The fill is not flat.');
  const opaque = pixels.filter((p) => p.alpha === 1);
  const ink = [...opaque].sort((a, b) => luminance(a.rgb) - luminance(b.rgb))[0].rgb;
  if (
    luminance(ink) > 80 ||
    luminance(fill) - luminance(ink) < CALIBRATION.minimumLuminanceContrast
  ) {
    throw new Error('Dark or low-contrast fill does not separate the ink from the fill.');
  }
  const vector = fill.map((v, i) => v - ink[i]);
  const magnitude = vector.reduce((sum, v) => sum + v * v, 0);
  let lastAlpha = 0;
  let lastFillFraction = 0;
  let hasInkPlateau = false;
  let inkArea = 0;
  for (const p of pixels) {
    if (p.alpha < lastAlpha) throw new Error('The scan contains a hole or translucent interior.');
    lastAlpha = p.alpha;
    if (p.alpha === 0) continue; // RGB of fully transparent pixels is undefined.
    const fraction = p.rgb.reduce((sum, v, i) => sum + (v - ink[i]) * vector[i], 0) / magnitude;
    const fitted = ink.map((v, i) => v + fraction * vector[i]) as Color;
    if (fraction < -0.01 || fraction > 1.01 || distance(p.rgb, fitted) > 2)
      throw new Error('The profile contains ambiguous colors or shading.');
    if (p.alpha !== 1 && distance(p.rgb, ink) > 2)
      throw new Error('Outer partial-alpha pixels do not have the ink color.');
    if (fraction + 0.015 < lastFillFraction)
      throw new Error('The profile contains extra lines, texture, or a nonmonotonic transition.');
    lastFillFraction = Math.max(lastFillFraction, fraction);
    if (p.alpha === 1 && distance(p.rgb, ink) <= 1) hasInkPlateau = true;
    // Recover the area occupied by ink, including the whole outer partial pixel.
    // This uses coverage, not the center of the first opaque pixel.
    inkArea += p.alpha * (1 - Math.max(0, Math.min(1, fraction)));
  }
  if (!hasInkPlateau) throw new Error('There is no opaque ink plateau.');
  return { outer: pixels.length - pixels.reduce((sum, p) => sum + p.alpha, 0), inkArea, ink, fill };
}

export function measureSample(raster: Raster, sample: ContourSample): SampleResult {
  try {
    if (
      !sample.id ||
      !BODY_PARTS.includes(sample.part) ||
      !['x', 'y'].includes(sample.axis) ||
      ![1, -1].includes(sample.direction) ||
      ![sample.x, sample.y, sample.length].every(Number.isInteger) ||
      sample.length < 12 ||
      sample.length > 64
    ) {
      throw new Error(
        'Invalid sample. Use a unique id, a body part, integer coordinates, axis x or y, direction 1 or -1, and length 12 through 64.',
      );
    }
    const profiles: Profile[] = [];
    for (let offset = -3; offset <= 3; offset++) {
      const pixels: Pixel[] = [];
      for (let k = 0; k < sample.length; k++) {
        pixels.push(
          pixel(
            raster,
            sample.x + (sample.axis === 'x' ? sample.direction * k : offset),
            sample.y + (sample.axis === 'y' ? sample.direction * k : offset),
          ),
        );
      }
      profiles.push(profile(pixels));
    }
    const outerMean = mean(profiles.map((p) => p.outer));
    const slope = profiles.reduce((sum, p, i) => sum + (i - 3) * (p.outer - outerMean), 0) / 28;
    if (Math.abs(slope) > CALIBRATION.maximumAbsoluteSlope)
      throw new Error('The slope exceeds the calibration range. Use the other scan axis.');
    if (profiles.some((p, i) => Math.abs(p.outer - outerMean - slope * (i - 3)) > 0.06))
      throw new Error('The outer edge is not straight over the sample patch.');
    const widths = profiles.map((p) => p.inkArea / Math.hypot(1, slope));
    if (Math.max(...widths) - Math.min(...widths) > 0.08)
      throw new Error('The inner and outer edges are not parallel, or the ink width is unstable.');
    const central = profiles[3];
    if (
      profiles.some((p) => distance(p.ink, central.ink) > 2 || distance(p.fill, central.fill) > 2)
    )
      throw new Error('The patch contains color changes or shading.');
    const widthPx = median(widths);
    if (widthPx < CALIBRATION.sourceWidthRangePx[0] || widthPx > CALIBRATION.sourceWidthRangePx[1])
      throw new Error('The source width is outside the calibrated 2.5 through 8 pixel range.');
    const scale = 1000 / (0.94 * raster.height);
    const normalizedWidth = widthPx * scale;
    const error = CALIBRATION.syntheticErrorBoundPx * scale;
    const interval: [number, number] = [normalizedWidth - error, normalizedWidth + error];
    return {
      sample,
      status: 'measured',
      widthPx,
      normalizedWidth,
      normalizedInterval: interval,
      slope,
      parallelWidthsPx: widths,
      ink: central.ink,
      fill: central.fill,
      range:
        interval[0] >= 2.8 && interval[1] <= 3.2
          ? 'inside'
          : interval[1] < 2.8 || interval[0] > 3.2
            ? 'outside'
            : 'borderline',
    };
  } catch (error) {
    return {
      sample,
      status: 'unmeasurable',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function measureContours(raster: Raster, samples: ContourSample[]) {
  if (
    !Number.isInteger(raster.width) ||
    !Number.isInteger(raster.height) ||
    raster.width < 1 ||
    raster.height < 1 ||
    raster.data.length !== raster.width * raster.height * 4
  )
    throw new Error('Invalid RGBA raster.');
  const results = samples.map((sample) => measureSample(raster, sample));
  const duplicateSites = samples.some((sample, i) =>
    samples
      .slice(0, i)
      .some(
        (other) => sample.id === other.id || Math.hypot(sample.x - other.x, sample.y - other.y) < 8,
      ),
  );
  const parts = BODY_PARTS.map((part) => {
    const measured = results.filter((r) => r.sample.part === part && r.status === 'measured');
    return {
      part,
      usableSamples: measured.length,
      medianWidthPx: measured.length ? median(measured.map((r) => r.widthPx!)) : null,
    };
  });
  const insufficient =
    duplicateSites ||
    parts.some((p) => p.usableSamples < 2) ||
    results.some((r) => r.status === 'unmeasurable');
  const failed = results.some((r) => r.range === 'outside');
  const borderline = results.some((r) => r.range === 'borderline');
  return {
    status: failed
      ? 'numeric-fail'
      : insufficient
        ? 'pending-insufficient-evidence'
        : borderline
          ? 'pending-borderline'
          : 'numeric-pass-manual-review-required',
    width: raster.width,
    height: raster.height,
    referenceHeight: 0.94 * raster.height,
    targetPer1000ReferenceHeight: [2.8, 3.2],
    calibration: CALIBRATION,
    duplicateSites,
    parts,
    samples: results,
    acceptance:
      'This tool does not accept artwork. Verify sample locations, image encoding, the complete contour, and the other style rules visually. No automatic sampling can establish acceptance.',
  };
}

export async function main(args: string[]): Promise<void> {
  if (args.length !== 2)
    throw new Error(
      'Usage: node .github/skills/generate-character-openai/scripts/measure-contour.ts <source.png> <manual-samples.json>',
    );
  const [source, sampleFile] = args;
  const metadata = await sharp(source).metadata();
  if (metadata.format !== 'png') throw new Error('Use the original PNG source.');
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const document: unknown = JSON.parse(await readFile(sampleFile, 'utf8'));
  if (
    !document ||
    typeof document !== 'object' ||
    !('selection' in document) ||
    document.selection !== 'manual' ||
    !('samples' in document) ||
    !Array.isArray(document.samples)
  )
    throw new Error(
      'The sample file must contain selection: "manual" and a samples array. Automatic sampling is exploratory only.',
    );
  if (document.samples.some((s: unknown) => !s || typeof s !== 'object'))
    throw new Error('Every sample must be an object.');
  const report = measureContours(
    { width: info.width, height: info.height, data },
    document.samples as ContourSample[],
  );
  console.log(
    JSON.stringify(
      { source: path.resolve(source), sampleFile: path.resolve(sampleFile), ...report },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
