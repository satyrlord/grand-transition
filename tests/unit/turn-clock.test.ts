import { describe, expect, test } from 'vitest';
import { ApplicationTurnClock } from '../../src/app/turn-clock.ts';

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const scheduled = new Map<number, { at: number; callback: () => void }>();
  return {
    dependencies: {
      now: () => now,
      schedule: (callback: () => void, delayMilliseconds: number) => {
        const id = nextId;
        nextId += 1;
        scheduled.set(id, { at: now + delayMilliseconds, callback });
        return id;
      },
      cancel: (id: number) => scheduled.delete(id),
    },
    advance(milliseconds: number) {
      const target = now + milliseconds;
      for (;;) {
        const next = [...scheduled.entries()]
          .filter(([, task]) => task.at <= target)
          .toSorted((left, right) => left[1].at - right[1].at)[0];
        if (!next) break;
        const [id, task] = next;
        scheduled.delete(id);
        now = task.at;
        task.callback();
      }
      now = target;
    },
  };
}

describe('application turn clock', () => {
  test('preserves fractional elapsed time and expires once', () => {
    const time = fakeClock();
    const ticks: number[] = [];
    let expirations = 0;
    const clock = new ApplicationTurnClock(
      {
        onTick: (remainingSeconds) => ticks.push(remainingSeconds),
        onExpire: () => {
          expirations += 1;
        },
      },
      time.dependencies,
    );

    clock.reset(3, true);
    time.advance(900);
    clock.pause();
    time.advance(10_000);
    clock.resume();
    time.advance(99);
    expect(clock.remainingSeconds).toBe(3);

    time.advance(1);
    expect(clock.remainingSeconds).toBe(2);
    time.advance(2_000);
    time.advance(10_000);

    expect(ticks).toEqual([2, 1]);
    expect(expirations).toBe(1);
  });

  test('resets elapsed fractions and disables scheduling for Unlimited', () => {
    const time = fakeClock();
    const ticks: number[] = [];
    let expirations = 0;
    const clock = new ApplicationTurnClock(
      {
        onTick: (remainingSeconds) => ticks.push(remainingSeconds),
        onExpire: () => {
          expirations += 1;
        },
      },
      time.dependencies,
    );

    clock.reset(2, true);
    time.advance(1_900);
    clock.reset(2, true);
    time.advance(1_999);
    expect(clock.remainingSeconds).toBe(1);
    expect(expirations).toBe(0);

    clock.reset(null, true);
    time.advance(10_000);
    expect(clock.remainingSeconds).toBeNull();
    expect(expirations).toBe(0);
    expect(ticks).toEqual([1, 1]);
  });
});
