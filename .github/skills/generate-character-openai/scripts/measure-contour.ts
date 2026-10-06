import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

// Written contour range in Specification 023, independent of image style references.
// Normalized to 1000 pixels of reference height (94% of the source canvas).
export const CONTOUR_RANGE = [3.9, 4.2] as const;
export const CONTOUR_TARGET = 4.1;

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

export type MeasurementModel = 'strict' | 'noisy';
export const NOISY_CALIBRATION = {
  version: 'local-coverage-fit-v1',
  sourceWidthRangePx: [2.5, 8],
  maximumAbsoluteSlope: 1.25,
  minimumLuminanceContrast: 80,
  syntheticErrorBoundPx: 0.22,
  model:
    'Invert straight-boundary square-pixel coverage at local alpha and RGB transitions; iteratively fit slope across seven parallel profiles; retain near-opaque plateaus and slight raster noise',
  syntheticFixtureParameters: {
    backgroundAlphaMaximum: 8,
    fillAlphaMinimum: 244,
    plateauAlphaSpreadMaximum: 12,
    channelNoiseAmplitude: 4,
    fillDriftAcrossProfile: 4,
    ringingFractionMaximum: 0.1,
  },
  limitation:
    'Finite synthetic calibration is not a confidence interval for generated art. Verify the selected patch visually. Dark fill, broad blur, shading boundaries, substantial curves, translucent fill, and unknown gamma mixing remain outside the model. No source pixels are changed.',
} as const;
const calibrationFor = (model: MeasurementModel) =>
  model === 'noisy' ? NOISY_CALIBRATION : CALIBRATION;

type Pixel = { rgb: Color; alpha: number };
type Profile = {
  outer: number;
  inkArea: number;
  ink: Color;
  fill: Color;
  partialAlphaPixels: number;
  mixedColorPixels: number;
};
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
  silhouettePoint?: { x: number; y: number };
  range?: 'inside' | 'outside';
  intervalOverlapsTargetBoundary?: boolean;
};

const luminance = (rgb: Color): number => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
const distance = (a: Color, b: Color): number => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;
const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
};

function assessWidth(widthPx: number, height: number, model: MeasurementModel = 'strict') {
  const scale = 1000 / (0.94 * height);
  const normalizedWidth = widthPx * scale;
  const error = calibrationFor(model).syntheticErrorBoundPx * scale;
  const interval: [number, number] = [normalizedWidth - error, normalizedWidth + error];
  return {
    normalizedWidth,
    normalizedInterval: interval,
    range:
      normalizedWidth >= CONTOUR_RANGE[0] && normalizedWidth <= CONTOUR_RANGE[1]
        ? ('inside' as const)
        : ('outside' as const),
    intervalOverlapsTargetBoundary: CONTOUR_RANGE.some(
      (boundary) => interval[0] <= boundary && interval[1] >= boundary,
    ),
  };
}

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
  let mixedColorPixels = 0;
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
    if (distance(p.rgb, ink) > 2 && distance(p.rgb, fill) > 2) mixedColorPixels++;
    // Recover the area occupied by ink, including the whole outer partial pixel.
    // This uses coverage, not the center of the first opaque pixel.
    inkArea += p.alpha * (1 - Math.max(0, Math.min(1, fraction)));
  }
  if (!hasInkPlateau) throw new Error('There is no opaque ink plateau.');
  return {
    outer: pixels.length - pixels.reduce((sum, p) => sum + p.alpha, 0),
    inkArea,
    ink,
    fill,
    partialAlphaPixels: pixels.filter((p) => p.alpha > 0 && p.alpha < 1).length,
    mixedColorPixels,
  };
}

function crossing(values: number[], target: number, start = 0): number {
  for (let i = Math.max(1, start); i < values.length; i++) {
    if (values[i - 1] < target && values[i] >= target)
      return i - 1 + (target - values[i - 1]) / (values[i] - values[i - 1]);
  }
  throw new Error('The profile has no clear boundary crossing.');
}

