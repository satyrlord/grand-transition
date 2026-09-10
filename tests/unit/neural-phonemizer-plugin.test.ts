import {beforeEach,expect,test,vi} from 'vitest';
import {readFile} from 'node:fs/promises';
import {parseAst} from 'rolldown/parseAst';
import type {Plugin} from 'vite';

vi.mock('rolldown/parseAst',async importOriginal=>{
  const actual=await importOriginal<typeof import('rolldown/parseAst')>();
  return {...actual,parseAst:vi.fn(actual.parseAst)};
});
vi.mock('node:fs/promises',async importOriginal=>{
  const actual=await importOriginal<typeof import('node:fs/promises')>();
  return {...actual,readFile:vi.fn(actual.readFile)};
});
const entry='node_modules/phonemizer/dist/phonemizer.js';
const prefix='virtual:grand-transition-phonemizer:';
const load=(plugin:Plugin,id:string)=>(plugin.load as (id:string)=>Promise<string|undefined>)(id);
const resolve=(plugin:Plugin,id:string)=>(plugin.resolveId as (id:string)=>string|undefined)(id);

beforeEach(()=>{vi.resetModules();vi.clearAllMocks();});

test('concurrent worker instances parse once and each resolves the complete virtual graph',async()=>{
  const {neuralPhonemizerPlugin}=await import('../../tools/neural-phonemizer-plugin');
  const first=neuralPhonemizerPlugin();const second=neuralPhonemizerPlugin();
  const [a,b]=await Promise.all([load(first,entry),load(second,entry)]);
  expect(a).toBe(b);expect(parseAst).toHaveBeenCalledOnce();expect(readFile).toHaveBeenCalledTimes(2);
  const pending=[a!];const seen=new Set<string>();
  while(pending.length){
    for(const match of pending.pop()!.matchAll(/import\("(virtual:grand-transition-phonemizer:[^"]+)"\)/gu)){
      const id=match[1]!;if(seen.has(id))continue;seen.add(id);
      expect(resolve(first,id)).toBe('\0'+id);expect(resolve(second,id)).toBe('\0'+id);
      const left=await load(first,'\0'+id);const right=await load(second,'\0'+id);
      expect(left).toBeTypeOf('string');expect(right).toBe(left);pending.push(left!);
    }
  }
  expect(seen.has(prefix+'engine')).toBe(true);expect(seen.size).toBeGreaterThan(2);
});

test('a cached split still rejects changed source bytes and unrelated files',async()=>{
  const {neuralPhonemizerPlugin}=await import('../../tools/neural-phonemizer-plugin');
  await load(neuralPhonemizerPlugin(),entry);
  const second=neuralPhonemizerPlugin();
  vi.mocked(readFile).mockResolvedValueOnce('modified dependency');
  await expect(load(second,entry)).rejects.toThrow('pinned version');
  expect(await load(second,'\0'+prefix+'engine')).toBeUndefined();
  expect(await load(second,'src/unrelated.ts')).toBeUndefined();
  expect(resolve(second,'src/unrelated.ts')).toBeUndefined();
  expect(parseAst).toHaveBeenCalledOnce();
  expect(await load(second,entry)).toBeTypeOf('string');
  expect(parseAst).toHaveBeenCalledOnce();
});
