import { test as base } from '@playwright/test';
import { useReturningPlayerSettings } from './stored-data.ts';

export { expect } from '@playwright/test';

/**
 * The stored data that a test starts with. `returning` has default settings,
 * so the Milestone 020 rehearsal match does not start. A test of first-run
 * behavior selects `first-run` with `test.use()`.
 */
export type StoredProfile = 'returning' | 'first-run';

export const test = base.extend<{ storedProfile: StoredProfile }>({
  storedProfile: ['returning', { option: true }],
  page: async ({ page, storedProfile }, use) => {
    if (storedProfile === 'returning') await useReturningPlayerSettings(page);
    await use(page);
  },
});
