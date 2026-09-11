import { createHash } from 'node:crypto';
import sharp from 'sharp';
import {
  measureNativeAlphaTopology,
  NATIVE_ALPHA_MAX_CONTOUR_DISTANCE,
  NATIVE_ALPHA_MIN_CONTOUR_RATIO,
  NATIVE_ALPHA_MIN_OPACITY,
} from '../../../../tools/asset-pixels.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function decode(bytes) {
  const metadata = await sharp(bytes, { failOn: 'warning' }).metadata();
  if (metadata.format !== 'png' || (metadata.pages ?? 1) !== 1 || metadata.depth !== 'uchar') {
    throw new Error('Use a static 8-bit PNG for native-alpha preparation.');
  }
  const { data, info } = await sharp(bytes, { failOn: 'warning' }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error('Native-alpha preparation requires decoded RGBA pixels.');
  return { data, width: info.width, height: info.height, hasAlpha: metadata.hasAlpha === true };
}

function nearInterior(data, width, height, x, y) {
  const radius = NATIVE_ALPHA_MAX_CONTOUR_DISTANCE;
  for (let row = Math.max(0, y - radius); row <= Math.min(height - 1, y + radius); row += 1) {
    for (let column = Math.max(0, x - radius); column <= Math.min(width - 1, x + radius); column += 1) {
      if (data[(row * width + column) * 4 + 3] >= NATIVE_ALPHA_MIN_OPACITY) return true;
    }
  }
  return false;
}

function inspectRaster({ data, width, height, hasAlpha }) {
  const topology = measureNativeAlphaTopology(data, width, height);
  let transparentPixels = 0;
  let nearOpaquePixels = 0;
  let detachedAlphaOnePixels = 0;
  let detachedStrongerAlphaPixels = 0;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const alpha = data[pixel * 4 + 3];
    if (alpha === 0) transparentPixels += 1;
    else if (alpha >= NATIVE_ALPHA_MIN_OPACITY) nearOpaquePixels += 1;
    else if (!nearInterior(data, width, height, pixel % width, Math.floor(pixel / width))) {
      if (alpha === 1) detachedAlphaOnePixels += 1;
      else detachedStrongerAlphaPixels += 1;
    }
  }
  const contourRatio = topology.partialAlphaPixels === 0 ? 0
    : topology.contourPartialAlphaPixels / topology.partialAlphaPixels;
  const visiblePixels = width * height - transparentPixels;
  const nearOpaqueRatio = visiblePixels === 0 ? 0 : nearOpaquePixels / visiblePixels;
  const issues = [];
  if (!hasAlpha) issues.push('The source PNG must contain an alpha channel.');
  if (transparentPixels === 0) issues.push('The source must contain fully transparent pixels.');
  if (nearOpaquePixels === 0) issues.push('The source must contain near-opaque pixels.');
  if (topology.partialAlphaPixels === 0) issues.push('The source must contain partial-alpha contour pixels.');
  if (nearOpaqueRatio < 0.5) issues.push('At least 50% of visible pixels must be near-opaque.');
  if (topology.nontransparentBorderPixels > 0) issues.push('The outer border must be fully transparent.');
  if (contourRatio < NATIVE_ALPHA_MIN_CONTOUR_RATIO) {
    issues.push(`At least ${NATIVE_ALPHA_MIN_CONTOUR_RATIO * 100}% of partial alpha must be within ` +
      `${NATIVE_ALPHA_MAX_CONTOUR_DISTANCE} pixels of near-opaque content.`);
  }
  return {
    width, height, hasAlpha, valid: issues.length === 0, issues,
    topology: {
      ...topology, transparentPixels, nearOpaquePixels, contourRatio, nearOpaqueRatio,
      detachedAlphaOnePixels, detachedStrongerAlphaPixels,
    },
  };
}

// Inspection reports invalid candidate topology without changing the input.
export async function inspectNativeAlpha(bytes) {
  return inspectRaster(await decode(bytes));
}

// This operation changes only detached alpha-1 values. It performs no matte
// extraction, colour correction, edge erosion, resizing, or file writes.
export async function prepareNativeAlpha(bytes) {
  const raster = await decode(bytes);
  const before = inspectRaster(raster);
  if (!raster.hasAlpha) throw new Error(before.issues.join(' '));
  const data = Buffer.from(raster.data);
  let clearedAlphaOnePixels = 0;
  for (let pixel = 0; pixel < raster.width * raster.height; pixel += 1) {
    const offset = pixel * 4 + 3;
    if (data[offset] === 1 && !nearInterior(data, raster.width, raster.height,
      pixel % raster.width, Math.floor(pixel / raster.width))) {
      data[offset] = 0;
      clearedAlphaOnePixels += 1;
    }
  }
  const after = inspectRaster({ ...raster, data });
  if (!after.valid) throw new Error(`Native-alpha preparation failed. ${after.issues.join(' ')}`);
  const output = clearedAlphaOnePixels === 0 ? bytes
    : await sharp(data, { raw: { width: raster.width, height: raster.height, channels: 4 } }).png().toBuffer();
  return {
    output,
    record: {
      method: 'clear-detached-alpha-one-v1',
      sourceSha256: sha256(bytes), outputSha256: sha256(output),
      width: raster.width, height: raster.height, clearedAlphaOnePixels,
      before, after,
    },
  };
}
