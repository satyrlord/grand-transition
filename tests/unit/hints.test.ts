import { describe, expect, test } from 'vitest';
import {
  createHintRotation,
  seriousHints,
  sillyHintShare,
  sillyHints,
  type Hint,
} from '../../src/app/hints.ts';
import {
  comebackChargeCap,
  comebackRules,
  continuationBreakDamage,
} from '../../src/engine/continuation-comeback-resolution.ts';
import { grammarMistakeSelfDamage, timeoutSelfDamage } from '../../src/engine/draft-actions.ts';

/** A seeded source, so the selection is the same in each run. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

function sequence(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length]!;
}

const hint = (id: string, kind: Hint['kind']): Hint => ({ id, kind, text: () => id });
const textOf = (id: string) => seriousHints.find((candidate) => candidate.id === id)!.text();

describe('loading hints', () => {
  test('gives two lists of short one-sentence hints with unique identifiers', () => {
    expect(seriousHints.length).toBeGreaterThanOrEqual(16);
    expect(sillyHints.length).toBeGreaterThanOrEqual(5);
    const all = [...seriousHints, ...sillyHints];
    expect(new Set(all.map(({ id }) => id)).size).toBe(all.length);
    expect(new Set(all.map(({ text }) => text())).size).toBe(all.length);
    expect(seriousHints.every(({ kind }) => kind === 'serious')).toBe(true);
    expect(sillyHints.every(({ kind }) => kind === 'silly')).toBe(true);
    for (const { id, text } of all) {
      const english = text();
      expect(english.length, id).toBeGreaterThan(20);
      expect(english.length, id).toBeLessThanOrEqual(92);
      expect(english.endsWith('.'), id).toBe(true);
      // One sentence: only the continuation phrase `[...]` has a period before the end.
      expect(english.slice(0, -1).replaceAll('[...]', '').includes('.'), id).toBe(false);
    }
  });

  test('promises nothing that the game does not do', () => {
    for (const { id, text } of [...seriousHints, ...sillyHints]) {
      expect(text(), id).not.toMatch(
        /achievement|statistic|unlock|gamepad|controller|keyboard|shortcut|online|leaderboard/iu,
      );
    }
  });

  test('states the values that the engine applies', () => {
    expect(textOf('grammar-mistake')).toContain(`costs you ${grammarMistakeSelfDamage} Pride`);
    expect(textOf('continuation-break')).toContain(`A hit of ${continuationBreakDamage} or more`);
    expect(textOf('timeout')).toContain(
      `cost ${[1, 2, 3].map(timeoutSelfDamage).join(', ')}, then ${timeoutSelfDamage(4)} Pride`,
    );
    const { weak, medium, strong } = comebackRules;
    expect(textOf('comeback-charge')).toContain(
      `${weak.cost}, ${medium.cost}, ${strong.cost} give +${weak.damageBonus}, +${medium.damageBonus}, +${strong.damageBonus}`,
    );
    expect(strong.cost).toBe(comebackChargeCap);
    expect(textOf('shared-phrases')).toContain('nine shared phrases');
    expect(textOf('private-phrases')).toContain('two private phrases');
    expect(textOf('noun-combo')).toContain('by 2, then by 3');
    expect(textOf('turn-timer')).toContain('15 seconds, 30 seconds, or Unlimited');
  });

  test('selects from the injected source and gives the same hints for the same source', () => {
    const first = createHintRotation(seededRandom(20_261_013));
    const second = createHintRotation(seededRandom(20_261_013));
    const ids = Array.from({ length: 40 }, () => first.next().id);
    expect(Array.from({ length: 40 }, () => second.next().id)).toEqual(ids);
    expect(new Set(ids).size).toBeGreaterThan(8);

    // The first value selects the list, and the second value selects the hint.
    const serious = createHintRotation(sequence([sillyHintShare, 0]));
    expect(serious.next()).toBe(seriousHints[0]);
    const silly = createHintRotation(sequence([sillyHintShare - 0.001, 0.999_999]));
    expect(silly.next()).toBe(sillyHints.at(-1));
  });

  test('never gives the same hint two times in a row', () => {
    for (const random of [seededRandom(1), seededRandom(77), () => 0, () => 0.999_999, () => 0.5]) {
      const rotation = createHintRotation(random);
      let previous = rotation.next();
      for (let draw = 0; draw < 5_000; draw += 1) {
        const next = rotation.next();
        expect(next.id).not.toBe(previous.id);
        previous = next;
      }
    }
  });

  test('keeps about one silly hint in five', () => {
    expect(sillyHintShare).toBe(0.2);
    const rotation = createHintRotation(seededRandom(20_261_013));
    const draws = 20_000;
    let silly = 0;
    for (let draw = 0; draw < draws; draw += 1) {
      if (rotation.next().kind === 'silly') silly += 1;
    }
    expect(silly / draws).toBeGreaterThan(0.18);
    expect(silly / draws).toBeLessThan(0.22);
  });

  test('uses the other list when the selected list has only the previous hint', () => {
    const lists = { serious: [hint('rule', 'serious')], silly: [hint('joke', 'silly')] };
    const rotation = createHintRotation(() => 0.9, lists);
    expect([rotation.next().id, rotation.next().id, rotation.next().id]).toEqual([
      'rule',
      'joke',
      'rule',
    ]);
    const single = createHintRotation(() => 0.9, { serious: [hint('only', 'serious')], silly: [] });
    expect([single.next().id, single.next().id]).toEqual(['only', 'only']);
    expect(() => createHintRotation(() => 0, { serious: [], silly: [] }).next()).toThrow(
      'The hint lists are empty.',
    );
  });
});
