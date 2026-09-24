# Milestone 024: Audio and Speech

**Status:** Approved  
**Depends on:** 023  
**Owns:** Music, effects, local neural speech, mixer, and speech privacy
**Production-file budget:** 8 per approved delivery package

## Terms

- CI: continuous integration.
- CSP: Content Security Policy.
- GPU: graphics processing unit.
- CPU: central processing unit.
- WASM: WebAssembly.
- OS: operating system.
- PCM: pulse-code modulation.
- FP32: 32-bit floating point.
- URLs: Uniform Resource Locators.
- ID: identifier.
- IDs: identifiers.
- MB: megabytes.
- MiB: mebibytes.
- ms: milliseconds.
- Hz: hertz.
- kHz: kilohertz.
- dB: decibels.
- dBFS: decibels relative to full scale.
- LUFS: loudness units relative to full scale.
- LU: loudness units.
- SDK: software development kit.
- MCP: Model Context Protocol.

## Speech contract

Make all the speech for the sentences that the game builds at runtime, with
local browser neural text-to-speech (TTS). Use the local Microsoft robot voices
that this specification gives. Do not ship recorded phrases or phrase packs.
Milestone 025 controls the Hollywood Roast presentation sequence.

Use a different package for each of these areas:

- Asset preparation.
- Audio playback and mixer.
- Neural worker and playback.
- Scoring-marker projection.
- Narrated-round integration.

Keep each code package in the budget of eight
production files. Keep model weights, voice embeddings, runtime binaries,
licenses, and manifests in different asset packages that have versions.

## Music and effects

The menu uses Joc cu bâtă. The transition-era television studio uses
Buciumeana from Bartók's Romanian Folk Dances, Sz.56 (1915). Chris Breemer
gave the 2025 piano recording to the public domain with the CC0 license. The composition
is in the public domain. These are piano selections from Romanian folk music.
They do not say that Romanian television used this recording in the 2000s.
The treatment of the transition-era television studio and its bytes do not
change.

For the other scenes, Milestone 028 replaces the temporary treatment with no
music. It uses five CC0 tracks, one for each of these scenes.
It keeps the contracts for format, loudness, mixer, and crossfade.
For each source, the manifest pins the source page, the download, the source
hash, and the license. It also pins the creator, the edit, and the scene
treatment. It also pins the
derivative hashes and the measured levels. `README.md` and `CREDITS.md` give
credit for each music track that the game ships.

