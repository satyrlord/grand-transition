# Milestone 020: Settings and Persistence

**Status:** Approved  
**Depends on:** 019  
**Owns:** Local settings, codecs, and storage fallback
**Production-file budget:** 8

## Terms

- GPU: graphics processing unit.
- URI: Uniform Resource Identifier.
- MB: megabytes.

## Deliver

Add sound, music, speech, and timer settings.
Implement the initial versioned codec, browser storage,
corrupt-data recovery, an in-memory fallback, and a non-blocking failure notice.

Use `localStorage` for settings. IndexedDB needs a later
approved volume requirement. The browser adapter alone calls storage. When storage is blocked, full, corrupt, or unavailable, continue through an
in-memory adapter. Show a non-blocking notice that changes will not persist.

The title exposes one `Settings` control. It opens a modal with three columns
in reading and keyboard order: Play, Sound, and Speech. The existing navy and
brass visual system uses open sections with ruled headings, aligned controls,
and a full-width voice privacy and credits footer. The heading and Close stay
visible if the settings body needs to scroll. Close and Escape close
the modal and return focus to `Settings`.

Focus stays inside the open modal, including voice-credit links.
Play starts with a `Scoring multiplier` group containing exactly five choices:
`×1`, `×2`, `×3`, `×4`, and `×5`. The default is `×3`. Its help explains that
it scales compatibility points for both players, while weaknesses and combos
apply separately. The setting is title-only and is captured when each new
custom or ladder match starts.

It cannot alter an active match or an existing
replay. Milestones 010 and 014 own scoring and replay behavior.
All other settings apply immediately. Ordinary speech controls precede GPU
voices and its associated help. All controls remain usable at the supported
desktop and phone viewport matrix.

Compact layouts may reflow the columns
and scroll vertically under Milestone 018. Status and storage-failure messages must not cover
controls. Selected multiplier and timer choices remain distinct during hover
and keyboard focus, including forced colors. Focus has a separate outer ring.
The selected Turn timer option stays visibly distinct in forced-colors mode.

Play also has a native `Tutorial` checkbox, unchecked by default. Its help explains that all grammatically valid next choices glow green. Checking it enables
tutorial mode immediately. Clearing it removes the guidance. The preference
persists across reloads.

Milestone 016 owns the eligible next choices and their
subtle pulsing green glow, including reduced-motion and forced-colors behavior.
The existing Pause controls use the same Turn timer and Auto-complete values.
Pause also exposes separate Music and Voices On and Off controls. Music Off uses zero Music volume. Music On restores the last non-zero Music
volume in the page session.

If no such value exists, it restores the 10
percent default. Voices
uses Speech enabled. These changes apply immediately and persist through the
same settings document. Phrase color coding remains session-only because it is
not in the strict settings document.

Do not expose a Speech voice dropdown. The Speech voice URI field
still round-trips so existing settings remain valid. It has no visible control
and does not override skin voice assignments.
Milestone 024 owns voice selection and all audio
and speech output.

## Settings document

One settings document format exists at a time. The initial `schemaVersion` was
`1` and identifies that document shape. A field addition changes the shape, so a new version is necessary. No earlier
document is migrated. GPU voices and Speech
enabled both default to true. Milestone 029 owns the `interfaceLocale` and
`gameLocale` fields: its Phase 1 adds `interfaceLocale` at `schemaVersion` `2`
and its Phase 2 adds `gameLocale` at `schemaVersion` `3`.

The title-only Speech group has a **GPU voices** checkbox. Its help text describes alternative local human voices. It explains that a
supported GPU and an extra model download of about 353 MB are necessary. The setting does not
change Speech enabled. With speech off, an unchecked GPU option is disabled.
A stored checked option remains checked and can always be turned off.

The
preference survives unsupported hardware, model failure, and speech being off.
GPU preparation and loading status appear on the main menu, outside Settings,
only when both preferences are on. Milestone 015 owns the styled loader.
GPU preparation and loading do not disable the Main Menu mode actions.
Milestone 018's viewport restrictions still apply.
Unavailable status explains that local Piper voices are used.

Settings keeps the controls and credits,
without a duplicate GPU loading or readiness status.
Milestone 024 owns runtime capability checks, loading,
fallback, and voice routing. Native Government AI voices are unaffected.
The GPU help links to the same-origin `tts/kokoro-gpu/NOTICE.txt` credits.
This milestone adds no locale controls or GPU model picker.

