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

Nine effects use the original project license: role-select, commit, light hit,
heavy hit, weakness, combo, continuation break, comeback, and grammar mistake.
Scenes contain no background hum or room-tone audio. Scene lighting and other
visual effects remain independent of audio.

Each asset has a WAV master and Ogg Vorbis plus MP3 runtime variants at 48 kHz.
Music targets -16 LUFS integrated, plus or minus 1 LU.
Effects have a true peak no higher than -1 dBFS. No decoded
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

Master multiplies Music, Effects, and Speech gains.
Defaults and ranges come from Milestone 020. Zero gain produces zero samples
without restarting sources. Music changes use a 300-millisecond equal-power
crossfade. Exit fades old loops for 300 milliseconds and stops effects. A loop
that is still fading in finishes that curve first, so its exit fade starts when
its fade-in ends.
Disconnection closes the context. Pause, unsupported viewports, and hidden
documents fade scene audio to silence.
A running AudioParam value curve cannot be cancelled, and a second event during
it must not throw or leave a loop audible. Either remove the prior automation
curve or start the replacement fade after it ends.

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

Use streamed Piper `en_GB-vctk-medium`, revision
`1162a9173d0ce503555aed757976b7a9912eae4c`, with ONNX Runtime Web 1.29.0
and phonemizer 1.2.1. One shared model provides British male speaker p226
(speaker ID 95) and British female speaker p225 (speaker ID 107). The published
model repository is MIT licensed. The VCTK dataset uses CC BY 4.0. Ship the
model card, license texts, dataset attribution, and a description of the duration
output modification. Settings links to the local voice credits.

Phase 2 adds GPU voices, with Piper retained as the CPU fallback.
Milestone 030 owns Romanian
voices and localization; other languages retain silent presentation until their
approved implementation is available.

`tools/neural-speech-assets.mjs` prepares and validates `public/tts/piper/`.
`speech:build` prepares the package. `speech:validate` runs in build, asset
validation, and CI. The approximately 91 MB package includes the shared model,
configuration, runtime WASM, and notices. Each file stays below 100 MiB.
Pinned input hashes, the package identity, the complete file inventory, and
output hashes are validated. Missing, duplicate, and unmanifested files fail.
The retired quantized Kokoro package is not shipped as an unused fallback.

The builder retains all trained weights and exposes the predicted phoneme
ceiling durations. At 22,050 Hz, one duration frame is 256 output samples.
Runtime checks the duration sum against the actual waveform. Phrase markers
come from phoneme positions and these model durations, never character-count
or reading-speed estimates. Padding and sentence boundary tokens remain in the
model input and timing calculation.

Character pitch is applied through the browser audio source playback rate.
The worker compensates the model duration scale by the same factor before
synthesis, so speech rate still owns tempo, subject to model duration rounding.
Piper pitch factors below 0.5 clamp to 0.5 to prevent zero-rate playback; current
authored pitch factors above that floor are preserved. Native Microsoft pitch
retains its platform behavior. No character pitch is silently ignored.

Piper playback uses a clarity EQ after character pitch: a second-order 150 Hz
high-pass (12 dB per octave, linear Q 0.8), a +2 dB high shelf at 1.5 kHz, and
-3 dB output compensation for headroom. Web Audio high-pass Q uses decibels,
so set it to `20 * log10(0.8)`. Keep resonance mild to avoid reinforcing bass.
The filter graph persists across contiguous chunks and is disconnected on
cancellation, failure, or disposal. It adds no synthesis pass or queued buffer.
GPU Kokoro and native Microsoft playback bypass this Piper EQ. Mixer volume,
pitch, tempo, and model-derived markers retain their existing ownership.

This is an initial listening preset, informed by Shure's 100 Hz vocal low-cut
guidance and its 200 Hz conferencing low-cut / treble-shelf guidance. Automated
browser tests measure the actual response at 44.1 and 48 kHz, rendered low-band
attenuation, presence retention, finite samples, silence, and test-signal
headroom. Subjective clarity still requires listening on the target output.

`neural-speech-worker.ts` performs pronunciation and inference in a local module
worker, using the existing pronunciation library. It loads only same-origin
resources with credentials omitted and redirects rejected, and checks manifested
bytes. Single-thread WASM needs no cross-origin isolation, cloud service,
key, or phrase upload. A boot message precedes initialization.

The pronunciation build plugin caches one validated source hash's parsed and
split artifacts within the build process. Each worker plugin instance registers
the complete virtual-module graph and verifies source bytes on every load.
Cache reuse must retain byte-identical generated worker and pronunciation assets.

`game-speech.ts` derives chunk boundaries from disjoint finalized scored clauses
and the optional Comeback line. Conjunctions remain with the following clause.
A shared-subject construction or coordinated noun complement is not split at
each conjunction. If clause positions cannot be resolved safely, keep the
remaining sentence together. Preserve the exact complete text. A long model
input is split at phoneme-space boundaries without truncating tokens.

