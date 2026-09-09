import type { SkinSpeechProfile } from '../../src/audio/skin-speech-profile';
import { describe, expect, test, vi } from 'vitest';
import { RoundPresentation, type RoundPresentationFrame } from '../../src/app/round-presentation';
import { GameSpeech } from '../../src/audio/game-speech';
import type { SpeechRequest } from '../../src/audio/speech-port';
import type { AudioPort } from '../../src/audio/audio-port';
import { defaultSettings } from '../../src/persistence/codecs/settings-codec';
import { component, publicPlayer, publicOpponent, resolution } from '../fixtures/narration';

function harness(enabled = true) {
  let now = 0; let nextId = 0;
  const tasks = new Map<number, { at: number; callback: () => void }>();
  const requests: SpeechRequest[] = [];
  const voice = { available: true, cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(),
    speak: (request: SpeechRequest) => { requests.push(request); return { accepted: true }; } };
  const speech = new GameSpeech(voice); speech.userGesture();
  const play = vi.fn(); const completed = vi.fn();
  let frame: RoundPresentationFrame | null = null;
  const controller = new RoundPresentation(speech, { play } as unknown as AudioPort, {
    now: () => now, setTimeout: (callback, delay) => { tasks.set(++nextId, { at: now + delay, callback }); return nextId; },
    clearTimeout: (id) => { tasks.delete(id); },
  }, (value) => { frame = value; }, completed);
  const input = { resolution: resolution(), firstSpeakerId: 'two', components: { one: [component(10)], two: [component(20)] },
    settings: { ...defaultSettings, speechEnabled: enabled }, voices: { one: { provider: 'neural', voiceUri: 'kokoro:bm_george', language: 'en-GB', pitch: 0.9 } as SkinSpeechProfile,
      two: { provider: 'neural', voiceUri: 'kokoro:bm_george', language: 'en-GB', pitch: 1.1 } as SkinSpeechProfile } };
  function advance(ms: number) {
    const target = now + ms;
    for (let count = 0; count < 1000; count++) {
      const next = [...tasks.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > target) { now = target; return; }
      now = next[1].at; tasks.delete(next[0]); next[1].callback();
    }
    throw new Error('The presentation clock did not settle.');
  }
  return { controller, input, voice, requests, play, completed, advance, frame: () => frame };
}

