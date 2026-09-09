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
the page session, or the 70 percent default when no such value exists. Voices
uses Speech enabled. These changes apply immediately and persist through the
same settings document. Phrase color coding remains session-only because it is
not in the strict version 1 document.

Do not expose a Speech voice dropdown. The version 1 Speech voice URI field
still round-trips so existing settings remain valid. It has no visible control
and does not override skin voice assignments.
Milestone 024 owns voice selection and all audio
and speech output.

## Version 1 settings

This section defines the shipped English source format. Milestone 030 owns
version 2, the independent `interfaceLocale` and `gameLocale` fields,
separate title-only language drop-downs, version 1
migration, and translated notices. Its explicit replacements apply when that
milestone is implemented; all other persistence behavior remains as defined here.

| Field            | Type and range          | Default |
| ---------------- | ----------------------- | ------- |
| Master volume    | 0 through 1, step 0.05  | 1       |
| Music volume     | 0 through 1, step 0.05  | 0.7     |
| Effects volume   | 0 through 1, step 0.05  | 0.8     |
| Speech volume    | 0 through 1, step 0.05  | 0.8     |
| Speech enabled   | Boolean                 | false   |
| Speech voice URI | String or null          | null    |
| Speech rate      | 0.5 through 2, step 0.1 | 1.2     |
| Turn timer       | 15, 30, or null         | 30      |
| Auto-complete    | Boolean                 | true    |

`null` is the stored Turn timer value for Unlimited.

Settings are one strict document with `schemaVersion: 1`. The product stores no
tutorial, onboarding, hint, or guided-progress state.

Version 1 is the first stored schema. Do not invent a migration from an
unshipped format. Future schema changes must add a documented source fixture
and stepwise migration. Malformed data returns `invalid-data`. An unknown
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
or the 70 percent default. Pause Voices Off sets Speech enabled to false,
cancels active narration, and suppresses later narration until Voices is On.
Both controls persist through the version 1 settings document and retain their
selected state after a later Pause.
