import type { MatchTransition } from '../app/match-coordinator';
import type { MatchCommand } from '../engine/match-lifecycle';
import type { AudioPort, EffectId } from './audio-port';

/** Projects accepted public events once; it never inspects private cards. */
export class GameAudio {
  private readonly handled = new WeakSet<MatchTransition['state']>();
  constructor(private readonly audio: AudioPort) {}

  accepted(command: MatchCommand, transition: MatchTransition): void {
    if (this.handled.has(transition.state)) return;
    this.handled.add(transition.state);
    const cues = new Set<EffectId>();
    if (transition.reaction?.kind === 'grammar-mistake') cues.add('grammar-mistake');
    else if (command.type === 'select-phrase') {
      const publicState = transition.review?.state ?? transition.state;
      const ended = command.actorId &&
        publicState.draft?.playerStates[command.actorId]?.construction.status === 'ended';
      cues.add(ended ? 'commit' : 'role-select');
    }
    if (command.type === 'commit-sentence' || command.type === 'select-comeback') cues.add('commit');
    // Narration, bonus, and impact cues belong to the round presentation clock.
    for (const cue of cues) this.audio.play(cue);
  }
}
