import { commands } from 'vitest/browser';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { gateViewports } from '../../e2e/helpers/viewports.ts';
import { setGameTextLocale } from '../../src/app/game-text-language.ts';
import { setInterfaceLocale } from '../../src/app/interface-localization.ts';
import { interfaceCharacterName } from '../../src/app/interface-names.ts';
import { visibleComboChips } from '../../src/app/screens/match-screen.ts';
import { englishGameLocale, gameCatalog, romanianGameLocale } from '../../src/game-content.ts';
import { formatViolations, inspectLayoutRegions } from './layout-regions.ts';
import {
  boxOf,
  contains,
  deliveryFrame,
  draftState,
  installMatchStyles,
  longestNouns,
  mountMatch,
  settle,
  sharedArea,
  snapshotOf,
  supportedViewports,
  withChains,
} from './match-state-helpers.ts';

// Milestone 016, AC-016-22 and AC-016-23: the active combo chips of the draft.

let removeStyles: () => void;
beforeAll(() => {
  removeStyles = installMatchStyles();
});
afterAll(() => removeStyles());
afterEach(async () => {
  document.body.innerHTML = '';
  await commands.setReducedMotion(false);
  await setInterfaceLocale('en');
  setGameTextLocale('en');
});

const visible = (element: Element) => {
  const { width, height } = element.getBoundingClientRect();
  return width > 1 && height > 1;
};

describe('active combo chips', () => {
  test('shows each chain of the two players as a labelled chip during the draft', async () => {
    await settle(1280, 720);
    const [noun, second] = longestNouns(englishGameLocale, 2);
    let state = draftState();
    const [redId, blueId] = state.playerOrder;
    state = withChains(state, redId, [
      { nounPhraseId: second!, chain: 1 },
      { nounPhraseId: noun!, chain: 2 },
    ]);
    state = withChains(state, blueId, [{ nounPhraseId: noun!, chain: 1 }]);
    const snapshot = snapshotOf(state);
    const match = await mountMatch(snapshot);

    const text = (phraseId: string) =>
      englishGameLocale.messages[gameCatalog.phrases.find(({ id }) => id === phraseId)!.textKey]!;
    for (const [side, player, expected] of [
      [
        'red',
        snapshot.players[0],
        [
          [text(noun!), '×3'],
          [text(second!), '×2'],
        ],
      ],
      ['blue', snapshot.players[1], [[text(noun!), '×2']]],
    ] as const) {
      const frame = match.querySelector(`[data-layout-region="plaque-${side}"]`)!;
      const list = frame.querySelector('.player-combos-list')!;
      // The list has an accessible name, and each item reads its factor in words.
      expect(list.getAttribute('aria-label')).toBe(`${player.characterName}: active combos`);
      const chips = [...list.querySelectorAll('.player-combo')];
      expect(
        chips.map((chip) => [
          chip.querySelector('.player-combo-noun')!.textContent!.trim(),
          chip.querySelector('.player-combo-factor')!.textContent!.trim(),
        ]),
      ).toEqual(expected);
      expect(chips.map((chip) => chip.getAttribute('title'))).toEqual(
        expected.map(([noun_]) => noun_),
      );
      expect(chips[0]!.querySelector('.visually-hidden')!.textContent).toBe(
        ` times ${expected[0]![1].slice(1)}`,
      );
      expect(frame.querySelector('.player-combos-label')!.textContent).toBe('Combo');
      // A wide frame shows the two chips, so it counts no other chip.
      expect([...frame.querySelectorAll('.player-combos-more')].filter(visible)).toEqual([]);
    }
    expect(match.querySelector('[data-side="red"]')!.getAttribute('data-combos')).toBe('2');
  });

  test('shows no chip without a chain, during a delivery, and at Victory', async () => {
    await settle(1280, 720);
    const [noun] = longestNouns(englishGameLocale, 1);
    const plain = draftState();
    const match = await mountMatch(snapshotOf(plain));
    expect(match.querySelector('.player-combos')).toBeNull();
    expect(match.querySelector('[data-combos]')).toBeNull();

    const chained = snapshotOf(
      withChains(plain, plain.playerOrder[0], [{ nounPhraseId: noun!, chain: 1 }]),
    );
    match.snapshot = chained;
    await match.updateComplete;
    expect(match.querySelectorAll('.player-combos')).toHaveLength(1);

    // The delivery shows its own combo emphasis.
    match.snapshot = { ...chained, roundReview: true };
    match.presentation = deliveryFrame(chained, plain.playerOrder[0]);
    await match.updateComplete;
    expect(match.querySelector('.player-combos')).toBeNull();

    match.presentation = null;
    match.snapshot = {
      ...chained,
      roundReview: true,
      phase: 'results',
      victory: {
        winnerId: plain.playerOrder[0],
        winnerName: chained.players[0].characterName,
        completedRounds: 2,
        ladder: false,
      },
      reaction: { ...chained.reaction, round: 2 },
    };
    await match.updateComplete;
    expect(match.querySelector('.round-review-dialog')).not.toBeNull();
    expect(match.querySelector('.player-combos')).toBeNull();
  });

  test('counts the chains that the frame does not show and keeps them in the accessible list', async () => {
    await settle(1920, 1080);
    const nouns = longestNouns(englishGameLocale, 4);
    const state = withChains(
      draftState(),
      'player-one',
      nouns.map((nounPhraseId, index) => ({ nounPhraseId, chain: 4 - index })),
    );
    const match = await mountMatch(snapshotOf(state));
    const frame = match.querySelector('[data-layout-region="plaque-red"]')!;
    const chips = [...frame.querySelectorAll('.player-combo')];
    expect(chips).toHaveLength(4);
    expect(chips.map(visible)).toEqual([true, true, false, false]);
    expect(visibleComboChips).toBe(2);
    const more = [...frame.querySelectorAll<HTMLElement>('.player-combos-more')].filter(visible);
    expect(more.map((element) => element.textContent!.trim())).toEqual(['+2']);
    expect(more[0]!.getAttribute('aria-hidden')).toBe('true');

    // A narrow frame shows one chip and counts three.
    await settle(1024, 720);
    expect(chips.map(visible)).toEqual([true, false, false, false]);
    expect(
      [...frame.querySelectorAll<HTMLElement>('.player-combos-more')]
        .filter(visible)
        .map((element) => element.textContent!.trim()),
    ).toEqual(['+3']);
  });
});