// Exact area of a unit square inside a straight boundary, at a given offset
// from its center. This is the convolution of two centered uniform densities.
function squareCoverage(offset: number, slope: number): number {
  const s = Math.abs(slope);
  if (s < 1e-6) return Math.max(0, Math.min(1, 0.5 - offset));
  const z = offset + (1 + s) / 2;
  const positiveSquare = (v: number) => Math.max(0, v) ** 2;
  const cdf =
    (positiveSquare(z) -
      positiveSquare(z - 1) -
      positiveSquare(z - s) +
      positiveSquare(z - 1 - s)) /
    (2 * s);
  return Math.max(0, Math.min(1, 1 - cdf));
}

function fittedCrossing(fractions: number[], bracket: number, slope: number): number {
  const a = Math.floor(bracket),
    b = Math.ceil(bracket);
  const index = Math.abs(fractions[a] - 0.5) <= Math.abs(fractions[b] - 0.5) ? a : b;
  const fraction = Math.max(0, Math.min(1, fractions[index]));
  let low = -(1 + Math.abs(slope)) / 2,
    high = -low;
  for (let iteration = 0; iteration < 28; iteration++) {
    const middle = (low + high) / 2;
    if (squareCoverage(middle, slope) > fraction) low = middle;
    else high = middle;
  }
  return index + (low + high) / 2;
}

function noisyProfile(pixels: Pixel[]) {
  const alpha = pixels.map((p) => p.alpha * 255);
  const lowAlpha = median(alpha.slice(0, 3));
  const highAlpha = median(alpha.slice(-6));
  if (
    alpha.slice(0, 3).some((a) => a > 8) ||
    highAlpha < 244 ||
    alpha.slice(-6).some((a) => Math.abs(a - highAlpha) > 12)
  )
    throw new Error('Alpha plateaus are outside the noisy calibration envelope.');
  const outer = crossing(alpha, (lowAlpha + highAlpha) / 2);
  const firstInside = Math.ceil(crossing(alpha, lowAlpha + 0.9 * (highAlpha - lowAlpha)));
  if (alpha.slice(firstInside + 1).some((a) => a < highAlpha - 12))
    throw new Error('The profile has a hole or excessive alpha variation.');
  const fill = [0, 1, 2].map((c) => median(pixels.slice(-6).map((p) => p.rgb[c]))) as Color;
  if (pixels.slice(-6).some((p) => distance(p.rgb, fill) > 8))
    throw new Error('The fill plateau has excessive shading or noise.');
  const values = pixels.map((p) => luminance(p.rgb));
  const inkPairs = [];
  for (let i = firstInside; i < Math.min(pixels.length - 7, firstInside + 8); i++)
    inkPairs.push({ index: i, value: (values[i] + values[i + 1]) / 2 });
  const pair = inkPairs.sort((a, b) => a.value - b.value)[0];
  if (!pair) throw new Error('The profile has no usable ink plateau.');
  const ink = [0, 1, 2].map(
    (c) => (pixels[pair.index].rgb[c] + pixels[pair.index + 1].rgb[c]) / 2,
  ) as Color;
  const inkLevel = luminance(ink),
    fillLevel = luminance(fill),
    contrast = fillLevel - inkLevel;
  if (
    inkLevel > 80 ||
    contrast < NOISY_CALIBRATION.minimumLuminanceContrast ||
    distance(pixels[pair.index].rgb, pixels[pair.index + 1].rgb) > 12
  )
    throw new Error('The noisy model needs two clear ink pixels and high-contrast fill.');
  if (
    values.slice(firstInside, pair.index).some((v) => v > inkLevel + Math.max(12, 0.16 * contrast))
  )
    throw new Error('The first opaque region is not the outer ink stroke.');
  const inner = crossing(values, (inkLevel + fillLevel) / 2, pair.index + 1);
  const vector = fill.map((v, i) => v - ink[i]);
  const magnitude = vector.reduce((sum, v) => sum + v * v, 0);
  for (let i = pair.index; i < pixels.length; i++) {
    const fraction =
      pixels[i].rgb.reduce((sum, v, c) => sum + (v - ink[c]) * vector[c], 0) / magnitude;
    const expected = ink.map((v, c) => v + fraction * vector[c]) as Color;
    if (distance(pixels[i].rgb, expected) > 8 || fraction < -0.1 || fraction > 1.16)
      throw new Error('Colors are outside the noisy ink-to-fill model.');
    if (i > inner + 2 && distance(pixels[i].rgb, fill) > 12)
      throw new Error('The fill contains a second line, a gradient, or shading.');
  }
  const alphaSpan =
    crossing(alpha, lowAlpha + 0.9 * (highAlpha - lowAlpha)) -
    crossing(alpha, lowAlpha + 0.1 * (highAlpha - lowAlpha));
  const colorSpan =
    crossing(values, inkLevel + 0.9 * contrast, pair.index + 1) -
    crossing(values, inkLevel + 0.1 * contrast, pair.index + 1);
  return {
    outer,
    inner,
    alphaSpan,
    colorSpan,
    ink,
    fill,
    alphaFractions: alpha.map((v) => (v - lowAlpha) / (highAlpha - lowAlpha)),
    colorFractions: values.map((v) => (v - inkLevel) / contrast),
  };
}

