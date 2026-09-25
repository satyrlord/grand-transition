import { expect, test } from 'vitest';
import { decideAiTurn, type AiTurnDecision } from '../../src/ai/ai-turn.ts';
import { createWorkerAiDecider } from '../../src/app/ai-decider.ts';
import { aiTurnState, context } from '../fixtures/ai-turn.ts';

test('the AI worker returns the in-thread decision', async () => {
  const state = aiTurnState();
  let workerReplied = false;
  const decider = createWorkerAiDecider(() => {
    const worker = new Worker(new URL('../../src/app/ai-worker.ts', import.meta.url), {
      type: 'module',
    });
    // A failed worker falls back to the in-thread search. Only a worker reply
    // proves that the search ran off the main thread.
    worker.addEventListener('message', () => {
      workerReplied = true;
    });
    return worker as never;
  });
  const decision = await new Promise<AiTurnDecision | null>((resolve) => {
    decider.decide(state, context, { reducedDelay: true }, resolve);
  });
  expect(workerReplied).toBe(true);
  expect(decision).not.toBeNull();
  expect(decision).toEqual(decideAiTurn(state, context, { reducedDelay: true }));
});

test('the AI worker returns no decision when no draft turn is open', async () => {
  const state = { ...aiTurnState(), phase: 'results' as const };
  const decider = createWorkerAiDecider(
    () =>
      new Worker(new URL('../../src/app/ai-worker.ts', import.meta.url), {
        type: 'module',
      }) as never,
  );
  const decision = await new Promise<AiTurnDecision | null>((resolve) => {
    decider.decide(state, context, { reducedDelay: true }, resolve);
  });
  expect(decideAiTurn(state, context, { reducedDelay: true })).toBeNull();
  expect(decision).toBeNull();
});
