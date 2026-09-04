import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const MASTER_WIDTH = 1920;
export const MASTER_HEIGHT = 1080;
export const DIFFERENCE_THRESHOLD = 16;
export const EDGE_THRESHOLD = 2;
export const EDGE_GROWTH_RADIUS = 2;
export const MAX_ASPECT_ERROR_SOURCE_PIXELS = 1;
export const MIN_COMPONENT_AREA_RATIO = 0.001;

export const EXTRACTION_ZONES = Object.freeze({
  left: Object.freeze({ x: 0.125, y: 0.54, width: 0.195, height: 0.46 }),
  right: Object.freeze({ x: 0.68, y: 0.54, width: 0.195, height: 0.46 }),
});

export const DESK_FOCAL_RECTS = Object.freeze({
  left: Object.freeze({ x: 0.26, y: 0.56, width: 0.06, height: 0.16 }),
  right: Object.freeze({ x: 0.68, y: 0.56, width: 0.06, height: 0.16 }),
});

export const MODERATOR_FOCAL_RECTS = Object.freeze([
  Object.freeze({ x: 0.26, y: 0.36, width: 0.06, height: 0.16 }),
  Object.freeze({ x: 0.68, y: 0.36, width: 0.06, height: 0.16 }),
]);

sharp.cache(false);
sharp.concurrency(1);

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