function measureNoisySample(raster: Raster, sample: ContourSample): SampleResult {
  const profiles = [];
  for (let offset = -3; offset <= 3; offset++) {
    const pixels: Pixel[] = [];
    for (let k = 0; k < sample.length; k++)
      pixels.push(
        pixel(
          raster,
          sample.x + (sample.axis === 'x' ? sample.direction * k : offset),
          sample.y + (sample.axis === 'y' ? sample.direction * k : offset),
        ),
      );
    profiles.push(noisyProfile(pixels));
  }
  let outerPositions = profiles.map((p) => p.outer);
  let outerMean = mean(outerPositions);
  let slope = outerPositions.reduce((sum, value, i) => sum + (i - 3) * (value - outerMean), 0) / 28;
  for (let iteration = 0; iteration < 3; iteration++) {
    outerPositions = profiles.map((p) => fittedCrossing(p.alphaFractions, p.outer, slope));
    outerMean = mean(outerPositions);
    slope = outerPositions.reduce((sum, value, i) => sum + (i - 3) * (value - outerMean), 0) / 28;
  }
  if (Math.abs(slope) > NOISY_CALIBRATION.maximumAbsoluteSlope)
    throw new Error('The slope exceeds the noisy calibration range.');
  if (outerPositions.some((value, i) => Math.abs(value - outerMean - slope * (i - 3)) > 0.2))
    throw new Error('The outer edge is curved or too noisy.');
  if (
    profiles.some((p) => p.alphaSpan > 1.8 + Math.abs(slope) || p.colorSpan > 1.8 + Math.abs(slope))
  )
    throw new Error('A broad transition exceeds the noisy calibration envelope.');
  const widths = profiles.map(
    (p, i) =>
      (fittedCrossing(p.colorFractions, p.inner, slope) - outerPositions[i]) / Math.hypot(1, slope),
  );
  if (Math.max(...widths) - Math.min(...widths) > 0.45)
    throw new Error('The stroke width is unstable over the noisy patch.');
  const widthPx = median(widths);
  if (widthPx < 2.5 || widthPx > 8)
    throw new Error('The source width is outside the noisy calibrated range.');
  const center = profiles[3];
  if (profiles.some((p) => distance(p.ink, center.ink) > 8 || distance(p.fill, center.fill) > 8))
    throw new Error('Colors vary too much across the noisy patch.');
  return {
    sample,
    status: 'measured',
    widthPx,
    ...assessWidth(widthPx, raster.height, 'noisy'),
    slope,
    parallelWidthsPx: widths,
    ink: center.ink,
    fill: center.fill,
    silhouettePoint: {
      x: sample.axis === 'x' ? sample.x + 0.5 + sample.direction * outerMean : sample.x + 0.5,
      y: sample.axis === 'y' ? sample.y + 0.5 + sample.direction * outerMean : sample.y + 0.5,
    },
  };
}

