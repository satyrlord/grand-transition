import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const workflowId = 'green-chroma-key-v1';
const chromaKey = '#00FF00';
const alphaSources = new Set(['adopted-alpha-v1', 'soft-green-key-v1']);
const softAlphaMatte = 'green-dominance-neighbor-matte-v1';
const foregroundReconstruction = 'known-green-unmix-v1';
const privatePromptProvenance =
  'Private prompt record and temporary render workflow.';
const alphaMetadataKeys = new Set([
  'Alpha Workflow',
  'Chroma Key',
  'Chroma Adoption',
  'Alpha Source',
  'Alpha Matte',
  'Foreground Reconstruction',
]);

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function makeInternationalText(keyword, text) {
  return makeChunk(
    'iTXt',
    Buffer.concat([
      Buffer.from(keyword, 'latin1'),
      Buffer.from([0, 0, 0, 0, 0]),
      Buffer.from(text, 'utf8'),
    ]),
  );
}

function internationalTextEntries(png) {
  const entries = new Map();
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'iTXt') {
      const keywordEnd = data.indexOf(0);
      const keyword = data.toString('latin1', 0, keywordEnd);
      entries.set(keyword, data.toString('utf8', keywordEnd + 5));
    }
    offset += 12 + length;
  }
  return entries;
}

async function stampMetadata(
  filePath,
  extraEntries = new Map(),
  includeAlphaWorkflow = true,
  removedKeys = new Set(),
) {
  const input = await readFile(filePath);
  const entries = new Map([
    ...(includeAlphaWorkflow
      ? [
          ['Alpha Workflow', workflowId],
          ['Chroma Key', chromaKey],
          [
            'Chroma Adoption',
            'Transparent pixels passed through a lossless green-matte staging check. The shipping raster contains genuine alpha and no key-green residue.',
          ],
          ['Alpha Source', 'adopted-alpha-v1'],
        ]
      : []),
    ...extraEntries,
  ]);
  const keysToReplace = new Set([
    ...(includeAlphaWorkflow ? alphaMetadataKeys : []),
    ...removedKeys,
    ...entries.keys(),
  ]);
  const chunks = [input.subarray(0, 8)];
  let offset = 8;

  while (offset < input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.toString('ascii', offset + 4, offset + 8);
    const data = input.subarray(offset + 8, offset + 8 + length);
    const end = offset + 12 + length;
    if (type === 'iTXt') {
      const keywordEnd = data.indexOf(0);
      const keyword = data.toString('latin1', 0, keywordEnd);
      if (keysToReplace.has(keyword)) {
        offset = end;
        continue;
      }
    }
    if (type === 'IEND') {
      for (const [keyword, text] of entries) {
        chunks.push(makeInternationalText(keyword, text));
      }
    }
    chunks.push(input.subarray(offset, end));
    offset = end;
  }

  await writeFile(filePath, Buffer.concat(chunks));
}

function generationProvenanceEntries(png) {
  const metadata = internationalTextEntries(png);
  return new Map(
    ['Generation Prompt', 'Generation Source'].flatMap((key) => {
      const value = metadata.get(key)?.trim();
      return value ? [[key, value]] : [];
    }),
  );
}

function assertGenerationProvenance(filePath, metadata) {
  if (
    !metadata.get('Generation Prompt')?.trim() &&
    !metadata.get('Generation Source')?.trim()
  ) {
    throw new Error(
      `${filePath}: missing embedded Generation Prompt or Generation Source metadata.`,
    );
  }
}

function assertGenerationSource(filePath, metadata) {
  if (!metadata.get('Generation Source')?.trim()) {
    throw new Error(
      `${filePath}: missing embedded Generation Source metadata.`,
    );
  }
}

