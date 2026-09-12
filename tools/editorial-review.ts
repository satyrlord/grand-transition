import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { API, SymbolFlags } from 'typescript/unstable/sync';
import { SyntaxKind, type Node, type StringLiteral, type TemplateExpression, type TaggedTemplateExpression, type CallExpression, type ConditionalExpression, type VariableDeclaration, type FunctionDeclaration, type IfStatement, type BinaryExpression, type ReturnStatement } from 'typescript/unstable/ast';
import type { ContentCatalog } from '../src/content/content-catalog';
import { loadGameContent } from './load-game-content';

export interface EditorialRecord {
  id: string;
  digest: string;
  kind: 'prose' | 'definition' | 'media';
  content: unknown;
  locale?: string;
  text?: string;
  characterIds: string[];
  neutralExemptionEligible: boolean;
}

export interface EditorialInventory {
  schemaVersion: 1;
  digest: string;
  characterIds: string[];
  sceneIds: string[];
  locales: string[];
  coverageGaps: string[];
  records: EditorialRecord[];
}

export interface InterfaceProseRecord {
  id: string;
  text: string;
  content: { path: string; line: number; form: string; source: string; staticText: string[]; expressions: string[]; sourceDigest: string; referencedSources: string[] };
}

export interface EditorialMediaRecord {
  id: string;
  content: unknown;
}

export interface EvidenceValidation {
  passed: boolean;
  issues: string[];
}

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const digestPattern = /^[a-f0-9]{64}$/u;
const textSchema = z.string().trim().min(1);
const digestSchema = z.string().regex(digestPattern);
const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Use a valid calendar date.');

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

/** Inventory only loaded game locales and supplied media; scope gaps remain explicit. */
export function createEditorialInventory(
  catalog: ContentCatalog,
  media: readonly EditorialMediaRecord[] = [],
  coverageGaps: string[] = [],
  interfaceProse: readonly InterfaceProseRecord[] = [],
): EditorialInventory {
  const records: EditorialRecord[] = [];
  const add = (record: Omit<EditorialRecord, 'digest'>) => {
    records.push({ ...record, digest: digest(record) });
  };
  const phrasesByKey = new Map(catalog.phrases.flatMap((phrase) => [
    phrase.textKey, ...Object.values(phrase.numberForms ?? {}),
  ].map((key) => [key, phrase] as const)));
  const comebackOwners = new Map(catalog.characters.flatMap((character) =>
    Object.values(character.comebackLinesByTier).flat().map((key) => [key, character.id] as const)));
  for (const locale of catalog.locales) {
    for (const [key, text] of Object.entries({
      ...Object.fromEntries(Object.entries(locale.title).map(([key, text]) => [`title.${key}`, text])),
      ...locale.messages,
    })) {
      const phrase = phrasesByKey.get(key);
      const comebackOwner = comebackOwners.get(key);
      add({
        id: `prose:${locale.locale}:${key}`, kind: 'prose', locale: locale.locale, text,
        content: { key, text, phrase: phrase ?? null },
        characterIds: phrase?.characterIds ?? (comebackOwner ? [comebackOwner] : []),
        neutralExemptionEligible: Boolean(phrase && phrase.tags.length === 0),
      });
    }
  }
  for (const [kind, definitions] of [
    ['phrase', catalog.phrases], ['character', catalog.characters], ['scene', catalog.scenes],
  ] as const) {
    for (const definition of definitions) add({
      id: `${kind}:${definition.id}`, kind: 'definition', content: definition,
      characterIds: kind === 'character' ? [definition.id] : [],
      neutralExemptionEligible: false,
    });
  }
  for (const record of interfaceProse) add({
    id: `interface:${record.id}`, kind: 'prose', locale: 'en', text: record.text,
    content: record.content, characterIds: [], neutralExemptionEligible: true,
  });
  for (const asset of media) add({
    id: `media:${asset.id}`, kind: 'media', content: asset.content,
    characterIds: [], neutralExemptionEligible: false,
  });
  records.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (new Set(records.map((record) => record.id)).size !== records.length) {
    throw new Error('Use unique editorial inventory record IDs.');
  }
  const inventory = {
    schemaVersion: 1 as const,
    characterIds: catalog.characters.map((character) => character.id).toSorted(),
    sceneIds: catalog.scenes.map((scene) => scene.id).toSorted(),
    locales: catalog.locales.map((locale) => locale.locale).toSorted(),
    coverageGaps: [...coverageGaps], records,
  };
  return { ...inventory, digest: digest(inventory) };
}

