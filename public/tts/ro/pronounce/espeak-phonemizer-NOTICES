# Third-party notices

## eSpeak NG

This repository builds and redistributes [eSpeak NG](https://github.com/espeak-ng/espeak-ng)
(source and compiled `espeak-ng-data`) as a WebAssembly module.

- Vendored at `vendor/espeak-ng`, pinned to commit `724808c` (the same commit
  [piper1-gpl](https://github.com/OHF-Voice/piper1-gpl) pins in its `CMakeLists.txt`,
  chosen because it includes `espeak_TextToPhonemesWithTerminator`, which is not in
  any tagged espeak-ng release as of this writing).
- License: GNU General Public License v3.0 (see `LICENSE` at the root of this repo,
  copied verbatim from `vendor/espeak-ng/COPYING`).

## ucd-tools

espeak-ng vendors [ucd-tools](https://github.com/rhdunn/ucd-tools) directly under
`vendor/espeak-ng/src/ucd-tools` (not as a separate submodule at the pinned commit).
License: see `vendor/espeak-ng/src/ucd-tools/COPYING`.

## piper1-gpl / piper-phonemize

The build flags used in `scripts/build-espeak-ng.sh` and the `initialize`/`setVoice`/
`getPhonemes` shape of `src/espeak.mjs` are modeled directly on
[OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl)'s `CMakeLists.txt` and
`src/piper/espeakbridge.c`, for phonemization parity with piper voices. No piper1-gpl
code is redistributed by this repository.
