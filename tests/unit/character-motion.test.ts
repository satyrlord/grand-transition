import { describe, expect, test } from 'vitest';
import { characterMotion, projectCharacterCue } from '../../src/app/character-motion';
import type { GameCommand } from '../../src/engine/game-contracts';
import type { MatchResolution, MatchResolutionPlayer } from '../../src/engine/match-lifecycle';

const command = (type: string, actorId = 'one'): GameCommand => ({ type, actorId, source: 'user', payload: {} });
const state = (...commands: GameCommand[]) => ({ commandHistory: commands, playerOrder: ['one', 'two'] as const });
function player(playerId: string, overrides: Partial<MatchResolutionPlayer> = {}): MatchResolutionPlayer {
  return {
    playerId, constructionText: '', constructionStatus: 'incomplete', constructionPhrases: [],
    prideBefore: 100, selfDamage: 0, opponentOutgoingDamage: 0, prideAfter: 100,
    chargeBefore: 0, chargeAfter: 0, sentenceDamage: 0, comebackBonus: 0, outgoingDamage: 0,
    sentenceSubtotal: 0, phraseCount: 0, completeValidInsult: false, insultText: null,
    weaknessActivated: false, comboMultiplier: 1, comebackActivated: false,
    comebackTier: null, comebackClosingLine: null, grammarMistakes: 0, score: null,
    continuation: { status: 'none', restoredCarry: null }, ...overrides,
  };
}
function review(one: Partial<MatchResolutionPlayer>, two: Partial<MatchResolutionPlayer> = {}): MatchResolution {
  return {
    round: 1, openingPlayerId: 'one', suddenDeath: false,
    order: ['lock-constructions', 'calculate-breakdowns', 'apply-simultaneous-damage', 'clamp-pride', 'gain-charge-after-spending', 'resolve-continuations', 'check-knockout'],
    players: { one: player('one', one), two: player('two', two) },
  };
}

describe('public character motion projection', () => {
  test('selects only on entry and does not replay entry on later rounds', () => {
    expect(projectCharacterCue(state(command('prepare-round')), 'one', null, null).stateId).toBe('selection');
    expect(projectCharacterCue(state(command('prepare-round'), command('prepare-round')), 'one', null, null).stateId).toBe('idle');
  });

  test('projects only the accepted actor and does not use private command payloads', () => {
    const input = state({ ...command('select-phrase'), payload: { privateCard: 'secret-unplayed-fixture' } });
    const cue = projectCharacterCue(input, 'one', null, null);
    expect(cue).toEqual({ stateId: 'delivery', sequence: 1 });
    expect(Object.isFrozen(cue)).toBe(true);
    expect(JSON.stringify(cue)).not.toContain('secret');
    expect(projectCharacterCue(input, 'two', null, null).stateId).toBe('idle');
    expect(projectCharacterCue(state(command('select-comeback')), 'one', null, null).stateId).toBe('comeback');
    expect(projectCharacterCue(state(command('redraw-hand')), 'one', null, null).stateId).toBe('idle');
  });

  test('grammar mistakes override delivery for the affected actor only', () => {
    const input = state(command('select-phrase'));
    const reaction = { kind: 'grammar-mistake' as const, playerId: 'one', damage: 3, sequence: 1 };
    expect(projectCharacterCue(input, 'one', reaction, null).stateId).toBe('grammar-mistake');
    expect(projectCharacterCue(input, 'two', reaction, null).stateId).toBe('idle');
  });

  test.each([[0, 'idle'], [1, 'light-hit'], [19, 'light-hit'], [20, 'heavy-hit'], [100, 'heavy-hit']] as const)(
    'projects incoming damage %s as %s without changing damage', (damage, expected) => {
      const resolution = review({ opponentOutgoingDamage: damage });
      const before = JSON.stringify(resolution);
      expect(projectCharacterCue(state(), 'one', null, resolution).stateId).toBe(expected);
      expect(JSON.stringify(resolution)).toBe(before);
    },
  );

  test('uses the opponent weakness result rather than the actor outgoing result', () => {
    expect(projectCharacterCue(state(), 'one', null,
      review({ opponentOutgoingDamage: 20 }, { weaknessActivated: true })).stateId).toBe('weakness');
    expect(projectCharacterCue(state(), 'one', null,
      review({ opponentOutgoingDamage: 20, weaknessActivated: true })).stateId).toBe('heavy-hit');
  });

  test('keeps grammar self-damage separate and supports undamaged comeback and delivery', () => {
    expect(projectCharacterCue(state(), 'one', null,
      review({ selfDamage: 3, grammarMistakes: 1, opponentOutgoingDamage: 20 })).stateId).toBe('grammar-mistake');
    expect(projectCharacterCue(state(), 'one', null, review({ comebackActivated: true })).stateId).toBe('comeback');
    expect(projectCharacterCue(state(), 'one', null, review({ completeValidInsult: true })).stateId).toBe('delivery');
  });

  test('all authored loops and reactions meet the fixed duration bounds', () => {
    expect(Object.keys(characterMotion)).toHaveLength(9);
    for (const [id, motion] of Object.entries(characterMotion)) {
      expect(Object.isFrozen(motion)).toBe(true);
      expect(motion.durationMs).toBeGreaterThanOrEqual(motion.loop ? 2000 : 150);
      expect(motion.durationMs).toBeLessThanOrEqual(motion.loop ? 8000 : 600);
      expect(motion.loop).toBe(id === 'idle' || id === 'thinking');
    }
  });
});
