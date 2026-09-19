import { readFile, readdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../src/assets/sidekicks/', import.meta.url);
const layoutPath = new URL('layout.json', root);
const command = process.argv[2] ?? 'validate';
if (command !== 'build' && command !== 'validate') {
  throw new Error('Use "build" or "validate" for sidekick alpha bounds.');
}

const layout = {};
for (const filename of (await readdir(root)).filter((name) => name.endsWith('.png')).sort()) {
  const { data, info } = await sharp(await readFile(new URL(filename, root)))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let bottom = info.height;
  while (bottom > 0 && !data.subarray((bottom - 1) * info.width * 4, bottom * info.width * 4)
    .some((value, index) => index % 4 === 3 && value > 0)) bottom -= 1;
  layout[filename] = { height: info.height, bottom };
}
const serialized = `${JSON.stringify(layout, null, 2)}\n`;
if (command === 'build') {
  await writeFile(layoutPath, serialized);
} else if (JSON.stringify(JSON.parse(await readFile(layoutPath, 'utf8'))) !== JSON.stringify(layout)) {
  throw new Error('Sidekick alpha bounds are stale. Run node tools/sidekick-assets.mjs build.');
}
console.log(`Sidekick alpha bounds ${command}: ${Object.keys(layout).length} assets.`);
