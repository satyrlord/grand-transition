import './styles/fonts.css';
import './styles/title-screen.css';
import './styles/screen-shell.css';
import './styles/match-screen.css';
import './styles/interruption-screen.css';
import { z } from 'zod';

// Configure before either dynamic import constructs application schemas.
z.config({ jitless: true });

if (import.meta.env.DEV) {
  await import('./app/development-game-logger');
}

await import('./app/app-shell');
