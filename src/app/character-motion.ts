import contract from '../assets/characters/state-contract.json' with { type: 'json' };
import type { MatchResolution, MatchState } from '../engine/match-lifecycle';
import type { MatchArenaReaction } from './match-coordinator';
import type { CharacterAssetSource } from './character-assets';

export type CharacterStateId =
  | 'idle' | 'selection' | 'thinking' | 'delivery' | 'light-hit'
  | 'heavy-hit' | 'weakness' | 'comeback' | 'grammar-mistake';

export type CharacterCue = Readonly<{ stateId: CharacterStateId; sequence: number; hold?: boolean }>;

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
    // Resolved outcomes are staged by RoundPresentation, never replayed at Victory.
    return cue('idle');
  }
  if (arenaReaction?.kind === 'grammar-mistake' && arenaReaction.playerId === playerId) {
    return cue('grammar-mistake');
  }
  const command = state.commandHistory.at(-1);
  if (command?.type === 'prepare-round') {
    return cue(state.commandHistory.filter((item) => item.type === 'prepare-round').length === 1 ? 'selection' : 'idle');
  }
  if (command?.type === 'start-match' || !command) return cue('selection');
  if (command.actorId !== playerId) return cue('idle');
  // Delivery poses belong to the narrated-round clock, not phrase selection.
  return cue('idle');
}