The [recording entry](https://imslp.org/wiki/Special:ReverseLookup/991622)
identifies the performer and the dedication. The build cuts the pinned source
recordings, changes their sample rate to 48 kHz, and normalizes loudness.
Milestone 028 gives the loops of complete phrases, the waveform seam
correction, and the Scene 6 configuration. The other recordings keep the fades
that they have at their endpoints. The build adds no accompaniment.

Ten effects use the license of the project: role-select, commit, light hit,
heavy hit, weakness, combo, continuation break, comeback, grammar mistake, and
the turn-timer tick. Scenes contain no background hum or room-tone audio. Scene
lighting and other visual effects are not related to audio.

Each asset has a WAV master and Ogg Vorbis and MP3 runtime variants at 48 kHz.
The target for music is -16 LUFS integrated, plus or minus 1 LU.
The true peak of effects is not more than -1 dBFS. No decoded
sample is more than 0 dBFS. `tools/audio-assets.mjs` does checks of the
files through pinned FFmpeg, which is only for development.

`audio:build` prepares them.
`audio:validate`
does checks of them in the build, in asset validation, and in CI.

## Playback and mixer

`audio-port.ts` gives sound playback and music playback that a different
adapter can replace. `browser-audio.ts` controls decoded buffers, gains,
crossfades, and source lifetime. `game-audio.ts` maps accepted drafting events.
Milestone 025 schedules the cues for scored results.
Audio does not change reducer state or use seeded game randomness.

The first trusted pointer action or keyboard action makes the context and
starts it again. Each subsequent activation uses the decoded buffers again.
The states are idle, loading, ready, and unavailable. Settings gives Retry
sound. If the Ogg file fails, the adapter tries the paired MP3 file.

If the two files fail, play continues with no sound. The adapter discards
events that occur before decoding.

Audio files load as same-origin static assets. The adapter sends no
credentials, and it rejects redirects. Do not embed recordings in JavaScript. Keep the
default JavaScript chunk budget of 500,000 bytes. Milestone 004 controls the
connection policy.

Master multiplies the Music, Effects, and Speech gains.
Defaults and ranges come from Milestone 020. Zero gain gives zero samples,
and the sources do not start again. Music changes use an equal-power
crossfade of 300 milliseconds. Exit fades the loops that play at that time
for 300 milliseconds, and it stops effects.

If a loop
is in its fade-in, it completes that curve first. Thus, its exit fade starts
when its fade-in ends.
Disconnection closes the context. Pause, unsupported viewports, and hidden
documents fade scene audio until it has no sound.
Code cannot cancel an AudioParam value curve while it runs. A second event
during the curve must not cause an error or keep a loop that the player can hear. Remove the
automation curve that started first, or start the replacement fade after that
curve ends.

The Pause Sound group shows On and Off choices for Music and Voices. Music
uses the saved Music volume. Voices uses the saved Speech enabled setting.
When the player sets Voices to Off, the narration that plays at that time
stops. These controls do not change Effects volume or match state.

After decoding, effects start 100 milliseconds or less after their public
events. A phrase pick plays role-select. A grammar mistake plays
grammar-mistake. End plays commit. A phrase selection that ends participation
also plays commit. An accepted Comeback plays its dedicated cartoon-impact cue
immediately. That cue does not play again during narration.

Damage 1 through 15 uses light hit. Damage 16
or more uses heavy hit. Zero damage has no sound. Narration markers schedule
the applied combo and weakness cues. Each event plays one time for each
delivery.

Callbacks that are out of date
cannot play it again. In the last five seconds of a timed turn, one
timer-tick plays each second. The tick uses the Effects volume, stops with the
turn timer, and does not play with the Unlimited setting. Milestone 016 controls the
countdown that starts it.

Audio status changes update only the title Settings. They must not replace a
match snapshot, close a waiting sentence that the screen shows, or start the
presentation again.

## Local neural speech

Use streamed Piper `en_GB-vctk-medium`, revision
`1162a9173d0ce503555aed757976b7a9912eae4c`, with ONNX Runtime Web 1.29.0
and phonemizer 1.2.1. One shared model gives British male speaker p226
(speaker ID 95) and British female speaker p225 (speaker ID 107). The published
model repository has the MIT license. The VCTK dataset uses CC BY 4.0. Ship the
model card, the license texts, the dataset attribution, and a description of
the change to the duration output. Settings has a link to the local voice
credits.

Phase 2 adds GPU voices, and Piper stays as the CPU fallback.
Milestone 029 controls Romanian
voices and localization. Other languages keep silent presentation until their
approved implementation is available.

`tools/neural-speech-assets.mjs` prepares `public/tts/piper/` and does checks
of it. `speech:build` prepares the package. `speech:validate` runs in the
build, in asset validation, and in CI. The package is approximately 91 MB. It
contains the shared model, the configuration, the runtime WASM, and the
notices. Each file is less than 100 MiB.

Validation does checks of the pinned input hashes, the package identity, the
full file inventory, and the output hashes. Missing files, duplicate files,
and files that are not in the manifest cause a failure.
The game does not ship the retired quantized Kokoro package as a fallback
that it does not use.

The builder keeps all trained weights and shows the predicted phoneme
ceiling durations. At 22,050 Hz, one duration frame is 256 output samples.
At runtime, the adapter compares the sum of the durations with the length of
the waveform. Phrase markers come from phoneme positions and these model
durations. They do not come from estimates of the character count or of the
reading speed. Padding tokens and sentence boundary tokens stay in the model
input and in the timing calculation.

The browser audio source playback rate applies the character pitch.
Before synthesis, the worker changes the model duration scale by the same
factor. Thus, the speech rate continues to control tempo, but the rounding of
model durations can change it a small quantity. Piper clamps pitch factors
below 0.5 to 0.5, so that playback does not use a rate of zero. The authored
pitch factors above that minimum at this time do not change. Native Microsoft
pitch keeps its platform behavior. The adapter does not ignore a character
pitch without a message.

Piper playback uses clarity equalization (EQ) after character pitch. It uses a
second-order 150 Hz high-pass filter (12 dB per octave, linear Q 0.8). It adds
a +2 dB high shelf at 1.5 kHz and -3 dB output compensation for headroom.
Web Audio high-pass Q uses decibels,
so set it to `20 * log10(0.8)`. Keep the resonance small, so that it does not
make the bass stronger.

The filter graph stays connected across contiguous chunks. Cancellation,
failure, or disposal disconnects it. It adds no synthesis pass or queued
buffer. GPU Kokoro and native Microsoft playback do not use this Piper EQ.
Mixer volume, pitch, tempo, and the markers from the model keep their
owners.

This is an initial listening preset. It uses Shure guidance for a 100 Hz vocal
low-cut, and for a 200 Hz conferencing low-cut and treble shelf.
Automated browser tests measure these items at 44.1 kHz and 48 kHz:

- The response.
- The rendered low-band attenuation.
- The presence retention.
- Finite samples.
- Silence.
- Test-signal headroom.

These measurements do not show
subjective clarity on a physical output device. The user can examine that
clarity independently after the milestone is completed.

`neural-speech-worker.ts` does pronunciation and inference in a local module
worker, with the pronunciation library of the project. It loads only
same-origin resources. It sends no credentials, and it rejects redirects. It
does checks of the bytes that are in the manifest. Single-thread WASM does not
use cross-origin isolation, a cloud service, a key, or phrase upload. A boot
message comes before initialization.

The pronunciation build plugin keeps a cache of the parsed and divided artifacts
for one validated source hash during the build process. Each worker plugin
instance registers the full virtual-module graph and does checks of the source
bytes at each load. When the plugin uses the cache again, the generated worker
assets and pronunciation assets must keep the same bytes.

`game-speech.ts` gets chunk boundaries from finalized scored clauses that do
not overlap, and from the optional Comeback line. A conjunction stays with the
clause after it. Do not divide a shared-subject construction or a coordinated
noun complement at each conjunction. If the adapter cannot safely find clause
positions, keep the remaining part of the sentence together. Keep all the
text, with no changes. The adapter divides a long model input at phoneme-space
boundaries, and it does not cut tokens.

`neural-speech.ts` controls initialization, progress, chunk queues, playback,
and cancellation. Make one chunk at a time. The remaining chunks of the speaker
that speaks at this time have priority over the preparation for subsequent
speakers. Each chunk gets its own inference timeout of 60 seconds. Start speech
when the adapter has its first chunk. Then schedule the other prepared buffers
on the audio clock, each immediately after the buffer before it.

Narration
is completed only after the last chunk ends. Pause stops playback and marker
timing. This includes the future buffers that the adapter scheduled before.

After public resolution, prepare one future neural delivery in memory, or none.
Preparation sends no playback callbacks. Use it only when its text, segment
boundaries, chunk boundaries, language, voice, rate, and pitch agree with the
request. The adapter applies volume at playback. Prepared future speech cannot
play before its presentation starts.

Cancellation discards the prepared audio and the scheduled audio, and it
rejects the responses that come after cancellation. There is no persistent cache of generated speech.
Native Microsoft requests start immediately. If the installed voice for the
request is missing, the selected neural engine is the fallback.

### Optional GPU voices

The title Settings checkbox `GPU voices` is on by default. Its setting is
not related to the speech setting. It selects streamed FP32 Kokoro with the
British George and Emma voices.
The local GPU package is approximately 353 MB. It uses the compact
WebGPU entry point of ONNX Runtime Web 1.29.0 and the Asyncify runtime that
agrees with it. Each model shard is less than 100 MiB.

`tools/kokoro-gpu-assets.mjs` pins the source model, the change to the
duration output, the runtime, the voices, the license notices, the full
inventory, and the hashes.
`speech:validate`, the build, and CI do checks of the two speech packages.
The asset builder also writes `src/audio/kokoro-gpu-manifest.json` for the
integrity pins that the worker compiles. Validation rejects differences between
that file, the public manifest, and the pinned package. JavaScript must not
import files from `public`.

The development server serves the pinned Asyncify module without
code transforms. Thus, the same runtime hash check works in development and in
production. The checks of worker boot and runtime bytes include the
development path.

When the menu opens and the Speech enabled setting is on, initialize the
voice resources. For GPU resources, the GPU voices setting must also be on. Preparation makes no audio
context and plays no sound. Subsequently, a trusted interaction starts playback.
Examine a real adapter and device before
you download the model.

Reject software fallback adapters. Before the adapter sends a ready status,
make sure that a WebGPU session device is available and that the public warmup
inference completes correctly.
Do not run this FP32 model as a fallback that uses only the CPU. Resources stay
on the app origin. The adapter uploads no phrase and no audio.

Keep the production CSP and subpath.
WebGPU can keep supported shape nodes or control-flow nodes on the CPU. That
placement on two providers is usual. Do not stop the worker because of it.
Show only real runtime errors in the app console.
Apply the error threshold to the runtime environment, to the inference session,
and to each inference run. Keep initialization failures and inference failures
visible through the typed failure messages of the worker.

`tests/unit/kokoro-gpu-worker.test.ts` does checks of these thresholds and failure paths.

Piper initializes at the same time as GPU loading. The main menu shows a styled
GPU progress indicator while it examines GPU support, loads assets, and runs
the warmup. Preparation is asynchronous and does not stop the menu. Keep the 3 Main Menu
mode buttons enabled during these pending states, and accept their commands.
If a match starts while preparation continues, it uses Piper for all of the
match. The cause is that the game selects the prepared engine one time at
match start.
Hide the indicator when speech or GPU voices is off.

Keep Settings available, so that the player can turn the voices off. When the
player changes a different setting, the preparation continues and does not start
again. Only when the player turns Speech enabled or GPU voices off does the
adapter release the GPU worker. When GPU preparation completes, the
indicator is hidden. When the GPU is not available, the indicator is hidden and a short
Piper fallback notice shows.

If initialization makes no progress for 120 seconds, GPU preparation fails.
Download progress resets that inactivity timer. Readiness and disposal clear
it. The GPU loading status is part of the main menu, not the Settings dialog.
Select the prepared engine one time at match start.

If the GPU is not available, use Piper
for all of that match. If GPU preparation completes after match start, the game
must not change the engine of a correct match that is in progress. Keep Piper prepared for
device loss. A GPU failure cancels its audio, and the delivery at that time
completes through silent presentation. Subsequent deliveries use Piper.

Do not play again a prefix that the adapter played before. The next
match can select prepared GPU voices. When the player sets GPU voices to off in
the menu, the adapter releases its worker and audio context. When the player
sets it to on, the adapter tries again.

Kokoro uses model-duration phrase markers at 24,000 Hz. It applies character
pitch in the worker and keeps the tempo of the request. It uses the same rules
as Piper for the bounded chunk queue, cancellation, and Pause. It also uses
the Piper rules for the preparation of future deliveries and the end of a
delivery. If a delivery has two or more chunks,
schedule its first PCM with a startup buffer of 750 ms.
Then add chunks on the audio clock. Speech with one chunk and fully
prepared deliveries start without that buffer. This buffer decreases the silent
time between chunks on the development GPU.
But it does not make sure that synthesis occurs in real time on each device.

The main menu shows the loading progress,
readiness, and unavailable status. Diagnostics identify the neural voice that
plays. Government AI keeps native Microsoft speech. Its fallback uses the
selected neural male voice or female voice.

The main menu shows GPU loading. Settings keeps the status of the selected local
voice engine. The arena shows preparation differently from reciting.
Latency changes with the device and the chunk length. Do not say that
generation occurs in real time on all devices. The two complete public
deliveries occur before the next round or Victory, as Milestone 025 gives.

Speech is on by default. Playback must have a trusted gesture in each page
session. Resource preparation can occur before that gesture. Skin metadata
selects the voice. Do not show a speech voice dropdown.

Settings shows speech enablement, volume, and rate.
Milestone 029 adds the title Settings interface-language selector. It selects
interface messages. It is not a speech voice control.
Saved voice URIs stay correct. The adapter keeps them when a different setting
changes, but they do not override the skin assignment. The rate is 0.5
through 2 in 0.1 steps, with a default of 1.00.

The adapter keeps a saved rate as the settings document stores it.
Milestone 020 controls the settings document. Other saved rates do not change.
Speech volume is 0 through 1 in 0.05 steps,
with a default of 0.8. Character data gives the pitch.

`game-speech.ts` gets only finalized public resolution records. Keep the
insult and the optional Comeback line with no changes. Do not send draft,
private-hand, hover, concealed waiting-bubble, incomplete, or carried text to
TTS. The two correct hotseat insults can play after the two players complete
their turns. Terminal correct insults play before Victory, in the order of
Milestone 025. A knockout that occurs directly from self-damage speaks no
fragments.

Pause and visibility interruption stop narration and keep its position.
Navigation, settings changes, disconnection, and replacement cancel it in
100 milliseconds or less. Generation IDs reject late worker callbacks and
playback callbacks. Human skins have no platform fallback. If the model, the
audio, or the inference fails, the same presentation completes with no sound.

If a synthesis request gets no PCM response for
60 seconds, the adapter stops its worker and starts the silent fallback. The
match must not wait with no time limit.

## Speech diagnostics

Record the diagnostics of public deliveries locally, and correlate them by
match, round, and speaker. The events include preparation requests, delivery
requests, a pending model load, model readiness, synthesis start, PCM readiness
and duration, playback start, and phrase markers. They include playback end,
failure, timeout, the cancellation `reason` code, Pause, resume, skipped speech, and
provider fallback. They also include silent presentation start, the score
markers that the screen shows, the total that the screen shows, and the
end of the presentation. Store the selected voice, the rate, the pitch,
the provider, and the elapsed milliseconds from match start.

Use controlled `reason` codes. In these events, do not record sentence text,
audio samples, cards that the player did not select, error messages, or stacks. Do not record resource URLs, browser identifiers, machine facts, or
credentials. The public match records identify the sentence by round and
speaker. Observer exceptions must not stop speech, scoring, or presentation.

Keep the last 1000 events for each match, and keep a count of the
dropped events. Each snapshot has the value `recording`, `finished`, or
`interrupted`. Milestone 019 stores the optional diagnostic snapshot with the
completed history. Development logs include the same snapshot in their last
`match-complete` record. Write that log record only after the terminal
presentation ends or something stops it. Thus, the log includes the last
utterance.

Do not send diagnostics in production.
After a snapshot has the value `finished` or `interrupted`, ignore the
subsequent events until the recorder resets for the next match.

These tests and checks examine event bounds, privacy, failure isolation, and
legacy compatibility:

- `speech-diagnostics.test.ts`.
- The neural and native adapter tests.
- The history codec tests.
- The development-log validation.

Production audio tests show that the saved history gets the two terminal
playback ends and the totals that the screen shows.

## Skin voices

Give automatic British voices to human skins. Give classic local Microsoft
voices to robot skins. Character files control `voiceProfile.skinVoices`. The
speech selector reads this authored metadata.

| Skin | Primary voice | Fallback when the named local voice is unavailable |
| --- | --- | --- |
| Male human skin | Piper p226 or selected GPU George, en-GB | Silent delivery at that time. Piper for subsequent deliveries after GPU failure |
| Female human skin | Piper p225 or selected GPU Emma, en-GB | Silent delivery at that time. Piper for subsequent deliveries after GPU failure |
| Robot 1, default | Microsoft David | Selected neural male voice |
| Robot 2, alternate | Microsoft Mark | Selected neural male voice |
| Robot 3, schoolteacher | Microsoft Zira | Selected neural female voice |

`skin-speech-profile.ts` selects the skin profile. `character-speech.ts` sends
it to the neural adapter or to `microsoft-robot-speech.ts`. The Microsoft
adapter selects only the Microsoft voice that the request names. It accepts
only `localService=true` and English. It rejects online, natural, or neural
platform voices. It does not use a system default that the request does not
name. Microsoft voice data stays as installed OS data.
The game does not ship it, and it does not upload phrase text.

Only complete public insults go to the two adapters. Robot speech sends the
complete insult and the optional Comeback line in one native utterance, with no
changes. Do not start the voice again at card boundaries. Native word-boundary
character positions select the authored phrase markers. Duplicate positions,
positions that are out of date, and incorrect positions cannot show scores
again.

When the utterance starts, the first segment shows. If the platform
does not send word boundaries, the remaining scores show when the utterance
is completed.
The adapter uses no word-timing estimate and no prerecorded phrase pack. Pause
holds the utterance or the pending end of the utterance. Cancellation removes the
control of the callbacks before it calls the platform service.

If an utterance makes no
word-boundary progress for 60 seconds while it is not paused, it fails, and
the silent presentation path starts. An error during a delivery does not play
spoken text again.
If a synchronous failure occurs before the first utterance starts, the adapter
rejects the native request, and it does not use the delivery callbacks. Then
the British neural fallback can speak the complete insult.

The new `government-ai--schoolteacher` skin is fully mechanical. It has a
strict schoolteacher face, a metal bun, spectacles, a charcoal jacket and
skirt, a ledger, and a ruler. It has a selection portrait and all eight
other authored states. Its artwork uses the flat cel-shaded direction
and the transparent asset pipeline of the project. The other robot skins and
all game rules do not change.

`tests/unit/skin-speech.test.ts` does checks of these items:

- Skin mappings.
- The selection of the local voice that the request names.
- The exclusion of remote voices.
- Continuous utterances.
- Native word boundaries.
- The timeout that stops during Pause.
- Cancellation.
- British fallback.

`e2e/skin-speech.spec.ts` does
checks of selected skins through a real match until the match ends, and it records native
calls and neural calls.

## Acceptance criteria and verifiers

- **AC-024-01:** Audio validation shows the formats, levels, provenance, and
  hashes. Asset unit tests include the paths that reject assets and the inventory, which
  has only music and effects.
- **AC-024-02:** Audio adapter tests show gains, the use of sources again,
  crossfade, cleanup, and failure. Browser tests show one timer-tick each
  second in the last five seconds of a timed turn, and no tick with Unlimited.
  Production tests measure an effect onset of less than 100 ms.
- **AC-024-03:** Neural asset validation shows identity, hashes, and bounds.
  Production browsers generate real PCM from local assets with the CSP, with
  no changes to the CSP.
  Human skins use the selected neural engine and make no platform speech call.
  Robot skins use only the approved installed Microsoft voices or their British
  neural fallback. GPU initialization must have a real device and a warmup.
  The adapter rejects FP32 execution that uses only the CPU.
- **AC-024-04:** Neural adapter tests include loading, voice, rate, pitch,
  gain, audio-clock markers, and compensated pitch.
  They also include contiguous chunks, the priority of the speaker that speaks
  at this time, Pause, cancellation, and failure.
  Public speech tests include the wording with no changes, how segments align,
  events that are out of date, and the suppression of private text.
  `piper-text.test.ts` does checks of input padding, how duration frames align,
  and duration compensation. `piper-pitch.browser.test.ts` measures the
  frequency and duration of browser playback with test signals that have set
  values. The
  production skin-speech flow does checks of the two streamed clauses and of
  one completed delivery for each speaker.
- **AC-024-05:** The two public bubbles and the reciting stances stay visible
  during speech. Victory waits for the two deliveries. Milestone 025 tests do
  checks of scores, total, damage, and automatic progression.
- **AC-024-06:** Signal tests, routing tests, and production-browser tests
  record the Chromium, Firefox, and WebKit runtimes and the available audio
  support. Unsupported audio uses the tested silent fallback. Windows
  Playwright WebKit does not have Web Audio. Its fallback result does not show
  WebKit output that a person can hear.
  Listening observations and physical-device observations are optional. They
  are not necessary to complete the milestone.
- **AC-024-07:** GPU asset tests and worker tests reject changed packages,
  unavailable devices, sessions that use only the CPU, and incorrect PCM or
  durations. Router tests show these items:

  - A selection that is stable for the match.
  - Voice mapping and cancellation.
  - Disposal after the player turns the voices off.
  - Fallback for subsequent deliveries with no repetition.

  Playback tests show the
  startup buffer and the real audio-clock diagnostics. Settings production
  tests show the unsupported GPU status, zero GPU package downloads,
  persistence, and layout.
  Record real GPU initialization, the two voices, contiguous chunks, and the
  result of simulated device loss.

  Keep these checks different from the optional observations of physical-device
  loss and listening. Simulated loss does not show physical-device
  behavior.

## Review and verification

Run the Impeccable audit and critique on Settings and narration.
Build and preview `/grand-transition/`. For the automated production flows,
record the browser, the operating system, the viewport, and the voice.
Use the verifiers above to do tests of menu and studio music routing and of
each cue. Also do tests of the two complete public insults.
Do tests of mute, Pause, resume, navigation, and the supported landscape
dimensions.

Run the focused tests, the production flows, and `npm run ci`. After the
milestone is completed, the user can independently listen for musical fit,
speech quality, and remaining noise. Record each such observation with its output
device. Do not show automated signal results or routing results as proof of
subjective quality.

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
