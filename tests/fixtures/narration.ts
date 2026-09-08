import { matchResolutionOrder, type MatchResolution, type MatchResolutionPlayer } from '../../src/engine/match-lifecycle';
import type { MatchScoreComponentView } from '../../src/app/match-screen-snapshot';

export const publicPlayer: MatchResolutionPlayer = {
  playerId: 'one', constructionText: 'Your office failed.', constructionStatus: 'valid',
  constructionPhrases: [{ phraseId: 'office', text: 'Your office', source: 'active' },
    { phraseId: 'failed', text: 'failed', source: 'active' }],
  prideBefore: 100, selfDamage: 0, opponentOutgoingDamage: 20,
  prideAfter: 80, chargeBefore: 0, chargeAfter: 20, sentenceDamage: 10, comebackBonus: 0,
  outgoingDamage: 10, sentenceSubtotal: 10, phraseCount: 2, completeValidInsult: true,
  insultText: 'Your office failed.', weaknessActivated: false, comboMultiplier: 1,
  comebackActivated: false, comebackTier: null, comebackClosingLine: null, grammarMistakes: 0,
  score: null, continuation: { status: 'none', restoredCarry: null },
};
export const publicOpponent: MatchResolutionPlayer = { ...publicPlayer, playerId: 'two',
  constructionText: 'Your audit failed.', insultText: 'Your audit failed.',
  constructionPhrases: [{ phraseId: 'audit', text: 'Your audit', source: 'active' },
    { phraseId: 'failed', text: 'failed', source: 'active' }],
  outgoingDamage: 20, sentenceDamage: 20, sentenceSubtotal: 20, opponentOutgoingDamage: 10,
  prideAfter: 90, chargeAfter: 10,
};
export const resolution = (players: MatchResolution['players'] = { one: publicPlayer, two: publicOpponent }): MatchResolution => ({
  round: 1, openingPlayerId: 'one', suddenDeath: false, order: matchResolutionOrder, players,
});
export function component(amount: number): MatchScoreComponentView {
  return { kind: 'clause', narrationIndex: 1, phraseText: 'A complete clause',
    base: amount, amount, restrictionFactor: 1, weaknessFactor: 1, comboFactor: 1, weaknessTags: [] };
}