/** Bind actual bytes, including fallback portraits absent from asset manifests. */
export function loadEditorialInventory(rootDirectory = repositoryRoot): EditorialInventory {
  const media: EditorialMediaRecord[] = [];
  const sourceDigests = new Set<string>();
  const catalog = loadGameContent(rootDirectory).sampleContent;
  const interfaceInventory = discoverInterfaceProse(rootDirectory, catalog);
  const coverageGaps = [...interfaceInventory.coverageGaps];
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) {
        const relativePath = path.relative(rootDirectory, file).replaceAll('\\', '/');
        const bytes = readFileSync(file);
        const sha256 = createHash('sha256').update(bytes).digest('hex');
        sourceDigests.add(sha256);
        media.push({ id: relativePath, content: {
          path: relativePath, bytes: bytes.length,
          sha256,
          ...(entry.name.endsWith('.json') ? { manifest: JSON.parse(bytes.toString('utf8')) as unknown } : {}),
        } });
      }
    }
  }
  visit(path.join(rootDirectory, 'src/assets'));
  visit(path.join(rootDirectory, 'public'));
  const productionRoot = path.join(rootDirectory, 'dist');
  if (!existsSync(productionRoot)) {
    coverageGaps.push('Build the current production artifact to inventory emitted dependency assets.');
  } else {
    const discovered = discoverBuiltReviewAssets(productionRoot, sourceDigests);
    media.push(...discovered);
  }
  return createEditorialInventory(catalog, media, coverageGaps, interfaceInventory.records);
}

