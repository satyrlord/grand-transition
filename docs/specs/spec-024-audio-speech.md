# Milestone 024: Audio and Speech

**Status:** Approved  
**Depends on:** 023  
**Owns:** Music, effects, speech synthesis, mixer, and speech privacy  
**Production-file budget:** 8

## Deliver

Implement replaceable sound, music, and speech adapters plus mixer controls.
Add slice audio and optional speech voice, rate, volume, cancellation,
unavailable state, and hotseat suppression.

Minimum viable product (MVP) audio includes menu music and distinct scene
treatment. Music may be original, AI-generated, or licensed third-party work.
Original and AI-generated audio uses the project license in `LICENSE.md`.
Third-party audio may use CC0, CC BY, or CC BY-NC because the product is free
and non-commercial. Record the owner, source, and license of every
third-party asset in the asset manifest before use.
It includes role-select, commit, light and heavy hit, weakness,
combo, continuation break, comeback, and grammar-mistake cues.
Mixer
controls are Master, Music, Effects, and Speech.

Speech defaults off and stays silent until enabled after user action. Detect
support safely. Load voices immediately and after `voiceschanged`. Prefer the
saved voice Uniform Resource Identifier (`voiceURI`), then a language match,
then the system default.

Expose Auto, voice, rate,
and volume. Speak only complete public insults. Cancel on round change, exit, or
match completion. Never speak draft fragments or hidden content. Explain that voices and
processing vary and do not promise offline behavior. Show unavailable state.

## Audio and speech measurements

Runtime music and ambience provide Ogg Vorbis plus MP3 fallback at 48 kilohertz.
Short effects provide Ogg Vorbis plus MP3 fallback and have a true peak no
higher than -1 decibel full scale. Music masters target -16 LUFS integrated,
plus or minus 1 LU. Ambience targets -22 LUFS, plus or minus 2 LU. No decoded
sample exceeds 0 decibels full scale.

After a selected match package is decoded, a cue starts within 100 milliseconds
of its public event. Music and ambience changes use a 300-millisecond equal-
power crossfade. Leaving a match fades and stops both within 300 milliseconds.
At volume zero a bus produces no audible sample and does not restart a source.

Mixer ranges and defaults come from Milestone 020. Speech voice is Auto by
default. Rate is 0.5 through 2 in 0.1 steps, with default 1. Volume is 0 through
1 in 0.05 steps, with default 0.8. Pitch is character data, not a user
setting.

Any user gesture that enables audio resumes the audio context before
playback.

Speech cancellation completes within 100 milliseconds and suppresses queued
`end` callbacks from changing the new screen.

## Acceptance criteria

- **AC-024-01:** Asset validation proves both runtime formats, 48-kilohertz
  sample rate, loudness range, true-peak limit, ownership, and license.
- **AC-024-02:** Every named cue maps to a distinct asset and fires once within
  100 milliseconds after decode. Mixer gain equations pass at 0, default, and 1.
- **AC-024-03:** Crossfade, exit cleanup, mute, repeated enable, and unavailable
  audio have deterministic adapter tests and no orphan source.
- **AC-024-04:** Voice selection follows saved URI, language, system-default
  order after immediate load and `voiceschanged`.
- **AC-024-05:** Disabled, unavailable, private, incomplete, turn-change, exit,
  and match-complete states speak nothing. Cancellation completes within 100
  milliseconds.
- **AC-024-06:** Chromium, Firefox, and WebKit browser evidence records audible
  menu, scene, effect, speech, mute, and silent-fallback results.

## Impeccable user interface validation

1. Run `$impeccable audit` on mixer, speech, and unavailable states.
2. After audit repairs, run `$impeccable critique` on the same audio user
   interface (UI) slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Adapter tests cover enabled, disabled, unavailable, cancellation, and privacy
states. Browser tests cover controls and lifecycle cleanup. Manual evidence
records audible playback and silent fallback. `npm run ci` passes. Stop before
full-scene audio, presentation reactions, or remaining content.

## Reference

[Web Speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/Window/speechSynthesis)