function pixelRect(normalized, width = MASTER_WIDTH, height = MASTER_HEIGHT) {
  const left = Math.floor(normalized.x * width);
  const top = Math.floor(normalized.y * height);
  const right = Math.ceil((normalized.x + normalized.width) * width);
  const bottom = Math.ceil((normalized.y + normalized.height) * height);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function contains(rect, x, y) {
  return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
}

function intersects(rect, other) {
  return !(
    rect.right <= other.left ||
    other.right <= rect.left ||
    rect.bottom <= other.top ||
    other.bottom <= rect.top
  );
}

function boundsForMask(mask, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let count = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
    count += 1;
  }
  return count === 0
    ? null
    : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function decodeNormalized(filePath) {
  const input = await readFile(filePath);
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Image dimensions are missing: ${filePath}`);
  }
  const aspectErrorSourcePixels =
    Math.abs(metadata.width * 9 - metadata.height * 16) / 16;
  if (aspectErrorSourcePixels > MAX_ASPECT_ERROR_SOURCE_PIXELS) {
    throw new Error(
      `Image must be 16:9 within one source pixel: ${filePath} (${metadata.width}x${metadata.height}).`,
    );
  }
  if (metadata.hasAlpha) {
    const statistics = await sharp(input).stats();
    const alpha = statistics.channels[3];
    if (alpha && alpha.min !== 255) {
      throw new Error(`Image must be fully opaque: ${filePath}`);
    }
  }

  let image = sharp(input).removeAlpha();
  if (metadata.width !== MASTER_WIDTH || metadata.height !== MASTER_HEIGHT) {
    image = image.resize({
      width: MASTER_WIDTH,
      height: MASTER_HEIGHT,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    });
  }
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error(`Image must decode as RGB: ${filePath}`);
  return {
    data,
    inputHash: sha256(input),
    originalDimensions: { width: metadata.width, height: metadata.height },
    aspectErrorSourcePixels,
  };
}

function colorDelta(left, right, offset) {
  return Math.max(
    Math.abs(left[offset] - right[offset]),
    Math.abs(left[offset + 1] - right[offset + 1]),
    Math.abs(left[offset + 2] - right[offset + 2]),
  );
}

function extractSideMask(changed, edge, zone, focal, width, height, side) {
  const visited = new Uint8Array(width * height);
  const retained = new Uint8Array(width * height);
  const queue = new Int32Array(zone.width * zone.height);
  let retainedComponentCount = 0;
  const retainedComponentSizes = [];
  const minimumComponentPixels = Math.ceil(zone.width * zone.height * MIN_COMPONENT_AREA_RATIO);

  let candidate = new Uint8Array(width * height);
  for (let y = zone.top; y < zone.bottom; y += 1) {
    for (let x = zone.left; x < zone.right; x += 1) {
      const index = y * width + x;
      candidate[index] = changed[index];
    }
  }
  for (let pass = 0; pass < EDGE_GROWTH_RADIUS; pass += 1) {
    const next = new Uint8Array(candidate);
    for (let y = zone.top; y < zone.bottom; y += 1) {
      for (let x = zone.left; x < zone.right; x += 1) {
        const index = y * width + x;
        if (candidate[index] === 0) continue;
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const nextX = x + offsetX;
            const nextY = y + offsetY;
            if (!contains(zone, nextX, nextY)) continue;
            const neighbor = nextY * width + nextX;
            if (edge[neighbor] !== 0) next[neighbor] = 1;
          }
        }
      }
    }
    candidate = next;
  }

  for (let y = zone.top; y < zone.bottom; y += 1) {
    for (let x = zone.left; x < zone.right; x += 1) {
      const start = y * width + x;
      if (candidate[start] === 0 || visited[start] !== 0) continue;
      let head = 0;
      let tail = 0;
      let touchesFocal = false;
      queue[tail++] = start;
      visited[start] = 1;
      while (head < tail) {
        const index = queue[head++];
        const currentX = index % width;
        const currentY = Math.floor(index / width);
        if (contains(focal, currentX, currentY)) touchesFocal = true;
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (offsetX === 0 && offsetY === 0) continue;
            const nextX = currentX + offsetX;
            const nextY = currentY + offsetY;
            if (!contains(zone, nextX, nextY)) continue;
            const next = nextY * width + nextX;
            if (candidate[next] === 0 || visited[next] !== 0) continue;
            visited[next] = 1;
            queue[tail++] = next;
          }
        }
      }
      if (!touchesFocal || tail < minimumComponentPixels) continue;
      retainedComponentCount += 1;
      retainedComponentSizes.push(tail);
      for (let queueIndex = 0; queueIndex < tail; queueIndex += 1) {
        retained[queue[queueIndex]] = 1;
      }
    }
  }

  if (retainedComponentCount === 0) {
    throw new Error(`The ${side} desk component is missing or does not touch its focal rectangle.`);
  }
  if (retainedComponentCount !== 1) {
    throw new Error(
      `The ${side} desk must form one connected component; found ${retainedComponentCount} (${retainedComponentSizes.join(', ')} pixels).`,
    );
  }

  return retained;
}

export async function deriveSceneLayers({
  compositePath,
  desklessPath,
  backOutputPath,
  foregroundOutputPath,
  reportOutputPath,
}) {
  assertDistinctPaths({
    compositePath,
    desklessPath,
    backOutputPath,
    foregroundOutputPath,
    reportOutputPath,
  });
  const [composite, deskless] = await Promise.all([
    decodeNormalized(compositePath),
    decodeNormalized(desklessPath),
  ]);
  if (
    composite.originalDimensions.width !== deskless.originalDimensions.width ||
    composite.originalDimensions.height !== deskless.originalDimensions.height
  ) {
    throw new Error('The composite and deskless edit must have identical dimensions.');
  }

  const pixelCount = MASTER_WIDTH * MASTER_HEIGHT;
  const changed = new Uint8Array(pixelCount);
  const edge = new Uint8Array(pixelCount);
  const zones = Object.fromEntries(
    Object.entries(EXTRACTION_ZONES).map(([side, rect]) => [side, pixelRect(rect)]),
  );
  const focals = Object.fromEntries(
    Object.entries(DESK_FOCAL_RECTS).map(([side, rect]) => [side, pixelRect(rect)]),
  );
  let changedPixelCount = 0;
  let outsideChangeCount = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    const delta = colorDelta(composite.data, deskless.data, index * 3);
    if (delta >= EDGE_THRESHOLD) edge[index] = 1;
    if (delta < DIFFERENCE_THRESHOLD) continue;
    changed[index] = 1;
    changedPixelCount += 1;
    const x = index % MASTER_WIDTH;
    const y = Math.floor(index / MASTER_WIDTH);
    if (!contains(zones.left, x, y) && !contains(zones.right, x, y)) {
      outsideChangeCount += 1;
    }
  }
  const leftMask = extractSideMask(
    changed,
    edge,
    zones.left,
    focals.left,
    MASTER_WIDTH,
    MASTER_HEIGHT,
    'left',
  );
  const rightMask = extractSideMask(
    changed,
    edge,
    zones.right,
    focals.right,
    MASTER_WIDTH,
    MASTER_HEIGHT,
    'right',
  );
  const mask = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    mask[index] = leftMask[index] | rightMask[index];
  }

  const maskBounds = boundsForMask(mask, MASTER_WIDTH, MASTER_HEIGHT);
  const moderatorRects = MODERATOR_FOCAL_RECTS.map((rect) => pixelRect(rect));
  if (maskBounds && moderatorRects.some((rect) => intersects(maskBounds, rect))) {
    for (let index = 0; index < mask.length; index += 1) {
      if (mask[index] === 0) continue;
      const x = index % MASTER_WIDTH;
      const y = Math.floor(index / MASTER_WIDTH);
      if (moderatorRects.some((rect) => contains(rect, x, y))) {
        throw new Error('The derived foreground mask includes a moderator focal rectangle.');
      }
    }
  }

  const backPixels = Buffer.alloc(pixelCount * 3);
  const foregroundPixels = Buffer.alloc(pixelCount * 3);
  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 3;
    const source = mask[index] === 0 ? composite.data : deskless.data;
    backPixels[offset] = source[offset];
    backPixels[offset + 1] = source[offset + 1];
    backPixels[offset + 2] = source[offset + 2];
    if (mask[index] === 0) {
      foregroundPixels[offset] = 0;
      foregroundPixels[offset + 1] = 255;
      foregroundPixels[offset + 2] = 0;
    } else {
      foregroundPixels[offset] = composite.data[offset];
      foregroundPixels[offset + 1] = composite.data[offset + 1];
      foregroundPixels[offset + 2] = composite.data[offset + 2];
    }
  }

  const pngOptions = { compressionLevel: 9, adaptiveFiltering: false, effort: 10 };
  const [backPng, foregroundPng] = await Promise.all([
    sharp(backPixels, { raw: { width: MASTER_WIDTH, height: MASTER_HEIGHT, channels: 3 } })
      .png(pngOptions)
      .toBuffer(),
    sharp(foregroundPixels, {
      raw: { width: MASTER_WIDTH, height: MASTER_HEIGHT, channels: 3 },
    })
      .png(pngOptions)
      .toBuffer(),
  ]);
  const maskHash = sha256(mask);
  const report = {
    schemaVersion: 1,
    dimensions: { width: MASTER_WIDTH, height: MASTER_HEIGHT },
    inputDimensions: composite.originalDimensions,
    inputAspectErrorSourcePixels: composite.aspectErrorSourcePixels,
    algorithm: {
      differenceThreshold: DIFFERENCE_THRESHOLD,
      antialiasEdgeThreshold: EDGE_THRESHOLD,
      antialiasGrowthRadius: EDGE_GROWTH_RADIUS,
      connectivity: 8,
      minimumComponentAreaRatio: MIN_COMPONENT_AREA_RATIO,
      outsideChangesIgnoredByMask: true,
    },
    changedPixelCount,
    outsideChangeCount,
    maskPixelCount: mask.reduce((sum, value) => sum + value, 0),
    maskBounds,
    sideMaskBounds: {
      left: boundsForMask(leftMask, MASTER_WIDTH, MASTER_HEIGHT),
      right: boundsForMask(rightMask, MASTER_WIDTH, MASTER_HEIGHT),
    },
    hashes: {
      compositeSourceSha256: composite.inputHash,
      desklessSourceSha256: deskless.inputHash,
      normalizedCompositeSha256: sha256(composite.data),
      normalizedDesklessSha256: sha256(deskless.data),
      maskSha256: maskHash,
      backSha256: sha256(backPng),
      foregroundSha256: sha256(foregroundPng),
    },
  };

  await Promise.all([
    mkdir(path.dirname(backOutputPath), { recursive: true }),
    mkdir(path.dirname(foregroundOutputPath), { recursive: true }),
    mkdir(path.dirname(reportOutputPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(backOutputPath, backPng),
    writeFile(foregroundOutputPath, foregroundPng),
    writeFile(reportOutputPath, `${JSON.stringify(report, null, 2)}\n`),
  ]);
  return report;
}

function assertDistinctPaths(paths) {
  const seen = new Map();
  for (const [name, filePath] of Object.entries(paths)) {
    if (typeof filePath !== 'string' || filePath.length === 0) {
      throw new Error(`The ${name} path must be a non-empty string.`);
    }
    const resolved = path.resolve(filePath);
    const comparisonPath = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    const previousName = seen.get(comparisonPath);
    if (previousName) {
      throw new Error(
        `Scene layer paths must be distinct; ${name} and ${previousName} both resolve to ${resolved}.`,
      );
    }
    seen.set(comparisonPath, name);
  }
}

function parseArguments(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || !value) throw new Error('Use named path arguments.');
    values[key.slice(2)] = value;
  }
  for (const name of ['composite', 'deskless', 'back', 'foreground', 'report']) {
    if (!values[name]) throw new Error(`Missing required argument --${name}.`);
  }
  return {
    compositePath: path.resolve(values.composite),
    desklessPath: path.resolve(values.deskless),
    backOutputPath: path.resolve(values.back),
    foregroundOutputPath: path.resolve(values.foreground),
    reportOutputPath: path.resolve(values.report),
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  deriveSceneLayers(parseArguments(process.argv.slice(2)))
    .then((report) => process.stdout.write(`${JSON.stringify(report)}\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
