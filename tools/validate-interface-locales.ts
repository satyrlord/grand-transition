// Localization validation for the Lit interface catalogs.
//
// `lit-localize extract` proves that every msg()/str call site is extractable,
// and `lit-localize build` generates the target-locale templates. This check
// proves that the checked-in catalog and the generated templates agree, that
// every message is translated, and that Romanian text is complete, correctly
// referenced, safe, and written with standard diacritics.
//
// Usage: node_modules/.bin/tsx tools/validate-interface-locales.ts

import { mkdtemp, readFile, rmdir, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { styleText } from 'node:util';
import { templates } from '../src/localization/generated/ro-RO';
import { RuntimeLitLocalizer } from '@lit/localize-tools/lib/modes/runtime.js';
import type { Config } from '@lit/localize-tools/lib/types/config.js';
import type { ProgramMessage } from '@lit/localize-tools/lib/messages.js';

export const xliffPath = 'xliff/ro-RO.xlf';
export const targetLocale = 'ro-RO';
const generatedPath = `src/localization/generated/${targetLocale}.ts`;

const unsafePatterns: readonly RegExp[] = [
  /<[A-Za-z/!]/u,
  /javascript:/iu,
  /\bon[a-z]+\s*=/iu,
];

const legacyDiacritics = /[\u015e\u015f\u0162\u0163]/u;
const latinLetter = /\p{Script=Latin}/gu;
const romanianLetters =
  /[A-Za-z\u0102\u0103\u00c2\u00e2\u00ce\u00ee\u0218\u0219\u021a\u021b]/u;
const placeholderTag = /<x id="(\d+)" equiv-text="([^"]*)"\/>/gu;

export type InterfaceLocaleFailure = Readonly<{
  path: string;
  code: string;
  message: string;
}>;

export type InterfaceCatalogUnit = Readonly<{
  id: string;
  source: string;
  target: string | null;
}>;

export function parseXliff(xliffText: string): readonly InterfaceCatalogUnit[] {
  const units: InterfaceCatalogUnit[] = [];
  const pattern =
    /<trans-unit id="([^"]+)">\n  <source>([\s\S]*?)<\/source>\n(?:  <target>([\s\S]*?)<\/target>\n)?<\/trans-unit>/gu;
  for (const match of xliffText.matchAll(pattern)) {
    units.push({
      id: match[1] as string,
      source: match[2] as string,
      target: (match[3] as string | undefined) ?? null,
    });
  }
  return Object.freeze(units);
}

export function placeholderIds(xml: string): readonly string[] {
  return Object.freeze(
    [...xml.matchAll(placeholderTag)].map((match) => match[1] as string),
  );
}

// Message text without the XLIFF placeholder markup that carries the source
// expression references.
export function plainMessageText(xml: string): string {
  return xml.replace(placeholderTag, '').replaceAll(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/giu,
    (entity, code: string) => {
      const named: Record<string, string> = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
      };
      if (named[code]) return named[code];
      const point = code.toLowerCase().startsWith('#x')
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff &&
        !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point)
        : entity;
    },
  );
}

export function validateMessageText(
  value: string,
  locale: string,
  path_: string,
): InterfaceLocaleFailure[] {
  const failures: InterfaceLocaleFailure[] = [];
  const fail = (code: string, message: string) => {
    failures.push({ path: path_, code, message });
  };

  if (value.trim().length === 0) {
    fail('incomplete-translation', 'Message text is empty.');
    return failures;
  }
  if (value !== value.normalize('NFC')) {
    fail('not-normalized', 'Message text is not Unicode NFC.');
  }
  if (legacyDiacritics.test(value)) {
    fail('legacy-diacritic', 'Message text uses legacy cedilla diacritics.');
  }
  for (const match of value.matchAll(latinLetter)) {
    const letter = match[0];
    if (letter.toUpperCase() === letter.toLowerCase()) continue;
    if (romanianLetters.test(letter)) continue;
    if (locale === 'en') continue;
    fail(
      'non-standard-letter',
      `Message text uses a non-Romanian diacritic: ${JSON.stringify(letter)}.`,
    );
  }
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) fail('unsafe-text', `Message text matches ${pattern}.`);
  }
  return failures;
}

