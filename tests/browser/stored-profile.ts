import type { RunnerTask } from 'vitest';

/**
 * The stored data that a browser test starts with. `returning` has the default
 * settings document and no match history, so the Milestone 020 rehearsal match
 * does not start. `first-run` has no stored settings and no match history.
 */
export type StoredProfile = 'returning' | 'first-run';

declare module 'vitest' {
  interface TaskMeta {
    storedProfile?: StoredProfile;
  }
}

/**
 * Test options that select the `first-run` profile. Pass them as the second
 * argument of `test()` or `describe()`.
 */
export const firstRun = { meta: { storedProfile: 'first-run' } } as const;

/** The profile of the closest test or suite that declares one. */
export function storedProfileOf(task: RunnerTask): StoredProfile {
  for (let current: RunnerTask | undefined = task; current; current = current.suite) {
    if (current.meta.storedProfile) return current.meta.storedProfile;
  }
  return 'returning';
}
