import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { chromium, type Browser } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const converterPath = path.resolve(
  '.github',
  'skills',
  'repair-scene-composition',
  'scripts',
  'green-chroma-key.mjs',
);

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
  await browser.close();
});

async function writePng(
  filePath: string,
  width: number,
  height: number,
  pixels: number[],
): Promise<void> {
  const page = await browser.newPage();
  try {
    const png = await page.evaluate(
      ({ imageHeight, imagePixels, imageWidth }) => {
        const canvas = document.createElement('canvas');
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context is unavailable.');
        const imageData = context.createImageData(imageWidth, imageHeight);
        imageData.data.set(imagePixels);
        context.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/png').split(',')[1];
      },
      {
        imageHeight: height,
        imagePixels: pixels,
        imageWidth: width,
      },
    );
    await writeFile(filePath, Buffer.from(png, 'base64'));
  } finally {
    await page.close();
  }
}

async function readPixels(filePath: string): Promise<number[]> {
  const page = await browser.newPage();
  try {
    const input = await readFile(filePath);
    return await page.evaluate(
      async (source) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Canvas 2D context is unavailable.');
        context.drawImage(image, 0, 0);
        return Array.from(
          context.getImageData(0, 0, canvas.width, canvas.height).data,
        );
      },
      `data:image/png;base64,${input.toString('base64')}`,
    );
  } finally {
    await page.close();
  }
}

function rgbaCanvas(
  width: number,
  height: number,
  color: [number, number, number, number],
): number[] {
  return Array.from({ length: width * height }, () => color).flat();
}

function setPixel(
  pixels: number[],
  width: number,
  x: number,
  y: number,
  color: [number, number, number, number],
): void {
  pixels.splice((y * width + x) * 4, 4, ...color);
}

function getPixel(
  pixels: number[],
  width: number,
  x: number,
  y: number,
): number[] {
  const offset = (y * width + x) * 4;
  return pixels.slice(offset, offset + 4);
}

function expectPixelNear(
  actual: number[],
  expected: [number, number, number, number],
): void {
  const colorTolerance = Math.ceil(255 / Math.max(1, expected[3]));
  for (let channel = 0; channel < 3; channel += 1) {
    expect(Math.abs(actual[channel] - expected[channel])).toBeLessThanOrEqual(
      colorTolerance,
    );
  }
  expect(Math.abs(actual[3] - expected[3])).toBeLessThanOrEqual(1);
}

function removeInternationalText(png: Buffer, keyword: string): Buffer {
  const chunks = [png.subarray(0, 8)];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    const end = offset + 12 + length;
    const keywordEnd = type === 'iTXt' ? data.indexOf(0) : -1;
    const chunkKeyword =
      keywordEnd >= 0 ? data.toString('latin1', 0, keywordEnd) : '';
    if (chunkKeyword !== keyword) chunks.push(png.subarray(offset, end));
    offset = end;
  }
  return Buffer.concat(chunks);
}