`neural-speech.ts` owns initialization, progress, chunk queues, playback, and
cancellation. Generate one chunk at a time. Prioritize the current speaker's
remaining chunks over future-speaker preparation. Each chunk receives its own
60-second inference timeout. Start speech when its first chunk is ready, then
schedule additional ready buffers contiguously on the audio clock. Narration
completion occurs only after the final chunk ends. Pause freezes playback and
marker timing, including already scheduled future buffers.

After public resolution, prepare at most one future neural delivery in memory.
Preparation emits no playback callbacks. Reuse it only when text, segment and
chunk boundaries, language, voice, rate, and pitch match. Volume is applied at
playback. Prepared future speech cannot play before its presentation begins.
Cancellation discards prepared and scheduled audio and rejects late responses.
There is no persistent generated-speech cache. Native Microsoft requests remain
immediate, with the selected neural engine as fallback when the requested
installed voice is missing.

### Optional GPU voices

The title Settings checkbox `GPU voices` defaults on, independently of speech
enablement. It requests streamed FP32 Kokoro with British George and Emma voices.
The additional local package is about 353 MB. It uses ONNX Runtime Web 1.29.0's
compact WebGPU entry point and matching Asyncify runtime. Model shards stay below
100 MiB. `tools/kokoro-gpu-assets.mjs` pins the source model, duration-output
modification, runtime, voices, license notices, complete inventory, and hashes.
Both speech packages are checked by `speech:validate`, build, and CI.
The asset builder also writes `src/audio/kokoro-gpu-manifest.json` for the
worker's compiled integrity pins. Validation rejects drift between that file,
the public manifest, and the pinned package. JavaScript must not import files
from `public`. The development server serves the pinned Asyncify module without
code transforms so the same runtime hash check works in development and
production. Worker boot and runtime-byte checks cover the development path.

Initialize voice resources when the menu opens if speech is enabled; GPU
resources additionally require GPU voices enabled. Preparation creates no audio
context and plays no sound. A trusted interaction activates playback later.
Check an actual adapter and device before
downloading the model. Reject software fallback adapters. Require a WebGPU
session device and successful public warmup inference before reporting ready.
Never run this FP32 model as a CPU-only fallback. Resources stay on the app
origin; no phrase or audio is uploaded. Preserve the production CSP and subpath.

Piper initializes alongside GPU loading. The main menu shows a styled GPU
progress indicator while GPU support is checked, assets load, and warmup runs.
Disable Set up match during these pending states, including initial idle, and
guard its command. Hide the indicator when speech or GPU voices is off. Keep
Settings available for opt-out. Readiness hides the indicator and unlocks setup.
GPU unavailability also unlocks setup and shows a concise Piper fallback notice.
No initialization progress for 120 seconds fails GPU preparation; ongoing
download progress resets that inactivity timer. Readiness and disposal clear it.
GPU loading status belongs to the main menu, not the Settings dialog.
Select the ready engine once at match start. If GPU is unavailable, use Piper
throughout that match. GPU becoming ready later must not
switch a healthy active match. Keep Piper ready for device loss. A GPU failure
cancels its audio and completes the current delivery through silent presentation;
subsequent deliveries use Piper. Never replay an already spoken prefix. The next
match can select ready GPU voices. Toggling GPU off in the menu releases its
worker and audio context; toggling on allows an explicit retry.

Kokoro uses model-duration phrase markers at 24,000 Hz and applies character pitch
in the worker while retaining the requested tempo. It shares the bounded chunk
queue, cancellation, pause, future-delivery preparation, and completion rules.
For a delivery with several chunks, schedule its first PCM with a 750 ms startup
buffer, then append chunks on the audio clock. Single-chunk speech and fully
prepared deliveries start without that buffer. This reduces gaps observed on
the development GPU, but does not
guarantee real-time synthesis on every device. The main menu reports loading progress,
readiness, and unavailable status. Diagnostics identify the actual neural voice.
Government AI retains native Microsoft speech; its fallback uses the selected
neural male or female voice.

The main menu shows GPU loading. Settings retains selected local voice-engine status.
The arena distinguishes preparation from reciting.
Latency depends on the device and chunk length; do not promise universal
real-time generation. Both complete public deliveries precede the next round
or Victory, as specified in Milestone 025.

Speech defaults on; playback needs a trusted gesture in each page session.
Resource preparation can precede that gesture. Skin metadata selects the voice. Do not expose a
speech voice dropdown. Settings exposes speech enablement, volume, and rate.
Existing saved voice URIs remain valid and are preserved when another setting
changes, but they do not override the skin assignment. Rate is 0.5
through 2 in 0.1 steps, default 1.00. Settings migration restores the previous saved 1.2 rate to
1.00 once, as specified in Milestone 020. Other saved rates remain unchanged.
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

## Speech diagnostics

Record public delivery diagnostics locally, correlated by match, round, and
speaker. Events include preparation and delivery requests, pending model load,
model readiness, synthesis start, PCM readiness and duration, playback start,
phrase markers, playback end, failure, timeout, cancellation reason, Pause,
resume, skipped speech, provider fallback, silent presentation start, displayed
score markers, displayed total, and presentation completion. Store the selected
voice, rate, pitch, provider, and elapsed milliseconds from match start.

