import { loadGameContent } from './load-game-content';
import { finalContentVolumeIssues } from './final-content-volumes';

const issues = finalContentVolumeIssues(loadGameContent().gameCatalog);
if (issues.length > 0) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Final content volumes passed.');
}
