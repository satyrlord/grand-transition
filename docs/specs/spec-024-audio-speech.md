# Milestone 024: Audio and Speech

**Status:** Approved  
**Depends on:** 023  
**Owns:** Music, effects, speech synthesis, mixer, and speech privacy  
**Production-file budget:** 8

## Deliver

Implement replaceable sound, music, and speech adapters plus mixer controls.
Add original slice audio and optional speech voice, rate, volume, cancellation,
subtitles, unavailable state, and hotseat suppression.

MVP audio includes original menu music, distinct scene treatment, role-select,
commit, light and heavy hit, weakness, combo, continuation break, comeback,
fault, victory, and defeat cues. Mixer controls are Master, Music, Effects, and
Speech.

Speech defaults off and stays silent until enabled after user action. Detect
support safely; load voices immediately and after `voiceschanged`; prefer saved
`voiceURI`, then language match, then system default. Expose Auto, voice, rate,
and volume. Speak only complete public insults. Cancel on round change, exit, or
rematch. Never speak draft fragments or hidden content. Explain that voices and
processing vary and do not promise offline behavior. Show unavailable state.

## Impeccable UI validation

1. Run `$impeccable audit` on mixer, speech, subtitle, and unavailable states.
2. After audit repairs, run `$impeccable critique` on the same audio UI slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Adapter tests cover enabled, disabled, unavailable, cancellation, and privacy
states. Browser tests cover controls and lifecycle cleanup. Manual evidence
records audible playback and silent fallback. `npm run ci` passes. Stop before
full-scene audio, tutorial, or remaining content.

## Reference

[Web Speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/Window/speechSynthesis)
