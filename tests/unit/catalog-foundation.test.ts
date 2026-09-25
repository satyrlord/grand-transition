import { describe, expect, test } from 'vitest';
import {
  catalogFoundationCaseTimeoutMs,
  catalogFoundationCounts,
  catalogFoundationShard,
  runCatalogFoundationCharacter,
} from './helpers/catalog-foundation-workload.ts';

// The catalog workload is split into five sibling files so that no single file
// bounds the unit phase. See the shared helper for why the cases are not run
// concurrently inside one file.
describe('Milestone 026 deterministic catalog foundation workload, shard 1 of 5', () => {
  test('covers all 2,527 ordered character and scene setups, including mirrors', () => {
    expect(catalogFoundationCounts.characters).toBe(19);
    expect(catalogFoundationCounts.scenes).toBe(7);
    expect(catalogFoundationCounts.setups).toBe(2_527);
  });

  test.each(catalogFoundationShard(0))(
    '$characterId prepares and completes every opponent and scene setup',
    runCatalogFoundationCharacter,
    catalogFoundationCaseTimeoutMs,
  );
});
