import './styles/title-screen.css';
import './styles/screen-shell.css';
import './styles/match-screen.css';
import './styles/interruption-screen.css';

if (import.meta.env.DEV) {
  await import('./app/screens/click-audit');
  document.body.append(document.createElement('grand-transition-click-audit'));
}

await import('./app/app-shell');

if (import.meta.env.DEV) {
  await import('./app/screens/developer-controls');
  document.body.append(
    document.createElement('grand-transition-developer-controls'),
  );
}