export function validateCatalog(
  units: readonly InterfaceCatalogUnit[],
  generatedTemplateIds: readonly string[],
): InterfaceLocaleFailure[] {
  const failures: InterfaceLocaleFailure[] = [];
  const seen = new Set<string>();
  const generated = new Set(generatedTemplateIds);

  for (const unit of units) {
    const path_ = `${xliffPath}[${unit.id}]`;
    if (seen.has(unit.id)) {
      failures.push({
        path: path_,
        code: 'duplicate-message',
        message: 'Catalog declares the same message id more than once.',
      });
      continue;
    }
    seen.add(unit.id);

    if (unit.target === null) {
      failures.push({
        path: path_,
        code: 'missing-translation',
        message: `No ${targetLocale} translation. Source: ${unit.source}`,
      });
    } else {
      failures.push(...validateMessageText(plainMessageText(unit.target), targetLocale, path_));
      const sourceIds = placeholderIds(unit.source);
      const targetIds = placeholderIds(unit.target);
      const sourceReferences = [...unit.source.matchAll(placeholderTag)].map((match) => match[2]);
      const targetReferences = [...unit.target.matchAll(placeholderTag)].map((match) => match[2]);
      if (sourceIds.join(',') !== targetIds.join(',') ||
        sourceReferences.join('\0') !== targetReferences.join('\0')) {
        failures.push({
          path: path_,
          code: 'placeholder-mismatch',
          message: `Expected placeholders [${sourceIds.join(', ')}] with their source references.`,
        });
      }
    }

    if (!generated.has(unit.id)) {
      failures.push({
        path: `src/localization/generated/${targetLocale}.ts[${unit.id}]`,
        code: 'missing-generated-template',
        message: 'The generated locale module has no template for this message.',
      });
    }
  }

  for (const id of generated) {
    if (seen.has(id)) continue;
    failures.push({
      path: `src/localization/generated/${targetLocale}.ts[${id}]`,
      code: 'unused-generated-template',
      message: 'The generated locale module has a template with no catalog unit.',
    });
  }

  return failures;
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\n', '&#10;');
}

function sourceXml(message: Pick<ProgramMessage, 'contents'>): string {
  return message.contents.map((part) => typeof part === 'string'
    ? escapeXml(part)
    : `<x id="${part.index}" equiv-text="${escapeXml(part.untranslatable)}"/>`).join('');
}

export function validateSourceCatalog(
  units: readonly InterfaceCatalogUnit[],
  sourceMessages: readonly Pick<ProgramMessage, 'name' | 'contents'>[],
): InterfaceLocaleFailure[] {
  const failures: InterfaceLocaleFailure[] = [];
  const catalog = new Map(units.map((unit) => [unit.id, unit]));
  const sourceIds = new Set<string>();
  for (const message of sourceMessages) {
    sourceIds.add(message.name);
    const unit = catalog.get(message.name);
    if (!unit) {
      failures.push({
        path: `${xliffPath}[${message.name}]`,
        code: 'missing-source-message',
        message: 'An extracted source message is missing from the Romanian catalog.',
      });
    } else if (unit.source !== sourceXml(message)) {
      failures.push({
        path: `${xliffPath}[${message.name}].source`,
        code: 'source-message-mismatch',
        message: 'The catalog source differs from the current interface message.',
      });
    }
  }
  for (const unit of units) {
    if (!sourceIds.has(unit.id)) {
      failures.push({
        path: `${xliffPath}[${unit.id}]`,
        code: 'unused-source-message',
        message: 'The catalog message has no current interface source.',
      });
    }
  }
  return failures;
}

export async function validateInterfaceLocales(
  rootDirectory: string = process.cwd(),
): Promise<readonly InterfaceLocaleFailure[]> {
  const xliffText = await readFile(path.join(rootDirectory, xliffPath), 'utf8');
  const configFile = JSON.parse(await readFile(path.join(rootDirectory, 'lit-localize.json'), 'utf8')) as Config;
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-localize-'));
  const localizer = new RuntimeLitLocalizer({
    ...configFile,
    baseDir: rootDirectory,
    resolve: (file: string) => path.resolve(rootDirectory, file),
    output: { ...configFile.output, mode: 'runtime', outputDir: outputDirectory },
  });
  try {
    const extracted = localizer.extractSourceMessages();
    if (extracted.errors.length > 0) {
      return Object.freeze(extracted.errors.map((error) => ({
        path: error.file?.fileName ?? 'src/',
        code: 'source-extraction-error',
        message: typeof error.messageText === 'string'
          ? error.messageText
          : error.messageText.messageText,
      })));
    }
    const units = parseXliff(xliffText);
    const failures = [
      ...validateCatalog(units, Object.keys(templates)),
      ...validateSourceCatalog(units, extracted.messages),
    ];
    if (failures.length === 0) {
      await localizer.build();
      const expected = await readFile(path.join(outputDirectory, `${targetLocale}.ts`), 'utf8');
      const actual = await readFile(path.join(rootDirectory, generatedPath), 'utf8');
      if (actual !== expected) {
        failures.push({
          path: generatedPath,
          code: 'stale-generated-template',
          message: 'The generated locale module differs from the current catalog.',
        });
      }
    }
    return Object.freeze(failures);
  } finally {
    await unlink(path.join(outputDirectory, `${targetLocale}.ts`)).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    });
    await rmdir(outputDirectory);
  }
}

async function main(): Promise<void> {
  const failures = await validateInterfaceLocales(process.cwd());
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`${failure.path}: ${failure.code}: ${failure.message}`);
    }
    console.error(
      styleText(
        'red',
        `localization validation failed: ${failures.length} issue(s).`,
      ),
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `localization validation passed: ${Object.keys(templates).length} ${targetLocale} interface messages are complete.`,
  );
}

const invokedScript = process.argv[1]
  ? path.resolve(process.argv[1])
  : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
