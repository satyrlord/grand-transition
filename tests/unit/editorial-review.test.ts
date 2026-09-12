import { describe, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createEditorialInventory,
  createPendingEditorialEvidence,
  discoverBuiltReviewAssets,
  discoverInterfaceProse,
  validateEditorialEvidence,
  type EditorialInventory,
} from '../../tools/editorial-review';
import { loadGameContent } from '../../tools/load-game-content';

const currentCatalog = loadGameContent().sampleContent;

function fixture() {
  const catalog = structuredClone(currentCatalog);
  catalog.characters = catalog.characters.slice(0, 2);
  catalog.scenes = catalog.scenes.slice(0, 1);
  catalog.phrases = [];
  catalog.locales[0]!.messages = {};
  for (const [index, character] of catalog.characters.entries()) {
    character.characterPhraseIds = [];
    for (let line = 0; line < 9; line += 1) {
      const id = `fixture-${index}-${line}`;
      const textKey = `phrase.${id}`;
      catalog.phrases.push({
        ...currentCatalog.phrases[0]!, id, textKey, numberForms: undefined,
        characterIds: [character.id], tags: line === 0 ? [] : ['family'],
      });
      character.characterPhraseIds.push(id);
      catalog.locales[0]!.messages[textKey] = `Fictional fixture ${index} line ${line}.`;
    }
    for (const key of Object.values(character.comebackLinesByTier).flat()) {
      catalog.locales[0]!.messages[key] = currentCatalog.locales[0]!.messages[key]!;
    }
  }
  return catalog;
}

function approved(inventory: EditorialInventory) {
  return {
    schemaVersion: 1, inventoryDigest: inventory.digest,
    reviews: inventory.records.map((record) => ({
      recordId: record.id, recordDigest: record.digest,
      reviewer: 'Fixture reviewer', date: '2026-09-12', severity: 'none',
      decision: 'approved', rationale: 'Synthetic evidence fixture only.',
      sourceOriginality: 'Original synthetic test record.',
      checks: record.kind === 'prose' ? {
        fictionalTarget: 'yes', characterOrSceneTone: 'yes', internationalComprehension: 'yes',
        neutralExemptionRationale: '',
      } : null,
    })),
  };
}

