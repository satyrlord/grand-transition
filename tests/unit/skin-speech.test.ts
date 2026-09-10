import { sampleContent, characterSkins } from '../../src/game-content';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { skinSpeechProfile } from '../../src/audio/skin-speech-profile';
import { CharacterSpeech } from '../../src/audio/character-speech';
import { MicrosoftRobotSpeech, selectMicrosoftRobotVoice } from '../../src/audio/microsoft-robot-speech';
import type { SpeechRequest } from '../../src/audio/speech-port';
import { GameSpeech } from '../../src/audio/game-speech';
import { defaultSettings } from '../../src/persistence/codecs/settings-codec';
import { publicPlayer } from '../fixtures/narration';

const character = (id: string, species: 'human' | 'robot' = 'human') => ({
  id, species, voiceProfile: { ...sampleContent.characters.find((value) => value.id === id)!.voiceProfile, pitch: 0.9 },
});
const femaleSpeechSkins = ['luxury-minister', 'midnight-sensationalist--alternate', 'oat-milk-reformist--alternate',
  'red-folded-chairman--alternate', 'retiring-cassandra--statesman', 'thunder-tribune--alternate', 'government-ai--schoolteacher'];
const voice = (name: string, local = true, lang = 'en-US') => ({
  name: `Microsoft ${name} - English`, voiceURI: `local:${name}`, localService: local, lang, default: false,
}) as SpeechSynthesisVoice;

afterEach(() => vi.useRealTimers());

describe('skin voice assignments', () => {
  test('GPU mode selects George and Emma while Government AI retains its native provider', () => {
    expect(skinSpeechProfile(character('red-folded-chairman'), 'default', 'gpu')).toMatchObject({provider:'neural',voiceUri:'kokoro:bm_george',pitch:0.9});
    expect(skinSpeechProfile(character('luxury-minister'), 'default', 'gpu')).toMatchObject({provider:'neural',voiceUri:'kokoro:bf_emma'});
    expect(skinSpeechProfile(character('government-ai','robot'), 'schoolteacher', 'gpu')).toMatchObject({provider:'microsoft-local',microsoftVoice:'Zira',voiceUri:'kokoro:bf_emma'});
  });
  test('the robot roster exposes David, Mark, and schoolteacher Zira in skin order', () => {
    expect(characterSkins['government-ai']?.map(({ id }) => id)).toEqual(['default', 'alternate', 'schoolteacher']);
  });
  test.each(femaleSpeechSkins)('%s uses the female British neural fallback', (id) => {
    const [ownerId, skinId = 'default'] = id.split('--');
    expect(skinSpeechProfile(character(ownerId!), skinId)).toMatchObject({ voiceUri: 'piper:vctk-p225', language: 'en-GB' });
  });
  test('male defaults and male alternate skins use George', () => {
    for (const [id, skin] of [['red-folded-chairman', 'default'], ['velvet-mogul', 'silk-diplomat']]) {
      expect(skinSpeechProfile(character(id!), skin!)).toEqual({ provider: 'neural', voiceUri: 'piper:vctk-p226', language: 'en-GB', pitch: 0.9 });
    }
  });
  test.each([['default', 'David', 'vctk-p226'], ['alternate', 'Mark', 'vctk-p226'], ['schoolteacher', 'Zira', 'vctk-p225']] as const)(
    'robot skin %s selects %s and retains the appropriate neural fallback', (skin, name, fallback) => {
      expect(skinSpeechProfile(character('government-ai', 'robot'), skin)).toMatchObject({
        provider: 'microsoft-local', microsoftVoice: name, voiceUri: `piper:${fallback}`,
      });
    });
});

