import './styles/title-screen.css';
import './styles/screen-shell.css';
import './styles/match-screen.css';
import './styles/interruption-screen.css';

if (import.meta.env.DEV) {
  await import('./app/development-game-logger');
}

await import('./app/app-shell');
