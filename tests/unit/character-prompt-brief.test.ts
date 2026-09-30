import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, test } from 'vitest';
import { analyzeRuntimeWindow, RUNTIME_WINDOW } from '../../tools/character-runtime-window.ts';
import {
  checkBrief,
  checkSet,
  parseBrief,
  type CharacterBrief,
} from '../../tools/validate-character-prompt.ts';

const helper = path.resolve('.github/skills/generate-scene-openai/scripts/scene-image.ts');
const lockedHash = 'a'.repeat(64);
const styleHash = 'b'.repeat(64);
const study = '- `delivery`: He raises the prayer beads in one hand.\n';
const common = `The only image reference is the accepted selection. Draw the figure at 82 to 88 percent of the 1024-square canvas height with at least 60 pixels of clear margin. The whole head is 17 to 20 percent of the visible figure height, with moderate adult caricature proportions. Use exactly one loop of prayer beads. Every pixel outside the contour must have zero alpha. No glow, halo, or backlight. Keep the head facing canvas right.
Neutral sRGB white balance. Ungraded colors. Warm color is local to skin. No whole-image color tint.`;

function fixture(state: string, action: string, hand = 'canvas-right hand') {
  const stateText = `Create the ${state} pose.`;
  const prompt = `${stateText}\n\n${action.replace('{hand}', hand)}\n\n${common}`;
  const brief: CharacterBrief = parseBrief({
    schemaVersion: 1,
    ownerId: 'tycoon',
    skinId: 'default',
    state,
    facing: 'right',
    promptFile: `${state}.txt`,
    studyFile: 'study.md',
    action: action.replace('{hand}', hand),
    stateText: [stateText],
    figure: {
      canvasPixels: 1024,
      heightPercent: [82, 88],
      headHeightPercent: [17, 20],
      marginPx: 60,
    },
    references: [{ role: 'locked-selection', sha256: lockedHash }],
    props: [
      {
        id: 'beads',
        pattern: 'prayer beads?',
        count: 1,
        hand: 'canvas-right',
        zone: { x: [60, 75], y: [25, 44] },
        signature: true,
      },
    ],
  });
  return { brief, prompt };
}
const delivery = () =>
  fixture(
    'delivery',
    'He raises the prayer beads in the {hand} at shoulder height. He speaks loudly.',
  );

describe('character prompt brief', () => {
  test('accepts a text-only style trial with moderate head proportions', () => {
    const { brief, prompt } = delivery();
    brief.state = 'selection';
    brief.references = [];
    expect(checkBrief(brief, { prompt, referenceHashes: [] })).toEqual([]);
  });

  test('measures the prop margin against the declared native canvas', () => {
    const { brief, prompt } = delivery();
    brief.props[0]!.zone = { x: [92, 95], y: [25, 44] };
    expect(checkBrief(brief, { prompt }).join('\n')).toContain('pixel margin');
    brief.figure.canvasPixels = 2048;
    expect(checkBrief(brief, { prompt: prompt.replace('1024-square', '2048-square') })).toEqual([]);
  });

  test('accepts a consistent brief', () => {
    const { brief, prompt } = delivery();
    expect(checkBrief(brief, { prompt, study, referenceHashes: [lockedHash] })).toEqual([]);
  });

  test('rejects a hand or arm without a canvas side', () => {
    const { brief, prompt } = fixture(
      'delivery',
      'He raises the prayer beads in one hand at shoulder height. The canvas-right hand rests.',
    );
    const issues = checkBrief(brief, { prompt });
    expect(issues.join('\n')).toContain('Name the canvas side');
  });

  test('rejects a signature prop outside the runtime window', () => {
    const { brief, prompt } = delivery();
    brief.props[0]!.zone = { x: [10, 27], y: [10, 35] };
    expect(checkBrief(brief, { prompt }).join('\n')).toContain('runtime window');
    brief.props[0]!.zone = { x: [60, 75], y: [50, 70] };
    expect(checkBrief(brief, { prompt }).join('\n')).toContain('runtime window');
    brief.props[0]!.runtimeVisibilityWaiver = 'Transient recoil, owner accepted.';
    expect(checkBrief(brief, { prompt })).toEqual([]);
  });

  test('rejects a zone inside the safe margin', () => {
    const { brief, prompt } = delivery();
    brief.props[0]!.zone = { x: [90, 99], y: [25, 44] };
    expect(checkBrief(brief, { prompt }).join('\n')).toContain('pixel margin');
  });

  test('rejects a missing count phrase and a prop in the wrong hand', () => {
    const { brief, prompt } = delivery();
    expect(checkBrief(brief, { prompt: prompt.replace('exactly one', 'a') }).join('\n')).toContain(
      'exactly one',
    );
    brief.props[0]!.hand = 'canvas-left';
    expect(checkBrief(brief, { prompt }).join('\n')).toContain('canvas-left hand');
  });

  test('rejects reference files that differ from the brief', () => {
    const { brief, prompt } = delivery();
    expect(checkBrief(brief, { prompt, referenceHashes: [styleHash] }).join('\n')).toContain(
      'reference files',
    );
    brief.references = [{ role: 'style', sha256: styleHash }];
    expect(checkBrief(brief, { prompt }).join('\n')).toContain('locked selection');
  });

  test('rejects a brief whose study line does not use the signature prop', () => {
    const { brief, prompt } = delivery();
    const issues = checkBrief(brief, {
      prompt,
      study: '- `delivery`: He points at the crowd.\nHe owns prayer beads.\n',
    });
    expect(issues.join('\n')).toContain('does not use "beads"');
  });

  test('rejects a brief that does not match the prompt text', () => {
    const { brief, prompt } = delivery();
    const issues = checkBrief(brief, { prompt: prompt.replace('82 to 88', '90 to 99') });
    expect(issues.join('\n')).toContain('82 to 88 percent');
  });
});

