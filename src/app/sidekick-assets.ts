import sidekickLayout from '../assets/sidekicks/layout.json';

const sidekickUrls = import.meta.glob('../assets/sidekicks/*.png', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
}) as Record<string, string>;

const sidekickByCharacterId = new Map(
  Object.entries(sidekickUrls).map(([assetPath, url]) => {
    const characterId = assetPath.match(/\/([^/]+)\.png$/u)?.[1];
    if (!characterId) {
      throw new Error(`Comeback sidekick path "${assetPath}" is invalid.`);
    }
    return [characterId, url] as const;
  }),
);

export const comebackSidekickIds = Object.freeze([...sidekickByCharacterId.keys()].toSorted());

export function resolveComebackSidekick(characterId: string): string | null {
  return sidekickByCharacterId.get(characterId) ?? null;
}

export function comebackSidekickBottomInset(characterId: string): number {
  const layout = (sidekickLayout as Record<string, { height: number; bottom: number }>)[
    `${characterId}.png`
  ];
  return layout ? (layout.height - layout.bottom) / layout.height : 0;
}