describe('reference round presentation', () => {
  test('last finisher recites, receives inline scoring, lands damage, then yields to the other speaker', () => {
    const h = harness(); const original = JSON.stringify(h.input);
    h.controller.start(h.input);
    expect(h.frame()?.phase).toBe('preparing'); expect(h.requests[0]?.text).toBe(publicOpponent.insultText);
    expect(h.frame()?.pride).toEqual({ one: 100, two: 100 });
    h.requests[0]!.onStart!();
    expect(h.frame()?.cues.two).toMatchObject({ stateId: 'delivery', hold: true });
    expect(h.frame()?.cues.one?.stateId).toBe('idle');
    h.requests[0]!.onSegment!(0); expect(h.frame()?.components).toHaveLength(0);
    h.requests[0]!.onSegment!(1); expect(h.frame()?.components).toEqual([component(20)]);
    h.requests[0]!.onEnd!(); expect(h.frame()?.total).toBe(20);
    h.advance(1200); expect(h.frame()?.phase).toBe('strike');
    h.advance(500); expect(h.frame()?.phase).toBe('points');
    h.advance(499); expect(h.frame()?.pride.one).toBe(100);
    h.advance(1); expect(h.frame()?.phase).toBe('damage'); expect(h.frame()?.pride.one).toBe(80);
    expect(h.frame()?.cues.one?.stateId).toBe('heavy-hit'); expect(h.play).toHaveBeenCalledExactlyOnceWith('hit-heavy');
    h.advance(499); expect(h.requests).toHaveLength(1);
    h.advance(1); expect(h.requests[1]?.text).toBe(publicPlayer.insultText);
    h.requests[1]!.onStart!(); h.requests[1]!.onSegment!(1); h.requests[1]!.onEnd!();
    h.advance(2700); expect(h.frame()).toBeNull(); expect(h.completed).toHaveBeenCalledOnce();
    expect(JSON.stringify(h.input)).toBe(original);
  });

  test('Pause preserves the exact remaining presentation time and blocks stale cancellation callbacks', () => {
    const h = harness(); h.controller.start(h.input); h.requests[0]!.onEnd!();
    h.advance(400); h.controller.pause(); h.advance(100000); expect(h.frame()?.phase).toBe('total');
    h.controller.resume(); h.advance(799); expect(h.frame()?.phase).toBe('total');
    h.advance(1); expect(h.frame()?.phase).toBe('strike');
    h.controller.cancel(); h.requests[0]!.onStart!(); h.requests[0]!.onEnd!(); h.advance(100000);
    expect(h.frame()).toBeNull(); expect(h.completed).not.toHaveBeenCalled();
  });

  test('a settings change cancels active speech and continues the presentation silently', () => {
    const h = harness(); h.controller.start(h.input); h.controller.pause();
    h.controller.updateSettings({ ...h.input.settings, speechEnabled: false });
    h.controller.resume(); h.advance(10_000);
    expect(h.voice.cancel).toHaveBeenCalled();
    expect(h.requests).toHaveLength(1);
    expect(h.completed).toHaveBeenCalledOnce();
    expect(h.frame()).toBeNull();
  });

  test('silent delivery follows the same ordered sequence without a mandatory Continue action', () => {
    const h = harness(false); h.controller.start(h.input);
    expect(h.frame()?.phase).toBe('reciting'); expect(h.requests).toHaveLength(0);
    h.advance(9400); expect(h.completed).toHaveBeenCalledOnce(); expect(h.frame()).toBeNull();
  });

  test('a continuation thinks without speaking a fragment', () => {
    const h = harness();
    h.controller.start({ ...h.input, resolution: resolution({ one: { ...publicPlayer, opponentOutgoingDamage: 0, prideAfter: 100 },
      two: { ...publicOpponent, completeValidInsult: false, constructionStatus: 'carried', outgoingDamage: 0, insultText: null },
    }) });
    expect(h.frame()?.phase).toBe('hesitating'); expect(h.requests).toHaveLength(0);
    h.advance(1999); expect(h.frame()?.phase).toBe('hesitating');
    h.advance(1); expect(h.requests).toHaveLength(1);
    expect(h.frame()?.total).toBeNull(); expect(h.play).not.toHaveBeenCalled();
  });

  test.each([0, 1, 15, 16, 100])('lands damage %s at the impact boundary without suppressing the second speaker', (damage) => {
    const h = harness();
    h.controller.start({ ...h.input, resolution: resolution({
      one: { ...publicPlayer, opponentOutgoingDamage: damage, prideAfter: Math.max(0, 100 - damage) },
      two: { ...publicOpponent, outgoingDamage: damage },
    }) });
    h.requests[0]!.onEnd!(); h.advance(2199); expect(h.frame()?.pride.one).toBe(100);
    h.advance(1); expect(h.frame()?.pride.one).toBe(Math.max(0, 100 - damage));
    expect(h.frame()?.cues.one?.stateId).toBe(damage === 0 ? 'idle' : damage < 16 ? 'light-hit' : 'heavy-hit');
    expect(h.play.mock.calls.flat()).toEqual(damage === 0 ? [] : [damage < 16 ? 'hit-light' : 'hit-heavy']);
    h.advance(500); expect(h.requests).toHaveLength(2); expect(h.completed).not.toHaveBeenCalled();
  });

  test('bonus cues follow completed phrases once and the comeback follows its closing line', () => {
    const h = harness();
    h.controller.start({ ...h.input, components: {
      ...h.input.components,
      two: [{ ...component(20), weaknessFactor: 1.5, weaknessTags: ['evidence'] }],
    }, resolution: resolution({ one: publicPlayer, two: {
      ...publicOpponent, comebackActivated: true, comebackClosingLine: 'The record is closed.',
      score: { finalDamage: 20, unroundedTotal: 20, combo: null, breakdown: [
        { kind: 'combo-chain', operation: 'note', nounPhraseId: 'audit', phraseIndex: 0, chain: 2 },
        { kind: 'weakness-match', operation: 'note', phraseId: 'failed', phraseIndex: 1, defenderTag: 'evidence' },
      ] },
    } }) });
    const voice = h.requests[0]!;
    voice.onStart!(); voice.onSegment!(0); expect(h.play).not.toHaveBeenCalled();
    voice.onSegment!(1); expect(h.play.mock.calls.flat()).toEqual(['combo']);
    expect(h.frame()?.emphasis).toContainEqual({ kind: 'combo', playerId: 'two', text: 'Your audit', value: 2 });
    voice.onSegment!(2); expect(h.play.mock.calls.flat()).toEqual(['combo', 'weakness']);
    expect(h.frame()?.emphasis).toContainEqual({ kind: 'weakness', playerId: 'one', text: 'evidence', value: 1.5 });
    voice.onSegment!(2); voice.onEnd!(); voice.onEnd!();
    expect(h.play.mock.calls.flat()).toEqual(['combo', 'weakness', 'comeback']);
  });

  test('a later-clause weakness waits for its component narration anchor', () => {
    const h = harness();
    const phrases = Array.from({ length: 4 }, (_, index) => ({
      phraseId: `phrase-${index}`,
      text: `phrase ${index}`,
      source: 'active' as const,
    }));
    h.controller.start({
      ...h.input,
      components: {
        ...h.input.components,
        two: [{
          ...component(20),
          narrationIndex: 3,
          weaknessFactor: 1.5,
          weaknessTags: ['evidence'],
        }],
      },
      resolution: resolution({
        one: publicPlayer,
        two: {
          ...publicOpponent,
          constructionText: 'phrase 0 phrase 1 phrase 2 phrase 3',
          insultText: 'phrase 0 phrase 1 phrase 2 phrase 3',
          constructionPhrases: phrases,
          score: {
            finalDamage: 20,
            unroundedTotal: 20,
            combo: null,
            breakdown: [{
              kind: 'weakness-match',
              operation: 'note',
              phraseId: 'phrase-3',
              phraseIndex: 0,
              defenderTag: 'evidence',
            }],
          },
        },
      }),
    });
    const voice = h.requests[0]!;
    voice.onStart!();
    for (let index = 0; index <= 3; index++) voice.onSegment!(index);
    expect(h.play).not.toHaveBeenCalled();
    expect(h.frame()?.emphasis).not.toContainEqual(
      expect.objectContaining({ kind: 'weakness' }),
    );
    voice.onEnd!();
    expect(h.play).toHaveBeenCalledExactlyOnceWith('weakness');
    expect(h.frame()?.emphasis).toContainEqual({
      kind: 'weakness',
      playerId: 'one',
      text: 'evidence',
      value: 1.5,
    });
  });

  test('failed synthesis finishes silently and does not accept its later completion', () => {
    const h = harness(); h.controller.start(h.input);
    h.requests[0]!.onError!(); expect(h.frame()?.phase).toBe('reciting');
    h.requests[0]!.onEnd!(); expect(h.frame()?.total).toBeNull();
    h.advance(2000); expect(h.frame()?.total).toBe(20);
    h.advance(2700); expect(h.requests).toHaveLength(2);
  });

  test('direct grammar knockout shows only the damage stance, then completes after 520 ms', () => {
    const h = harness();
    h.controller.selfDamage(resolution(), 'one', 3, true);
    expect(h.requests).toHaveLength(0); expect(h.frame()?.cues.one).toMatchObject({ stateId: 'grammar-mistake', hold: true });
    h.advance(519); expect(h.completed).not.toHaveBeenCalled();
    h.advance(1); expect(h.completed).toHaveBeenCalledOnce(); expect(h.frame()).toBeNull();
  });

  test('cliffhanger keeps score points separate from scaled Pride loss and hit severity', () => {
    const h = harness(); h.controller.start({ ...h.input, resolution: {
      ...resolution({ one: { ...publicPlayer, opponentOutgoingDamage: 100, prideAfter: 0 },
        two: { ...publicOpponent, outgoingDamage: 5 } }), suddenDeath: true,
    } });
    h.requests[0]!.onEnd!(); expect(h.frame()?.total).toBe(5);
    h.advance(2200); expect(h.frame()?.damage).toEqual({ playerId: 'one', amount: 100 });
    expect(h.frame()?.pride.one).toBe(0); expect(h.frame()?.cues.one?.stateId).toBe('heavy-hit');
    expect(h.play).toHaveBeenCalledExactlyOnceWith('hit-heavy');
  });
});