/** Retain source forms and dynamic expressions for editorial review, without executing UI code. */
export function discoverInterfaceProse(rootDirectory = repositoryRoot, catalog?: ContentCatalog): { records: InterfaceProseRecord[]; coverageGaps: string[] } {
  const records: InterfaceProseRecord[] = [];
  const coverageGaps: string[] = [];
  const files: string[] = [];
  const secretPoliceLabelSources = new Set<string>();
  const visitFiles = (directory: string) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== 'assets') visitFiles(file);
      else if (entry.isFile() && /\.(?:ts|css|json)$/u.test(entry.name)) files.push(file);
    }
  };
  visitFiles(path.join(rootDirectory, 'src'));
  const relative = (file: string) => path.relative(rootDirectory, file).replaceAll('\\', '/');
  // Bind local source and JSON dependencies, including imported constants and text formatters.
  const sourceDigest = digest(files.toSorted().map((file) => [relative(file), readFileSync(file, 'utf8')]));
  const entityNames: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', hellip: '…', mdash: '—', ndash: '–', minus: '−', times: '×', middot: '·', bull: '•', rarr: '→', larr: '←' };
  const decodeEntities = (text: string, file: string) => text.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/giu, (whole: string, name: string) => {
    if (name.startsWith('#')) {
      const code = name[1]?.toLowerCase() === 'x' ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
      if (code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) return String.fromCodePoint(code);
    } else if (entityNames[name]) return entityNames[name];
    coverageGaps.push(`${file}: Review unsupported HTML entity ${whole}.`);
    return whole;
  });
  const add = (file: string, start: number, form: string, source: string, staticText: string[], expressions: string[], referencedSources: string[], text?: string) => {
    const fileText = readFileSync(file, 'utf8');
    const location = relative(file);
    const decoded = staticText.map((part) => decodeEntities(part, location));
    records.push({ id: `${location}:${start}:${form}`, text: text ?? decoded.join(' '), content: {
      path: location, line: fileText.slice(0, start).split('\n').length, form, source,
      staticText: decoded, expressions: [...new Set(expressions)], sourceDigest, referencedSources: [...new Set(referencedSources)],
    } });
  };
  const api = new API({ cwd: rootDirectory });
  try {
    using snapshot = api.updateSnapshot({ openProjects: [path.join(rootDirectory, 'tsconfig.json')] });
    const project = snapshot.getProject(path.join(rootDirectory, 'tsconfig.json'));
    if (!project) throw new Error('Load the TypeScript project for interface review.');
    const forms = (node: Node, active = new Set<Node>()): { text: string; staticText: string[]; expressions: string[]; referencedSources: string[] } => {
      const unknown = () => ({ text: `{{${node.getText()}}}`, staticText: [] as string[], expressions: [node.getText()], referencedSources: [] as string[] });
      if (active.has(node)) return unknown();
      active = new Set(active).add(node);
      if (node.kind === SyntaxKind.StringLiteral || node.kind === SyntaxKind.NoSubstitutionTemplateLiteral) {
        const text = (node as StringLiteral).text;
        return { text, staticText: [text], expressions: [], referencedSources: [] };
      }
      if (node.kind === SyntaxKind.TemplateExpression) {
        const template = node as TemplateExpression;
        const parts = template.templateSpans.map((span) => ({ value: forms(span.expression, active), literal: span.literal.text }));
        return { text: template.head.text + parts.map(({ value, literal }) => value.text + literal).join(''),
          staticText: [template.head.text, ...parts.flatMap(({ value, literal }) => [...value.staticText, literal])],
          expressions: parts.flatMap(({ value }) => value.expressions), referencedSources: parts.flatMap(({ value }) => value.referencedSources) };
      }
      if (node.kind === SyntaxKind.TaggedTemplateExpression) return forms((node as TaggedTemplateExpression).template, active);
      if (node.kind === SyntaxKind.CallExpression && (node as CallExpression).expression.getText() === 'msg') {
        const argument = (node as CallExpression).arguments?.[0];
        if (argument) return forms(argument, active);
      }
      if (node.kind === SyntaxKind.ConditionalExpression) {
        const conditional = node as ConditionalExpression;
        const options = [forms(conditional.whenTrue, active), forms(conditional.whenFalse, active)];
        return { text: options.map((option) => option.text).join(' / '), staticText: options.flatMap((option) => option.staticText),
          expressions: options.flatMap((option) => option.expressions), referencedSources: options.flatMap((option) => option.referencedSources) };
      }
      if (node.kind === SyntaxKind.Identifier) {
        let symbol = project.checker.getSymbolAtLocation(node);
        if (symbol && symbol.flags & SymbolFlags.Alias) symbol = project.checker.getAliasedSymbol(symbol);
        const declaration = symbol?.valueDeclaration?.resolve();
        if (declaration?.kind === SyntaxKind.VariableDeclaration) {
          const initializer = (declaration as VariableDeclaration).initializer;
          if (initializer) {
            const value = forms(initializer, active);
            return { ...value, referencedSources: [...value.referencedSources, `${relative(declaration.getSourceFile().fileName)}:${declaration.getText()}`] };
          }
        }
      }
      const result = unknown();
      const collectLiterals = (child: Node) => {
        if ([SyntaxKind.StringLiteral, SyntaxKind.NoSubstitutionTemplateLiteral, SyntaxKind.TemplateHead, SyntaxKind.TemplateMiddle, SyntaxKind.TemplateTail].includes(child.kind)) result.staticText.push((child as StringLiteral).text);
        child.forEachChild(collectLiterals);
      };
      node.forEachChild(collectLiterals);
      return result;
    };
    for (const file of files.filter((file) => /^src\/(?:app|components)\/.*\.ts$/u.test(relative(file)))) {
      const source = project.program.getSourceFile(file);
      if (!source) { coverageGaps.push(`${relative(file)}: Parse this interface source.`); continue; }
      if (project.program.getSyntacticDiagnostics(file).length) coverageGaps.push(`${relative(file)}: Resolve TypeScript syntax errors before interface review.`);
      const walk = (node: Node, captured: boolean) => {
        if (node.kind === SyntaxKind.FunctionDeclaration && (node as FunctionDeclaration).name?.text === 'titleCase') {
          const first = (node as FunctionDeclaration).body?.statements[0];
          if (first?.kind === SyntaxKind.IfStatement) {
            const condition = (first as IfStatement).expression;
            const then = (first as IfStatement).thenStatement;
            const returned = then.kind === SyntaxKind.ReturnStatement ? (then as ReturnStatement).expression : undefined;
            if (condition.kind === SyntaxKind.BinaryExpression &&
              (condition as BinaryExpression).left.getText() === 'value' &&
              (condition as BinaryExpression).operatorToken.kind === SyntaxKind.EqualsEqualsEqualsToken &&
              (condition as BinaryExpression).right.kind === SyntaxKind.StringLiteral &&
              ((condition as BinaryExpression).right as StringLiteral).text === 'securitate' &&
              returned?.kind === SyntaxKind.CallExpression && (returned as CallExpression).expression.getText() === 'msg' &&
              (returned as CallExpression).arguments?.[0]?.kind === SyntaxKind.StringLiteral &&
              ((returned as CallExpression).arguments![0] as StringLiteral).text === 'Former secret police') secretPoliceLabelSources.add(relative(file));
          }
        }
        const isMessage = node.kind === SyntaxKind.CallExpression && (node as CallExpression).expression.getText() === 'msg';
        const isTemplate = node.kind === SyntaxKind.TemplateExpression || node.kind === SyntaxKind.NoSubstitutionTemplateLiteral;
        const isString = node.kind === SyntaxKind.StringLiteral && ![SyntaxKind.ImportDeclaration, SyntaxKind.ExportDeclaration, SyntaxKind.LiteralType].includes(node.parent.kind);
        if (isMessage || isTemplate || !captured && isString) {
          const argument = isMessage ? (node as CallExpression).arguments?.[0] : node;
          if (!argument) coverageGaps.push(`${relative(file)}:${node.getStart()}: Review a message without a text argument.`);
          else {
            const value = forms(argument);
            const form = isMessage ? 'message' : isTemplate && node.parent.kind === SyntaxKind.TaggedTemplateExpression
              ? (node.parent as TaggedTemplateExpression).tag.getText() : isTemplate ? 'template' : 'literal';
            add(file, node.getStart(), form, node.getText(), value.staticText, value.expressions, value.referencedSources, decodeEntities(value.text, relative(file)));
          }
        }
        node.forEachChild((child) => walk(child, captured || isMessage || isTemplate || isString));
      };
      walk(source, false);
    }
  } finally { api.close(); }
  const htmlFile = path.join(rootDirectory, 'index.html');
  if (existsSync(htmlFile)) {
    const source = readFileSync(htmlFile, 'utf8');
    add(htmlFile, 0, 'html-document', source, [source], [], []);
  } else coverageGaps.push('Review the missing index.html document.');
  for (const file of files.filter((file) => file.endsWith('.css'))) {
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, (comment) => ' '.repeat(comment.length));
    for (const match of source.matchAll(/(?:^|[;{}])\s*content\s*:\s*([^;}]*)(?=[;}])/giu)) {
      const value = match[1]!.trim();
      add(file, match.index, 'css-content', match[0], [value], /^(?:none|normal|(?:'[^']*'|"[^"]*")\s*)$/u.test(value) ? [] : [value], []);
    }
  }
  if (catalog) {
    const source = path.join(rootDirectory, 'src/app/screens/setup-screen.ts');
    const titleCase = (value: string) => value.replaceAll(/(^|[-\s])\p{L}/gu, (letter) => letter.toUpperCase());
    if (!existsSync(source)) coverageGaps.push('Review the missing setup label formatter.');
    else {
      const labels = new Set([...catalog.characters.flatMap((character) => [character.id, ...character.weaknessTags]),
        ...catalog.scenes.map((scene) => scene.id), ...catalog.phrases.flatMap((phrase) => phrase.tags)]);
      for (const label of labels) {
        if (label === 'securitate') for (const file of ['src/app/screens/setup-screen.ts', 'src/app/screens/match-screen.ts']) {
          if (existsSync(path.join(rootDirectory, file)) && !secretPoliceLabelSources.has(file)) coverageGaps.push(`${file}: Verify the English secret-police label before recording it.`);
        }
        const displayed = label === 'securitate' && secretPoliceLabelSources.has(relative(source)) ? 'Former secret police' : titleCase(label);
        add(source, 0, `catalog-label:${label}`, `titleCase(${JSON.stringify(label)})`, [displayed], [], []);
      }
      const portraits = path.join(rootDirectory, 'src/assets/characters');
      const skins = new Set<string>();
      const manifestFile = path.join(portraits, 'character-manifest.json');
      if (existsSync(manifestFile)) {
        const manifest = z.object({ assets: z.array(z.object({ ownerId: z.string(), skinId: z.string() })) })
          .parse(JSON.parse(readFileSync(manifestFile, 'utf8')));
        for (const asset of manifest.assets) if (catalog.characters.some((character) => character.id === asset.ownerId)) skins.add(asset.skinId);
      }
      if (existsSync(portraits)) for (const file of readdirSync(portraits).filter((file) => file.endsWith('.png'))) {
        const stem = file.slice(0, -4);
        for (const character of catalog.characters) {
          if (stem === character.id) skins.add('default');
          else if (stem.startsWith(`${character.id}--`)) skins.add(stem.slice(character.id.length + 2));
        }
      }
      for (const skin of skins) {
        const label = skin === 'default' ? 'Original' : skin === 'alternate' ? 'Alternate' : titleCase(skin);
        const accessible = skin === 'alternate' ? ['Alternate skin', 'Alternate chassis'] : [`${label} skin`];
        add(source, 0, `skin-label:${skin}`, `skinLabel(${JSON.stringify(skin)})`, [label, ...accessible], [], []);
      }
    }
  }
  return { records: records.toSorted((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), coverageGaps: [...new Set(coverageGaps)] };
}

/** Include emitted dependencies by actual bytes, without re-listing copied source assets. */
export function discoverBuiltReviewAssets(
  productionRoot: string, sourceDigests: ReadonlySet<string> = new Set(),
): EditorialMediaRecord[] {
  const records: EditorialMediaRecord[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) {
        const bytes = readFileSync(file);
        const sha256 = createHash('sha256').update(bytes).digest('hex');
        if (sourceDigests.has(sha256)) continue;
        const relativePath = path.relative(productionRoot, file).replaceAll('\\', '/');
        records.push({ id: `production/${relativePath}`, content: {
          path: relativePath, bytes: bytes.length, sha256,
          origin: 'Production build output. Review against current build and source or license evidence.',
        } });
      } else {
        throw new Error('Production review inventory requires regular files and directories.');
      }
    }
  };
  visit(productionRoot);
  return records;
}

