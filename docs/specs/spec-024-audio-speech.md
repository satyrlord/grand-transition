# Milestone 024: Audio and Speech

**Status:** Approved  
**Depends on:** 023  
**Owns:** Music, effects, local neural speech, mixer, and speech privacy
**Production-file budget:** 8 per approved delivery package

## Approved revision

On 2026-09-08, the product owner rejected procedural music and platform speech.
The owner selected local browser neural text-to-speech (TTS), with a larger
model download and device processing. A later request permits the local
Microsoft robot voices specified below. All constructed speech is generated at
runtime. Recorded phrases and phrase packs are out of scope. Milestone 025 owns
the requested Hollywood Roast presentation sequence.

The approved packages are asset preparation, audio playback and mixer, neural
worker and playback, scoring-marker projection, and narrated-round integration. Each code package has an
eight-production-file budget. Model weights, voice embeddings, runtime binaries,
licenses, and manifests form separate versioned asset packages.

## Music and effects

The menu uses Joc cu bâtă and the transition-era television studio uses
Buciumeana from Bartók's Romanian Folk Dances, Sz.56 (1915). Chris Breemer's
2025 piano recording is dedicated to the public domain under CC0. The
composition is public domain. These are Romanian folk-derived piano selections,
not a claim that this recording was used on Romanian television in the 2000s.
Other scenes retain public effects and optional speech without scene music.

