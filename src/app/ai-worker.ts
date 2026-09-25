import { decideAiTurn } from '../ai/ai-turn.ts';
import type { MatchEngineContext } from '../engine/match-lifecycle.ts';
import type { AiWorkerCommand, AiWorkerMessage } from './ai-decider.ts';

const worker = globalThis as unknown as {
  onmessage: ((event: MessageEvent<AiWorkerCommand>) => void) | null;
  postMessage(message: AiWorkerMessage): void;
};

// One context per match. Keeping the same object across turns keeps the
// identity-keyed engine caches warm.
let current: Readonly<{ contextId: number; context: MatchEngineContext }> | null = null;

worker.onmessage = ({ data }) => {
  if (data.type === 'context') {
    current = { contextId: data.contextId, context: data.context };
    return;
  }
  if (current?.contextId !== data.contextId) {
    worker.postMessage({ type: 'failure', requestId: data.requestId });
    return;
  }
  try {
    const decision = decideAiTurn(data.state, current.context, { reducedDelay: data.reducedDelay });
    worker.postMessage({ type: 'decision', requestId: data.requestId, decision });
  } catch {
    worker.postMessage({ type: 'failure', requestId: data.requestId });
  }
};