const checksSchema = z.object({
  fictionalTarget: z.enum(['yes', 'no', 'exempt']),
  characterOrSceneTone: z.enum(['yes', 'no', 'exempt']),
  internationalComprehension: z.enum(['yes', 'no']),
  neutralExemptionRationale: z.string(),
}).strict();

const reviewSchema = z.object({
  recordId: textSchema, recordDigest: digestSchema,
  reviewer: textSchema, date: calendarDateSchema,
  severity: z.enum(['none', 'minor', 'major', 'blocker']),
  decision: z.enum(['approved', 'rejected', 'needs-review']),
  rationale: textSchema, sourceOriginality: textSchema,
  checks: checksSchema.nullable(),
}).strict();

export function createPendingEditorialEvidence(inventory: EditorialInventory) {
  return {
    schemaVersion: 1, inventoryDigest: inventory.digest,
    reviews: inventory.records.map((record) => ({
      recordId: record.id, recordDigest: record.digest,
      reviewer: null, date: null, severity: null, decision: 'needs-review',
      rationale: null, sourceOriginality: null,
      checks: record.kind === 'prose' ? {
        fictionalTarget: null, characterOrSceneTone: null,
        internationalComprehension: null, neutralExemptionRationale: '',
      } : null,
    })),
  };
}

