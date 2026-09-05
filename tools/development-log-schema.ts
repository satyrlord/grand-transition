import { z } from 'zod';
import { isDeepStrictEqual } from 'node:util';

const id = z.string().min(1);
const count = z.number().int().nonnegative();
const status = z.enum(['incomplete', 'complete', 'carried', 'valid']);
const phrase = z.object({
  phraseId: id, text: z.string(),
  source: z.enum(['private', 'shared', 'restored', 'active', 'carried']),
}).strict();
const construction = z.object({
  text: z.string(), status, legal: z.boolean(), complete: z.boolean(),
  grammarMistakes: count, phrases: z.array(phrase),
}).strict().nullable();
const player = z.object({
  characterId: id, pride: count.max(100), charge: count.max(60),
  bubble: z.string(), construction,
}).strict();
const resolution = z.object({
  round: count.min(1), openingPlayerId: id, suddenDeath: z.boolean(),
  players: z.record(id, z.object({
    constructionText: z.string(), constructionStatus: status,
    phraseIds: z.array(id), grammarMistakes: count, selfDamage: count,
    outgoingDamage: count, prideAfter: count.max(100),
  }).strict()),
}).strict().nullable();
const state = z.object({
  phase: z.enum(['setup', 'round-preparation', 'drafting', 'resolution', 'sudden-death', 'results']),
  round: count.min(1), activePlayerId: id, players: z.record(id, player),
  board: z.array(z.object({
    slot: count.min(1).max(9), phraseId: id, text: z.string(), available: z.boolean(),
  }).strict()).max(9), latestResolution: resolution,
}).strict();
const otherCommandType = z.enum([
  'start-match', 'prepare-round', 'resolve-round', 'redraw-hand',
  'commit-sentence', 'select-comeback', 'expire-turn',
]);
const selection = z.object({
  type: z.literal('select-phrase'), source: z.enum(['user', 'ai']),
  actorId: id.optional(), payload: z.object({
    card: z.object({ source: z.enum(['shared', 'private']), cardId: id.optional() }).strict(),
  }).strict(),
}).strict();
const command = z.union([selection, z.object({
  type: otherCommandType, source: z.enum(['user', 'ai']),
  actorId: id.optional(), payload: z.object({}).strict(),
}).strict()]);
const move = z.union([
  z.object({ type: otherCommandType }).strict(),
  z.object({
    type: z.literal('select-phrase'), actorId: id.optional(),
    source: z.enum(['shared', 'private']), cardId: id.optional(),
    phraseId: id.nullable().optional(), text: z.string().nullable().optional(),
  }).strict(),
]);
const headerSchema = z.object({
  type: z.literal('match-log'), formatVersion: z.literal(1),
  seed: count.max(0xffff_ffff), mode: z.enum(['ai', 'hotseat']), sceneId: id,
  players: z.array(z.object({ playerId: id, characterId: id }).strict()).length(2),
}).strict();
const actionSchema = z.object({
  type: z.literal('action'), sequence: count.min(1), command,
  move, outcome: z.enum(['accepted', 'rejected']),
  errorCode: id.nullable(), state,
}).strict();
const completionSchema = z.object({
  type: z.literal('match-complete'), winner: id, roundCount: count.min(1), state,
}).strict();

export function validateDevelopmentLog(text: string): { seed: number } {
  const lines = text.trimEnd().split('\n');
  const parse = (line: string): unknown => {
    try { return JSON.parse(line); }
    catch { throw new Error('The game log contains invalid JSON.'); }
  };
  const header = headerSchema.safeParse(parse(lines[0] ?? ''));
  if (!header.success) throw new Error('The game log header is invalid.');
  const players = new Map(header.data.players.map(({ playerId, characterId }) => [playerId, characterId]));
  if (players.size !== 2) throw new Error('The game log player identifiers must be distinct.');
  if (lines.length < 3) throw new Error('The game log is missing actions or completion.');
  const samePlayers = (record: object): boolean =>
    Object.keys(record).length === 2 && Object.keys(record).every((key) => players.has(key));
  const validState = (value: z.infer<typeof state>): boolean =>
    players.has(value.activePlayerId) && samePlayers(value.players) &&
    Object.entries(value.players).every(([key, value]) => players.get(key) === value.characterId) &&
    (value.latestResolution === null || (
      players.has(value.latestResolution.openingPlayerId) && samePlayers(value.latestResolution.players)
    ));
  let lastState: z.infer<typeof state> | undefined;
  for (let index = 1; index < lines.length - 1; index += 1) {
    const action = actionSchema.safeParse(parse(lines[index]!));
    if (!action.success) throw new Error(`The game log action ${index} is invalid.`);
    const value = action.data;
    if (value.sequence !== index || !validState(value.state) ||
        (value.command.actorId !== undefined && !players.has(value.command.actorId)) ||
        (value.outcome === 'accepted') !== (value.errorCode === null) ||
        value.move.type !== value.command.type ||
        (value.outcome === 'accepted' && !value.command.actorId &&
          !['start-match', 'prepare-round', 'resolve-round'].includes(value.command.type))) {
      throw new Error(`The game log action ${index} is inconsistent.`);
    }
    if (value.command.type === 'select-phrase' && value.move.type === 'select-phrase') {
      const card = value.command.payload.card;
      const redacted = value.outcome === 'rejected' && card.source === 'private';
      if (value.move.actorId !== value.command.actorId || value.move.source !== card.source ||
          (redacted
            ? card.cardId !== undefined || value.move.cardId !== undefined ||
              value.move.phraseId !== undefined || value.move.text !== undefined
            : !card.cardId || value.move.cardId !== card.cardId ||
              value.move.phraseId === undefined || value.move.text === undefined ||
              (value.outcome === 'accepted' && (value.move.phraseId === null || value.move.text === null)))) {
        throw new Error(`The game log selection ${index} is invalid.`);
      }
    }
    lastState = value.state;
  }
  const completion = completionSchema.safeParse(parse(lines.at(-1)!));
  if (!completion.success || !players.has(completion.data.winner) ||
      completion.data.state.phase !== 'results' || !validState(completion.data.state) ||
      !isDeepStrictEqual(lastState, completion.data.state)) {
    throw new Error('The game log completion is invalid.');
  }
  return { seed: header.data.seed };
}
