import { decideAiTurn, type AiTurnDecision } from '../ai/ai-turn.ts';
import type { MatchEngineContext, MatchState } from '../engine/match-lifecycle.ts';

export type AiDecisionCallback = (decision: AiTurnDecision | null) => void;

/**
 * Runs one AI search. The callback runs at most once, and never after the
 * returned cancel function runs.
 */
export type AiDecider = Readonly<{
  decide(
    state: MatchState,
    context: MatchEngineContext,
    options: Readonly<{ reducedDelay: boolean }>,
    done: AiDecisionCallback,
  ): () => void;
}>;

export type AiWorkerCommand =
  | Readonly<{ type: 'context'; contextId: number; context: MatchEngineContext }>
  | Readonly<{
      type: 'decide';
      requestId: number;
      contextId: number;
      state: MatchState;
      reducedDelay: boolean;
    }>;

export type AiWorkerMessage =
  | Readonly<{ type: 'decision'; requestId: number; decision: AiTurnDecision | null }>
  | Readonly<{ type: 'failure'; requestId: number }>;

type AiWorkerLike = {
  onmessage: ((event: MessageEvent<AiWorkerMessage>) => void) | null;
  onerror: ((event: Event) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: AiWorkerCommand): void;
  terminate(): void;
};

/** Runs the search on the calling thread. Tests and the worker fallback use it. */
export const inThreadAiDecider: AiDecider = {
  decide(state, context, options, done) {
    done(decideAiTurn(state, context, options));
    return () => {};
  },
};

type PendingDecision = Readonly<{
  state: MatchState;
  context: MatchEngineContext;
  reducedDelay: boolean;
  done: AiDecisionCallback;
}>;

/**
 * Runs the search in a dedicated module worker. The worker keeps one context
 * per match, so the identity-keyed engine caches stay warm across turns. When
 * the worker cannot start or fails, pending and later searches run in-thread.
 */
export function createWorkerAiDecider(
  createWorker: () => AiWorkerLike = () =>
    new Worker(new URL('./ai-worker.ts', import.meta.url), {
      type: 'module',
    }) as unknown as AiWorkerLike,
): AiDecider {
  let worker: AiWorkerLike | null = null;
  let failed = false;
  let sentContext: MatchEngineContext | null = null;
  let contextId = 0;
  let nextRequestId = 0;
  const pending = new Map<number, PendingDecision>();

  const fail = () => {
    failed = true;
    worker?.terminate();
    worker = null;
    const orphaned = [...pending.values()];
    pending.clear();
    for (const request of orphaned) {
      request.done(decideAiTurn(request.state, request.context, request));
    }
  };

  const ensureWorker = (): AiWorkerLike | null => {
    if (failed) return null;
    if (worker) return worker;
    try {
      worker = createWorker();
    } catch {
      failed = true;
      return null;
    }
    worker.onmessage = ({ data }) => {
      const request = pending.get(data.requestId);
      if (!request) return;
      if (data.type === 'failure') {
        fail();
        return;
      }
      pending.delete(data.requestId);
      request.done(data.decision);
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
    return worker;
  };

  return {
    decide(state, context, options, done) {
      const target = ensureWorker();
      if (!target) return inThreadAiDecider.decide(state, context, options, done);
      const requestId = ++nextRequestId;
      pending.set(requestId, { state, context, reducedDelay: options.reducedDelay, done });
      try {
        if (context !== sentContext) {
          contextId += 1;
          target.postMessage({ type: 'context', contextId, context });
          sentContext = context;
        }
        target.postMessage({
          type: 'decide',
          requestId,
          contextId,
          state,
          reducedDelay: options.reducedDelay,
        });
      } catch {
        // A value that cannot be cloned ends worker use for this page.
        fail();
      }
      return () => {
        pending.delete(requestId);
      };
    },
  };
}
