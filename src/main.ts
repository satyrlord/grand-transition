import './styles/fonts.css';
import './styles/title-screen.css';
import './styles/screen-shell.css';
import './styles/match-screen.css';
import './styles/interruption-screen.css';
import './styles/mobile-layout.css';
// Configure interface localization before either dynamic import constructs
// application schemas or renders interface messages.
import './app/interface-localization.ts';
import { z } from 'zod';

// Configure before either dynamic import constructs application schemas.
z.config({ jitless: true });

if (import.meta.env.DEV) {
  await import('./app/development-game-logger.ts');
}

// Open durable storage before the application shell constructs its repositories.
await (await import('./app/persistence-session.ts')).openPersistenceSession();

await import('./app/app-shell.ts');