The [recording entry](https://imslp.org/wiki/Special:ReverseLookup/991622)
identifies the performer and dedication. `audio-manifest.json` records owner,
source URL, license, original hash, movement, source start and duration,
derivative hashes, formats, and measured levels. The build trims whole movements,
applies short endpoint fades, and normalizes loudness. It adds no accompaniment.

Studio ambience and nine effects use the original project license. The effects
are role-select, commit, light hit, heavy hit, weakness, combo, continuation
break, comeback, and grammar mistake. Ambience uses smooth harmonic tones.
No random-noise layer is present. Ambience energy above 2 kHz must remain below
-55 dBFS RMS after a two-pole high-pass measurement.

Each asset has a WAV master and Ogg Vorbis plus MP3 runtime variants at 48 kHz.
Music targets -16 LUFS integrated, plus or minus 1 LU. Ambience targets -22 LUFS,
plus or minus 2 LU. Effects have a true peak no higher than -1 dBFS. No decoded
sample exceeds 0 dBFS. `tools/audio-assets.mjs` validates actual files through
pinned development-only FFmpeg. `audio:build` prepares them; `audio:validate`
checks them in build, asset validation, and CI.

## Playback and mixer

`audio-port.ts` defines replaceable sound and music playback. `browser-audio.ts`
owns decoded buffers, gains, crossfades, and source lifetime. `game-audio.ts`
maps accepted drafting events. Milestone 025 schedules scored outcome cues.
Audio never changes reducer state or consumes seeded game randomness.

The first trusted pointer or keyboard action creates and resumes the context.
Repeated activation reuses decoded buffers. States are idle, loading, ready,
and unavailable. Settings provides Retry sound. Ogg failure tries the paired
MP3. Failure of both leaves play silent. Events before decoding are discarded.

Audio files load as same-origin static assets with credentials omitted and
redirects rejected. Do not embed recordings in JavaScript. Preserve the default
500,000-byte JavaScript chunk budget. Milestone 004 owns the connection policy.

Master multiplies Music, Effects, and Speech gains. Ambience uses Music.
Defaults and ranges come from Milestone 020. Zero gain produces zero samples
without restarting sources. Music changes use a 300-millisecond equal-power
crossfade. Exit fades old loops within 300 milliseconds and stops effects.
Disconnection closes the context. Pause, unsupported viewports, and hidden
documents fade scene audio to silence.

After decode, effects begin within 100 milliseconds of their public events.
A phrase pick produces role-select; a grammar mistake produces grammar-mistake;
End, Comeback, and a selection that ends participation produce commit. Damage
1 through 15 uses light hit; damage 16 or more uses heavy hit. Zero is silent.
Narration markers schedule applied combo, weakness, and comeback cues. Each
event fires once per delivery. Stale callbacks cannot repeat it.

Audio status changes refresh title Settings only. They must not replace a match
snapshot, close a disclosed waiting sentence, or restart presentation.

## Local neural speech

Use Kokoro-82M v1.0 quantized ONNX, revision
`1939ad2a8e416c0acfeecc08a694d14ef25f2231`, with ONNX Runtime Web 1.29.0
and phonemizer 1.2.1. The model and pronunciation library use Apache 2.0;
ONNX Runtime uses MIT. Ship licenses and third-party notices. Six local voices
serve the current English locale. Other languages use silent presentation until
a suitable model is approved.

`tools/neural-speech-assets.mjs` prepares and validates `public/tts/kokoro/`.
`speech:build` prepares the package; `speech:validate` runs in build, asset
validation, and CI. The approximately 110 MB package includes model, voices,
vocabulary, runtime WASM, and notices. The model stays below the 100 MiB
repository single-file limit. Resource bytes and hashes are manifested.
The builder rejects a source model that differs from the approved source hash.
License and notice downloads use fixed upstream revisions. Validation rejects a
changed package identity, duplicate or missing paths, and unmanifested files.

Preparation retains trained weights, exposes predicted phoneme durations, and
adds an F0 multiplier for character pitch. At 24 kHz, one duration frame equals
600 output samples. Runtime checks duration totals against the waveform.
Markers use these durations and the playback audio clock, never character counts.

`neural-speech-worker.ts` performs pronunciation and synthesis in a local module
worker. It loads same-origin resources, omits credentials, rejects redirects,
and checks manifested bytes. Single-thread WASM needs no cross-origin isolation,
cloud service, key, or phrase upload. A boot message precedes initialization.

`neural-speech.ts` owns initialization, PCM playback, progress, and cancellation.
Settings shows model loading. The arena shows preparation before recitation.
Latency depends on device and sentence length; do not promise real-time
generation. Split long phoneme streams at boundaries and concatenate all output.
Never truncate text at a model token limit.

Speech defaults off and needs a trusted gesture in each page session. Enabling
it downloads local resources. Skin metadata selects the voice. The owner removed the speech voice dropdown on
2026-09-08. Settings exposes speech enablement, volume, and rate. Existing saved
voice URIs remain valid and are preserved when another setting changes, but
they no longer override the skin assignment. Rate is 0.5
through 2 in 0.1 steps, default 1. Speech volume is 0 through 1 in 0.05 steps,
default 0.8. Character data supplies pitch.

`game-speech.ts` receives finalized public resolution records only. Preserve the
exact insult and optional Comeback line. Never send draft, private-hand, hover,
concealed waiting-bubble, incomplete, or carried text to TTS. Both valid hotseat
insults can speak after both players finish. Terminal valid insults speak before
Victory, in Milestone 025 order. Direct self-damage knockout speaks no fragments.

Pause and visibility interruption suspend narration and preserve its position.
Navigation, settings changes, disconnection, and replacement cancel it within
100 milliseconds. Generation IDs reject late worker and playback callbacks.
Human skins have no platform fallback. Model, audio, or inference failure completes
the same presentation silently. A synthesis request with no PCM response for
60 seconds terminates its worker and enters silent fallback; the match must
not wait indefinitely.

## Skin voices and the robot exception

The owner requested automatic British voices for human skins and classic local
Microsoft voices for robots. The dropdown remains removed. Character files own
`voiceProfile.skinVoices`; the speech selector reads this authored metadata.

| Skin | Primary voice | Fallback when the named local voice is unavailable |
| --- | --- | --- |
| Male human skin | Kokoro George, en-GB | Silent if neural speech fails |
| Female human skin | Kokoro Emma, en-GB | Silent if neural speech fails |
| Robot 1, default | Microsoft David | Kokoro George |
| Robot 2, alternate | Microsoft Mark | Kokoro George |
| Robot 3, schoolteacher | Microsoft Zira | Kokoro Emma |

`skin-speech-profile.ts` selects the skin profile. `character-speech.ts` routes
it to the neural adapter or `microsoft-robot-speech.ts`. The latter selects only
the exact requested Microsoft voice, requires `localService=true` and English,
and rejects online, natural, or neural platform voices. It never uses an
unspecified system default. Microsoft voice data remains installed OS data;
the game does not redistribute it or upload phrase text.

Only complete public insults reach either adapter. Robot speech synthesizes the
finalized phrase segments as ordered native utterances. Real utterance start
and end events drive segment scores and delivery completion. No word-timing
estimate or prerecorded phrase pack is used. Pause holds the current utterance
or next segment; cancellation clears callback ownership before calling the
platform service. An utterance that stalls for 60 unpaused seconds fails into
the silent presentation path. A mid-delivery error does not repeat spoken text.
A synchronous failure before the first utterance starts rejects the native
request without consuming delivery callbacks, so the British neural fallback
can deliver the complete insult.

The new `government-ai--schoolteacher` skin is fully mechanical, with a severe
schoolteacher face, metal bun, spectacles, charcoal jacket and skirt, ledger,
and ruler. It has a selection portrait and all eight additional authored states.
Its artwork uses the existing flat cel-shaded direction and transparent asset
pipeline. The existing robot skins and all game rules remain unchanged.

`tests/unit/skin-speech.test.ts` verifies skin mappings, exact local voice
selection, remote exclusion, native segment events, pause-aware timeout,
cancellation, and British fallback. `e2e/skin-speech.spec.ts` verifies selected
skins through real match completion and records native versus neural calls.

## Acceptance criteria and verifiers

- **AC-024-01:** Audio validation proves formats, levels, provenance, and hashes.
  Asset unit tests cover rejection paths and the ambience noise bound.
- **AC-024-02:** Audio adapter tests prove gains, source reuse, crossfade,
  cleanup, and failure. Production tests measure effect onset below 100 ms.
- **AC-024-03:** Neural asset validation proves identity, hashes, and bounds.
  Production browsers generate real PCM under the exact CSP from local assets.
  Human skins make no platform speech call. Robot skins use only the approved
  installed Microsoft voices or their British neural fallback.
- **AC-024-04:** Neural adapter tests cover loading, voice, rate, pitch, gain,
  audio-clock markers, Pause, cancellation, and failure. Public speech tests
  cover exact wording, segment alignment, stale events, and private suppression.
- **AC-024-05:** Both public bubbles and reciting stances remain visible during
  speech. Victory waits for both deliveries. Milestone 025 tests verify scores,
  total, damage, and automatic progression.
- **AC-024-06:** Record listening separately from signal and routing tests.
  Chromium, Firefox, and WebKit evidence identifies exact runtime and native
  audio support. Windows Playwright WebKit lacks Web Audio; its silent fallback
  does not establish audible WebKit acceptance.

## Review and verification

Run Impeccable audit and critique on Settings and narration. Earlier Settings
review and passing CI apply to the rejected version only, not this revision.

Build and preview `/grand-transition/`. Record revision, browser, operating
system, viewport, output device, and voice. Listen to menu and studio music,
each cue, and both complete insults. Check mute, Pause, resume, navigation,
musical fit, speech quality, and residual noise at supported landscape sizes.
Run focused tests, production flows, and `npm run ci`. Do not claim listening
from synthetic fixtures or completion from the earlier gate.

## Verification record: 2026-09-08

Before the voice-dropdown removal, the audio revision passed `npm run ci`: 565 Node tests, 466 Chromium
component tests, 466 coverage tests, and 151 production end-to-end tests.
Coverage was 89.66 percent statements, 82.55 percent branches, 94.86 percent
functions, and 92.61 percent lines. All per-file thresholds passed.
`tmp/spec-024-final-ci.log` retains the complete result.

The base commit was `03cf939994cfb83489df21ab70a3bb0b790e391f`. The changed
production, asset, and configuration inventory has SHA-256
`631167db5fa63405c598ada928dc390f70688cce7cd0d8b8b56fa9874290e55f`.
`tmp/spec-024-final-evidence.json` records its 80 files and verification results.
No commit or deployment was made.

The gate used Node 24.19.0, npm 12.0.2, and Playwright 1.63.0 on Windows.
That compatible test-runner refresh retained the declared package version range
and supplied Chromium 153.0.8010.12, Firefox 155.0, and WebKit 26.6.
The former Playwright Firefox 153 stalled inside ONNX inference. The installed
Firefox 155 and the updated automated Firefox both generated the same public
speech successfully. No production model or inference option was changed to
make that comparison pass.

The product owner confirmed audible speech during a dedicated headless
Chromium 151 check with its default mute argument removed. Music and effects
were zero; Speech was 0.8. Two complete generated insults played for 3.15 and
5.525 seconds, with peaks 0.6603 and 0.5730 and no page errors. The output-device
identity was not recorded. `tmp/audible-neural-check/evidence.json` records this
check. Ordinary automated tests remain headless and muted.

The two independent Impeccable assessments identified speaker attribution,
redundant Clause labels, long-log scrolling, live announcements, scaled
cliffhanger damage, and missing damage text. These findings were repaired.
The bounded confirmation at all four supported sizes found no remaining issue
in the requested scope. Both speaker sides, ten-line logs, visible totals,
combo and weakness emphasis, exact damage, and delayed Victory passed.
`tmp/spec-024-inline-confirmation-a/REPORT.md` records the final visual evidence.

Windows Playwright WebKit has no native Web Audio interface. Its silent fallback
passed; audible WebKit behavior needs a supported environment. Physical
screen-reader testing and explicit owner acceptance of musical fit were not
recorded. These limits must remain separate from the passing automated gate.

The dropdown-removal follow-up passed seven Settings component tests, a
production browser check at all four supported sizes, typecheck, lint,
Markdown validation, and `git diff --check`. The full CI suite was not repeated
for this control removal. The stored voice URI and speech adapter remain intact.

## Verification record: skin voices and schoolteacher

On 2026-09-08, the owner confirmed hearing all five assigned voices during
three unmuted headless Chromium production tests: George, Emma, Mark, David,
George, and Zira, in that order. All three tests passed. Music and Effects were
zero and Speech was 0.8. The output-device identity was not recorded.
`tmp/skin-voices-audible.log` retains the result. Ordinary tests remain muted.

The independent visual review passed at 1024 by 720, 1024 by 768, 1280 by 720,
and 1920 by 1080. It checked schoolteacher selection, both player sides,
mirroring, thinking, recitation, idle, damage, speaker separation, and clear
faces. It found no scoped defect. `tmp/robot-teacher-review-a/REPORT.md` records
the evidence. The independent code review found a synchronous native failure
that prevented neural fallback. The repair preserves delivery callbacks and
passes throw and error-event regression cases through the router and
`GameSpeech`. Its bounded confirmation found no remaining issue.

The configured quality gate completed with two focused repairs. The initial
`npm run ci` passed validation and 584 of 585 Node tests; a state-manifest
merge had changed the builder's defined entry order. Restoring that order
passed all 11 state-package tests and asset validation. All 486 browser tests
and 486 coverage tests passed. Coverage was 89.81 percent statements,
82.63 percent branches, 95.05 percent functions, and 92.78 percent lines;
all thresholds passed.

The production suite passed 154 of 155 tests. Its state fixture used one skin
cycle for every non-default skin and therefore selected Robot 2 for Robot 3.
The corrected fixture derives the selected skin index; all eight production
state tests then passed. Typecheck, lint, and the production build passed.
The complete suite was not repeated after these focused repairs.
Logs are `tmp/skin-speech-final-ci.log`, `tmp/skin-speech-state-recheck.log`,
`tmp/skin-speech-final-browser.log`, `tmp/skin-speech-final-coverage.log`,
`tmp/skin-speech-final-e2e.log`, and
`tmp/skin-speech-states-production-recheck.log`.

## Research sources

- [Kokoro](https://github.com/hexgrad/kokoro)
- [ONNX model distribution](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [Microsoft HD voices](https://learn.microsoft.com/azure/ai-services/speech-service/high-definition-voices)
- [Microsoft Embedded Speech](https://learn.microsoft.com/azure/ai-services/speech-service/embedded-speech)

Microsoft Learn MCP research found modern Microsoft HD speech in cloud services.
Embedded Speech has no browser JavaScript SDK. The owner chose local processing.