describe('active combo chips at the supported viewports', () => {
  const viewports = gateViewports(supportedViewports, {
    GRAND_TRANSITION_QUALITY_GATE: process.env.GRAND_TRANSITION_QUALITY_GATE,
    GRAND_TRANSITION_QUALITY_GATE_RUNNER: process.env.GRAND_TRANSITION_QUALITY_GATE_RUNNER,
  });

  // The longest names and weakness lists give the Pride frames their tallest text.
  const textLength = (character: (typeof gameCatalog.characters)[number]) =>
    interfaceCharacterName(character.id).length + character.weaknessTags.join('').length;

  test.each(viewports)(
    'keeps the chips in their place without moving a control at $width by $height',
    async ({ width, height, layout }) => {
      await setInterfaceLocale('ro-RO');
      setGameTextLocale('ro-RO');
      // The entrance motion of the controls must not change a measured position.
      await commands.setReducedMotion(true);
      await settle(width, height);
      const widest = [...gameCatalog.characters]
        .toSorted((left, right) => textLength(right) - textLength(left))
        .slice(0, 2);
      const plain = draftState({
        locale: romanianGameLocale,
        characterIds: [widest[0]!.id, widest[1]!.id],
      });
      const nouns = longestNouns(romanianGameLocale, 3);
      let chained = plain;
      for (const playerId of plain.playerOrder) {
        chained = withChains(
          chained,
          playerId,
          nouns.map((nounPhraseId, index) => ({ nounPhraseId, chain: 3 - index })),
        );
      }
      const withSentence = (snapshot: ReturnType<typeof snapshotOf>) => ({
        ...snapshot,
        players: snapshot.players.map((player) => ({
          ...player,
          sentence: 'Partidul tău promite o reformă atentă.',
          // A synthetic noun is 40 percent longer than the longest shipped noun.
          combos: player.combos.map((combo, index) =>
            index === 0
              ? {
                  ...combo,
                  text: `${combo.text} ${combo.text.slice(0, Math.ceil(combo.text.length * 0.4))}`,
                }
              : combo,
          ),
        })) as unknown as typeof snapshot.players,
      });

      const match = await mountMatch(withSentence(snapshotOf(plain, romanianGameLocale)));
      await settle(width, height);
      const stable = [
        '.match-status-rail',
        '.sentence-ledger',
        '.common-phrases',
        '.private-hand',
        '.match-actions',
      ];
      const before = stable.map((selector) => boxOf(match.querySelector(selector)!));
      const scrollHeight = document.documentElement.scrollHeight;
      // The area of the waiting bubble that its Pride frame covers. The shortest
      // landscape screen covers a part of it before this milestone.
      const coveredBubble = () => {
        const waiting = match.querySelector('.match-player[data-turn-state="waiting"]')!;
        return sharedArea(
          boxOf(waiting.querySelector('.player-hud')!),
          boxOf(waiting.querySelector('.player-sentence--waiting')!),
        );
      };
      const coveredBefore = coveredBubble();
      if (height >= 360) expect(coveredBefore).toBe(0);

      match.snapshot = withSentence(snapshotOf(chained, romanianGameLocale));
      await match.updateComplete;
      await settle(width, height);

      // The chips do not push the rail, the sentence, the board, the hand, or the actions.
      expect(stable.map((selector) => boxOf(match.querySelector(selector)!))).toEqual(before);
      expect(document.documentElement.scrollHeight).toBe(scrollHeight);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      if (layout === 'desktop') expect(document.documentElement.scrollHeight).toBe(height);

      const stage = boxOf(match.querySelector('.match-stage')!);
      const rail = boxOf(match.querySelector('.match-status-rail')!);
      const ledger = boxOf(match.querySelector('.sentence-ledger')!);
      for (const side of ['red', 'blue'] as const) {
        const player = match.querySelector(`.match-player[data-side="${side}"]`)!;
        const frame = boxOf(player.querySelector('.player-hud')!);
        const row = player.querySelector('.player-combos')!;
        const rowBox = boxOf(row);
        const chips = [...row.querySelectorAll('.player-combo')].filter(visible);
        const more = [...row.querySelectorAll('.player-combos-more')].filter(visible);
        const shown = width >= 1200 && layout === 'desktop' ? 2 : 1;
        expect(chips, side).toHaveLength(shown);
        expect(
          more.map((element) => element.textContent!.trim()),
          side,
        ).toEqual([`+${3 - shown}`]);

        // One line of chips stays in the scene, and it clears the rail and the sentence.
        expect(rowBox.bottom - rowBox.top, side).toBeLessThanOrEqual(24);
        expect(contains(stage, rowBox), side).toBe(true);
        expect(sharedArea(rowBox, rail), side).toBe(0);
        expect(sharedArea(rowBox, ledger), side).toBe(0);
        expect(sharedArea(frame, rail), side).toBe(0);
        expect(sharedArea(frame, ledger), side).toBe(0);
        // The shortest landscape screens hang the line beside the frame.
        if (height >= 360) expect(contains(frame, rowBox), side).toBe(true);
        else expect(sharedArea(frame, rowBox), side).toBe(0);

        for (const chip of chips) {
          const chipBox = boxOf(chip);
          const noun = chip.querySelector<HTMLElement>('.player-combo-noun')!;
          const factor = boxOf(chip.querySelector('.player-combo-factor')!);
          expect(contains(rowBox, chipBox), side).toBe(true);
          // A long noun gives up its end. The factor stays complete.
          expect(contains(chipBox, factor), side).toBe(true);
          expect(factor.right - factor.left, side).toBeGreaterThan(8);
          expect(getComputedStyle(noun).textOverflow).toBe('ellipsis');
          expect(Number.parseFloat(getComputedStyle(noun).fontSize)).toBeGreaterThanOrEqual(11);
          expect(chip.getAttribute('title')!.length).toBeGreaterThan(noun.textContent!.length - 1);
        }
        for (const element of more) expect(contains(rowBox, boxOf(element)), side).toBe(true);

        const bubble = player.querySelector('.player-sentence--waiting');
        if (bubble) expect(sharedArea(rowBox, boxOf(bubble)), side).toBe(0);
        const tab = player.querySelector('.player-turn-status:not([hidden])');
        if (tab) expect(sharedArea(boxOf(tab), ledger), side).toBe(0);
      }
      // The frame with its chips does not cover more of the waiting bubble.
      expect(coveredBubble()).toBe(coveredBefore);
      const inspection = inspectLayoutRegions(match.querySelector('.match-screen')!, {
        overlays: ['sentence-bubble'],
      });
      expect(formatViolations(inspection.violations)).toBe('');
    },
    30_000,
  );
});
