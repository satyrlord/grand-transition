# Milestone 020: Settings and Persistence

**Status:** Approved  
**Depends on:** 019  
**Owns:** Local settings, tutorial state, codecs, and storage fallback  
**Production-file budget:** 8

## Deliver

Add sound, music, speech, animation, timer, contrast, and accessibility settings
plus tutorial state. Implement the initial versioned codec, browser storage,
corrupt-data recovery, an in-memory fallback, and a non-blocking failure notice.

Use `localStorage` for settings and tutorial state. IndexedDB needs a later
approved volume requirement. The browser adapter alone calls storage. When
storage is blocked, full, corrupt, or unavailable, continue through an in-memory
adapter and show a non-blocking notice that changes will not persist.

## Version 1 settings

| Field | Type and range | Default |
| --- | --- | --- |
| Master volume | 0 through 1, step 0.05 | 1 |
| Music volume | 0 through 1, step 0.05 | 0.7 |
| Effects volume | 0 through 1, step 0.05 | 0.8 |
| Speech volume | 0 through 1, step 0.05 | 0.8 |
| Speech enabled | Boolean | false |
| Speech voice URI | String or null | null |
| Speech rate | 0.5 through 2, step 0.1 | 1 |
| Animation mode | system, full, or reduced | system |
| Contrast mode | system, standard, or high | system |
| Keyboard hints | auto, always, or never | auto |
| Subtitles | Boolean | true |
| Reduced delay | Boolean | false |
| Privacy | Boolean | true |

Tutorial state contains `completed`, `dismissed`, and nullable
`lastStepId`; defaults are false, false, and null. Settings and tutorial state
are one strict document with `schemaVersion: 1`.

Version 1 is the first stored schema. Do not invent a migration from an
unshipped format. Future schema changes must add a documented source fixture
and stepwise migration. Malformed data returns `invalid-data`; an unknown
version returns `unsupported-version`. Storage failures are
`storage-unavailable`, `storage-quota`, or `storage-security`.

The fallback notice uses `role=status`, stays until dismissed, names that
changes will not persist, and does not cover or disable setup or play. The
in-memory adapter remains active for the browser session.

## Acceptance criteria

- **AC-020-01:** Default, minimum, maximum, and step-aligned values round-trip
  with normalized bytes. Out-of-range, off-step, unknown, and wrong-type values
  fail at their field path.
- **AC-020-02:** Reload restores every setting and tutorial field. Unknown
  versions and malformed data use defaults without overwriting the bad value
  until the user changes a setting.
- **AC-020-03:** Quota, security, and unavailable failures each activate
  in-memory fallback, show the exact non-blocking notice, and permit setup and a
  complete match.
- **AC-020-04:** Dismissing the notice hides it for the session but does not
  claim persistence is restored.
- **AC-020-05:** Only the storage adapter imports `localStorage`; codecs are
  deterministic pure modules and log no stored value.

## Impeccable UI validation

1. Run `$impeccable audit` on settings and all persistence-notice states.
2. After audit repairs, run `$impeccable critique` on those same states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Codec tests cover round trip and unsupported versions. Browser tests cover reload, corrupt
data, quota and security exceptions, fallback, and notice behavior. Storage
failure never blocks setup or play. `npm run ci` passes. Stop before audio
output, speech output, artificial intelligence (AI), or tutorial content.
