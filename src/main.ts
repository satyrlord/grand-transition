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
  document.body.insertBefore(
    document.createComment(`
      THESIS: Local match truth becomes an inspectable civic register and refuses a generic debug dashboard.
      OWN-WORLD: Deep municipal blue, warm ledger fields, oxblood stamps, exact rules, and square semantic controls.
      STORY: A developer sets match facts, inspects phrase utility, runs a complete simulation, and validates replay evidence.
      FIRST VIEWPORT: The title record remains intact; the inspection ledger follows with setup facts and three primary actions before replay detail.
      FORM: Operate-mode extension of the Open Civic Ledger; narrow approved surface with no concept roll.
      FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
    `),
    document.body.firstChild,
  );
  await import('./app/screens/developer-controls');
  document.body.append(
    document.createElement('grand-transition-developer-controls'),
  );
}