export function measureSample(
  raster: Raster,
  sample: ContourSample,
  model: MeasurementModel = 'strict',
): SampleResult {
  try {
    if (
      typeof sample.id !== 'string' ||
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
    if (model === 'noisy') return measureNoisySample(raster, sample);
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
    // A straight boundary intersects at most this many pixels in one scan row.
    // Include one alpha quantization unit in the slope allowance.
    const boundaryFootprint = Math.ceil(1 + Math.abs(slope) + 1 / 255);
    if (
      profiles.some(
        (p) => p.partialAlphaPixels > boundaryFootprint || p.mixedColorPixels > boundaryFootprint,
      )
    ) {
      throw new Error(
        'The transition is wider than a straight pixel boundary. Blur and gradients are not calibrated.',
      );
    }
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
    return {
      sample,
      status: 'measured',
      widthPx,
      silhouettePoint: {
        x:
          sample.axis === 'x'
            ? sample.x + (sample.direction === -1 ? 1 : 0) + sample.direction * outerMean
            : sample.x + 0.5,
        y:
          sample.axis === 'y'
            ? sample.y + (sample.direction === -1 ? 1 : 0) + sample.direction * outerMean
            : sample.y + 0.5,
      },
      ...assessWidth(widthPx, raster.height),
      slope,
      parallelWidthsPx: widths,
      ink: central.ink,
      fill: central.fill,
    };
  } catch (error) {
    return {
      sample,
      status: 'unmeasurable',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function measureContours(
  raster: Raster,
  samples: ContourSample[],
  model: MeasurementModel = 'strict',
) {
  if (
    !Number.isInteger(raster.width) ||
    !Number.isInteger(raster.height) ||
    raster.width < 1 ||
    raster.height < 1 ||
    raster.data.length !== raster.width * raster.height * 4
  )
    throw new Error('Invalid RGBA raster.');
  const results = samples.map((sample) => measureSample(raster, sample, model));
  const duplicateSites = results.some((result, i) =>
    results
      .slice(0, i)
      .some(
        (other) =>
          result.sample.id === other.sample.id ||
          (result.silhouettePoint &&
            other.silhouettePoint &&
            Math.hypot(
              result.silhouettePoint.x - other.silhouettePoint.x,
              result.silhouettePoint.y - other.silhouettePoint.y,
            ) < 8),
      ),
  );
  const parts = BODY_PARTS.map((part) => {
    const measured = results.filter((r) => r.sample.part === part && r.status === 'measured');
    const medianWidthPx = measured.length ? median(measured.map((r) => r.widthPx!)) : null;
    return {
      part,
      usableSamples: measured.length,
      medianWidthPx,
      assessment: medianWidthPx === null ? null : assessWidth(medianWidthPx, raster.height, model),
    };
  });
  const insufficient =
    duplicateSites ||
    parts.some((p) => p.usableSamples < 2) ||
    results.some((r) => r.status === 'unmeasurable');
  const measuredWidths = results.flatMap((r) => (r.widthPx === undefined ? [] : [r.widthPx]));
  const medianWidthPx = measuredWidths.length ? median(measuredWidths) : null;
  const overall =
    medianWidthPx === null
      ? null
      : { medianWidthPx, ...assessWidth(medianWidthPx, raster.height, model) };
  const failed =
    overall?.range === 'outside' || parts.some((p) => p.assessment?.range === 'outside');
  return {
    status: insufficient
      ? 'pending-insufficient-evidence'
      : failed
        ? 'numeric-fail'
        : 'numeric-pass-manual-review-required',
    width: raster.width,
    height: raster.height,
    referenceHeight: 0.94 * raster.height,
    targetPer1000ReferenceHeight: CONTOUR_RANGE,
    nominalTargetPer1000ReferenceHeight: CONTOUR_TARGET,
    decisionRule:
      'Use the central figure and body-part medians for the inclusive target range. Report uncertainty intervals separately. Visual review remains required.',
    model,
    calibration: calibrationFor(model),
    duplicateSites,
    overall,
    outsideSampleIds: results.filter((r) => r.range === 'outside').map((r) => r.sample.id),
    parts,
    samples: results,
    acceptance:
      'This tool does not accept artwork. Verify sample locations, image encoding, the complete contour, and the other style rules visually. No automatic sampling can establish acceptance.',
  };
}

export function exploreContours(raster: Raster, model: MeasurementModel = 'strict') {
  const sites = [];
  for (const axis of ['x', 'y'] as const) {
    const length = axis === 'x' ? raster.width : raster.height;
    const across = axis === 'x' ? raster.height : raster.width;
    for (let row = 8; row < across - 8; row += 8)
      for (const direction of [1, -1] as const) {
        for (
          let along = direction === 1 ? 8 : length - 9;
          along >= 8 && along < length - 8;
          along += direction
        ) {
          const p = pixel(raster, axis === 'x' ? along : row, axis === 'y' ? along : row);
          const previous = pixel(
            raster,
            axis === 'x' ? along - direction : row,
            axis === 'y' ? along - direction : row,
          );
          const threshold = model === 'noisy' ? 128 / 255 : 1 / 255;
          if (p.alpha < threshold || previous.alpha >= threshold) continue;
          const start = along - direction * 8;
          const result = measureSample(
            raster,
            {
              id: `site-${axis}-${row}-${along}-${direction}`,
              part: 'head',
              x: axis === 'x' ? start : row,
              y: axis === 'y' ? start : row,
              axis,
              direction,
              length: 32,
            },
            model,
          );
          if (result.status === 'measured') {
            const { part: _part, ...coordinates } = result.sample;
            sites.push({
              coordinates,
              widthPx: result.widthPx,
              normalizedWidth: result.normalizedWidth,
              slope: result.slope,
            });
          }
        }
      }
  }
  return {
    selection: 'automatic',
    status: 'exploratory-only',
    width: raster.width,
    height: raster.height,
    model,
    calibration: calibrationFor(model),
    sites,
    instruction:
      'Inspect these sites visually. Select distinct straight outer contours, assign body parts, and create a manual samples file. This list cannot pass contour acceptance.',
  };
}

export async function main(args: string[]): Promise<void> {
  if (
    args.length !== 2 &&
    !(args.length === 4 && args[2] === '--model' && ['strict', 'noisy'].includes(args[3]))
  )
    throw new Error(
      'Usage: node .github/skills/generate-character-openai/scripts/measure-contour.ts <source.png> <manual-samples.json|--explore> [--model strict|noisy]',
    );
  const [source, sampleFile] = args;
  const metadata = await sharp(source).metadata();
  if (metadata.format !== 'png') throw new Error('Use the original PNG source.');
  const { data, info } = await sharp(source)
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raster = { width: info.width, height: info.height, data };
  if (sampleFile === '--explore') {
    console.log(
      JSON.stringify(
        {
          source: path.resolve(source),
          ...exploreContours(raster, (args[3] ?? 'strict') as MeasurementModel),
        },
        null,
        2,
      ),
    );
    return;
  }
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
  const model = 'model' in document ? document.model : (args[3] ?? 'strict');
  if ((model !== 'strict' && model !== 'noisy') || (args[3] && args[3] !== model))
    throw new Error('Select one measurement model: strict or noisy.');
  const report = measureContours(raster, document.samples as ContourSample[], model);
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
