import { describe, expect, test, vi } from 'vitest';
import { decideAiTurn } from '../../src/ai/ai-turn.ts';
import {
  createWorkerAiDecider,
  type AiWorkerCommand,
  type AiWorkerMessage,
} from '../../src/app/ai-decider.ts';
import { aiTurnState, context } from '../fixtures/ai-turn.ts';

function fakeWorker(options: Readonly<{ throwOnPost?: boolean }> = {}) {
  const posted: AiWorkerCommand[] = [];
  const worker = {
    onmessage: null as ((event: MessageEvent<AiWorkerMessage>) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    onmessageerror: null as ((event: MessageEvent) => void) | null,
    postMessage: (message: AiWorkerCommand) => {
      if (options.throwOnPost) throw new DOMException('Cannot clone.', 'DataCloneError');
      posted.push(message);
    },
    terminate: vi.fn(),
  };
  const reply = (message: AiWorkerMessage) =>
    worker.onmessage!({ data: message } as MessageEvent<AiWorkerMessage>);
  return { worker, posted, reply };
}

describe('worker AI decider', () => {
  const state = aiTurnState();
  const expected = decideAiTurn(state, context, { reducedDelay: true });

  test('sends each match context once and returns the worker decision', () => {
    const { worker, posted, reply } = fakeWorker();
    const decider = createWorkerAiDecider(() => worker);
    const done = vi.fn();
    decider.decide(state, context, { reducedDelay: true }, done);
    decider.decide(state, context, { reducedDelay: true }, done);
    expect(posted.map(({ type }) => type)).toEqual(['context', 'decide', 'decide']);
    expect(done).not.toHaveBeenCalled();
    reply({ type: 'decision', requestId: 1, decision: expected });
    expect(done).toHaveBeenCalledExactlyOnceWith(expected);

    decider.decide(state, { ...context }, { reducedDelay: true }, done);
    expect(posted.map(({ type }) => type)).toEqual([
      'context',
      'decide',
      'decide',
      'context',
      'decide',
    ]);
  });

  test('ignores a decision after cancellation', () => {
    const { worker, reply } = fakeWorker();
    const done = vi.fn();
    const cancel = createWorkerAiDecider(() => worker).decide(
      state,
      context,
      { reducedDelay: true },
      done,
    );
    cancel();
    reply({ type: 'decision', requestId: 1, decision: expected });
    expect(done).not.toHaveBeenCalled();
  });

  test.each(['failure', 'error'] as const)(
    'runs pending and later searches in-thread after a worker %s',
    (kind) => {
      const { worker, posted, reply } = fakeWorker();
      const decider = createWorkerAiDecider(() => worker);
      const pending = vi.fn();
      decider.decide(state, context, { reducedDelay: true }, pending);
      if (kind === 'failure') reply({ type: 'failure', requestId: 1 });
      else worker.onerror!(new Event('error'));
      expect(pending).toHaveBeenCalledExactlyOnceWith(expected);
      expect(worker.terminate).toHaveBeenCalledOnce();

      const later = vi.fn();
      decider.decide(state, context, { reducedDelay: true }, later);
      expect(later).toHaveBeenCalledExactlyOnceWith(expected);
      expect(posted).toHaveLength(2);
    },
  );

  test('runs in-thread when the worker cannot start or clone the request', () => {
    const unavailable = vi.fn();
    createWorkerAiDecider(() => {
      throw new Error('No workers.');
    }).decide(state, context, { reducedDelay: true }, unavailable);
    expect(unavailable).toHaveBeenCalledExactlyOnceWith(expected);

    const { worker } = fakeWorker({ throwOnPost: true });
    const uncloneable = vi.fn();
    createWorkerAiDecider(() => worker).decide(state, context, { reducedDelay: true }, uncloneable);
    expect(uncloneable).toHaveBeenCalledExactlyOnceWith(expected);
  });
});
