import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Conservative authoring reserve for a square master at any source resolution.
// Per-pose framing can keep more outer artwork visible. Retain this inner-side reserve
// for new signature props and gestures, and verify their actual production composition separately.
// The desktop portrait plane retains its authored size and desk alignment.
// The source art faces right. The inner side is the right side of the master, for both players.
export const RUNTIME_WINDOW = Object.freeze({ innerXMinPercent: 34, yMaxPercent: 46 });

export interface RuntimeWindowReport {
  visibleSilhouettePercent: number;
  hiddenOuterPercent: number;
  hiddenLowerPercent: number;
}

export async function analyzeRuntimeWindow(bytes: Buffer): Promise<RuntimeWindowReport> {
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const xLimit = (info.width * RUNTIME_WINDOW.innerXMinPercent) / 100;
  const yLimit = (info.height * RUNTIME_WINDOW.yMaxPercent) / 100;
  let total = 0;
  let visible = 0;
  let outer = 0;
  let lower = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) < 128) continue;
      total++;
      const isOuter = x < xLimit;
      const isLower = y > yLimit;
      if (isOuter) outer++;
      if (isLower) lower++;
      if (!isOuter && !isLower) visible++;
    }
  }
  const percent = (value: number) => Math.round((value / Math.max(total, 1)) * 10_000) / 100;
  return {
    visibleSilhouettePercent: percent(visible),
    hiddenOuterPercent: percent(outer),
    hiddenLowerPercent: percent(lower),
  };
}

export async function renderRuntimeWindowOverlay(bytes: Buffer): Promise<Buffer> {
  const { width, height } = await sharp(bytes).metadata();
  if (!width || !height) throw new Error('The image has no dimensions.');
  const x = Math.round((width * RUNTIME_WINDOW.innerXMinPercent) / 100);
  const y = Math.round((height * RUNTIME_WINDOW.yMaxPercent) / 100);
  const shade = 'fill="rgb(20,20,60)" fill-opacity="0.55"';
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<rect x="0" y="0" width="${x}" height="${height}" ${shade}/>` +
      `<rect x="${x}" y="${y}" width="${width - x}" height="${height - y}" ${shade}/>` +
      `<rect x="${x}" y="0" width="${width - x}" height="${y}" fill="none" stroke="rgb(220,30,30)" stroke-width="6"/>` +
      `</svg>`,
  );
  const flat = await sharp({
    create: { width, height, channels: 3, background: { r: 235, g: 235, b: 235 } },
  })
    .composite([{ input: bytes }, { input: overlay }])
    .png()
    .toBuffer();
  return sharp(flat).resize({ width: 1024 }).png().toBuffer();
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || process.argv.length !== 4) {
    process.stderr.write('Usage: character-runtime-window.ts <master.png> <overlay-out.png>\n');
    process.exitCode = 2;
  } else {
    readFile(input)
      .then(async (bytes) => {
        const report = await analyzeRuntimeWindow(bytes);
        await sharp(await renderRuntimeWindowOverlay(bytes)).toFile(output);
        console.log(JSON.stringify({ window: RUNTIME_WINDOW, ...report, overlay: output }));
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      });
  }
}
