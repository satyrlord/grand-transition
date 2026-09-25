import type { LitElement } from 'lit';

export async function lockInSetup(): Promise<void> {
  await clickEnabledLock('one');
  await clickEnabledLock('two');
}

async function clickEnabledLock(side: 'one' | 'two'): Promise<void> {
  const control = document.querySelector<HTMLButtonElement>(`[data-testid="lock-player-${side}"]`);
  if (!control || control.disabled || control.getAttribute('aria-pressed') === 'true') return;
  control.click();
  await settleLitUpdates();
}

async function settleLitUpdates(): Promise<void> {
  await Promise.resolve();
  const app = document.querySelector<LitElement>('grand-transition-app');
  if (app) await app.updateComplete;
  const setup = document.querySelector<LitElement>('grand-transition-setup');
  if (setup) await setup.updateComplete;
}