describe('character prompt set', () => {
  const thinking = () =>
    fixture('thinking', 'He gathers the prayer beads in the {hand} near his chin. He frowns.');

  test('accepts states that share one identity block and differ in action', () => {
    expect(checkSet([delivery(), thinking()])).toEqual([]);
  });

  test('rejects shared text that drifts between states', () => {
    const drifted = thinking();
    drifted.prompt = drifted.prompt.replace('Ungraded colors.', 'Ungraded colors. Extra rule.');
    expect(checkSet([delivery(), drifted]).join('\n')).toContain('shared text');
  });

  test('rejects near-identical actions and different locked selections', () => {
    const copy = fixture(
      'thinking',
      'He raises the prayer beads in the {hand} at shoulder height. He speaks loudly.',
    );
    expect(checkSet([delivery(), copy]).join('\n')).toContain('too similar');
    const other = thinking();
    other.brief.references = [{ role: 'locked-selection', sha256: styleHash }];
    expect(checkSet([delivery(), other]).join('\n')).toContain('different locked selection');
  });
});

describe('runtime window', () => {
  const canvas = async (left: number, top: number) =>
    sharp({
      create: {
        width: 2048,
        height: 2048,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 100,
              height: 100,
              channels: 4,
              background: { r: 200, g: 0, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left,
          top,
        },
      ])
      .png()
      .toBuffer();

  test('counts silhouette inside and outside the visible zone', async () => {
    expect(RUNTIME_WINDOW.innerXMinPercent).toBeGreaterThan(0);
    expect((await analyzeRuntimeWindow(await canvas(1200, 300))).visibleSilhouettePercent).toBe(
      100,
    );
    expect((await analyzeRuntimeWindow(await canvas(100, 300))).hiddenOuterPercent).toBe(100);
    expect((await analyzeRuntimeWindow(await canvas(1200, 1400))).hiddenLowerPercent).toBe(100);
  });
});

describe('helper requirement', () => {
  const roots: string[] = [];
  afterAll(async () => {
    await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
  });

  test('a character dry run routes to built-in generation without constructing a paid request', async () => {
    await mkdir(path.resolve('tmp/character-generation'), { recursive: true });
    const dir = await mkdtemp(path.resolve('tmp/character-generation/brief-required-'));
    roots.push(dir);
    const promptFile = path.join(dir, 'prompt.txt');
    await writeFile(promptFile, common);
    const result = spawnSync(
      process.execPath,
      [
        helper,
        'generate',
        '--asset-role',
        'character',
        '--background',
        'transparent',
        '--size',
        '2048x2048',
        '--prompt',
        promptFile,
        '--out',
        path.join(dir, 'run'),
        '--dry-run',
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      assetRole: 'character',
      route: 'internal',
      networkRequest: false,
    });
    expect(JSON.parse(result.stdout).requestConstructed).toBeUndefined();
  }, 30_000);
});
