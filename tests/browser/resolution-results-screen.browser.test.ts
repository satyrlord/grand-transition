import { page } from 'vitest/browser';
import { afterEach, expect, test } from 'vitest';
import { GrandTransitionApp } from '../../src/app/app-shell';
import {
  createResolutionResultsSnapshot,
  GrandTransitionResolutionResults,
  resolutionCommandEventName,
  type ResolutionCommandEvent,
  type ResolutionResultsSnapshot,
} from '../../src/app/screens/resolution-results-screen';
import type {
  MatchResolutionPlayer,
  MatchState,
} from '../../src/engine/match-lifecycle';

afterEach(() => {
  document.body.innerHTML = '';
});

test('renders every ordered sequence step and rule event in DOM text', async () => {
  const screen = await renderSnapshot(resolutionFixture());
  const sequence = [...screen.querySelectorAll('[data-sequence]')].map(
    (section) => section.getAttribute('data-sequence'),
  );

  expect(sequence).toEqual(['1', '2', '3', '4', '5']);
  expect(screen.textContent).toContain('Valid complete construction');
  expect(screen.textContent).toContain('Carried construction');
  expect(screen.textContent).toContain('Weakness activated: credibility');
  expect(screen.textContent).toContain('Combo activated at 2×');
  expect(screen.textContent).toContain('Finisher activated');
  expect(screen.textContent).toContain('Strong comeback activated');
  expect(screen.textContent).toContain(
    'Grammar mistake: 1 card removed and 3 Pride lost immediately.',
  );
  expect(
    screen.querySelectorAll('.construction-entry blockquote'),
  ).toHaveLength(2);
  expect(screen.textContent).toContain(
    'Reaction: The opposition reels under a heavy exchange.',
  );
  const phraseSources = [
    ...screen.querySelectorAll('.construction-phrases li'),
  ].map((item) => item.textContent?.replaceAll(/\s+/gu, ' ').trim());
  expect(phraseSources).toContain('Carried a paper promise');
  expect(phraseSources).toContain('Active folds');
  expect(screen.textContent).toContain('Continuation survived');
  expect(screen.textContent).toContain('Continuation broke');
  expect(screen.textContent).toContain('Incomplete construction');
  expect(screen.textContent).toContain('Weak comeback activated');
  expect(screen.textContent).toContain('Medium comeback activated');
  expect(screen.textContent).toContain('Strong comeback activated');
  expect(
    screen
      .querySelector('.damage-equation')
      ?.textContent?.replaceAll(/\s+/gu, ' ')
      .trim(),
  ).toBe('Sentence damage 28 + Unmultiplied comeback 18 = Outgoing damage 46');
  const firstCalculation = screen.querySelector('.calculation-entry')!;
  let reconstructed = 0;
  for (const term of firstCalculation.querySelectorAll<HTMLElement>(
    '[data-term-kind]',
  )) {
    const value = term.querySelector('strong')?.textContent?.trim() ?? '';
    if (
      ['clause-score', 'finisher-bonus'].includes(term.dataset.termKind ?? '')
    ) {
      reconstructed += Number(value);
    }
  }
  expect(reconstructed).toBe(28);
  expect(screen.querySelectorAll('[role="status"]')).toHaveLength(1);
});

test('shows simultaneous before and after values without waiting for motion', async () => {
  const snapshot = resolutionFixture();
  const screen = await renderSnapshot(snapshot);
  const meterText = [...screen.querySelectorAll('.meter-copy')].map((item) =>
    item.textContent?.replaceAll(/\s+/gu, ' ').trim(),
  );

  expect(meterText).toEqual([
    'Pride Before 74; after 32',
    'Comeback charge Before 60; after 42',
    'Pride Before 52; after 28',
    'Comeback charge Before 40; after 60',
  ]);
  expect(
    screen.querySelector('.meter-track')?.getAttribute('data-before'),
  ).toBe('74');
  expect(screen.snapshot).toBe(snapshot);
});

test('renders valid, incomplete, and carried constructions as distinct golden states', async () => {
  const cases = [
    ['valid', 'Valid complete construction'],
    ['incomplete', 'Incomplete construction — zero sentence damage'],
    ['carried', 'Carried construction — zero outgoing damage this round'],
  ] as const;

  for (const [status, label] of cases) {
    const base = resolutionFixture();
    const snapshot: ResolutionResultsSnapshot = {
      ...base,
      players: [
        {
          ...base.players[0],
          constructionStatus: status,
          constructionStatusLabel: label,
        },
        base.players[1],
      ],
    };
    const screen = await renderSnapshot(snapshot);
    expect(
      screen.querySelector(`[data-construction-status="${status}"]`)
        ?.textContent,
    ).toContain(label);
  }
});

