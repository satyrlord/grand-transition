import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { encodeSceneVariant } from '../../tools/build-scene-assets.ts';

const id = 'influencer-campaign-livestream-foreground';
const target = { width: 640, height: 360 };

async function fixture(width: number, gap: number, intrusionAlpha = 0) {
  const height = (width * 9) / 16;
  const pixels = Buffer.alloc(width * height * 4);
  const safeLeft = Math.ceil(width * 0.32 - 0.5);
  for (let y = Math.floor(height * 0.5); y < height - 10; y += 1) {
    for (let x = 100; x < safeLeft - gap; x += 1) {
      const offset = (y * width + x) * 4;
      pixels[offset] = 120;
      pixels[offset + 1] = 52;
      pixels[offset + 2] = 28;
      pixels[offset + 3] = 255;
    }
    for (let x = Math.floor(width * 0.76); x < Math.ceil(width * 0.85); x += 1) {
      const offset = (y * width + x) * 4;
      pixels[offset] = 120;
      pixels[offset + 1] = 52;
      pixels[offset + 2] = 28;
      pixels[offset + 3] = 255;
    }
  }
  pixels[(Math.floor(height * 0.5) * width + safeLeft) * 4 + 3] = intrusionAlpha;
  return sharp(pixels, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

async function centralMaximum(input: Buffer) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let maximum = 0;
  for (
    let y = Math.ceil(info.height * 0.18 - 0.5);
    y < Math.ceil(info.height * 0.94 - 0.5);
    y += 1
  ) {
    for (
      let x = Math.ceil(info.width * 0.32 - 0.5);
      x < Math.ceil(info.width * 0.68 - 0.5);
      x += 1
    ) {
      maximum = Math.max(maximum, data[(y * info.width + x) * 4 + 3]);
    }
  }
  return maximum;
}

describe('scene foreground encoding', () => {
  test.each(['avif', 'webp'] as const)(
    'keeps an empty center transparent after Lanczos and %s encoding',
    async (format) => {
      const source = await fixture(1680, 4);
      expect(await centralMaximum(source)).toBe(0);
      const resized = await sharp(source)
        .resize(640, 360, { kernel: sharp.kernel.lanczos3 })
        .png()
        .toBuffer();
      const residue = await centralMaximum(resized);
      expect(residue).toBeGreaterThan(0);
      expect(residue).toBeLessThanOrEqual(8);
      const encoded = await encodeSceneVariant(source, target, format, id);
      expect(await centralMaximum(encoded.output)).toBe(0);
      const { data } = await sharp(encoded.output)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(data[(250 * 640 + 150) * 4 + 3]).toBeGreaterThanOrEqual(250);
    },
  );

  test('rejects a meaningful resize intrusion instead of erasing it', async () => {
    const source = await fixture(1280, 0);
    expect(await centralMaximum(source)).toBe(0);
    const resized = await sharp(source)
      .resize(640, 360, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();
    expect(await centralMaximum(resized)).toBeGreaterThan(8);
    await expect(encodeSceneVariant(source, target, 'webp', id)).rejects.toThrow(
      'Increase source clearance',
    );
  });

  test.each([1, 128])(
    'rejects alpha %s in the source safe region even below the resize cleanup threshold',
    async (alpha) => {
      await expect(
        encodeSceneVariant(await fixture(1680, 4, alpha), target, 'avif', id),
      ).rejects.toThrow('source central interaction rectangle');
    },
  );
});
