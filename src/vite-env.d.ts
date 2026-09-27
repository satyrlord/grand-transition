/// <reference types="vite/client" />

/** The build-time game version, for example `v1.177`. */
declare const __GAME_VERSION__: string;

declare module 'virtual:character-portrait-fallbacks' {
  const portraitUrls: Readonly<Record<string, string>>;
  export default portraitUrls;
}
