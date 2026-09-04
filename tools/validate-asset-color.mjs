import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const supportedRasterExtensions = new Set([
  '.avif',
  '.jpeg',
  '.jpg',
  '.png',
  '.webp',
]);
const mimeTypes = {
  '.avif': 'image/avif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const policyPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'asset-color-policy.json',
);

async function listRasterFiles(rootPath) {
  const files = [];
  for (const entry of await readdir(rootPath, { withFileTypes: true })) {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRasterFiles(entryPath)));
      continue;
    }
    if (
      entry.isFile() &&
      supportedRasterExtensions.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push(entryPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

function formatMetric(value) {
  return value === null ? 'n/a' : value.toFixed(2);
}

async function inspectImage(page, filePath, policy) {
  const extension = path.extname(filePath).toLowerCase();
  const input = await readFile(filePath);
  const source = `data:${mimeTypes[extension]};base64,${input.toString('base64')}`;
  return page.evaluate(
    async ({ imageSource, imagePolicy }) => {
      const image = new Image();
      image.src = imageSource;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas 2D context is unavailable.');
      context.drawImage(image, 0, 0);

      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      const pixelCount = canvas.width * canvas.height;
      const step = Math.max(
        1,
        Math.ceil(Math.sqrt(pixelCount / imagePolicy.sampleLimit)),
      );
      const neutralBiases = [];
      const nearNeutralBiases = [];
      const coolDominances = [];
      let sampledPixels = 0;
      let opaqueSamples = 0;
      const medianInPage = (values) => {
        if (values.length === 0) return null;
        const sorted = [...values].sort((left, right) => left - right);
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? (sorted[middle - 1] + sorted[middle]) / 2
          : sorted[middle];
      };
      const srgbToLinear = (channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      const labB = (red, green, blue) => {
        const linearRed = srgbToLinear(red);
        const linearGreen = srgbToLinear(green);
        const linearBlue = srgbToLinear(blue);
        const y =
          linearRed * 0.2126729 +
          linearGreen * 0.7151522 +
          linearBlue * 0.072175;
        const z =
          (linearRed * 0.0193339 +
            linearGreen * 0.119192 +
            linearBlue * 0.9503041) /
          1.08883;
        const labPivot = (value) =>
          value > 0.008856
            ? Math.cbrt(value)
            : 7.787037 * value + 16 / 116;
        const fy = labPivot(y);
        const fz = labPivot(z);
        return 200 * (fy - fz);
      };

      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const offset = (y * canvas.width + x) * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const alpha = pixels[offset + 3];
          sampledPixels += 1;
          if (alpha < 128) continue;
          if (green >= 180 && red <= 80 && blue <= 80) continue;
          opaqueSamples += 1;

          const maximum = Math.max(red, green, blue);
          const minimum = Math.min(red, green, blue);
          const channelSpread = maximum - minimum;
          const redGreenSpread = Math.abs(red - green);
          const yellowBias = labB(red, green, blue);
          if (
            maximum >= imagePolicy.neutralMinimumChannel &&
            channelSpread <= imagePolicy.neutralMaxChannelSpread &&
            redGreenSpread <= imagePolicy.neutralMaxRedGreenSpread
          ) {
            neutralBiases.push(yellowBias);
          }
          const blueDominance = blue - Math.max(red, green);
          if (
            maximum >= imagePolicy.coolMinimumChannel &&
            blueDominance >= imagePolicy.coolBlueDominance
          ) {
            coolDominances.push(blueDominance);
          }
          if (
            maximum >= imagePolicy.neutralMinimumChannel &&
            channelSpread <= imagePolicy.nearNeutralMaxChannelSpread &&
            redGreenSpread <= imagePolicy.nearNeutralMaxRedGreenSpread
          ) {
            nearNeutralBiases.push(yellowBias);
          }
        }
      }

      const warmNeutralCount = neutralBiases.filter(
        (bias) => bias >= imagePolicy.yellowBiasThreshold,
      ).length;
      const warmNearNeutralCount = nearNeutralBiases.filter(
        (bias) => bias >= imagePolicy.yellowBiasThreshold,
      ).length;
      return {
        height: canvas.height,
        coolSamples: coolDominances.length,
        medianCoolBlueDominance: medianInPage(coolDominances),
        medianNeutralYellowBias: medianInPage(neutralBiases),
        medianNearNeutralYellowBias: medianInPage(nearNeutralBiases),
        nearNeutralSamples: nearNeutralBiases.length,
        neutralSamples: neutralBiases.length,
        opaqueSamples,
        sampledPixels,
        warmNearNeutralFraction:
          nearNeutralBiases.length === 0
            ? null
            : warmNearNeutralCount / nearNeutralBiases.length,
        warmNeutralFraction:
          neutralBiases.length === 0
            ? null
            : warmNeutralCount / neutralBiases.length,
        width: canvas.width,
      };
    },
    { imagePolicy: policy, imageSource: source },
  );
}

function validateMetrics(filePath, metrics, policy) {
  if (metrics.opaqueSamples < policy.minimumOpaqueSamples) {
    throw new Error(
      `${filePath}: color validation found only ${metrics.opaqueSamples} ` +
        `opaque samples; manual color review is required.`,
    );
  }
  if (
    metrics.neutralSamples < policy.minimumNeutralSamples &&
    metrics.coolSamples < policy.minimumCoolSamples
  ) {
    throw new Error(
      `${filePath}: color validation found only ${metrics.neutralSamples} ` +
        `neutral samples and ${metrics.coolSamples} cool samples; manual color ` +
        `review is required instead of passing an image without a neutral or ` +
        `cool anchor.`,
    );
  }

  const medianBias = metrics.medianNeutralYellowBias;
  const neutralFraction = metrics.warmNeutralFraction;
  const nearNeutralMedianBias = metrics.medianNearNeutralYellowBias;
  const nearNeutralFraction = metrics.warmNearNeutralFraction;
  const neutralMetricsIndicateWarmCast =
    metrics.neutralSamples >= policy.minimumNeutralSamples &&
    medianBias !== null && medianBias > policy.maximumMedianYellowBias;
  const neutralFractionIndicatesWarmCast =
    neutralFraction !== null &&
    neutralFraction > policy.maximumNeutralYellowFraction;
  const nearNeutralMetricsIndicateWarmCast =
    metrics.neutralSamples < policy.minimumNeutralSamples &&
    metrics.nearNeutralSamples >= policy.minimumNeutralSamples &&
    nearNeutralMedianBias !== null &&
    nearNeutralMedianBias > policy.maximumMedianYellowBias;
  const nearNeutralFractionIndicatesWarmCast =
    nearNeutralFraction !== null &&
    nearNeutralFraction > policy.maximumNeutralYellowFraction;

  if (
    (neutralMetricsIndicateWarmCast && neutralFractionIndicatesWarmCast) ||
    (nearNeutralMetricsIndicateWarmCast &&
      nearNeutralFractionIndicatesWarmCast)
  ) {
    throw new Error(
      `${filePath}: rejected global yellow color cast; ` +
        `median neutral yellow bias=${formatMetric(medianBias)}, ` +
        `median near-neutral yellow bias=${formatMetric(nearNeutralMedianBias)}, ` +
        `warm neutral fraction=${formatMetric(neutralFraction)}, ` +
        `warm near-neutral fraction=${formatMetric(nearNeutralFraction)}, ` +
        `Warm colors must remain local to authored materials and lighting.`,
    );
  }
}

async function validate(rootPath) {
  const policy = JSON.parse(await readFile(policyPath, 'utf8'));
  const files = await listRasterFiles(rootPath);
  if (files.length === 0) {
    process.stdout.write(`Asset color validation passed: ${rootPath} is empty.\n`);
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    for (const filePath of files) {
      let metrics;
      try {
        metrics = await inspectImage(page, filePath, policy);
      } catch (error) {
        const reason = error instanceof Error ? ` ${error.message}` : '';
        throw new Error(
          `${filePath}: could not decode the raster for color validation.${reason}`,
          { cause: error },
        );
      }
      validateMetrics(filePath, metrics, policy);
      process.stdout.write(
        `Color checked ${filePath}: ` +
          `${metrics.width}x${metrics.height}, ` +
          `neutral samples=${metrics.neutralSamples}, ` +
          `cool samples=${metrics.coolSamples}, ` +
          `median neutral yellow bias=${formatMetric(metrics.medianNeutralYellowBias)}, ` +
          `median near-neutral yellow bias=${formatMetric(metrics.medianNearNeutralYellowBias)}.\n`,
      );
    }
  } finally {
    await browser.close();
  }
  process.stdout.write(
    `Asset color validation passed: ${files.length} raster(s).\n`,
  );
}

const [command, rootArgument] = process.argv.slice(2);
if (command === 'validate' && (!rootArgument || process.argv.length === 4)) {
  validate(path.resolve(rootArgument ?? 'src/assets')).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
} else {
  process.stderr.write(
    'Usage: validate-asset-color.mjs validate [asset-root]\n',
  );
  process.exitCode = 2;
}
