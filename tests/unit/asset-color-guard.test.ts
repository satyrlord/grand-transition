import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { chromium, type Browser } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const validatorPath = path.resolve('tools', 'validate-asset-color.mjs');
const rasterStylePaths = [
  path.resolve('src', 'styles', 'match-screen.css'),
  path.resolve('src', 'styles', 'screen-shell.css'),
  path.resolve('src', 'styles', 'title-screen.css'),
];

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

function rgbaCanvas(
  width: number,
  height: number,
  color: [number, number, number, number],
): number[] {
  return Array.from({ length: width * height }, () => color).flat();
}

function fillRect(
  pixels: number[],
  width: number,
  left: number,
  top: number,
  rectWidth: number,
  rectHeight: number,
  color: [number, number, number, number],
): void {
  for (let y = top; y < top + rectHeight; y += 1) {
    for (let x = left; x < left + rectWidth; x += 1) {
      pixels.splice((y * width + x) * 4, 4, ...color);
    }
  }
}

async function runValidator(rootPath: string): Promise<{
  stderr: string;
  stdout: string;
}> {
  return execFileAsync(process.execPath, [validatorPath, 'validate', rootPath]);
}

describe('asset color guard', () => {
  test('keeps runtime raster art free of global color grading', async () => {
    const styles = await Promise.all(
      rasterStylePaths.map((stylePath) => readFile(stylePath, 'utf8')),
    );
    for (const style of styles) {
      expect(style).not.toMatch(/\bsepia\s*\(/iu);
      expect(style).not.toMatch(/\bhue-rotate\s*\(/iu);
      expect(style).not.toMatch(/\bmix-blend-mode\s*:/iu);
    }
  });

  test('accepts local warm accents when neutral and cool anchors remain', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-color-pass-'),
    );
    try {
      const pixels = rgbaCanvas(64, 64, [118, 120, 122, 255]);
      fillRect(pixels, 64, 0, 0, 16, 64, [190, 85, 30, 255]);
      fillRect(pixels, 64, 16, 0, 16, 64, [229, 214, 184, 255]);
      fillRect(pixels, 64, 32, 0, 16, 64, [20, 48, 85, 255]);
      await writePng(path.join(fixtureRoot, 'portrait.png'), 64, 64, pixels);

      await expect(runValidator(fixtureRoot)).resolves.toMatchObject({
        stdout: expect.stringContaining('Asset color validation passed: 1 raster(s).'),
      });
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  }, 30_000);

  test('rejects a broad yellow cast over neutral colors', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-color-yellow-'),
    );
    try {
      const pixels = rgbaCanvas(64, 64, [125, 114, 105, 255]);
      fillRect(pixels, 64, 0, 0, 32, 32, [155, 143, 132, 255]);
      await writePng(path.join(fixtureRoot, 'yellow-wash.png'), 64, 64, pixels);

      await expect(runValidator(fixtureRoot)).rejects.toMatchObject({
        stderr: expect.stringContaining('rejected global yellow color cast'),
      });
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  }, 30_000);

  test('rejects a broad near-neutral yellow cast despite a small cool anchor', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-color-near-neutral-'),
    );
    try {
      const pixels = rgbaCanvas(64, 64, [135, 115, 95, 255]);
      fillRect(pixels, 64, 0, 0, 8, 8, [20, 48, 85, 255]);
      await writePng(
        path.join(fixtureRoot, 'near-neutral-yellow-wash.png'),
        64,
        64,
        pixels,
      );

      await expect(runValidator(fixtureRoot)).rejects.toMatchObject({
        stderr: expect.stringContaining('rejected global yellow color cast'),
      });
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  }, 30_000);

  test('blocks an image that has no neutral anchor for manual review', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-color-review-'),
    );
    try {
      await writePng(
        path.join(fixtureRoot, 'warm-only.png'),
        64,
        64,
        rgbaCanvas(64, 64, [210, 140, 40, 255]),
      );

      await expect(runValidator(fixtureRoot)).rejects.toMatchObject({
        stderr: expect.stringContaining('manual color review is required'),
      });
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  }, 30_000);

  test('ignores transparent pixels and the temporary green matte', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-color-matte-'),
    );
    try {
      const pixels = rgbaCanvas(64, 64, [0, 255, 0, 255]);
      fillRect(pixels, 64, 8, 8, 48, 48, [118, 120, 122, 255]);
      fillRect(pixels, 64, 16, 16, 16, 16, [0, 0, 0, 0]);
      await writePng(path.join(fixtureRoot, 'green-source.png'), 64, 64, pixels);

      await expect(runValidator(fixtureRoot)).resolves.toMatchObject({
        stdout: expect.stringContaining('Asset color validation passed: 1 raster(s).'),
      });
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  }, 30_000);
});