Use controlled reason codes. Do not record sentence text, audio samples,
unselected cards, error messages or stacks, resource URLs, browser identifiers,
machine facts, or credentials in these events. Existing public match records
already identify the sentence by round and speaker. Observer exceptions must
not interrupt speech, scoring, or presentation.

Keep the latest 1000 events per match and an explicit dropped-event count.
Each snapshot states `recording`, `finished`, or `interrupted`. Milestone 019
stores the optional diagnostic snapshot with completed history. Development
logs include the same snapshot in their final `match-complete` record. Delay
that log write until terminal presentation finishes or is explicitly interrupted,
so the final utterance is included. Do not send diagnostics in production.
After a snapshot becomes `finished` or `interrupted`, ignore later events until
the recorder resets for the next match.

`speech-diagnostics.test.ts`, neural and native adapter tests, history codec
tests, and development-log validation cover event bounds, privacy, failure
isolation, and legacy compatibility. Production audio tests verify that both
terminal playback completions and displayed totals reach saved history.

## Skin voices

Assign automatic British voices to human skins and classic local Microsoft
voices to robot skins. Character files own `voiceProfile.skinVoices`. The
speech selector reads this authored metadata.

| Skin | Primary voice | Fallback when the named local voice is unavailable |
| --- | --- | --- |
| Male human skin | Piper p226 or selected GPU George, en-GB | Silent current delivery; later Piper after GPU failure |
| Female human skin | Piper p225 or selected GPU Emma, en-GB | Silent current delivery; later Piper after GPU failure |
| Robot 1, default | Microsoft David | Selected neural male voice |
| Robot 2, alternate | Microsoft Mark | Selected neural male voice |
| Robot 3, schoolteacher | Microsoft Zira | Selected neural female voice |

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
  Asset unit tests cover rejection paths and the music-and-effects-only inventory.
- **AC-024-02:** Audio adapter tests prove gains, source reuse, crossfade,
  cleanup, and failure. Production tests measure effect onset below 100 ms.
- **AC-024-03:** Neural asset validation proves identity, hashes, and bounds.
  Production browsers generate real PCM under the exact CSP from local assets.
  Human skins use the selected neural engine and make no platform speech call.
  Robot skins use only the approved installed Microsoft voices or their British
  neural fallback. GPU initialization requires an actual device and warmup;
  CPU-only FP32 execution is rejected.
- **AC-024-04:** Neural adapter tests cover loading, voice, rate, pitch, gain,
  audio-clock markers, compensated pitch, contiguous chunks, current-speaker priority,
  Pause, cancellation, and failure. Public speech tests
  cover exact wording, segment alignment, stale events, and private suppression.
  `piper-text.test.ts` verifies input padding, duration-frame alignment, and
  duration compensation. `piper-pitch.browser.test.ts` measures browser playback
  frequency and duration with known signals. The production skin-speech flow
  verifies both streamed clauses and one completed delivery per speaker.
- **AC-024-05:** Both public bubbles and reciting stances remain visible during
  speech. Victory waits for both deliveries. Milestone 025 tests verify scores,
  total, damage, and automatic progression.
- **AC-024-06:** Record listening separately from signal and routing tests.
  Chromium, Firefox, and WebKit evidence identifies exact runtime and native
  audio support. Windows Playwright WebKit lacks Web Audio. Its silent fallback
  does not establish audible WebKit acceptance.
- **AC-024-07:** GPU asset and worker tests reject altered packages, unavailable
  devices, CPU-only sessions, and invalid PCM or durations. Router tests prove
  match-stable selection, voice mapping, cancellation, opt-out disposal, and
  later-delivery fallback without repetition. Playback tests prove the startup
  buffer and actual audio-clock diagnostics. Settings production tests prove
  unsupported GPU status, zero GPU package downloads, persistence, and layout.
  Record real GPU initialization, both voices, contiguous chunks, and injected
  device-loss handling separately from physical device loss and listening.

## Review and verification

Run Impeccable audit and critique on Settings and narration.
Build and preview `/grand-transition/`. Record the browser, operating system,
viewport, output device, and voice. Listen to menu and studio music,
each cue, and both complete insults. Check mute, Pause, resume, navigation,
musical fit, speech quality, and residual noise at supported landscape sizes.
Run focused tests, production flows, and `npm run ci`.

## Research sources

- [Shure vocal EQ guidance](https://www.shure.com/en-US/insights/how-to-record-and-mix-vocals)
- [Shure speech EQ applications](https://www.shure.com/en-US/docs/guide/IntelliMixRoom)
- [Web Audio filter Q definition](https://www.w3.org/TR/webaudio-1.0/#dom-biquadfilternode-q)

- [Piper model distribution](https://huggingface.co/rhasspy/piper-voices)
- [VCTK corpus](https://datashare.ed.ac.uk/handle/10283/3443)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [Microsoft HD voices](https://learn.microsoft.com/azure/ai-services/speech-service/high-definition-voices)
- [Microsoft Embedded Speech](https://learn.microsoft.com/azure/ai-services/speech-service/embedded-speech)

Microsoft Learn MCP research found modern Microsoft HD speech in cloud services.
Embedded Speech has no browser JavaScript SDK. Use local processing.
