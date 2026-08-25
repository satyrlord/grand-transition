import { page } from 'vitest/browser';
import { expect, test } from 'vitest';
import '../../src/app/screens/developer-controls';

async function mountControls(): Promise<void> {
  document.body.innerHTML =
    '<grand-transition-developer-controls></grand-transition-developer-controls>';
  await (
    document.querySelector('grand-transition-developer-controls') as {
      updateComplete?: Promise<unknown>;
    } | null
  )?.updateComplete;
}

test('exposes every development inspection control with semantic labels', async () => {
  await mountControls();

  await expect
    .element(page.getByRole('heading', { name: 'Simulation Registry' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('heading', { name: 'Configure' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('heading', { name: 'Run' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('heading', { name: 'Evidence' }))
    .toBeVisible();
  await expect.element(page.getByLabelText('Seed')).toHaveValue(20_260_823);
  await expect
    .element(page.getByLabelText('Scene'))
    .toHaveValue('transition-era-television-studio');
  await expect
    .element(page.getByLabelText('Player 2 matchup character'))
    .toHaveValue('thunder-tribune');
  await expect.element(page.getByLabelText('Player 1 Pride')).toHaveValue(100);
  await expect.element(page.getByLabelText('Player 2 Charge')).toHaveValue(0);
  await expect
    .element(page.getByRole('button', { name: 'Run AI versus AI' }))
    .toHaveClass(/developer-controls__primary-action/);
  await expect
    .element(page.getByText('No document', { exact: true }))
    .toBeVisible();
});

test('spawns phrases with tags and utility and skips inspection animation', async () => {
  await mountControls();

  await page.getByRole('button', { name: 'Inspect legal phrases' }).click();
  await expect
    .element(page.getByRole('columnheader', { name: 'Phrase' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('columnheader', { name: 'Tags' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('columnheader', { name: 'AI utility' }))
    .toBeVisible();
  await expect.element(page.getByRole('status')).toHaveTextContent(/Spawned/);

  await page.getByLabelText('Skip inspection animation').click();
  await expect
    .element(page.getByRole('region', { name: 'Simulation Registry' }))
    .toHaveClass(/developer-controls--skip-animation/);
});

test('runs AI versus AI and imports or exports normalized replay JSON', async () => {
  await mountControls();
  await page.getByLabelText('Seed').fill('0');
  await page.getByLabelText('Player 1 Pride').fill('12');
  await page.getByLabelText('Player 2 Charge').fill('20');

  await page.getByRole('button', { name: 'Run AI versus AI' }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent(/Completed/);
  await expect.element(page.getByText('Replay', { exact: true })).toBeVisible();
  const replayBytes = replayTextArea().value;
  expect(replayBytes.endsWith('\n')).toBe(true);
  const replay = JSON.parse(replayBytes) as {
    schemaVersion: number;
    kind: string;
    seed: number;
    setup: { players: [{ pride: number }, { charge: number }] };
  };
  expect(replay).toEqual(
    expect.objectContaining({
      schemaVersion: 1,
      kind: 'grand-transition-replay',
      seed: 0,
    }),
  );
  expect(replay.setup.players[0].pride).toBe(12);
  expect(replay.setup.players[1].charge).toBe(20);

  await page.getByRole('button', { name: 'Import replay' }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent(/Imported/);

  await page.getByLabelText('Replay JSON').fill('{');
  await expect
    .element(page.getByText('Unrecognized JSON', { exact: true }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Import replay' }).click();
  await expect
    .element(page.getByRole('status'))
    .toHaveTextContent(
      'Replay JSON is malformed. Correct the JSON and try again. Code: invalid-json.',
    );
});

test('validates content and exports the public local match log', async () => {
  await mountControls();

  await page.getByRole('button', { name: 'Validate content' }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent(/Validated/);

  await page.getByRole('button', { name: 'Prepare match log' }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent(/match-log/);
  await expect
    .element(page.getByText('Public match log', { exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Import replay' }))
    .toBeDisabled();
  await expect
    .element(page.getByRole('button', { name: 'Copy JSON' }))
    .toBeEnabled();
  await expect
    .element(page.getByRole('button', { name: 'Download JSON' }))
    .toBeEnabled();
  const bytes = replayTextArea().value;
  expect(JSON.parse(bytes)).toEqual(
    expect.objectContaining({
      schemaVersion: 1,
      kind: 'grand-transition-match-log',
      winner: expect.any(String),
    }),
  );
});

test('shows inline setup errors and disables only setup-consuming actions', async () => {
  await mountControls();

  await page.getByLabelText('Seed').fill('');
  await expect.element(page.getByText(/Seed is required/)).toBeVisible();
  await expect
    .element(page.getByLabelText('Seed'))
    .toHaveAttribute('aria-invalid', 'true');
  for (const name of [
    'Run AI versus AI',
    'Inspect legal phrases',
    'Prepare replay',
    'Prepare match log',
  ]) {
    await expect.element(page.getByRole('button', { name })).toBeDisabled();
  }
  await expect
    .element(page.getByRole('button', { name: 'Validate content' }))
    .toBeEnabled();

  await page.getByLabelText('Seed').fill('4294967295');
  await expect
    .element(page.getByRole('button', { name: 'Run AI versus AI' }))
    .toBeEnabled();

  await page.getByLabelText('Player 1 Pride').fill('101');
  await expect
    .element(page.getByText(/Player 1 Pride must be an integer/))
    .toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Run AI versus AI' }))
    .toBeDisabled();
  await page.getByLabelText('Player 1 Pride').fill('100');

  await page.getByLabelText('Player 2 Charge').fill('');
  await expect
    .element(page.getByText(/Player 2 charge is required/))
    .toBeVisible();
  await page.getByLabelText('Player 2 Charge').fill('60');
  await expect
    .element(page.getByRole('button', { name: 'Run AI versus AI' }))
    .toBeEnabled();
});

function replayTextArea(): HTMLTextAreaElement {
  return document.querySelector<HTMLTextAreaElement>(
    'textarea[name="replay-json"]',
  )!;
}
