// Native interiors allow at most 5/255 (about 2%) background contribution.
export const NATIVE_ALPHA_MIN_OPACITY = 250;
export const NATIVE_ALPHA_MAX_CONTOUR_DISTANCE = 4;
export const NATIVE_ALPHA_MIN_CONTOUR_RATIO = 0.9;

export function isVisibleChromaGreen(data, offset) {
  return data[offset + 3] > 16 && data[offset + 1] >= 180 &&
    data[offset] <= 80 && data[offset + 2] <= 80;
}

export function hasNativeAlphaProvenance(png) {
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return false;
  const entries = new Map();
  for (let offset = 8; offset + 12 <= png.length;) {
    const length = png.readUInt32BE(offset);
    if (offset + length + 12 > png.length) return false;
    if (png.toString('ascii', offset + 4, offset + 8) === 'iTXt') {
      const data = png.subarray(offset + 8, offset + 8 + length);
      const end = data.indexOf(0);
      if (end >= 0) entries.set(data.toString('latin1', 0, end), data.toString('utf8', end + 5));
    }
    offset += length + 12;
  }
  return entries.get('Alpha Workflow') === 'native-alpha-v1' &&
    entries.get('Alpha Source') === 'generated-alpha-v1';
}

export function measureNativeAlphaTopology(data, width, height) {
  const pixelCount = width * height;
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width <= 0 || height <= 0 || data.length !== pixelCount * 4) {
    throw new Error('Native-alpha topology requires a complete RGBA raster.');
  }

  const maximumDistance = 0xffff;
  const distances = new Uint16Array(pixelCount);
  distances.fill(maximumDistance);
  let partialAlphaPixels = 0;
  let nontransparentBorderPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const alpha = data[pixelIndex * 4 + 3];
      if (alpha >= NATIVE_ALPHA_MIN_OPACITY) distances[pixelIndex] = 0;
      else if (alpha > 0) partialAlphaPixels += 1;
      if (alpha > 0 && (x === 0 || y === 0 || x === width - 1 || y === height - 1)) {
        nontransparentBorderPixels += 1;
      }
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      if (distances[pixelIndex] === 0) continue;
      let distance = maximumDistance;
      if (x > 0) distance = Math.min(distance, distances[pixelIndex - 1]);
      if (y > 0) {
        distance = Math.min(distance, distances[pixelIndex - width]);
        if (x > 0) distance = Math.min(distance, distances[pixelIndex - width - 1]);
        if (x + 1 < width) distance = Math.min(distance, distances[pixelIndex - width + 1]);
      }
      if (distance < maximumDistance) distances[pixelIndex] = distance + 1;
    }
  }

  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const pixelIndex = y * width + x;
      let distance = distances[pixelIndex];
      if (x + 1 < width) distance = Math.min(distance, distances[pixelIndex + 1] + 1);
      if (y + 1 < height) {
        distance = Math.min(distance, distances[pixelIndex + width] + 1);
        if (x > 0) distance = Math.min(distance, distances[pixelIndex + width - 1] + 1);
        if (x + 1 < width) distance = Math.min(distance, distances[pixelIndex + width + 1] + 1);
      }
      distances[pixelIndex] = distance;
    }
  }

  let contourPartialAlphaPixels = 0;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const alpha = data[pixelIndex * 4 + 3];
    if (alpha > 0 && alpha < NATIVE_ALPHA_MIN_OPACITY &&
        distances[pixelIndex] <= NATIVE_ALPHA_MAX_CONTOUR_DISTANCE) {
      contourPartialAlphaPixels += 1;
    }
  }
  return {
    partialAlphaPixels,
    contourPartialAlphaPixels,
    nontransparentBorderPixels,
  };
}
