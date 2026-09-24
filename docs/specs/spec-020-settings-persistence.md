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

Add the sound, music, speech, and timer settings.
Add the initial versioned codec, browser storage, and recovery from corrupt data.
Also add a fallback in memory and a failure notice that does not block.

Use `localStorage` for settings.
IndexedDB must have a subsequent approved volume requirement.
Only the browser adapter calls storage.
When storage is blocked, full, corrupt, or not available, continue through an adapter in memory.
Show a notice that does not block.
The notice tells the user that the changes will not stay after the page closes.

The title shows one `Settings` control.
It opens a modal with three columns: Play, Sound, and Speech.
The columns are in reading sequence and keyboard sequence.
The navy and brass visual system uses open sections with ruled headings, aligned controls, and a full-width footer for the voice privacy text and the credits.
The heading and Close stay visible if the settings body must scroll.
Close and Escape close the modal, and they put the focus back on `Settings`.

The focus stays in the open modal, and this includes the voice-credit links.
Play starts with a `Scoring multiplier` group that contains five choices: `×1`, `×2`, `×3`, `×4`, and `×5`.
The default is `×3`.
Its help text tells the user that it changes the scale of the compatibility points for the two players.
It also tells that weaknesses and combos apply as different rules.
The setting is only on the title, and the game records it when each new custom match or ladder match starts.

It cannot change an active match or a replay that is in storage.
Milestones 010 and 014 control the scoring behavior and the replay behavior.
All other settings apply immediately.
The usual speech controls come before GPU voices and its help text.
All the controls stay usable at the supported desktop and phone viewport matrix.

Compact layouts can change the layout of the columns and scroll vertically in Milestone 018.
Status messages and storage-failure messages must not cover controls.
The selected multiplier and timer choices stay different from the other choices during hover and keyboard focus, and this includes forced colors.
The focus has a different outer ring.
The selected Turn timer option stays visibly different in forced-colors mode.

Play also has a native `Tutorial` checkbox, which is not checked by default.
Its help text tells the user that all the next choices that are correct in the grammar glow green.
When the user checks it, tutorial mode starts immediately.
When the user clears it, the guidance goes away.
The game keeps the preference after a reload.

Milestone 016 controls the eligible next choices and their small green pulse, and this includes the reduced-motion and forced-colors behavior.
The Pause controls use the same Turn timer and Auto-complete values.
Pause also shows different On and Off controls for Music and Voices.
Music Off uses zero Music volume.
Music On sets the Music volume to the last value above zero in the page session.

If there is no such value, it sets the default of 10 percent.
Voices uses Speech enabled.
These changes apply immediately, and the game keeps them through the same settings document.
Phrase color coding is only for the session, because it is not in the strict settings document.

Do not show a dropdown for the Speech voice.
The Speech voice URI field continues to decode and encode without a change, so the stored settings stay correct.
It has no visible control, and it does not replace the voice assignments of the skins.
Milestone 024 controls the voice selection and all audio output and speech output.

## Settings document

Only one settings document format applies at a time.
The initial `schemaVersion` was `1`, and it identifies that document shape.
A new field changes the shape, so a new version is necessary.
The game does not migrate a previous document.
GPU voices and Speech enabled are `true` by default.
Milestone 029 controls the `interfaceLocale` and `gameLocale` fields.
Its Phase 1 adds `interfaceLocale` at `schemaVersion` `2`, and its Phase 2 adds `gameLocale` at `schemaVersion` `3`.

The Speech group on the title has a **GPU voices** checkbox.
Its help text tells the user that it gives alternative local human voices.
It tells the user that a supported GPU and one more model download of approximately 353 MB are necessary.
The setting does not change Speech enabled.
With speech off, a GPU option that is not checked is disabled.
A stored option that is checked stays checked, and the user can always clear it.

The preference stays through unsupported hardware, a model failure, and speech that is off.
The GPU preparation status and loading status show on the main menu, not in Settings.
They show only when the two preferences are on.
Milestone 015 controls the styled loader.
GPU preparation and loading do not disable the mode actions of the Main Menu.
The viewport restrictions of Milestone 018 continue to apply.
The status for GPU voices that are not available tells the user that the game uses local Piper voices.

Settings keeps the controls and the credits, without a duplicate GPU loading status or readiness status.
Milestone 024 controls the runtime capability checks, the loading, the fallback, and the voice routing.
This setting does not change the native Government AI voices.
The GPU help text has a link to the `tts/kokoro-gpu/NOTICE.txt` credits from the same origin.
This milestone adds no locale controls and no GPU model picker.

