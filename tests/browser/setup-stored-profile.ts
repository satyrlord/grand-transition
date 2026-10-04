import { beforeEach } from 'vitest';
import { currentPersistence } from '../../src/app/persistence-session.ts';
import { defaultSettings, encodeSettings } from '../../src/persistence/codecs/settings-codec.ts';
import { settingsStorageKey } from '../../src/persistence/settings.ts';
import { resetStoredData } from './persistence-test-helpers.ts';
import { storedProfileOf } from './stored-profile.ts';

// Each browser test starts with the stored data of its profile. The cleanup
// that a test file runs after each test continues to apply. A test that needs
// other stored data writes it after this hook has run.
beforeEach(async ({ task }) => {
  if (!task.file.filepath.includes('/tests/browser/')) return;
  await resetStoredData();
  if (storedProfileOf(task) === 'returning') {
    currentPersistence().documents.write(settingsStorageKey, encodeSettings(defaultSettings));
    await currentPersistence().settled();
  }
});
