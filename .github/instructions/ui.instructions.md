---
applyTo: "src/app/**,src/components/**,src/styles/**,src/audio/**,src/visual/**,tests/browser/**,e2e/**"
---

# Experience instructions

Before you edit, read `docs/specs/spec-000-milestone-index.md`.
Use its contract-owner table to find each applicable user interface (UI) specification.
Read those specifications and all the specifications in their **Depends on** chains.

Use Lit only as the view layer.
Screens use the light Document Object Model (DOM).
Child components receive immutable snapshots and send typed commands.
When it is possible, use native controls.

Keep the tactical state easy to read.
Keep hidden hotseat content private.
Run pointer-input tests in real browsers.

Run tests at the supported landscape matrix.
Also run tests at each blocking viewport limit that the applicable specification gives.

## Locators

Milestone 002 controls this rule.
New or changed interaction tests find an element through a stable test identifier (ID).
Role and label locators in tests that nobody changed stay until someone edits those tests.
Do not use its shown text, its role name, or its Cascading Style Sheets (CSS) class as the locator.
If a control has no `data-testid`, add one.
Give the ID a stable kebab-case name that identifies its owner and its purpose, for example `lock-player-one`.

```ts
await page.getByTestId('lock-player-one').click();
```

Use `getByRole` only for tests of accessibility semantics.
These tests examine a role, an accessible name, or a labeled relation.
Assert that accessibility contract.
Do not use `getByRole` to find a control for an interaction test.

Shown text changes with translation and revision.
Thus, text locators can fail for causes that are not related to the behavior that the test examines.
For example, the setup lock controls show `Confirm selection` in the two languages and in the two states.
Their test IDs identify the correct controls.
