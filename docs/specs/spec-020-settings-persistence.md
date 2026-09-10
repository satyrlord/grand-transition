# Milestone 020: Settings and Persistence

**Status:** Approved  
**Depends on:** 019  
**Owns:** Local settings, codecs, and storage fallback
**Production-file budget:** 8

## Deliver

Add sound, music, speech, and timer settings.
Implement the initial versioned codec, browser storage,
corrupt-data recovery, an in-memory fallback, and a non-blocking failure notice.

Use `localStorage` for settings. IndexedDB needs a later
approved volume requirement. The browser adapter alone calls storage. When
storage is blocked, full, corrupt, or unavailable, continue through an in-memory
adapter and show a non-blocking notice that changes will not persist.

The title exposes one `Settings` control. It opens a modal that groups Sound,
Speech, and Play settings. Changes apply immediately. Close and Escape close
the modal and return focus to `Settings`.

Focus stays inside the open modal.
The selected Turn timer option stays visibly distinct in forced-colors mode.
The existing Pause controls use the same Turn timer and Auto-complete values.
Pause also exposes separate Music and Voices On and Off controls. Music Off
uses zero Music volume and Music On restores the last non-zero Music volume in
the page session, or the 10 percent default when no such value exists. Voices
uses Speech enabled. These changes apply immediately and persist through the
same settings document. Phrase color coding remains session-only because it is
not in the strict version 3 document.

Do not expose a Speech voice dropdown. The Speech voice URI field
still round-trips so existing settings remain valid. It has no visible control
and does not override skin voice assignments.
Milestone 024 owns voice selection and all audio
and speech output.

## Version 3 settings

Version 2 adds the independent `gpuVoices` preference to the shipped English
version 1 source format. GPU voices and Speech enabled both default to true.
Version 3 restores the default speech rate to 1.00 times.
Milestone 030 owns future version 4, its independent `interfaceLocale` and
`gameLocale` fields, and the version 1, 2, or 3 to 4 migration.

The title-only Speech group has a **GPU voices** checkbox. Its help text states
that these are alternative local human voices, require a supported GPU, and
need an extra model download of about 353 MB. The setting does not
change Speech enabled. With speech off, an unchecked GPU option is disabled;
a stored checked option remains checked and can always be turned off. The
preference survives unsupported hardware, model failure, and speech being off.
GPU preparation and loading status appear on the main menu, outside Settings,
only when both preferences are on. Milestone 015 owns the styled loader and
the disabled setup action until ready or unavailable. Unavailable status states
that local Piper voices are used. Settings retains the controls and credits,
without a duplicate GPU loading or readiness status.
Milestone 024 owns runtime capability checks, loading,
fallback, and voice routing. Native Government AI voices are unaffected.
The GPU help links to the same-origin `tts/kokoro-gpu/NOTICE.txt` credits.
Do not add locale controls or a GPU model picker in this change.

| Field            | Type and range          | Default |
| ---------------- | ----------------------- | ------- |
| Master volume    | 0 through 1, step 0.05  | 1       |
| Music volume     | 0 through 1, step 0.05  | 0.1     |
| Effects volume   | 0 through 1, step 0.05  | 0.8     |
| Speech volume    | 0 through 1, step 0.05  | 0.8     |
| Speech enabled   | Boolean                 | true    |
| GPU voices       | Boolean                 | true    |
| Speech voice URI | String or null          | null    |
| Speech rate      | 0.5 through 2, step 0.1 | 1.00    |
| Turn timer       | 15, 30, or null         | 30      |
| Auto-complete    | Boolean                 | true    |

`null` is the stored Turn timer value for Unlimited.
Display Speech rate with two decimal places, such as `1.00×`.
Preserve explicit saved Speech enabled and GPU voices choices, including opt-outs.

Settings are one strict document with `schemaVersion: 3`. The product stores no
tutorial, onboarding, hint, or guided-progress state.

Version 1 is the first shipped schema. Decode strict version 1 data by preserving
the old fields, including the retired speech voice URI, then adding
`gpuVoices: true` and setting `schemaVersion: 3`. Reject malformed source values
and unknown source fields before accepting the migration. Version 2 retains its
GPU preference, including an explicit opt-out. Fresh settings and version 1
documents without a GPU preference use the enabled default. Migrating either source version changes a saved rate of 1.2 to
1.00; other rates remain unchanged. Version 3 accepts an explicitly selected
1.2 without resetting it on reload. Keep the existing
`grand-transition.settings.v1` storage key. Reading migrates in memory; the next
explicit setting change writes normalized version 3 bytes to that key. Unit
tests contain a literal shipped source fixture. Future schema changes must add
a documented source fixture and stepwise migration. Malformed data returns `invalid-data`. An unknown
version returns `unsupported-version`. Storage failures are
`storage-unavailable`, `storage-quota`, or `storage-security`.

The exact fallback notice is `Settings storage is unavailable. Changes will not
persist after this page closes.` The fallback notice stays until dismissed and
does not cover or disable setup or play. The
in-memory adapter remains active for the browser session.

## Acceptance criteria

- **AC-020-01:** Default, minimum, maximum, and step-aligned values round-trip
  with normalized bytes. Out-of-range, off-step, unknown, and wrong-type values
  fail at their field path.
- **AC-020-02:** Reload restores every setting. Unknown
  versions and malformed data use defaults without overwriting the bad value
  until the user changes a setting. A successful replacement restores browser
  persistence for that change and all later changes. A failed replacement
  keeps the in-memory fallback active.
- **AC-020-03:** Quota, security, and unavailable failures each activate
  in-memory fallback, show the exact non-blocking notice, and permit setup and a
  complete match.
- **AC-020-04:** Dismissing the notice hides it for the session but does not
  claim persistence is restored.
- **AC-020-05:** Only the storage adapter imports `localStorage`. Codecs are
  deterministic pure modules and log no stored value.
- **AC-020-06:** The selected Turn timer option remains visually distinct in
  forced-colors mode without hiding its `aria-pressed` state.

## Impeccable UI validation

1. Run `$impeccable audit` on settings and all persistence-notice states.
2. After audit repairs, run `$impeccable critique` on those same states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Codec tests cover round trip and unsupported versions. Browser tests cover reload, corrupt
data, quota and security exceptions, fallback, and notice behavior. Storage
failure never blocks setup or play. `npm run ci` passes. Stop before audio
output, speech output, or artificial intelligence (AI).

## Review repair regression

**AC-020-07:** All Pause option groups have a visible selected marker that survives forced
colors, hover, and focus. Keyboard focus retains a separate outer ring so it
can be distinguished from selection. This includes Turn timer, Auto-complete, and Phrase
color coding, Music, and Voices. Their `aria-pressed` values remain correct.
Verify selected and unselected siblings with
`e2e/review-accessibility.spec.ts` and production browser evidence.

**AC-020-08:** Pause Music Off applies zero Music gain without changing Effects
volume. Music On restores the last non-zero Music volume for the page session,
or the 10 percent default. Pause Voices Off sets Speech enabled to false,
cancels active narration, and suppresses later narration until Voices is On.
Both controls persist through the version 3 settings document and retain their
selected state after a later Pause.

**AC-020-09:** Version 1 migration preserves settings except the previous 1.2 rate and adds GPU
voices on. Version 3 round-trips both checkbox values independently. GPU
loading progress and Piper fallback are visible on the main menu; a stored GPU preference can
be turned off even when speech or GPU support is unavailable.
