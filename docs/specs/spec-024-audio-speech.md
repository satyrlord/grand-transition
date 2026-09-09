# Milestone 024: Audio and Speech

**Status:** Approved  
**Depends on:** 023  
**Owns:** Music, effects, local neural speech, mixer, and speech privacy
**Production-file budget:** 8 per approved delivery package

## Speech contract

Generate all constructed speech at runtime with local browser neural
text-to-speech (TTS). Use the local Microsoft robot voices specified below.
Do not ship recorded phrases or phrase packs. Milestone 025 owns the Hollywood
Roast presentation sequence.

Use separate packages for asset preparation, audio playback and mixer, neural
worker and playback, scoring-marker projection, and narrated-round integration.
Keep each code package within the eight-production-file budget. Keep model
weights, voice embeddings, runtime binaries, licenses, and manifests in
separate versioned asset packages.

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
pinned development-only FFmpeg. `audio:build` prepares them.
`audio:validate`
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

The Pause Sound group exposes Music and Voices On and Off choices. Music uses
the persisted Music volume and Voices uses the persisted Speech enabled setting.
Turning Voices Off cancels active narration. These controls do not change
Effects volume or any match state.

After decode, effects begin within 100 milliseconds of their public events.
A phrase pick produces role-select. A grammar mistake produces grammar-mistake.
End, Comeback, and a selection that ends participation produce commit. Damage
1 through 15 uses light hit. Damage 16 or more uses heavy hit. Zero is silent.
Narration markers schedule applied combo, weakness, and comeback cues. Each
event fires once per delivery. Stale callbacks cannot repeat it.

Audio status changes refresh title Settings only. They must not replace a match
snapshot, close a disclosed waiting sentence, or restart presentation.

## Local neural speech

Use Kokoro-82M v1.0 quantized ONNX, revision
`1939ad2a8e416c0acfeecc08a694d14ef25f2231`, with ONNX Runtime Web 1.29.0
and phonemizer 1.2.1. The model and pronunciation library use Apache 2.0.
ONNX Runtime uses MIT. Ship licenses and third-party notices. Six local voices
serve the current English locale. Other languages use silent presentation until
a suitable model is approved.

Milestone 030 approves Mihai medium and Liana medium for Romanian and owns
their implementation and acceptance. It extends this worker, asset, and timing
contract with Romanian inference. The skin mappings and Microsoft exception
below remain the English behavior; Romanian mappings are defined in 030.

`tools/neural-speech-assets.mjs` prepares and validates `public/tts/kokoro/`.
`speech:build` prepares the package. `speech:validate` runs in build, asset
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
After public resolution, prepare the next neural delivery while the current
delivery plays or presents its result. Preparation emits no playback callbacks.
Retain at most one future delivery in memory. Submit one inference at a time;
the next request starts after the previous PCM response, so queued preparation
does not consume its synthesis timeout. Reuse it only when the exact text,
segment boundaries, language, voice, rate, and pitch match. Volume is applied
at playback. Start the prepared audio only when its speaker's presentation
begins. Cancellation discards prepared audio and rejects late responses.
There is no persistent generated-speech cache. Native Microsoft requests remain
immediate; a missing native voice uses the existing neural fallback on demand.

Settings shows model loading. The arena shows preparation before recitation.
Latency depends on device and sentence length. Do not promise real-time
generation. Split long phoneme streams at boundaries and concatenate all output.
Never truncate text at a model token limit.

Speech defaults off and needs a trusted gesture in each page session. Enabling
it downloads local resources. Skin metadata selects the voice. Do not expose a
speech voice dropdown. Settings exposes speech enablement, volume, and rate.
Existing saved voice URIs remain valid and are preserved when another setting
changes, but they do not override the skin assignment. Rate is 0.5
through 2 in 0.1 steps, default 1.2. Existing saved rates remain unchanged.
Speech volume is 0 through 1 in 0.05 steps,
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
60 seconds terminates its worker and enters silent fallback. The match must
not wait indefinitely.

## Skin voices

Assign automatic British voices to human skins and classic local Microsoft
voices to robot skins. Character files own `voiceProfile.skinVoices`. The
speech selector reads this authored metadata.

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
unspecified system default. Microsoft voice data remains installed OS data.
the game does not redistribute it or upload phrase text.

Only complete public insults reach either adapter. Robot speech sends the exact
complete insult and optional Comeback line in one native utterance. Do not
restart the voice at card boundaries. Native word-boundary character positions
select the authored phrase markers; duplicate, stale, and invalid positions
cannot repeat scores. Utterance start reveals the first segment. If the platform
omits word boundaries, the remaining scores appear at actual completion.
No word-timing estimate or prerecorded phrase pack is used. Pause holds the
current utterance or its pending completion. Cancellation clears callback
ownership before calling the platform service. An utterance that makes no
word-boundary progress for 60 unpaused seconds fails into
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
selection, remote exclusion, continuous utterances, native word boundaries, pause-aware timeout,
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
  audio support. Windows Playwright WebKit lacks Web Audio. Its silent fallback
  does not establish audible WebKit acceptance.

## Review and verification

Run Impeccable audit and critique on Settings and narration.
Build and preview `/grand-transition/`. Record the browser, operating system,
viewport, output device, and voice. Listen to menu and studio music,
each cue, and both complete insults. Check mute, Pause, resume, navigation,
musical fit, speech quality, and residual noise at supported landscape sizes.
Run focused tests, production flows, and `npm run ci`.

## Research sources

- [Kokoro](https://github.com/hexgrad/kokoro)
- [ONNX model distribution](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [Microsoft HD voices](https://learn.microsoft.com/azure/ai-services/speech-service/high-definition-voices)
- [Microsoft Embedded Speech](https://learn.microsoft.com/azure/ai-services/speech-service/embedded-speech)

Microsoft Learn MCP research found modern Microsoft HD speech in cloud services.
Embedded Speech has no browser JavaScript SDK. Use local processing.