Milestone 029 Phase 1
adds the title Settings interface-language control.

| Field                  | Type and range          | Default |
| ---------------------- | ----------------------- | ------- |
| Master volume          | 0 through 1, step 0.05  | 1       |
| Music volume           | 0 through 1, step 0.05  | 0.1     |
| Effects volume         | 0 through 1, step 0.05  | 0.8     |
| Speech volume          | 0 through 1, step 0.05  | 0.8     |
| Speech enabled         | Boolean                 | true    |
| GPU voices             | Boolean                 | true    |
| Speech voice URI       | String or null          | null    |
| Speech rate            | 0.5 through 2, step 0.1 | 1.00    |
| Turn timer             | 15, 30, or null         | 30      |
| Auto-complete          | Boolean                 | true    |
| Tutorial mode          | Boolean                 | false   |
| Base points multiplier | 1, 2, 3, 4, or 5        | 3       |

`null` is the stored Turn timer value for Unlimited.
Display Speech rate with two decimal places, such as `1.00×`.
Keep explicit saved Speech enabled and GPU voices choices, including opt-outs.

Settings are one strict document. Milestone 029 Phase 1 uses `schemaVersion`
`2`, and Phase 2 makes the current version `3`. Tutorial mode is the
only persisted guidance preference. The product stores no tutorial progress,
onboarding completion, or other hint state.

Every field is required and unknown fields are rejected, including a field that
belongs to a different settings shape. Decode returns `invalid-data` at the
offending field path for a missing, malformed, off-step, or out-of-range value.
An integer `schemaVersion` other than the current version returns `unsupported-version` before
field validation. The repository never rewrites, repairs, or partially applies a rejected
document. It keeps the document bytes and uses the defaults in memory.

It
replaces the document only when the user next changes a setting.
Keep the existing
`grand-transition.settings.v1` storage key. Storage failures are
`storage-unavailable`, `storage-quota`, or `storage-security`.

The exact fallback notice is `Settings storage is unavailable. Changes will not
persist after this page closes.` The fallback notice stays until dismissed and
does not cover or disable setup or play. The
in-memory adapter remains active for the browser session.

## Acceptance criteria

- **AC-020-11:** Tutorial is unchecked in fresh settings. Both checkbox values
  persist and restore on reload. The control
  has its native accessible label and associated help. Codec tests cover a
  missing `tutorialMode`, an unknown field, kept preferences, and strict
  validation of the single document shape. Browser tests cover
  the default, enabling, disabling, and reload behavior.

- **AC-020-10:** All five scoring choices persist and restore on reload. Each
  new match captures the chosen value for both players. Production browser
  checks cover the supported viewport matrix, loading and unavailable speech,
  storage fallback, keyboard focus including credit links, and forced-color
  selection. `tests/browser/settings-persistence.browser.test.ts` and
  `e2e/settings-persistence.spec.ts` do checks of the control and its integration.

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

## Checks and stop conditions

Codec tests cover round trip and unsupported versions. Browser tests cover reload, corrupt
data, quota and security exceptions, fallback, and notice behavior. Storage
failure never blocks setup or play. `npm run ci` passes. Stop before audio
output, speech output, or artificial intelligence (AI).

## Review repair regression

**AC-020-07:** All Pause option groups have a visible selected marker that survives forced
colors, hover, and focus. Keyboard focus keeps a separate outer ring so it
can be distinguished from selection. This includes Turn timer, Auto-complete, and Phrase
color coding, Music, and Voices. Their `aria-pressed` values remain correct.
Do checks of selected and unselected siblings with
`e2e/review-accessibility.spec.ts` and production browser evidence.

**AC-020-08:** Pause Music Off applies zero Music gain without changing Effects
volume. Music On restores the last non-zero Music volume for the page session,
or the 10 percent default. Pause Voices Off sets Speech enabled to false,
cancels active narration, and suppresses later narration until Voices is On.
Both controls persist through the settings document and keep their
selected state after a later Pause.

**AC-020-09:** A stored document with a current shape keeps every preference,
including an explicitly saved 1.20 speech rate. Both speech checkbox values
round-trip independently. GPU
loading progress and Piper fallback are visible on the main menu. A stored GPU preference can
be turned off even when speech or GPU support is unavailable.