async function inspectImages(filePaths) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  try {
    for (const filePath of filePaths) {
      const input = await readFile(filePath);
      const source = `data:image/png;base64,${input.toString('base64')}`;
      const facts = await page.evaluate(async (imageSource) => {
        const image = new Image();
        image.src = imageSource;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        let chromaGreenPixels = 0;
        let opaquePixels = 0;
        let partialAlphaPixels = 0;
        let transparentPixels = 0;
        for (
          let pixelIndex = 0;
          pixelIndex < canvas.width * canvas.height;
          pixelIndex += 1
        ) {
          const offset = pixelIndex * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const alpha = pixels[offset + 3];
          if (alpha === 0) transparentPixels += 1;
          if (alpha === 255) opaquePixels += 1;
          if (alpha > 0 && alpha < 255) partialAlphaPixels += 1;
          if (alpha > 0 && green >= 180 && red <= 80 && blue <= 80) {
            chromaGreenPixels += 1;
          }
        }
        return {
          width: canvas.width,
          height: canvas.height,
          cornerAlpha: [
            context.getImageData(0, 0, 1, 1).data[3],
            context.getImageData(canvas.width - 1, 0, 1, 1).data[3],
            context.getImageData(0, canvas.height - 1, 1, 1).data[3],
            context.getImageData(canvas.width - 1, canvas.height - 1, 1, 1)
              .data[3],
          ],
          chromaGreenPixels,
          opaquePixels,
          partialAlphaPixels,
          transparentPixels,
        };
      }, source);
      results.push({ filePath, ...facts });
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function listPngFiles(rootPath) {
  const files = [];
  for (const entry of await readdir(rootPath, { withFileTypes: true })) {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) files.push(...(await listPngFiles(entryPath)));
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.png') {
      files.push(entryPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

function assertTransparentAsset(facts) {
  if (facts.transparentPixels === 0 || facts.opaquePixels === 0) {
    throw new Error(
      `${facts.filePath}: expected transparent and opaque pixels.`,
    );
  }
  if (!facts.cornerAlpha.every((alpha) => alpha === 0)) {
    throw new Error(`${facts.filePath}: all four corners must have alpha 0.`);
  }
  if (facts.chromaGreenPixels !== 0) {
    throw new Error(
      `${facts.filePath}: found ${facts.chromaGreenPixels} chroma-key green pixels.`,
    );
  }
}

async function adopt(filePath, promptFile) {
  const [facts] = await inspectImages([filePath]);
  assertTransparentAsset(facts);
  const extraEntries = generationProvenanceEntries(await readFile(filePath));
  if (promptFile) {
    const prompt = await readFile(promptFile, 'utf8');
    if (!prompt.trim()) {
      throw new Error(`${promptFile}: generation prompt is empty.`);
    }
    extraEntries.delete('Generation Prompt');
    extraEntries.set('Generation Source', privatePromptProvenance);
  } else if (extraEntries.has('Generation Prompt')) {
    extraEntries.delete('Generation Prompt');
    extraEntries.set('Generation Source', privatePromptProvenance);
  }
  assertGenerationProvenance(filePath, extraEntries);
  await stampMetadata(
    filePath,
    extraEntries,
    true,
    new Set(['Generation Prompt', 'Generation Source']),
  );
  process.stdout.write(`Adopted ${filePath} into ${workflowId}.\n`);
}

async function stampProvenance(filePath, promptFile, sourceText) {
  const input = await readFile(filePath);
  const entries = generationProvenanceEntries(input);
  if (promptFile) {
    const prompt = await readFile(promptFile, 'utf8');
    if (!prompt.trim()) {
      throw new Error(`${promptFile}: generation prompt is empty.`);
    }
    entries.delete('Generation Prompt');
    entries.set('Generation Source', privatePromptProvenance);
  }
  const removedKeys = new Set(['Generation Prompt', 'Generation Source']);
  if (sourceText) {
    entries.delete('Generation Prompt');
    entries.set('Generation Source', sourceText);
  }
  assertGenerationProvenance(filePath, entries);
  await stampMetadata(filePath, entries, false, removedKeys);
  process.stdout.write(`Recorded generation provenance for ${filePath}.\n`);
}

function assertSoftKeyAsset(facts) {
  if (facts.partialAlphaPixels === 0) {
    throw new Error(
      `${facts.filePath}: soft green-key conversion produced no partial-alpha edge pixels.`,
    );
  }
}

async function convert(inputPath, outputPath, promptFile) {
  const input = await readFile(inputPath);
  const provenanceEntries = generationProvenanceEntries(input);
  if (promptFile) {
    const prompt = await readFile(promptFile, 'utf8');
    if (!prompt.trim()) {
      throw new Error(`${promptFile}: generation prompt is empty.`);
    }
    provenanceEntries.delete('Generation Prompt');
    provenanceEntries.set('Generation Source', privatePromptProvenance);
  } else if (provenanceEntries.has('Generation Prompt')) {
    provenanceEntries.delete('Generation Prompt');
    provenanceEntries.set('Generation Source', privatePromptProvenance);
  }
  assertGenerationProvenance(inputPath, provenanceEntries);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const source = `data:image/png;base64,${input.toString('base64')}`;
    const output = await page.evaluate(async (imageSource) => {
      const backgroundDominance = 230;
      const connectedBackgroundDominance = 180;
      const backgroundColorRadius = 52;
      const foregroundDominance = 25;
      const searchRadius = 8;
      const image = new Image();
      image.src = imageSource;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const source = new Uint8ClampedArray(pixels);
      const pixelCount = canvas.width * canvas.height;
      const classifications = new Uint8Array(pixelCount);
      const coverage = new Float32Array(pixelCount);
      const connectedBackground = new Uint8Array(pixelCount);
      const backgroundQueue = new Int32Array(pixelCount);

      const clampUnit = (value) => Math.max(0, Math.min(1, value));
      const pixelOffset = (x, y) => (y * canvas.width + x) * 4;
      const isBorderBackground = (pixelIndex) => {
        const offset = pixelIndex * 4;
        return (
          source[offset + 3] > 0 &&
          source[offset + 1] - Math.max(source[offset], source[offset + 2]) >=
            connectedBackgroundDominance
        );
      };
      let queueStart = 0;
      let queueEnd = 0;
      const enqueueBackground = (pixelIndex) => {
        if (
          connectedBackground[pixelIndex] !== 0 ||
          !isBorderBackground(pixelIndex)
        ) {
          return;
        }
        connectedBackground[pixelIndex] = 1;
        backgroundQueue[queueEnd] = pixelIndex;
        queueEnd += 1;
      };

      for (let x = 0; x < canvas.width; x += 1) {
        enqueueBackground(x);
        enqueueBackground((canvas.height - 1) * canvas.width + x);
      }
      for (let y = 0; y < canvas.height; y += 1) {
        enqueueBackground(y * canvas.width);
        enqueueBackground(y * canvas.width + canvas.width - 1);
      }
      while (queueStart < queueEnd) {
        const pixelIndex = backgroundQueue[queueStart];
        queueStart += 1;
        const x = pixelIndex % canvas.width;
        const y = Math.floor(pixelIndex / canvas.width);
        if (x > 0) enqueueBackground(pixelIndex - 1);
        if (x + 1 < canvas.width) enqueueBackground(pixelIndex + 1);
        if (y > 0) enqueueBackground(pixelIndex - canvas.width);
        if (y + 1 < canvas.height) {
          enqueueBackground(pixelIndex + canvas.width);
        }
      }
      if (queueEnd === 0) {
        throw new Error('No border-connected green matte was found.');
      }

      const matte = [0, 0, 0];
      for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
        if (connectedBackground[pixelIndex] === 0) continue;
        const offset = pixelIndex * 4;
        matte[0] += source[offset];
        matte[1] += source[offset + 1];
        matte[2] += source[offset + 2];
      }
      matte[0] /= queueEnd;
      matte[1] /= queueEnd;
      matte[2] /= queueEnd;

      for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
        const offset = pixelIndex * 4;
        const red = source[offset];
        const green = source[offset + 1];
        const blue = source[offset + 2];
        const sourceAlpha = source[offset + 3] / 255;
        const dominance = green - Math.max(red, blue);
        const matteDistance = Math.hypot(
          red - matte[0],
          green - matte[1],
          blue - matte[2],
        );

        if (
          sourceAlpha === 0 ||
          connectedBackground[pixelIndex] !== 0 ||
          matteDistance <= backgroundColorRadius ||
          dominance >= backgroundDominance
        ) {
          classifications[pixelIndex] = 0;
          coverage[pixelIndex] = 0;
          continue;
        }
        if (dominance <= foregroundDominance) {
          classifications[pixelIndex] = 2;
          coverage[pixelIndex] = sourceAlpha;
          continue;
        }

        classifications[pixelIndex] = 1;
        coverage[pixelIndex] =
          clampUnit(
            (backgroundDominance - dominance) /
              (backgroundDominance - foregroundDominance),
          ) * sourceAlpha;
      }

      const nearestForeground = (x, y) => {
        for (let radius = 1; radius <= searchRadius; radius += 1) {
          let red = 0;
          let green = 0;
          let blue = 0;
          let count = 0;
          const left = Math.max(0, x - radius);
          const right = Math.min(canvas.width - 1, x + radius);
          const top = Math.max(0, y - radius);
          const bottom = Math.min(canvas.height - 1, y + radius);

          for (let sampleX = left; sampleX <= right; sampleX += 1) {
            for (const sampleY of [top, bottom]) {
              const sampleIndex = sampleY * canvas.width + sampleX;
              if (classifications[sampleIndex] !== 2) continue;
              const offset = sampleIndex * 4;
              red += source[offset];
              green += source[offset + 1];
              blue += source[offset + 2];
              count += 1;
            }
          }
          for (let sampleY = top + 1; sampleY < bottom; sampleY += 1) {
            for (const sampleX of [left, right]) {
              const sampleIndex = sampleY * canvas.width + sampleX;
              if (classifications[sampleIndex] !== 2) continue;
              const offset = sampleIndex * 4;
              red += source[offset];
              green += source[offset + 1];
              blue += source[offset + 2];
              count += 1;
            }
          }
          if (count > 0) {
            return [red / count, green / count, blue / count];
          }
        }
        return null;
      };

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const pixelIndex = y * canvas.width + x;
          if (classifications[pixelIndex] !== 1) continue;
          const foreground = nearestForeground(x, y);
          if (!foreground) continue;
          const offset = pixelIndex * 4;
          const observed = [
            source[offset],
            source[offset + 1],
            source[offset + 2],
          ];
          let numerator = 0;
          let denominator = 0;
          for (let channel = 0; channel < 3; channel += 1) {
            const foregroundDelta = foreground[channel] - matte[channel];
            numerator += (observed[channel] - matte[channel]) * foregroundDelta;
            denominator += foregroundDelta * foregroundDelta;
          }
          if (denominator > 0) {
            const sourceAlpha = source[offset + 3] / 255;
            coverage[pixelIndex] =
              clampUnit(numerator / denominator) * sourceAlpha;
          }
        }
      }

      const originalCoverage = new Float32Array(coverage);
      const kernel = [1, 2, 1];
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          let hasTransparent = false;
          let hasOpaque = false;
          let hasPartial = false;
          for (let localY = -1; localY <= 1; localY += 1) {
            const sampleY = y + localY;
            if (sampleY < 0 || sampleY >= canvas.height) continue;
            for (let localX = -1; localX <= 1; localX += 1) {
              const sampleX = x + localX;
              if (sampleX < 0 || sampleX >= canvas.width) continue;
              const sampleCoverage =
                originalCoverage[sampleY * canvas.width + sampleX];
              if (sampleCoverage === 0) hasTransparent = true;
              else if (sampleCoverage === 1) hasOpaque = true;
              else hasPartial = true;
            }
          }
          if (hasTransparent && hasOpaque && !hasPartial) {
            let weightedCoverage = 0;
            let weightTotal = 0;
            for (let kernelY = -1; kernelY <= 1; kernelY += 1) {
              const sampleY = y + kernelY;
              if (sampleY < 0 || sampleY >= canvas.height) continue;
              for (let kernelX = -1; kernelX <= 1; kernelX += 1) {
                const sampleX = x + kernelX;
                if (sampleX < 0 || sampleX >= canvas.width) continue;
                const weight = kernel[kernelX + 1] * kernel[kernelY + 1];
                weightedCoverage +=
                  originalCoverage[sampleY * canvas.width + sampleX] * weight;
                weightTotal += weight;
              }
            }
            coverage[y * canvas.width + x] = weightedCoverage / weightTotal;
          }
        }
      }

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const pixelIndex = y * canvas.width + x;
          const offset = pixelOffset(x, y);
          const alpha = clampUnit(coverage[pixelIndex]);
          if (alpha <= 8 / 255) {
            pixels[offset] = 0;
            pixels[offset + 1] = 0;
            pixels[offset + 2] = 0;
            pixels[offset + 3] = 0;
            continue;
          }

          let foreground;
          let reconstructed;
          if (classifications[pixelIndex] === 0) {
            foreground = nearestForeground(x, y);
            reconstructed = foreground ?? [0, 0, 0];
          } else if (classifications[pixelIndex] === 2) {
            reconstructed = [
              source[offset],
              source[offset + 1],
              source[offset + 2],
            ];
          } else {
            foreground = nearestForeground(x, y);
            const rawAlpha = Math.max(alpha, 1 / 255);
            reconstructed = [
              (source[offset] - (1 - rawAlpha) * matte[0]) / rawAlpha,
              (source[offset + 1] - (1 - rawAlpha) * matte[1]) / rawAlpha,
              (source[offset + 2] - (1 - rawAlpha) * matte[2]) / rawAlpha,
            ];
          }
          for (let channel = 0; channel < 3; channel += 1) {
            const fallback = foreground?.[channel] ?? source[offset + channel];
            const value = Number.isFinite(reconstructed[channel])
              ? reconstructed[channel]
              : fallback;
            pixels[offset + channel] = Math.max(0, Math.min(255, value));
          }
          pixels[offset + 3] =
            alpha >= 247 / 255 ? 255 : Math.round(alpha * 255);
        }
      }
      context.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, source);
    await writeFile(outputPath, Buffer.from(output, 'base64'));
  } finally {
    await browser.close();
  }
  const [facts] = await inspectImages([outputPath]);
  assertTransparentAsset(facts);
  assertSoftKeyAsset(facts);
  const extraEntries = new Map([
    [
      'Chroma Adoption',
      'Flat green matte converted to continuous alpha with known-matte foreground reconstruction.',
    ],
    ['Alpha Source', 'soft-green-key-v1'],
    ['Alpha Matte', softAlphaMatte],
    ['Foreground Reconstruction', foregroundReconstruction],
    ...provenanceEntries,
  ]);
  await stampMetadata(outputPath, extraEntries);
  process.stdout.write(
    `Converted ${inputPath} to ${outputPath} with soft alpha.\n`,
  );
}

