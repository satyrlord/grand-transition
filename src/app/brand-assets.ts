import manifest from '../assets/brand/brand-manifest.json' with { type: 'json' };

const urls = import.meta.glob('../assets/brand/*.{png,avif,webp}', {
  eager: true, import: 'default', query: '?url&no-inline',
}) as Record<string, string>;

export function resolveBrandAsset(id: string) {
  const asset = manifest.assets.find((entry) => entry.id === id);
  if (!asset) throw new Error('Missing brand asset: ' + id);
  const url = (file: string) => {
    const result = urls['../assets/brand/' + file];
    if (!result) throw new Error('Missing brand variant: ' + file);
    return result;
  };
  const variant = (format: string) => {
    const result = asset.variants.find((entry) => entry.format === format);
    if (!result) throw new Error('Missing brand format: ' + id + ' ' + format);
    return url(result.path);
  };
  return Object.freeze({
    id, width: asset.variants[0]!.width, height: asset.variants[0]!.height,
    avif: variant('avif'), webp: variant('webp'), png: url(asset.source.path),
  });
}

export function brandImageSet(asset: ReturnType<typeof resolveBrandAsset>): string {
  return `image-set(url("${asset.avif}") type("image/avif"), url("${asset.webp}") type("image/webp"), url("${asset.png}") type("image/png"))`;
}