test('dispatches one immutable lifecycle command and blocks rapid activation', async () => {
  const screen = await renderSnapshot(resolutionFixture());
  const commands: ResolutionCommandEvent[] = [];
  screen.addEventListener(resolutionCommandEventName, (event) =>
    commands.push(event),
  );
  const button = screen.querySelector<HTMLButtonElement>(
    '.resolution-primary',
  )!;

  button.click();
  button.click();
  await screen.updateComplete;

  expect(commands).toHaveLength(1);
  expect(commands[0]!.bubbles).toBe(true);
  expect(commands[0]!.composed).toBe(true);
  expect(commands[0]!.detail).toEqual({
    type: 'prepare-round',
    source: 'user',
    payload: {},
  });
  expect(Object.isFrozen(commands[0]!.detail)).toBe(true);
  expect(button.disabled).toBe(true);
});

test('keeps every result label when optional event counts are zero', async () => {
  const screen = await renderSnapshot(resultsFixture());
  const labels = [...screen.querySelectorAll('.results-statistics dt')].map(
    (item) => item.textContent?.trim(),
  );

  expect(labels).toEqual([
    'Final score — Civic Fox',
    'Final score — Brass Peacock',
    'Best insult',
    'Highest damage',
    'Longest valid sentence',
    'Weaknesses',
    'Highest combo',
    'Grammar mistakes',
    'Comebacks',
  ]);
  const values = [...screen.querySelectorAll('.results-statistics dd')].map(
    (item) => item.textContent?.trim(),
  );
  expect(values).toEqual(['42', '0', 'None', '42', '0', '0', '0', '0', '0']);
  expect(
    screen.querySelector<HTMLButtonElement>(
      '[aria-label="Start rematch with same setup"]',
    ),
  ).toBeNull();
  expect(screen.textContent).toContain('Start rematch with same setup');
  expect(screen.textContent).toContain('Return to match setup');
});

test('describes an equal-zero cliffhanger without inventing a knockout', () => {
  const snapshot = createResolutionResultsSnapshot(
    cliffhangerState([0, 0], [100, 100]),
  );
  expect(snapshot.outcome).toBe(
    'Cliffhanger tied at zero. Another cliffhanger starts with restored Pride, zero charge, no combo, and no continuation.',
  );
});

test('pauses the real match on resolution until the user continues', async () => {
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();

  for (let turn = 0; turn < 40; turn += 1) {
    if (document.querySelector('grand-transition-resolution-results')) break;
    const end = document.querySelector<HTMLButtonElement>(
      '.match-actions .action-primary',
    );
    if (end?.disabled === false) {
      end.click();
    } else {
      const legal = document.querySelector<HTMLButtonElement>(
        '.shared-board button[data-card-state="legal"], .private-hand button[data-card-state="legal"]',
      );
      if (legal) {
        legal.click();
      }
    }
    await app.updateComplete;
    await document.querySelector<GrandTransitionResolutionResults>(
      'grand-transition-resolution-results',
    )?.updateComplete;
  }

  const resolution = document.querySelector(
    'grand-transition-resolution-results',
  ) as GrandTransitionResolutionResults | null;
  expect(resolution).not.toBeNull();
  if (!resolution) throw new Error('The match did not reach resolution.');
  await resolution.updateComplete;
  expect(Object.isFrozen(resolution.snapshot)).toBe(true);
  expect(resolution.textContent).toContain('Round 1 resolution');
  expect(document.querySelector('grand-transition-match')).toBeNull();

  await page.getByRole('button', { name: 'Continue to round 2' }).click();
  await app.updateComplete;
  expect(
    document.querySelector('grand-transition-resolution-results'),
  ).toBeNull();
  expect(
    document.querySelector('grand-transition-match')?.textContent,
  ).toContain('Round 2');
});

async function renderSnapshot(
  snapshot: ResolutionResultsSnapshot,
): Promise<GrandTransitionResolutionResults> {
  document.body.innerHTML =
    '<grand-transition-resolution-results></grand-transition-resolution-results>';
  const screen = document.querySelector(
    'grand-transition-resolution-results',
  ) as GrandTransitionResolutionResults;
  screen.snapshot = snapshot;
  await screen.updateComplete;
  return screen;
}