function nativeHarness(voices = [voice('David'), voice('Mark'), voice('Zira')]) {
  const utterances: SpeechSynthesisUtterance[] = [];
  const service = { getVoices: () => voices, speak: vi.fn((utterance: SpeechSynthesisUtterance) => utterances.push(utterance)),
    cancel: vi.fn(), pause: vi.fn(), resume: vi.fn() };
  const port = new MicrosoftRobotSpeech({ service: () => service as unknown as SpeechSynthesis,
    utterance: (text) => ({ text }) as SpeechSynthesisUtterance });
  const events = { onStart: vi.fn(), onSegment: vi.fn(), onEnd: vi.fn(), onError: vi.fn() };
  const request: SpeechRequest = { text: 'Your office failed.', segments: ['Your office ', 'failed.'],
    language: 'en-GB', microsoftVoice: 'David', rate: 1.2, pitch: 0.72, volume: 0.4, ...events };
  const fire = (utterance: SpeechSynthesisUtterance, kind: 'onstart' | 'onend' | 'onerror') =>
    (utterance[kind] as (() => void) | null)?.();
  return { port, service, utterances, events, request, fire };
}

describe('local Microsoft robot speech', () => {
  test('selects the exact requested installed voice and rejects remote, neural, and unrelated voices', () => {
    const voices = [voice('David', false), voice('David Online', true), voice('David Neural'), voice('Mark'), voice('Zira')];
    expect(selectMicrosoftRobotVoice(voices, 'David')).toBeUndefined();
    expect(selectMicrosoftRobotVoice(voices, 'Mark')?.voiceURI).toBe('local:Mark');
    expect(selectMicrosoftRobotVoice([voice('Zira', true, 'ro-RO')], 'Zira')).toBeUndefined();
  });
  test('a complete insult uses one utterance and native word boundaries drive phrase scores', () => {
    const h = nativeHarness(); const onDiagnostic = vi.fn();
    expect(h.port.speak({ ...h.request, onDiagnostic }).accepted).toBe(true);
    expect(h.utterances[0]).toMatchObject({ text: 'Your office failed.', voice: voice('David'), rate: 1.2, pitch: 0.72, volume: 0.4, lang: 'en-US' });
    h.fire(h.utterances[0]!, 'onstart'); expect(h.events.onSegment).toHaveBeenLastCalledWith(0);
    const boundary = h.utterances[0]!.onboundary!;
    for (const charIndex of [0, 5, 12, 12, 5, -1, Number.NaN, 999]) {
      boundary.call(h.utterances[0]!, { name: 'word', charIndex } as SpeechSynthesisEvent);
    }
    expect(h.events.onSegment.mock.calls.flat()).toEqual([0, 1]);
    h.fire(h.utterances[0]!, 'onend');
    expect(h.utterances).toHaveLength(1);
    expect(h.events.onStart).toHaveBeenCalledOnce(); expect(h.events.onEnd).toHaveBeenCalledOnce();
    expect(onDiagnostic.mock.calls.map(([event]) => [event.type, event.segment])).toEqual([
      ['synthesis-start', undefined], ['playback-start', undefined], ['segment', 0], ['segment', 1],
      ['playback-end', undefined],
    ]);
    h.port.cancel();
  });
  test('Pause holds a completed delivery until resume and cancellation releases platform pause', () => {
    const h = nativeHarness(); h.port.speak(h.request);
    const oldStart = h.utterances[0]!.onstart as () => void;
    h.port.pause(); h.fire(h.utterances[0]!, 'onend'); expect(h.utterances).toHaveLength(1);
    expect(h.events.onEnd).not.toHaveBeenCalled();
    h.port.resume(); expect(h.events.onEnd).toHaveBeenCalledOnce();
    h.port.speak(h.request);
    h.port.pause(); h.port.cancel(); oldStart();
    expect(h.events.onStart).not.toHaveBeenCalled(); expect(h.events.onEnd).toHaveBeenCalledOnce();
    expect(h.service.cancel).toHaveBeenCalledOnce(); expect(h.service.resume).toHaveBeenCalledTimes(2);
  });
  test('cancellation from a start callback cannot emit a later score marker', () => {
    const h = nativeHarness(); h.port.speak({ ...h.request, onStart: () => h.port.cancel() });
    h.fire(h.utterances[0]!, 'onstart');
    expect(h.events.onSegment).not.toHaveBeenCalled(); expect(h.service.cancel).toHaveBeenCalledOnce();
  });
  test('missing native word boundaries finish once without estimated segment timers', () => {
    const h = nativeHarness(); h.port.speak(h.request);
    h.fire(h.utterances[0]!, 'onstart'); const ended = h.utterances[0]!.onend as () => void;
    ended(); ended();
    expect(h.events.onSegment).toHaveBeenCalledExactlyOnceWith(0);
    expect(h.events.onEnd).toHaveBeenCalledOnce();
  });
  test('native word progress keeps a long continuous delivery alive', () => {
    vi.useFakeTimers(); const h = nativeHarness(); h.port.speak(h.request);
    h.fire(h.utterances[0]!, 'onstart'); vi.advanceTimersByTime(50_000);
    h.utterances[0]!.onboundary!.call(h.utterances[0]!, { name: 'word', charIndex: 12 } as SpeechSynthesisEvent);
    vi.advanceTimersByTime(50_000); expect(h.events.onError).not.toHaveBeenCalled();
    h.fire(h.utterances[0]!, 'onend'); expect(h.events.onEnd).toHaveBeenCalledOnce();
  });
  test('a missing exact voice declines without speaking; a stalled utterance has a bounded, pause-aware failure', () => {
    const missing = nativeHarness([voice('David')]);
    expect(missing.port.speak({ ...missing.request, microsoftVoice: 'Mark' }).accepted).toBe(false);
    expect(missing.service.speak).not.toHaveBeenCalled();
    vi.useFakeTimers(); const h = nativeHarness(); h.port.speak(h.request);
    vi.advanceTimersByTime(10_000); h.port.pause(); vi.advanceTimersByTime(120_000);
    expect(h.events.onError).not.toHaveBeenCalled(); h.port.resume(); vi.advanceTimersByTime(49_999);
    expect(h.events.onError).not.toHaveBeenCalled(); vi.advanceTimersByTime(1); expect(h.events.onError).toHaveBeenCalledOnce();
  });
});