async function convertTree(inputRoot, outputRoot, promptRoot) {
  if (path.resolve(inputRoot) === path.resolve(outputRoot)) {
    throw new Error('Green source and output roots must be different.');
  }
  const inputFiles = await listPngFiles(inputRoot);
  if (inputFiles.length === 0) {
    throw new Error(`${inputRoot}: found no Portable Network Graphics files.`);
  }
  const jobs = inputFiles.map((inputPath) => {
    const relativePath = path.relative(inputRoot, inputPath);
    const outputPath = path.join(outputRoot, relativePath);
    const parsedPath = path.parse(relativePath);
    const promptPath = path.join(
      promptRoot ?? inputRoot,
      parsedPath.dir,
      `${parsedPath.name}.prompt.txt`,
    );
    return { inputPath, outputPath, promptPath };
  });
  await Promise.all(jobs.map(({ promptPath }) => stat(promptPath)));
  for (const { inputPath, outputPath, promptPath } of jobs) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await convert(inputPath, outputPath, promptPath);
  }
  process.stdout.write(
    `Converted green source tree: ${inputFiles.length} asset(s).\n`,
  );
}

async function validate(rootPath) {
  const pngFiles = await listPngFiles(rootPath);
  const facts = await inspectImages(pngFiles);
  let transparentAssetCount = 0;
  for (const imageFacts of facts) {
    const metadata = internationalTextEntries(
      await readFile(imageFacts.filePath),
    );
    assertGenerationSource(imageFacts.filePath, metadata);
    if (
      imageFacts.filePath.split(path.sep).includes('characters') &&
      metadata.get('Generation Prompt')?.trim()
    ) {
      throw new Error(
        `${imageFacts.filePath}: exact character Generation Prompt must stay in the research folder.`,
      );
    }
    if (imageFacts.transparentPixels === 0) continue;
    transparentAssetCount += 1;
    assertTransparentAsset(imageFacts);
    if (metadata.get('Alpha Workflow') !== workflowId) {
      throw new Error(
        `${imageFacts.filePath}: missing Alpha Workflow=${workflowId}.`,
      );
    }
    if (metadata.get('Chroma Key') !== chromaKey) {
      throw new Error(
        `${imageFacts.filePath}: missing Chroma Key=${chromaKey}.`,
      );
    }
    const alphaSource = metadata.get('Alpha Source');
    if (!alphaSource || !alphaSources.has(alphaSource)) {
      throw new Error(
        `${imageFacts.filePath}: missing or unsupported Alpha Source=${alphaSource}.`,
      );
    }
    if (alphaSource === 'soft-green-key-v1') {
      assertSoftKeyAsset(imageFacts);
      if (metadata.get('Alpha Matte') !== softAlphaMatte) {
        throw new Error(
          `${imageFacts.filePath}: missing Alpha Matte=${softAlphaMatte}.`,
        );
      }
      if (
        metadata.get('Foreground Reconstruction') !== foregroundReconstruction
      ) {
        throw new Error(
          `${imageFacts.filePath}: missing Foreground Reconstruction=${foregroundReconstruction}.`,
        );
      }
    }
  }
  process.stdout.write(
    `Green chroma-key validation passed: ${transparentAssetCount} transparent asset(s).\n`,
  );
}

