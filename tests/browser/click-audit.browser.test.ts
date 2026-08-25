import { page } from 'vitest/browser';
import { afterEach, expect, test, vi } from 'vitest';
import { GrandTransitionApp } from '../../src/app/app-shell';
import {
  GrandTransitionClickAudit,
  type ClickAuditDocument,
} from '../../src/app/screens/click-audit';
import { GrandTransitionMatch } from '../../src/app/screens/match-screen';
import type {
  MatchCommand,
  MatchState,
} from '../../src/engine/match-lifecycle';

afterEach(() => {
  document.body.innerHTML = '';
});

test('correlates a shared-card click with its command and authoritative state transition', async () => {
  const { app, audit, match } = await startAuditedMatch();
  const card = match.snapshot!.sharedCards.find(
    (candidate) => candidate.role === 'noun' && candidate.reference,
  )!;
  const beforeRevision = match.snapshot!.revision;

  match
    .querySelector<HTMLButtonElement>(
      `[data-card-id="${card.reference!.cardId}"]`,
    )!
    .click();
  await vi.waitFor(() =>
    expect(
      document.querySelector<GrandTransitionMatch>('grand-transition-match')
        ?.snapshot?.revision,
    ).toBeGreaterThan(beforeRevision),
  );
  await app.updateComplete;

  const documentValue = audit.exportDocument();
  const click = documentValue.entries.find(
    (entry) =>
      entry.kind === 'ui-click' &&
      entry.details.cardId === card.reference!.cardId,
  )!;
  const command = documentValue.entries.find(
    (entry) =>
      entry.kind === 'game-action' &&
      entry.details.type === 'select-phrase' &&
      entry.clickId === click.clickId,
  );
  const result = documentValue.entries.find(
    (entry) =>
      entry.kind === 'game-result' &&
      entry.details.action === 'select-phrase' &&
      entry.clickId === click.clickId,
  );

  expect(command).toBeDefined();
  expect(result).toBeDefined();
  expect(result!.details.outcome).toBe('accepted');
  const before = stateDetails(result!.details.before);
  const after = stateDetails(result!.details.after);
  expect(boardDetails(after.board).availableCount).toBe(
    boardDetails(before.board).availableCount - 1,
  );
  const actorId = String(result!.details.actorId);
  const beforeActor = playerDetails(before.players, actorId);
  const afterActor = playerDetails(after.players, actorId);
  expect(constructionDetails(afterActor.construction).selectedCount).toBe(
    constructionDetails(beforeActor.construction).selectedCount + 1,
  );
  expect(
    constructionDetails(afterActor.construction).selectedSharedPhraseIds,
  ).toContain(card.phraseId);
  expect(
    documentValue.entries.every((entry, index) => entry.sequence === index + 1),
  ).toBe(true);
});

test('records the immediate and final lifecycle states when a match starts', async () => {
  const { audit } = await startAuditedMatch();
  const result = audit
    .exportDocument()
    .entries.find(
      (entry) =>
        entry.kind === 'game-result' && entry.details.action === 'start-match',
    );

  expect(result).toBeDefined();
  expect(stateDetails(result!.details.command)).toMatchObject({
    type: 'start-match',
    source: 'user',
  });
  expect(stateDetails(result!.details.reduced).phase).toBe('round-preparation');
  expect(stateDetails(result!.details.after).phase).toBe('drafting');
});

test('records only a private source and valid hand slot without inventing an unknown slot', async () => {
  const { app, audit, match } = await startAuditedMatch();
  const privateCard = match.snapshot!.privateCards.find(
    (candidate) => candidate.reference,
  )!;
  const privateButton = match.querySelector<HTMLButtonElement>(
    `[data-card-id="${privateCard.reference!.cardId}"]`,
  )!;

  privateButton.click();
  await vi.waitFor(() =>
    expect(
      audit
        .exportDocument()
        .entries.some(
          (entry) =>
            entry.kind === 'game-result' &&
            entry.details.action === 'select-phrase',
        ),
    ).toBe(true),
  );

  const serialized = JSON.stringify(audit.exportDocument());
  expect(serialized).not.toContain(privateCard.reference!.cardId);
  expect(serialized).not.toContain(privateCard.phraseId!);
  expect(serialized).not.toContain(privateCard.text);
  expect(serialized).toContain('"source":"private"');

  const privateClick = audit
    .exportDocument()
    .entries.find(
      (entry) =>
        entry.kind === 'ui-click' && entry.details.source === 'private',
    );
  expect(privateClick?.details).toEqual({
    source: 'private',
    slot: privateCard.slotIndex + 1,
  });

  const state = (app as unknown as { matchState: MatchState }).matchState;
  const command = {
    type: 'select-phrase',
    source: 'user',
    actorId: state.activePlayerId,
    payload: {
      card: { source: 'private', cardId: 'unknown-private-card' },
    },
  } as const satisfies MatchCommand;
  window.grandTransitionTemporaryClickAudit?.({
    kind: 'game-action-result',
    action: command.type,
    actorId: command.actorId,
    outcome: 'rejected',
    errorCode: 'unknown-card',
    command,
    before: state,
    reduced: null,
    after: state,
  });
  const rejected = audit
    .exportDocument()
    .entries.findLast(
      (entry) =>
        entry.kind === 'game-result' && entry.details.outcome === 'rejected',
    );
  const rejectedCommand = stateDetails(rejected?.details.command);
  expect(stateDetails(rejectedCommand.card).slot).toBeNull();
  expect(JSON.stringify(rejected)).not.toContain('unknown-private-card');
});