describe('soft green chroma-key conversion', () => {
  test('recovers partial alpha and foreground color from a known green matte', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-green-key-'),
    );
    try {
      const inputPath = path.join(fixtureRoot, 'green-source.png');
      const outputDirectory = path.join(fixtureRoot, 'output');
      const outputPath = path.join(outputDirectory, 'converted.png');
      const promptPath = path.join(fixtureRoot, 'green-source.prompt.txt');
      await mkdir(outputDirectory);
      const pixels = rgbaCanvas(5, 5, [24, 232, 32, 255]);
      setPixel(pixels, 5, 2, 2, [200, 50, 20, 255]);
      setPixel(pixels, 5, 1, 2, [112, 141, 26, 255]);
      setPixel(pixels, 5, 3, 2, [68, 187, 29, 255]);
      await writePng(inputPath, 5, 5, pixels);
      await writeFile(
        promptPath,
        'Synthetic near-green matte regression fixture.\n',
        'utf8',
      );

      await execFileAsync(process.execPath, [
        converterPath,
        'convert',
        inputPath,
        outputPath,
        '--prompt-file',
        promptPath,
      ]);

      const output = await readPixels(outputPath);
      expect(getPixel(output, 5, 0, 0)).toEqual([0, 0, 0, 0]);
      expect(getPixel(output, 5, 2, 2)).toEqual([200, 50, 20, 255]);
      expectPixelNear(getPixel(output, 5, 1, 2), [200, 50, 20, 128]);
      expectPixelNear(getPixel(output, 5, 3, 2), [200, 50, 20, 64]);

      const png = await readFile(outputPath);
      expect(png.includes(Buffer.from('soft-green-key-v1'))).toBe(true);
      expect(
        png.includes(Buffer.from('green-dominance-neighbor-matte-v1')),
      ).toBe(true);
      expect(png.includes(Buffer.from('known-green-unmix-v1'))).toBe(true);

      await expect(
        execFileAsync(process.execPath, [
          converterPath,
          'validate',
          outputDirectory,
        ]),
      ).resolves.toBeDefined();

      const invalidPath = path.join(outputDirectory, 'missing-matte.png');
      await writeFile(invalidPath, removeInternationalText(png, 'Alpha Matte'));
      let failure: { stderr?: string } | undefined;
      try {
        await execFileAsync(process.execPath, [
          converterPath,
          'validate',
          outputDirectory,
        ]);
      } catch (error) {
        failure = error as { stderr?: string };
      }
      expect(failure?.stderr).toContain(
        'missing Alpha Matte=green-dominance-neighbor-matte-v1',
      );

      await rm(invalidPath);
      const missingSourcePath = path.join(
        outputDirectory,
        'missing-alpha-source.png',
      );
      await writeFile(
        missingSourcePath,
        removeInternationalText(png, 'Alpha Source'),
      );
      failure = undefined;
      try {
        await execFileAsync(process.execPath, [
          converterPath,
          'validate',
          outputDirectory,
        ]);
      } catch (error) {
        failure = error as { stderr?: string };
      }
      expect(failure?.stderr).toContain(
        'missing or unsupported Alpha Source=undefined',
      );
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  }, 30_000);

  test('requires embedded generation provenance for every raster', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-provenance-'),
    );
    try {
      const imagePath = path.join(fixtureRoot, 'opaque-source.png');
      await writePng(imagePath, 2, 2, rgbaCanvas(2, 2, [120, 80, 40, 255]));

      let failure: { stderr?: string } | undefined;
      try {
        await execFileAsync(process.execPath, [
          converterPath,
          'validate',
          fixtureRoot,
        ]);
      } catch (error) {
        failure = error as { stderr?: string };
      }
      expect(failure?.stderr).toContain(
        'missing embedded Generation Prompt or Generation Source metadata',
      );

      await execFileAsync(process.execPath, [
        converterPath,
        'provenance',
        imagePath,
        '--source',
        'Synthetic opaque provenance fixture.',
      ]);
      await expect(
        execFileAsync(process.execPath, [
          converterPath,
          'validate',
          fixtureRoot,
        ]),
      ).resolves.toBeDefined();
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  }, 30_000);

  test('adds a partial-alpha edge when the green source contour is binary', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-green-key-binary-'),
    );
    try {
      const sourceRoot = path.join(fixtureRoot, 'green-masters');
      const outputRoot = path.join(fixtureRoot, 'converted');
      const inputDirectory = path.join(sourceRoot, 'characters');
      const inputPath = path.join(inputDirectory, 'binary-source.png');
      const outputPath = path.join(
        outputRoot,
        'characters',
        'binary-source.png',
      );
      await mkdir(inputDirectory, { recursive: true });
      const pixels = rgbaCanvas(7, 7, [24, 232, 32, 255]);
      for (let y = 2; y <= 4; y += 1) {
        for (let x = 2; x <= 4; x += 1) {
          setPixel(pixels, 7, x, y, [180, 40, 30, 255]);
        }
      }
      await writePng(inputPath, 7, 7, pixels);
      await writeFile(
        path.join(inputDirectory, 'binary-source.prompt.txt'),
        'Synthetic binary green-matte regression fixture.\n',
        'utf8',
      );

      await execFileAsync(process.execPath, [
        converterPath,
        'convert-tree',
        sourceRoot,
        outputRoot,
      ]);

      const output = await readPixels(outputPath);
      const edge = getPixel(output, 7, 1, 3);
      expect(edge[3]).toBeGreaterThan(0);
      expect(edge[3]).toBeLessThan(255);
      expectPixelNear(edge, [180, 40, 30, edge[3]]);
      expect(getPixel(output, 7, 3, 3)).toEqual([180, 40, 30, 255]);
      expect(getPixel(output, 7, 0, 0)).toEqual([0, 0, 0, 0]);
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  }, 30_000);
});