function schemaIssues(error: z.ZodError): EvidenceValidation {
  return { passed: false, issues: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
}

export function validateEditorialEvidence(inventory: EditorialInventory, input: unknown): EvidenceValidation {
  const parsed = z.object({
    schemaVersion: z.literal(1), inventoryDigest: digestSchema, reviews: z.array(reviewSchema),
  }).strict().safeParse(input);
  if (!parsed.success) return schemaIssues(parsed.error);
  const issues = [...inventory.coverageGaps];
  if (parsed.data.inventoryDigest !== inventory.digest) issues.push('Review the current inventory digest.');
  const expected = new Map(inventory.records.map((record) => [record.id, record]));
  const seen = new Set<string>();
  for (const review of parsed.data.reviews) {
    const record = expected.get(review.recordId);
    const fail = (message: string) => issues.push(`${review.recordId}: ${message}`);
    if (!record) { fail('Remove the unknown review record.'); continue; }
    if (seen.has(record.id)) fail('Supply only one review per record.');
    seen.add(record.id);
    if (record.digest !== review.recordDigest) fail('Review the changed record.');
    if (review.decision !== 'approved') fail('Record an approved decision.');
    if (review.severity === 'major' || review.severity === 'blocker') fail('Resolve the blocking severity.');
    if (record.kind !== 'prose') {
      if (review.checks !== null) fail('Use null line checks for a non-prose record.');
      continue;
    }
    if (!review.checks) { fail('Complete all three editorial checks.'); continue; }
    const checks = review.checks;
    if (checks.internationalComprehension !== 'yes') fail('Pass the comprehension check.');
    for (const check of [checks.fictionalTarget, checks.characterOrSceneTone]) {
      if (check === 'no') fail('Pass the fictional-target and tone checks.');
      if (check === 'exempt' && (!record.neutralExemptionEligible || !checks.neutralExemptionRationale.trim())) {
        fail('Use a justified exemption only for a neutral grammatical phrase or functional interface text.');
      }
    }
  }
  for (const record of inventory.records) if (!seen.has(record.id)) issues.push(`${record.id}: Add review evidence.`);
  return { passed: issues.length === 0, issues };
}