Milestone 029 Phase 1 adds the interface-language control to the title Settings.

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
Show the Speech rate with two decimal places, for example `1.00×`.
Keep the Speech enabled and GPU voices choices that the user saved, and this includes the opt-outs.

Settings are one strict document.
Milestone 029 Phase 1 uses `schemaVersion` `2`, and Phase 2 makes the version of this time `3`.
Tutorial mode is the only stored guidance preference.
The product stores no tutorial progress, onboarding status, or other hint state.

Each field is necessary, and the codec does not accept unknown fields.
This includes a field that is part of a different settings shape.
For a value that is missing, malformed, not on a step, or out of range, decoding gives `invalid-data` at the path of that field.
An integer `schemaVersion` that is not the version of this time gives `unsupported-version` before the field validation.
The repository does not write again, repair, or apply a part of a rejected document.
It keeps the document bytes, and it uses the defaults in memory.

It replaces the document only when the user changes a setting the next time.
Keep the `grand-transition.settings.v1` storage key.
The storage failures are `storage-unavailable`, `storage-quota`, or `storage-security`.

The fallback notice is `Settings storage is unavailable. Changes will not
persist after this page closes.`, without a change.
The fallback notice stays until the user closes it.
It does not cover or disable setup or play.
The adapter in memory stays active for the browser session.

## Acceptance criteria

- **AC-020-11:** Tutorial is not checked in new settings.
  The game keeps the two checkbox values, and it shows them again after a reload.
  The control has its native accessible label and its related help text.
  Codec tests include a missing `tutorialMode`, an unknown field, kept preferences, and strict validation of the single document shape.
  Browser tests include the default, the enabled state, the disabled state, and the reload behavior.

- **AC-020-10:** The game keeps all five scoring choices, and it shows them again after a reload.
  Each new match records the selected value for the two players.
  Production browser checks include the supported viewport matrix, loading speech, speech that is not available, and storage fallback.
  They also include keyboard focus, and this includes the credit links, and forced-color selection.
  `tests/browser/settings-persistence.browser.test.ts` and
  `e2e/settings-persistence.spec.ts` do checks of the control and its integration.

- **AC-020-01:** Default, minimum, maximum, and step-aligned values decode and encode without a change, with normalized bytes.
  Values that are out of range, not on a step, unknown, or of an incorrect type fail at their field path.
- **AC-020-02:** A reload shows each setting again.
  Unknown versions and malformed data use the defaults, and the game does not write over the bad value until the user changes a setting.
  A replacement that passes starts the browser persistence again for that change and all subsequent changes.
  A failed replacement keeps the fallback in memory active.
- **AC-020-03:** Quota failures, security failures, and unavailable-storage failures each start the fallback in memory.
  They show the notice above without a change, and the notice does not block.
  They let the user do the setup and play a full match.
- **AC-020-04:** When the user closes the notice, it stays hidden for the session.
  The game does not say that the persistence operates again.
- **AC-020-05:** Only the storage adapter imports `localStorage`.
  Codecs are deterministic pure modules, and they log no stored value.
- **AC-020-06:** The selected Turn timer option stays visually different in forced-colors mode, and it does not hide its `aria-pressed` state.

## Impeccable UI validation

1. Run `$impeccable audit` on the settings and all the persistence-notice states.
2. After the audit repairs, run `$impeccable critique` on those same states.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Checks and stop conditions

Codec tests include a decode and encode round trip and unsupported versions.
Browser tests include reload, corrupt data, quota exceptions, security exceptions, fallback, and notice behavior.
A storage failure does not block setup or play.
`npm run ci` passes.
Stop before audio output, speech output, or artificial intelligence (AI).

## Review repair regression

**AC-020-07:** All the Pause option groups have a visible selected marker that stays with forced colors, hover, and focus.
Keyboard focus keeps a different outer ring, so the user can see the difference between focus and selection.
This includes Turn timer, Auto-complete, Phrase color coding, Music, and Voices.
Their `aria-pressed` values stay correct.
Do checks of the selected siblings and the siblings that are not selected with `e2e/review-accessibility.spec.ts` and production browser evidence.

**AC-020-08:** Pause Music Off applies zero Music gain, and it does not change the Effects volume.
Music On sets the Music volume to the last value above zero in the page session, or to the default of 10 percent.
Pause Voices Off sets Speech enabled to false, stops the active narration, and prevents subsequent narration until Voices is On.
The settings document keeps the two controls, and they keep their selected state after a subsequent Pause.

**AC-020-09:** A stored document with the shape of this time keeps each preference, and this includes a saved speech rate of 1.20.
The two speech checkbox values decode and encode independently.
The GPU loading progress and the Piper fallback are visible on the main menu.
The user can clear a stored GPU preference also when speech or GPU support is not available.