describe('editorial inventory and review evidence', () => {
  test('inventories message syntax, imports, fallback text, raw markup, CSS content, and unknown expressions', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'gt-editorial-interface-'));
    try {
      mkdirSync(path.join(directory, 'src/app/screens'), { recursive: true });
      mkdirSync(path.join(directory, 'src/styles'));
      mkdirSync(path.join(directory, 'src/assets/characters'), { recursive: true });
      writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ESNext', module: 'ESNext' }, include: ['src/**/*.ts'] }));
      writeFileSync(path.join(directory, 'src/settings.ts'), 'export const notice = "Storage is unavailable.";');
      writeFileSync(path.join(directory, 'index.html'), '<title>Title &amp; subtitle</title><meta name="description" content="A fictional game.">');
      writeFileSync(path.join(directory, 'src/styles/test.css'), 'p::before { content: "Read this"; } p::after { CONTENT: attr(data-note); }');
      const source = [
        'import { notice as importedNotice } from "../../settings";',
        'declare const msg: any, str: any, html: any, value: any, condition: boolean;',
        'msg("Simple label");',
        'msg(`Round ${value}`);',
        'msg(str`Player ${value}`);',
        'msg(condition ? "Active" : "Waiting");',
        'msg(importedNotice);',
        'msg(value);',
        'const view = html`<p aria-label="Score &amp; result">Visible &#x2192; ${value || "Empty sentence"}</p>${condition ? html`<i>Nested text</i>` : "No result"}`;',
        'const plain = ` times ${value}`;',
        'function titleCase(value: string) { if (value === \'securitate\') return msg(\'Former secret police\'); return value; }',
      ].join('\n');
      writeFileSync(path.join(directory, 'src/app/screens/setup-screen.ts'), source);
      writeFileSync(path.join(directory, 'src/assets/characters', `${currentCatalog.characters[0]!.id}--test-outfit.png`), 'fixture');
      const result = discoverInterfaceProse(directory, currentCatalog);
      expect(result.coverageGaps).toEqual([]);
      expect(result.records.filter((record) => record.content.form === 'message')).toHaveLength(7);
      const imported = result.records.find((record) => record.content.source === 'msg(importedNotice)')!;
      expect(imported.text).toBe('Storage is unavailable.');
      expect(imported.content.referencedSources.join(' ')).toContain('src/settings.ts');
      expect(result.records.find((record) => record.content.source === 'msg(condition ? "Active" : "Waiting")')!.text).toBe('Active / Waiting');
      expect(result.records.find((record) => record.content.source === 'msg(value)')!.content.expressions).toEqual(['value']);
      const html = result.records.find((record) => record.content.form === 'html' && record.text.includes('Score'))!;
      expect(html.text).toContain('Score & result');
      expect(html.text).toContain('Visible →');
      expect(html.content.staticText).toContain('Empty sentence');
      expect(html.content.staticText).toContain('No result');
      expect(result.records.some((record) => record.content.form === 'html' && record.text === '<i>Nested text</i>')).toBe(true);
      expect(result.records.some((record) => record.text.includes(' times {{value}}'))).toBe(true);
      expect(result.records.find((record) => record.content.form === 'css-content' && record.text === 'attr(data-note)')!.content.expressions).toEqual(['attr(data-note)']);
      expect(result.records.find((record) => record.content.form === 'skin-label:test-outfit')!.text).toBe('Test-Outfit Test-Outfit skin');
      expect(result.records.find((record) => record.content.form === 'catalog-label:securitate')!.text).toBe('Former secret police');
      const inventory = createEditorialInventory(fixture(), [], [], result.records);
      const evidence = approved(inventory);
      const functional = evidence.reviews.find((review) => review.recordId.startsWith('interface:'))!;
      functional.checks!.fictionalTarget = 'exempt';
      functional.checks!.characterOrSceneTone = 'exempt';
      expect(validateEditorialEvidence(inventory, evidence).passed).toBe(false);
      functional.checks!.neutralExemptionRationale = 'Functional interface text. Safety and comprehension were reviewed.';
      expect(validateEditorialEvidence(inventory, evidence).passed).toBe(true);
      functional.checks!.internationalComprehension = 'no';
      expect(validateEditorialEvidence(inventory, evidence).passed).toBe(false);
      functional.checks!.internationalComprehension = 'yes';
      writeFileSync(path.join(directory, 'src/settings.ts'), 'export const notice = "Changed storage notice.";');
      const changed = discoverInterfaceProse(directory, currentCatalog);
      expect(changed.records.find((record) => record.content.source === 'msg(importedNotice)')!.text).toBe('Changed storage notice.');
      expect(validateEditorialEvidence(createEditorialInventory(fixture(), [], [], changed.records), evidence).passed).toBe(false);
      writeFileSync(path.join(directory, 'index.html'), '<title>Unknown &madeup; entity</title>');
      expect(discoverInterfaceProse(directory).coverageGaps).toContain('index.html: Review unsupported HTML entity &madeup;.');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('discovers emitted dependencies and notices while omitting byte-identical source copies', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'gt-editorial-assets-'));
    try {
      mkdirSync(path.join(directory, 'assets'));
      writeFileSync(path.join(directory, 'assets', 'font.woff2'), 'font bytes');
      writeFileSync(path.join(directory, 'assets', 'runtime.wasm'), 'runtime bytes');
      writeFileSync(path.join(directory, 'NOTICE.txt'), 'license bytes');
      writeFileSync(path.join(directory, 'copied.png'), 'source bytes');
      const sourceHash = createHash('sha256').update('source bytes').digest('hex');
      const initial = discoverBuiltReviewAssets(directory, new Set([sourceHash]));
      expect(initial.map(({ id }) => id)).toEqual([
        'production/NOTICE.txt', 'production/assets/font.woff2', 'production/assets/runtime.wasm',
      ]);
      expect(discoverBuiltReviewAssets(directory, new Set([sourceHash]))).toEqual(initial);
      const inventory = createEditorialInventory(fixture(), initial);
      const evidence = approved(inventory);
      writeFileSync(path.join(directory, 'assets', 'font.woff2'), 'changed font bytes');
      const changed = createEditorialInventory(fixture(), discoverBuiltReviewAssets(directory, new Set([sourceHash])));
      expect(validateEditorialEvidence(changed, evidence).passed).toBe(false);
      writeFileSync(path.join(directory, 'assets', 'new-model.bin'), 'new shipped asset');
      expect(discoverBuiltReviewAssets(directory, new Set([sourceHash]))).toHaveLength(4);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('covers every loaded message, agreement form, title, definition, and supplied media record', () => {
    const inventory = createEditorialInventory(currentCatalog, [{
      id: 'portrait.png', content: { sha256: 'fixture-media-hash', source: 'Original fixture.' },
    }]);
    for (const locale of currentCatalog.locales) {
      for (const key of Object.keys(locale.messages)) {
        expect(inventory.records.some((record) => record.id === `prose:${locale.locale}:${key}`)).toBe(true);
      }
    }
    expect(inventory.records.some((record) => record.id === 'prose:en:title.name')).toBe(true);
    expect(inventory.records.filter((record) => record.kind === 'definition')).toHaveLength(
      currentCatalog.phrases.length + currentCatalog.characters.length + currentCatalog.scenes.length,
    );
    expect(inventory.records.some((record) => record.id === 'media:portrait.png')).toBe(true);
  });

  test('invalidates evidence after visible text, scoring tags, media bytes, or manifest metadata changes', () => {
    const catalog = fixture();
    const first = createEditorialInventory(catalog, [{ id: 'asset', content: { sha256: 'old', license: 'original' } }]);
    expect(createEditorialInventory(catalog, [{ id: 'asset', content: { license: 'original', sha256: 'old' } }])).toEqual(first);
    const evidence = approved(first);
    expect(validateEditorialEvidence(first, evidence).passed).toBe(true);
    for (const content of [{ sha256: 'new', license: 'original' }, { sha256: 'old', license: 'changed' }]) {
      expect(validateEditorialEvidence(createEditorialInventory(catalog, [{ id: 'asset', content }]), evidence).passed).toBe(false);
    }
    const phrase = catalog.phrases[0]!;
    catalog.locales[0]!.messages[phrase.textKey] = 'Changed visible phrase.';
    expect(validateEditorialEvidence(createEditorialInventory(catalog), evidence).passed).toBe(false);
    const beforeTagChange = createEditorialInventory(catalog);
    phrase.tags = ['family'];
    const afterTagChange = createEditorialInventory(catalog);
    expect(afterTagChange.records.find((record) => record.id === `prose:en:${phrase.textKey}`)?.digest)
      .not.toBe(beforeTagChange.records.find((record) => record.id === `prose:en:${phrase.textKey}`)?.digest);
  });

  test('pending evidence never creates approvals and declared coverage gaps block completion', () => {
    const inventory = createEditorialInventory(fixture());
    const pending = createPendingEditorialEvidence(inventory);
    expect(pending.reviews.every((review) => review.reviewer === null && review.date === null && review.decision === 'needs-review')).toBe(true);
    expect(validateEditorialEvidence(inventory, pending).passed).toBe(false);
    const incomplete = createEditorialInventory(fixture(), [], ['Review interface prose.']);
    expect(validateEditorialEvidence(incomplete, approved(incomplete))).toEqual({ passed: false, issues: ['Review interface prose.'] });
  });

  test('requires exact complete coverage and rejects duplicate, unknown, or stale records', () => {
    const inventory = createEditorialInventory(fixture());
    for (const mutate of [
      (value: ReturnType<typeof approved>) => value.reviews.pop(),
      (value: ReturnType<typeof approved>) => value.reviews.push(value.reviews[0]!),
      (value: ReturnType<typeof approved>) => { value.reviews[0]!.recordId = 'unknown'; },
      (value: ReturnType<typeof approved>) => { value.reviews[0]!.recordDigest = '0'.repeat(64); },
    ]) {
      const evidence = approved(inventory);
      mutate(evidence);
      expect(validateEditorialEvidence(inventory, evidence).passed).toBe(false);
    }
  });

  test.each(['2026-02-29', '2026-13-01', '2026-04-31', 'yesterday'])('rejects an invalid calendar date %s', (date) => {
    const inventory = createEditorialInventory(fixture());
    const evidence = approved(inventory);
    evidence.reviews[0]!.date = date;
    expect(validateEditorialEvidence(inventory, evidence).passed).toBe(false);
  });

  test.each(['major', 'blocker'])('blocks approved %s severity', (severity) => {
    const inventory = createEditorialInventory(fixture());
    const evidence = approved(inventory);
    evidence.reviews[0]!.severity = severity;
    expect(validateEditorialEvidence(inventory, evidence).passed).toBe(false);
  });

  test('permits only explicitly justified neutral exemptions and never exempts comprehension', () => {
    const inventory = createEditorialInventory(fixture());
    const evidence = approved(inventory);
    const neutral = inventory.records.find((record) => record.neutralExemptionEligible)!;
    const review = evidence.reviews.find((review) => review.recordId === neutral.id)!;
    review.checks!.fictionalTarget = 'exempt';
    review.checks!.characterOrSceneTone = 'exempt';
    expect(validateEditorialEvidence(inventory, evidence).passed).toBe(false);
    review.checks!.neutralExemptionRationale = 'This is a short neutral grammatical fragment.';
    expect(validateEditorialEvidence(inventory, evidence).passed).toBe(true);
    review.checks!.internationalComprehension = 'no';
    expect(validateEditorialEvidence(inventory, evidence).passed).toBe(false);
    review.checks!.internationalComprehension = 'yes';
    const tagged = inventory.records.find((record) => record.kind === 'prose' && !record.neutralExemptionEligible)!;
    evidence.reviews.find((review) => review.recordId === tagged.id)!.checks = review.checks;
    expect(validateEditorialEvidence(inventory, evidence).passed).toBe(false);
  });
});
