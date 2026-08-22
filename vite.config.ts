import { defineConfig } from 'vite';

export const productionContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

export default defineConfig(({ command }) => ({
  base: '/grand-transition/',
  plugins:
    command === 'build'
      ? [
          {
            name: 'production-content-security-policy',
            transformIndexHtml: {
              order: 'pre',
              handler: () => [
                {
                  tag: 'meta',
                  attrs: {
                    'http-equiv': 'Content-Security-Policy',
                    content: productionContentSecurityPolicy,
                  },
                  injectTo: 'head',
                },
              ],
            },
          },
        ]
      : [],
}));
