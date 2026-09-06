import { expect, test } from 'vitest';
import { resolveCharacterAsset } from '../../src/app/character-assets';
import { createCharacterStatePackages } from '../../src/app/character-state-assets';
import { characterMotion } from '../../src/app/character-motion';

function fixture() {
  const selection = resolveCharacterAsset('red-folded-chairman');
  const assets = Object.keys(characterMotion).filter((id) => id !== 'selection').map((stateId) => {
    const id = selection.id + '--' + stateId;
    return {
      id, ownerId: selection.ownerId, skinId: selection.skinId, stateId,
      variants: [320, 640, 960].flatMap((width) => ['avif', 'webp'].map((format) => ({
        path: 'states/variants/' + id + '-' + width + 'x' + width + '.' + format,
        width, height: width, format,
      }))),
    };
  });
  const urls = Object.fromEntries(assets.flatMap((asset) => asset.variants.map((variant) =>
    ['../assets/characters/' + variant.path, '/grand-transition/assets/' + variant.path])));
  return {
    selection, urls,
    manifest: {
      schemaVersion: 1, assets,
      packages: [{
        ownerId: selection.ownerId, skinId: selection.skinId,
        states: Object.entries(characterMotion).map(([stateId, motion]) => ({
          stateId, ...motion,
          assetId: stateId === 'selection' ? selection.id : selection.id + '--' + stateId,
        })),
      }],
    },
  };
}

test('resolves nine immutable frames and reuses the selection sources', () => {
  const { manifest, selection, urls } = fixture();
  const packages = createCharacterStatePackages(manifest, [selection], urls);
  expect(Object.isFrozen(packages)).toBe(true);
  expect(Object.isFrozen(packages[0])).toBe(true);
  expect(packages[0]!.frames).toHaveLength(9);
  for (const frame of packages[0]!.frames) {
    expect(Object.isFrozen(frame)).toBe(true);
    if (frame.stateId === 'selection') {
      expect(frame.avif).toBe(selection.avif);
      expect(frame.webp).toBe(selection.webp);
    } else {
      expect(frame.avif.variants).toHaveLength(3);
      expect(frame.webp.variants).toHaveLength(3);
      expect(frame.url).toContain('960x960.webp');
      expect(frame.avif.srcSet).toMatch(/320w.*640w.*960w/u);
    }
  }
});

test('variant order cannot choose a smaller fallback image', () => {
  const { manifest, selection, urls } = fixture();
  for (const asset of manifest.assets) asset.variants.reverse();
  const frames = createCharacterStatePackages(manifest, [selection], urls)[0]!.frames;
  expect(frames.every((frame) => frame.url.includes('960x960'))).toBe(true);
});

test('rejects missing state mappings, sources, and selection instead of producing blank frames', () => {
  const first = fixture();
  first.manifest.packages[0]!.states.pop();
  expect(() => createCharacterStatePackages(first.manifest, [first.selection], first.urls)).toThrow(/nine states/u);
  const second = fixture();
  delete second.urls[Object.keys(second.urls)[0]!];
  expect(() => createCharacterStatePackages(second.manifest, [second.selection], second.urls)).toThrow(/missing state variant URL/u);
  const third = fixture();
  expect(() => createCharacterStatePackages(third.manifest, [], third.urls)).toThrow(/selection portrait is missing/u);
});

test('rejects duplicate packages and a state pointing at another owner', () => {
  const first = fixture();
  first.manifest.packages.push(first.manifest.packages[0]!);
  expect(() => createCharacterStatePackages(first.manifest, [first.selection], first.urls)).toThrow(/Duplicate character state package/u);
  const second = fixture();
  second.manifest.assets[0]!.ownerId = 'wrong-character';
  expect(() => createCharacterStatePackages(second.manifest, [second.selection], second.urls)).toThrow(/incorrect asset/u);
});