test('offers a compact local audit panel with copy, download, and clear controls', async () => {
  const audit = mountAudit();
  await audit.updateComplete;

  await page.getByRole('button', { name: /Open click audit/u }).click();
  await expect
    .element(page.getByRole('heading', { name: 'Temporary Click Audit' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Copy JSON' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Download JSON' }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();
  expect(audit.exportDocument()).toMatchObject({
    schemaVersion: 1,
    kind: 'grand-transition-click-audit',
    droppedEntryCount: 0,
  } satisfies Partial<ClickAuditDocument>);
});

test('retains a settled-render record for every rapid click', async () => {
  const audit = mountAudit();
  const probe = document.createElement('button');
  probe.textContent = 'Rapid click probe';
  document.body.prepend(probe);

  probe.click();
  probe.click();
  await vi.waitFor(() =>
    expect(
      audit
        .exportDocument()
        .entries.filter(
          (entry) => entry.kind === 'ui-settled' && entry.clickId !== null,
        ),
    ).toHaveLength(2),
  );

  const settledClickIds = audit
    .exportDocument()
    .entries.filter((entry) => entry.kind === 'ui-settled')
    .map((entry) => entry.clickId);
  expect(settledClickIds).toEqual([1, 2]);
});

test('keeps the closed audit control clear of every enabled blue-side match control', async () => {
  const { app, audit, match } = await startAuditedMatch();
  const card = match.snapshot!.sharedCards.find(
    (candidate) => candidate.role === 'noun' && candidate.reference,
  )!;

  match
    .querySelector<HTMLButtonElement>(
      `[data-card-id="${card.reference!.cardId}"]`,
    )!
    .click();
  await app.updateComplete;
  const updatedMatch = document.querySelector(
    'grand-transition-match',
  ) as GrandTransitionMatch;
  await updatedMatch.updateComplete;

  expect(
    updatedMatch
      .querySelector('.match-screen')
      ?.getAttribute('data-active-side'),
  ).toBe('blue');
  const auditToggle = audit.querySelector<HTMLButtonElement>(
    '.click-audit__toggle',
  )!;
  const auditRectangle = auditToggle.getBoundingClientRect();
  for (const control of updatedMatch.querySelectorAll<HTMLButtonElement>(
    'button:not(:disabled)',
  )) {
    expect(
      rectanglesOverlap(auditRectangle, control.getBoundingClientRect()),
    ).toBe(false);
  }
});

async function startAuditedMatch(): Promise<{
  app: GrandTransitionApp;
  audit: GrandTransitionClickAudit;
  match: GrandTransitionMatch;
}> {
  await page.viewport(1280, 720);
  const audit = mountAudit();
  const app = document.createElement(
    'grand-transition-app',
  ) as GrandTransitionApp;
  document.body.prepend(app);
  await app.updateComplete;
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await app.updateComplete;
  const match = document.querySelector(
    'grand-transition-match',
  ) as GrandTransitionMatch;
  await match.updateComplete;
  return { app, audit, match };
}

function mountAudit(): GrandTransitionClickAudit {
  const audit = document.createElement(
    'grand-transition-click-audit',
  ) as GrandTransitionClickAudit;
  document.body.append(audit);
  return audit;
}

function stateDetails(value: unknown): Record<string, unknown> {
  expect(value).toBeTypeOf('object');
  expect(value).not.toBeNull();
  return value as Record<string, unknown>;
}

function boardDetails(value: unknown): { availableCount: number } {
  return stateDetails(value) as unknown as { availableCount: number };
}

function playerDetails(
  value: unknown,
  playerId: string,
): Record<string, unknown> {
  expect(Array.isArray(value)).toBe(true);
  const player = (value as Record<string, unknown>[]).find(
    (candidate) => candidate.playerId === playerId,
  );
  expect(player).toBeDefined();
  return player!;
}

function constructionDetails(value: unknown): {
  selectedCount: number;
  selectedSharedPhraseIds: string[];
} {
  return stateDetails(value) as unknown as {
    selectedCount: number;
    selectedSharedPhraseIds: string[];
  };
}

function rectanglesOverlap(first: DOMRect, second: DOMRect): boolean {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}