test('human speech never uses the system service; robots fall back to neural when the exact voice is missing', () => {
  const h = nativeHarness([voice('David')]);
  const neural = { available: true, speak: vi.fn(() => ({ accepted: true })), cancel: vi.fn() };
  const router = new CharacterSpeech(neural, h.port);
  router.speak({ ...h.request, provider: 'neural' }); expect(h.service.speak).not.toHaveBeenCalled();
  router.speak({ ...h.request, provider: 'microsoft-local', microsoftVoice: 'Mark', voiceUri: 'piper:vctk-p226' });
  expect(neural.speak).toHaveBeenCalledTimes(2); expect(h.service.speak).not.toHaveBeenCalled();
  router.speak({ ...h.request, provider: 'microsoft-local' }); expect(h.service.speak).toHaveBeenCalledOnce();
  router.cancel();
});

test.each(['throw', 'error-event'] as const)('native synchronous %s preserves neural fallback delivery callbacks', (failure) => {
  const h = nativeHarness();
  h.service.speak.mockImplementation((utterance) => {
    if (failure === 'throw') throw new Error('Platform unavailable');
    h.fire(utterance, 'onerror');
    return 0;
  });
  const requests: SpeechRequest[] = [];
  const diagnostics = vi.fn();
  const neural = { available: true, cancel: vi.fn(),
    speak: vi.fn((request: SpeechRequest) => { requests.push(request); return { accepted: true }; }) };
  const game = new GameSpeech(new CharacterSpeech(neural, h.port), diagnostics);
  game.userGesture();
  expect(game.deliver(publicPlayer, { ...defaultSettings, speechEnabled: true },
    skinSpeechProfile(character('government-ai', 'robot'), 'default'), h.events)).toBe(true);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ text: publicPlayer.insultText, voiceUri: 'piper:vctk-p226' });
  expect(diagnostics).toHaveBeenCalledWith(expect.objectContaining({
    type: 'cancel', reason: 'failure', provider: 'microsoft-local',
  }));
  expect(h.events.onError).not.toHaveBeenCalled();
  requests[0]!.onStart!(); requests[0]!.onSegment!(0); requests[0]!.onEnd!();
  expect(h.events.onStart).toHaveBeenCalledOnce();
  expect(h.events.onSegment).toHaveBeenCalledExactlyOnceWith(0);
  expect(h.events.onEnd).toHaveBeenCalledOnce();
  game.cancel();
});
