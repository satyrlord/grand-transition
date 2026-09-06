import contract from '../assets/characters/state-contract.json' with { type: 'json' };
import type { MatchResolution, MatchState } from '../engine/match-lifecycle';
import type { MatchArenaReaction } from './match-coordinator';
import type { CharacterAssetSource } from './character-assets';

export type CharacterStateId =
  | 'idle' | 'selection' | 'thinking' | 'delivery' | 'light-hit'
  | 'heavy-hit' | 'weakness' | 'comeback' | 'grammar-mistake';

export type CharacterCue = Readonly<{ stateId: CharacterStateId; sequence: number }>;

export type CharacterFrame = Readonly<{
  id: string;
  stateId: CharacterStateId;
  url: string;
  sizes: string;
  avif: CharacterAssetSource;
  webp: CharacterAssetSource;
}>;

export const characterMotion = Object.freeze(Object.fromEntries(
  contract.states.map((state) => [state.id, Object.freeze({ durationMs: state.durationMs, loop: state.loop })]),
)) as Readonly<Record<CharacterStateId, Readonly<{ durationMs: number; loop: boolean }>>>;

/** Project accepted public facts only. Animation never changes the reducer. */
export function projectCharacterCue(
  state: Pick<MatchState, 'commandHistory' | 'playerOrder'>,
  playerId: string,
  arenaReaction: MatchArenaReaction | null,
  review: MatchResolution | null,
): CharacterCue {
  const sequence = state.commandHistory.length;
  const cue = (stateId: CharacterStateId): CharacterCue => Object.freeze({ stateId, sequence });
  if (review) {
    const result = review.players[playerId];
    const opponentId = state.playerOrder.find((id) => id !== playerId);
    const opponent = opponentId ? review.players[opponentId] : undefined;
    if (result && result.selfDamage > 0 && result.grammarMistakes > 0) return cue('grammar-mistake');
    if (result && result.opponentOutgoingDamage > 0) {
      if (opponent?.weaknessActivated) return cue('weakness');
      return cue(result.opponentOutgoingDamage >= 20 ? 'heavy-hit' : 'light-hit');
    }
    if (result?.comebackActivated) return cue('comeback');
    if (result?.completeValidInsult) return cue('delivery');
    return cue('idle');
  }
  if (arenaReaction?.playerId === playerId) return cue('grammar-mistake');
  const command = state.commandHistory.at(-1);
  if (command?.type === 'prepare-round') {
    return cue(state.commandHistory.filter((item) => item.type === 'prepare-round').length === 1 ? 'selection' : 'idle');
  }
  if (command?.type === 'start-match' || !command) return cue('selection');
  if (command.actorId !== playerId) return cue('idle');
  if (command.type === 'select-comeback') return cue('comeback');
  if (command.type === 'select-phrase' || command.type === 'commit-sentence') return cue('delivery');
  return cue('idle');
}
