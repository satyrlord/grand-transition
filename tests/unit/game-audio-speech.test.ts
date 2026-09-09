import type { SkinSpeechProfile } from '../../src/audio/skin-speech-profile';
import { describe, expect, test, vi } from 'vitest';
import { GameAudio } from '../../src/audio/game-audio';
import { GameSpeech, publicNarrationSegments } from '../../src/audio/game-speech';
import type { AudioPort } from '../../src/audio/audio-port';
import type { SpeechRequest } from '../../src/audio/speech-port';
import type { MatchTransition } from '../../src/app/match-coordinator';
import { defaultSettings } from '../../src/persistence/codecs/settings-codec';
import { publicPlayer, publicOpponent, resolution } from '../fixtures/narration';

describe('public audio event projection', () => {
  test('draft cues fire once while scored outcomes wait for narration', () => {
    const play = vi.fn();
    const game = new GameAudio({ play } as unknown as AudioPort);
    const transition: MatchTransition = { state: {} as MatchTransition['state'], reaction: null,
      review: { state: {} as MatchTransition['state'], resolution: resolution(), victory: null } };
    game.accepted({ type: 'commit-sentence', source: 'user', payload: {} }, transition);
    game.accepted({ type: 'commit-sentence', source: 'user', payload: {} }, transition);
    expect(play).toHaveBeenCalledExactlyOnceWith('commit');
  });

  test.each([false, true])('selecting a phrase projects a public cue with mistake=%s', (mistake) => {
    const play = vi.fn();
    new GameAudio({ play } as unknown as AudioPort).accepted({
      type: 'select-phrase', source: 'user', actorId: 'one', payload: { card: { source: 'shared', cardId: 'card' } },
    }, { state: {} as MatchTransition['state'], review: null,
      reaction: mistake ? { kind: 'grammar-mistake', playerId: 'one', damage: 3, sequence: 1 } : null });
    expect(play).toHaveBeenCalledExactlyOnceWith(mistake ? 'grammar-mistake' : 'role-select');
  });

  test('a phrase that ends participation uses the preserved public review state', () => {
    const play = vi.fn();
    const state = {} as MatchTransition['state'];
    const reviewState = {
      draft: {
        playerStates: {
          one: { construction: { status: 'ended' } },
        },
      },
    } as unknown as MatchTransition['state'];
    new GameAudio({ play } as unknown as AudioPort).accepted({
      type: 'select-phrase', source: 'user', actorId: 'one',
      payload: { card: { source: 'shared', cardId: 'continuation' } },
    }, {
      state,
      reaction: null,
      review: {
        state: reviewState,
        resolution: resolution(),
        victory: null,
      },
    });
    expect(play).toHaveBeenCalledExactlyOnceWith('commit');
  });
});

describe('finalized public speech', () => {
  const settings = { ...defaultSettings, speechEnabled: true };
  const profile: SkinSpeechProfile = { provider: 'neural', voiceUri: 'kokoro:bm_george', language: 'en-GB', pitch: 1 };
  function harness() {
    const requests: SpeechRequest[] = [];
    const port = { available: true, cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), prepare: vi.fn(() => ({ accepted: true })),
      speak: vi.fn((request: SpeechRequest) => { requests.push(request); return { accepted: true }; }) };
    return { port, requests, game: new GameSpeech(port) };
  }

  test.each(['gesture', 'disabled', 'unavailable', 'incomplete', 'carried', 'master-zero', 'speech-zero'])(
    '%s suppression sends no text to the adapter', (state) => {
      const { game, port } = harness();
      if (state !== 'gesture') game.userGesture();
      port.available = state !== 'unavailable';
      const accepted = game.deliver({ ...publicPlayer, completeValidInsult: state !== 'incomplete',
        constructionStatus: state === 'carried' ? 'carried' : 'valid' }, {
        ...settings, speechEnabled: state !== 'disabled', masterVolume: state === 'master-zero' ? 0 : 1,
        speechVolume: state === 'speech-zero' ? 0 : 0.8,
      }, profile, {});
      expect(accepted).toBe(false); expect(port.speak).not.toHaveBeenCalled();
      expect(game.prepare({ ...publicPlayer, completeValidInsult: state !== 'incomplete',
        constructionStatus: state === 'carried' ? 'carried' : 'valid' }, {
        ...settings, speechEnabled: state !== 'disabled', masterVolume: state === 'master-zero' ? 0 : 1,
        speechVolume: state === 'speech-zero' ? 0 : 0.8,
      }, profile)).toBe(false);
      expect(port.prepare).not.toHaveBeenCalled();
    },
  );

  test('preserves public wording and uses the skin voice instead of a retired global preference', () => {
    const { game, requests } = harness(); game.userGesture();
    game.deliver({ ...publicPlayer, comebackClosingLine: 'The microphone disagrees.' },
      { ...settings, masterVolume: 0.5, speechRate: 1.4, speechVoiceUri: 'kokoro:af_heart' }, { ...profile, pitch: 0.8 }, {});
    expect(requests[0]).toMatchObject({ text: 'Your office failed. The microphone disagrees.',
      segments: ['Your office ', 'failed.', ' The microphone disagrees.'],
      language: 'en-GB', pitch: 0.8, rate: 1.4, volume: 0.4, voiceUri: 'kokoro:bm_george' });
  });

  test('passes start and monotonic segment events once, then rejects finished or cancelled callbacks', () => {
    const { game, requests, port } = harness(); game.userGesture();
    const events = { onStart: vi.fn(), onSegment: vi.fn(), onEnd: vi.fn(), onError: vi.fn() };
    game.deliver(publicPlayer, settings, profile, events);
    const first = requests[0]!;
    first.onStart!(); first.onSegment!(0); first.onSegment!(0); first.onSegment!(-1); first.onSegment!(1); first.onSegment!(5);
    expect(events.onSegment.mock.calls.flat()).toEqual([0, 1]);
    first.onEnd!(); first.onEnd!(); first.onStart!();
    expect(events.onStart).toHaveBeenCalledOnce(); expect(events.onEnd).toHaveBeenCalledOnce();
    game.deliver(publicOpponent, settings, profile, events);
    game.pause(); game.resume(); game.cancel();
    requests[1]!.onStart!(); requests[1]!.onEnd!(); requests[1]!.onError!();
    expect(events.onStart).toHaveBeenCalledOnce(); expect(events.onError).not.toHaveBeenCalled();
    expect(port.pause).toHaveBeenCalledOnce(); expect(port.resume).toHaveBeenCalledOnce();
  });

  test('rejects invalid public phrase alignment instead of inventing or dropping words', () => {
    expect(() => publicNarrationSegments({ ...publicPlayer, constructionPhrases: [
      { phraseId: 'bad', text: 'Unrelated words', source: 'active' },
    ] })).toThrow('do not match');
    expect(publicNarrationSegments({ ...publicPlayer, completeValidInsult: false })).toEqual([]);
  });
});
