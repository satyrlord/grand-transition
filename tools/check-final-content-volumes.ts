import { loadGameContent, loadQuoteReveals } from './load-game-content.ts';
import { finalContentVolumeIssues } from './final-content-volumes.ts';

const issues = finalContentVolumeIssues(loadGameContent().gameCatalog);
// The production bundle skips this shape check, as it does for the phrase catalog.
loadQuoteReveals();
if (issues.length > 0) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Final content volumes passed.');
}
