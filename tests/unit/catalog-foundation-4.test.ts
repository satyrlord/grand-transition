import { describe, test } from 'vitest';
import {
  catalogFoundationCaseTimeoutMs,
  catalogFoundationShard,
  runCatalogFoundationCharacter,
} from './helpers/catalog-foundation-workload.ts';

describe('Milestone 026 deterministic catalog foundation workload, shard 4 of 5', () => {
  test.each(catalogFoundationShard(3))(
    '$characterId prepares and completes every opponent and scene setup',
    runCatalogFoundationCharacter,
    catalogFoundationCaseTimeoutMs,
  );
});
