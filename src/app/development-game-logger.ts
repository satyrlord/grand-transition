import { englishGameLocale, sampleContent } from '../game-content';
import type { MatchCommand, MatchState } from '../engine/match-lifecycle';

export type DevelopmentGameLogTransition = Readonly<{
  initialSeed: number;
  action: string;
  actorId?: string | null;
  outcome: 'accepted' | 'rejected';
  errorCode?: string;
  command: MatchCommand | null;
  before: MatchState | null;
  after: MatchState;
}>;

type LogSink = (text: string) => Promise<void>;

const phraseTextById = new Map(
  sampleContent.phrases.map((phrase) => [
    phrase.id,
    englishGameLocale.messages[phrase.textKey] ?? phrase.id,
  ]),
);

export class DevelopmentGameLogger {
  private lines: string[] = [];
  private sequence = 0;

  constructor(private readonly sink: LogSink = writeLogToRepository) {}

  capture(transition: DevelopmentGameLogTransition): void {
    if (transition.action === 'start-match') {
      this.lines = [JSON.stringify(headerRecord(transition))];
      this.sequence = 0;
    }
    if (this.lines.length === 0) return;

    this.sequence += 1;
    this.lines.push(JSON.stringify(actionRecord(this.sequence, transition)));
    if (transition.after.phase !== 'results' || !transition.after.winner) {
      return;
    }

    this.lines.push(JSON.stringify(completionRecord(transition.after)));
    const text = `${this.lines.join('\n')}\n`;
    this.lines = [];
    this.sequence = 0;
    void this.sink(text).catch((error: unknown) => {
      console.error(
        `Could not write the completed match log: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }
}

function headerRecord(transition: DevelopmentGameLogTransition) {
  const state = transition.after;
  return {
    type: 'match-log',
    formatVersion: 1,
    seed: transition.initialSeed,
    mode: state.mode,
    sceneId: state.sceneId,
    players: state.playerOrder.map((playerId) => ({
      playerId,
      characterId: state.playerStates[playerId]!.characterId,
    })),
  };
}

function actionRecord(
  sequence: number,
  transition: DevelopmentGameLogTransition,
) {
  return {
    type: 'action',
    sequence,
    command: publicCommandRecord(transition),
    move: moveRecord(transition),
    outcome: transition.outcome,
    errorCode: transition.errorCode ?? null,
    state: publicStateRecord(transition.after),
  };
}

function moveRecord(transition: DevelopmentGameLogTransition) {
  const command = transition.command;
  if (command?.type !== 'select-phrase') {
    return { type: transition.action };
  }
  if (isRejectedPrivateSelection(transition)) {
    return {
      type: command.type,
      actorId: command.actorId,
      source: command.payload.card.source,
    };
  }
  const phraseId = selectedPhraseId(transition.before, command);
  return {
    type: command.type,
    actorId: command.actorId,
    source: command.payload.card.source,
    cardId: command.payload.card.cardId,
    phraseId,
    text: phraseId ? phraseText(phraseId) : null,
  };
}

function publicCommandRecord(transition: DevelopmentGameLogTransition) {
  if (isRejectedPrivateSelection(transition)) {
    return {
      type: transition.command.type,
      source: transition.command.source,
      actorId: transition.command.actorId,
      payload: { card: { source: transition.command.payload.card.source } },
    };
  }
  return transition.command;
}

function isRejectedPrivateSelection(
  transition: DevelopmentGameLogTransition,
): transition is DevelopmentGameLogTransition &
  Readonly<{
    command: Extract<MatchCommand, { type: 'select-phrase' }>;
    outcome: 'rejected';
  }> {
  return (
    transition.outcome === 'rejected' &&
    transition.command?.type === 'select-phrase' &&
    transition.command.payload.card.source === 'private'
  );
}

function publicStateRecord(state: MatchState) {
  return {
    phase: state.phase,
    round: state.round,
    activePlayerId: state.activePlayerId,
    players: Object.fromEntries(
      state.playerOrder.map((playerId) => {
        const player = state.playerStates[playerId]!;
        return [
          playerId,
          {
            characterId: player.characterId,
            pride: player.pride,
            charge: player.comebackCharge,
            bubble: publicBubbleText(state, playerId),
            construction: constructionRecord(state, playerId),
          },
        ];
      }),
    ),
    board:
      state.draft?.board.slots.map((slot, index) => ({
        slot: index + 1,
        phraseId: slot.phraseId,
        text: phraseText(slot.phraseId),
        available: slot.available,
      })) ?? [],
    latestResolution: resolutionRecord(state),
  };
}

function completionRecord(state: MatchState) {
  return {
    type: 'match-complete',
    winner: state.winner,
    roundCount: state.resolutionHistory.length,
    state: publicStateRecord(state),
  };
}

function selectedPhraseId(
  state: MatchState | null,
  command: Extract<MatchCommand, { type: 'select-phrase' }>,
): string | null {
  const draft = state?.draft;
  if (!draft) return null;
  if (command.payload.card.source === 'shared') {
    return (
      draft.board.slots.find((slot) => slot.id === command.payload.card.cardId)
        ?.phraseId ?? null
    );
  }
  const actorId = command.actorId;
  if (!actorId) return null;
  return (
    draft.playerStates[actorId]?.hand.find(
      (card) => card.id === command.payload.card.cardId,
    )?.phraseId ?? null
  );
}

function resolutionRecord(state: MatchState) {
  const resolution = state.resolutionHistory.at(-1);
  if (!resolution) return null;
  return {
    round: resolution.round,
    openingPlayerId: resolution.openingPlayerId,
    suddenDeath: resolution.suddenDeath,
    players: Object.fromEntries(
      state.playerOrder.map((playerId) => {
        const player = resolution.players[playerId]!;
        return [
          playerId,
          {
            constructionText: player.constructionText,
            constructionStatus: player.constructionStatus,
            phraseIds: player.constructionPhrases.map(
              (phrase) => phrase.phraseId,
            ),
            grammarMistakes: player.grammarMistakes,
            selfDamage: player.selfDamage,
            outgoingDamage: player.outgoingDamage,
            prideAfter: player.prideAfter,
          },
        ];
      }),
    ),
  };
}

function publicBubbleText(state: MatchState, playerId: string): string {
  const current =
    state.draft?.playerStates[playerId]?.construction.previewText.trim() ?? '';
  if (current) return current;
  for (const resolution of state.resolutionHistory.toReversed()) {
    const prior = resolution.players[playerId]?.constructionText.trim();
    if (prior) return prior;
  }
  return 'No sentence yet.';
}

function constructionRecord(state: MatchState, playerId: string) {
  const current = state.draft?.playerStates[playerId]?.construction;
  if (current) {
    return {
      text: current.previewText,
      status: current.analysis.sentenceStatus,
      legal: current.analysis.legal,
      complete: current.analysis.complete,
      grammarMistakes: current.grammarMistakes,
      phrases: current.selectedCards.map((card) => ({
        phraseId: card.phraseId,
        text: phraseText(card.phraseId),
        source: card.source,
      })),
    };
  }
  const resolved = state.resolutionHistory.at(-1)?.players[playerId];
  return resolved
    ? {
        text: resolved.constructionText,
        status: resolved.constructionStatus,
        legal: resolved.constructionStatus !== 'incomplete',
        complete: resolved.completeValidInsult,
        grammarMistakes: resolved.grammarMistakes,
        phrases: resolved.constructionPhrases.map((phrase) => ({
          ...phrase,
          text: phraseText(phrase.phraseId),
        })),
      }
    : null;
}

function phraseText(phraseId: string): string {
  return phraseTextById.get(phraseId) ?? phraseId;
}

async function writeLogToRepository(text: string): Promise<void> {
  const response = await fetch(new URL('__game-log', document.baseURI), {
    method: 'POST',
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
    body: text,
  });
  if (!response.ok) {
    throw new Error(`Development log server returned ${response.status}.`);
  }
}

const logger = new DevelopmentGameLogger();
window.grandTransitionDevelopmentGameLog = (transition) =>
  logger.capture(transition);

declare global {
  interface Window {
    grandTransitionDevelopmentGameLog?: (
      transition: DevelopmentGameLogTransition,
    ) => void;
  }
}
