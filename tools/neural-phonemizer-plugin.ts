import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { parseAst } from 'rolldown/parseAst';
import type { Plugin } from 'vite';

const prefix = 'virtual:grand-transition-phonemizer:';
const sourceHash = '193481f474f7c1ea81df3195d18b45df8ef7254dbdccb3f193d60215c4897bec';
let prepared: Readonly<{ hash: string; code: string; modules: ReadonlyMap<string, string> }> | undefined;

/** Split the pinned generated pronunciation engine and its data without evaluating source. */
export function neuralPhonemizerPlugin(): Plugin {
  const modules = new Map<string, string>();
  function splitData(source: string, name: string): string {
    let index = 0;
    const declarations: string[] = [];
    const body = source.replace(/"([A-Za-z0-9+/=]{1024,})"/gu, (_, data: string) => {
      const variable = `__phonemeData${index++}`;
      const imports: string[] = [];
      for (let offset = 0; offset < data.length; offset += 240_000) {
        const id = `${prefix}data-${name}-${index}-${offset}`;
        modules.set(id, `export default ${JSON.stringify(data.slice(offset, offset + 240_000))};`);
        imports.push(`(await import(${JSON.stringify(id)})).default`);
      }
      declarations.push(`const ${variable}=${imports.join('+')};`);
      return variable;
    });
    return declarations.join('\n') + '\n' + body;
  }
  return {
    name: 'neural-pronunciation-chunks',
    enforce: 'pre',
    resolveId(id) { if (id.startsWith(prefix)) return '\0' + id; },
    async load(id) {
      if (id.startsWith('\0' + prefix)) return modules.get(id.slice(1));
      if (!id.replaceAll('\\', '/').endsWith('/phonemizer/dist/phonemizer.js')) return;
      const source = await readFile(id, 'utf8');
      const hash = createHash('sha256').update(source).digest('hex');
      if (hash !== sourceHash) {
        throw new Error('Review the pronunciation engine split before changing its pinned version.');
      }
      // Share CPU-heavy preparation across worker builds, but validate every load.
      if (prepared?.hash === hash) {
        for (const [name, code] of prepared.modules) modules.set(name, code);
        return prepared.code;
      }
      let instance: { start: number; end: number } | undefined;
      function visit(value: unknown): void {
        if (!value || typeof value !== 'object') return;
        const node = value as Record<string, unknown>;
        if (node.type === 'FunctionExpression' && typeof node.start === 'number' && typeof node.end === 'number' &&
          source.slice(node.start, node.start + 33).startsWith('function(A,e){this.exports=')) {
          instance = { start: node.start, end: node.end };
          return;
        }
        for (const child of Object.values(node)) {
          if (Array.isArray(child)) child.forEach(visit);
          else if (child && typeof child === 'object') visit(child);
        }
      }
      visit(parseAst(source));
      if (!instance) throw new Error('The pronunciation module has no supported engine factory.');
      const engineId = prefix + 'engine';
      modules.set(engineId, splitData('export default ' + source.slice(instance.start, instance.end) + ';', 'engine'));
      const entry = source.slice(0, instance.start) + '__phonemeEngine' + source.slice(instance.end);
      const code = `const __phonemeEngine=(await import(${JSON.stringify(engineId)})).default;\n` + splitData(entry, 'entry');
      prepared = { hash, code, modules: new Map(modules) };
      return code;
    },
  };
}
