/// <reference types="vite/client" />

declare module 'virtual:character-portrait-fallbacks' {
  const portraitUrls: Readonly<Record<string, string>>;
  export default portraitUrls;
}