function resolutionFixture(): ResolutionResultsSnapshot {
  return Object.freeze({
    revision: 14,
    phase: 'sudden-death',
    round: 4,
    suddenDeath: false,
    players: [
      {
        playerId: 'player-one',
        characterName: 'Civic Fox',
        constructionText: 'Paper promise folds a velvet megaphone.',
        constructionStatus: 'valid',
        constructionStatusLabel: 'Valid complete construction',
        reactionLabel: 'Reaction: The opposition reels under a heavy exchange.',
        phrases: [
          { text: 'a paper promise', source: 'Carried' },
          { text: 'folds', source: 'Active' },
          { text: 'a velvet megaphone', source: 'Active' },
        ],
        terms: [
          { kind: 'clause-base', label: 'Clause base', value: '5' },
          { kind: 'finisher-bonus', label: 'Finisher activated', value: '+3' },
          {
            kind: 'weakness-match',
            label: 'Weakness “credibility” matched by “paper promise”',
            value: 'recorded',
          },
          {
            kind: 'weakness-multiplier',
            label: 'Weakness multiplier',
            value: '×2',
          },
          { kind: 'combo-chain', label: 'Combo chain', value: '×2' },
          { kind: 'combo-multiplier', label: 'Combo multiplier', value: '×2' },
          { kind: 'clause-score', label: 'Clause score', value: '+25' },
          { kind: 'unrounded-total', label: 'Unrounded subtotal', value: '28' },
          {
            kind: 'final-damage',
            label: 'Rounded sentence damage',
            value: '28',
          },
        ],
        activations: [
          'Weakness activated: credibility.',
          'Combo activated at 2×.',
          'Finisher activated: with the receipt.',
          'Strong comeback activated for +18 after sentence scoring.',
          'Grammar mistake: 1 card removed and 3 Pride lost immediately.',
          'Continuation survived: received 15 damage, below the 16-damage break threshold.',
          'Weak comeback activated for +4 after sentence scoring.',
          'Medium comeback activated for +10 after sentence scoring.',
        ],
        sentenceDamage: 28,
        comebackBonus: 18,
        outgoingDamage: 46,
        grammarMistakes: 1,
        continuationLabel:
          'Continuation survived: received 15 damage, below the 16-damage break threshold.',
        prideBefore: 74,
        prideAfter: 32,
        chargeBefore: 60,
        chargeAfter: 42,
      },
      {
        playerId: 'player-two',
        characterName: 'Brass Peacock',
        constructionText: 'Before lunch.',
        constructionStatus: 'carried',
        constructionStatusLabel:
          'Carried construction — zero outgoing damage this round',
        reactionLabel:
          'Reaction: The chamber holds its breath for the continuation.',
        phrases: [{ text: 'before lunch', source: 'Active' }],
        terms: [{ kind: 'no-score', label: 'No score terms', value: '0' }],
        activations: [
          'Continuation broke: received 42 damage, at or above the 16-damage threshold.',
          'Incomplete construction — zero sentence damage.',
        ],
        sentenceDamage: 0,
        comebackBonus: 0,
        outgoingDamage: 0,
        grammarMistakes: 0,
        continuationLabel:
          'Continuation broke: received 42 damage, at or above the 16-damage threshold.',
        prideBefore: 52,
        prideAfter: 28,
        chargeBefore: 40,
        chargeAfter: 60,
      },
    ],
    outcome:
      'Double knockout recorded. The cliffhanger starts with restored Pride.',
    announcement:
      'Civic Fox: Pride 74 to 32, charge 60 to 42. Brass Peacock: Pride 52 to 28, charge 40 to 60.',
    continueLabel: 'Continue to sudden death',
    results: null,
  } satisfies ResolutionResultsSnapshot);
}

function resultsFixture(): ResolutionResultsSnapshot {
  const resolution = resolutionFixture();
  return Object.freeze({
    ...resolution,
    revision: 30,
    phase: 'results',
    suddenDeath: true,
    outcome: 'The higher cliffhanger score decided the match.',
    continueLabel: null,
    results: {
      winnerName: 'Civic Fox',
      finalScores: [
        { playerId: 'player-one', characterName: 'Civic Fox', score: 42 },
        { playerId: 'player-two', characterName: 'Brass Peacock', score: 0 },
      ],
      bestInsult: 'None',
      highestDamage: 42,
      longestSentence: 0,
      weaknesses: 0,
      highestCombo: 0,
      grammarMistakes: 0,
      comebacks: 0,
    },
  } satisfies ResolutionResultsSnapshot);
}

function cliffhangerState(
  scores: readonly [number, number],
  prideAfter: readonly [number, number],
): MatchState {
  const playerIds = ['player-one', 'player-two'] as const;
  const characters = ['civic-fox', 'brass-peacock'] as const;
  const players = Object.fromEntries(
    playerIds.map((playerId, index) => [
      playerId,
      {
        playerId,
        constructionText: '',
        constructionStatus: 'incomplete',
        constructionPhrases: [],
        prideBefore: 100,
        selfDamage: 0,
        opponentOutgoingDamage: 0,
        prideAfter: prideAfter[index]!,
        chargeBefore: 0,
        chargeAfter: 0,
        sentenceDamage: scores[index]!,
        comebackBonus: 0,
        outgoingDamage: scores[index]!,
        sentenceSubtotal: scores[index]!,
        phraseCount: 0,
        completeValidInsult: false,
        insultText: null,
        weaknessActivated: false,
        comboMultiplier: 0,
        comebackActivated: false,
        comebackTier: null,
        comebackClosingLine: null,
        grammarMistakes: 0,
        score: null,
        continuation: { status: 'none', restoredCarry: null },
      } satisfies MatchResolutionPlayer,
    ]),
  );
  return {
    phase: 'sudden-death',
    draft: null,
    round: 3,
    playerOrder: playerIds,
    playerStates: Object.fromEntries(
      playerIds.map((playerId, index) => [
        playerId,
        { characterId: characters[index] },
      ]),
    ),
    commandHistory: [],
    resolutionHistory: [
      {
        round: 2,
        openingPlayerId: playerIds[0],
        suddenDeath: true,
        order: [
          'lock-constructions',
          'calculate-breakdowns',
          'apply-simultaneous-damage',
          'clamp-pride',
          'gain-charge-after-spending',
          'resolve-continuations',
          'check-knockout',
        ],
        players,
      },
    ],
  } as unknown as MatchState;
}
