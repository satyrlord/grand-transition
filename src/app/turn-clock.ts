export type TurnClockSeconds = number | null;

type TurnClockCallbacks = Readonly<{
  onTick: (remainingSeconds: number) => void;
  onExpire: () => void;
}>;

type TurnClockDependencies = Readonly<{
  now: () => number;
  schedule: (callback: () => void, delayMilliseconds: number) => number;
  cancel: (timerId: number) => void;
}>;

const browserTurnClockDependencies: TurnClockDependencies = {
  now: () => performance.now(),
  schedule: (callback, delayMilliseconds) => window.setTimeout(callback, delayMilliseconds),
  cancel: (timerId) => window.clearTimeout(timerId),
};

/**
 * Owns elapsed-time accounting for the browser turn timer.
 *
 * The engine remains authoritative for timeout consequences. This clock only
 * reports visible second changes and requests one expiration when elapsed time
 * reaches the configured duration.
 */
export class ApplicationTurnClock {
  private remainingMilliseconds: number | null = null;
  private visibleSeconds: TurnClockSeconds = null;
  private deadlineMilliseconds: number | null = null;
  private timerId: number | undefined;
  private running = false;
  private expired = false;

  private readonly callbacks: TurnClockCallbacks;
  private readonly dependencies: TurnClockDependencies;

  constructor(
    callbacks: TurnClockCallbacks,
    dependencies: TurnClockDependencies = browserTurnClockDependencies,
  ) {
    this.callbacks = callbacks;
    this.dependencies = dependencies;
  }

  get remainingSeconds(): TurnClockSeconds {
    return this.visibleSeconds;
  }

  reset(durationSeconds: TurnClockSeconds, running: boolean): void {
    this.cancelScheduledTick();
    this.running = false;
    this.expired = false;
    this.remainingMilliseconds = durationSeconds === null ? null : durationSeconds * 1_000;
    this.visibleSeconds = durationSeconds;
    this.deadlineMilliseconds = null;
    if (running) this.resume();
  }

  pause(): void {
    if (!this.running) return;
    this.captureRemainingTime();
    this.running = false;
    this.cancelScheduledTick();
  }

  resume(): void {
    if (this.running || this.expired || this.remainingMilliseconds === null) {
      return;
    }
    this.running = true;
    this.deadlineMilliseconds = this.dependencies.now() + this.remainingMilliseconds;
    this.scheduleNextTick();
  }

  dispose(): void {
    this.cancelScheduledTick();
    this.running = false;
    this.deadlineMilliseconds = null;
  }

  private readonly advance = (): void => {
    this.timerId = undefined;
    if (!this.running || this.deadlineMilliseconds === null) return;

    const remainingMilliseconds = Math.max(0, this.deadlineMilliseconds - this.dependencies.now());
    this.remainingMilliseconds = remainingMilliseconds;
    if (remainingMilliseconds === 0) {
      this.running = false;
      this.deadlineMilliseconds = null;
      this.visibleSeconds = 0;
      if (this.expired) return;
      this.expired = true;
      this.callbacks.onExpire();
      return;
    }

    const nextVisibleSeconds = Math.ceil(remainingMilliseconds / 1_000);
    if (nextVisibleSeconds !== this.visibleSeconds) {
      this.visibleSeconds = nextVisibleSeconds;
      this.callbacks.onTick(nextVisibleSeconds);
    }
    this.scheduleNextTick();
  };

  private captureRemainingTime(): void {
    if (this.deadlineMilliseconds === null) return;
    this.remainingMilliseconds = Math.max(0, this.deadlineMilliseconds - this.dependencies.now());
    this.visibleSeconds = Math.ceil(this.remainingMilliseconds / 1_000);
    this.deadlineMilliseconds = null;
  }

  private scheduleNextTick(): void {
    if (
      !this.running ||
      this.deadlineMilliseconds === null ||
      this.remainingMilliseconds === null
    ) {
      return;
    }
    const remainingMilliseconds = Math.max(0, this.deadlineMilliseconds - this.dependencies.now());
    const visibleSeconds = Math.ceil(remainingMilliseconds / 1_000);
    const delayMilliseconds = Math.max(
      0,
      remainingMilliseconds - Math.max(0, visibleSeconds - 1) * 1_000,
    );
    this.timerId = this.dependencies.schedule(this.advance, delayMilliseconds);
  }

  private cancelScheduledTick(): void {
    if (this.timerId === undefined) return;
    this.dependencies.cancel(this.timerId);
    this.timerId = undefined;
  }
}