const [command, ...arguments_] = process.argv.slice(2);
const promptFileIndex = arguments_.indexOf('--prompt-file');
let promptFile;
if (promptFileIndex >= 0) {
  promptFile = path.resolve(arguments_[promptFileIndex + 1]);
  arguments_.splice(promptFileIndex, 2);
  await stat(promptFile);
}
const sourceIndex = arguments_.indexOf('--source');
let sourceText;
if (sourceIndex >= 0) {
  sourceText = arguments_[sourceIndex + 1];
  arguments_.splice(sourceIndex, 2);
}
const promptRootIndex = arguments_.indexOf('--prompt-root');
let promptRoot;
if (promptRootIndex >= 0) {
  promptRoot = path.resolve(arguments_[promptRootIndex + 1]);
  arguments_.splice(promptRootIndex, 2);
  await stat(promptRoot);
}

if (
  command === 'provenance' &&
  arguments_.length === 1 &&
  (promptFile || sourceText)
) {
  await stampProvenance(path.resolve(arguments_[0]), promptFile, sourceText);
} else if (command === 'adopt' && arguments_.length === 1) {
  await adopt(path.resolve(arguments_[0]), promptFile);
} else if (command === 'convert' && arguments_.length === 2) {
  await convert(
    path.resolve(arguments_[0]),
    path.resolve(arguments_[1]),
    promptFile,
  );
} else if (command === 'convert-tree' && arguments_.length === 2) {
  await convertTree(
    path.resolve(arguments_[0]),
    path.resolve(arguments_[1]),
    promptRoot,
  );
} else if (command === 'validate' && arguments_.length <= 1) {
  await validate(path.resolve(arguments_[0] ?? 'src/assets'));
} else {
  process.stderr.write(
    'Usage: green-chroma-key.mjs provenance <png> (--prompt-file <txt> | --source <text>) | adopt <png> [--prompt-file <txt>] | convert <green-png> <output-png> [--prompt-file <txt>] | convert-tree <green-root> <output-root> [--prompt-root <prompt-root>] | validate [asset-root]\n',
  );
  process.exitCode = 2;
}
