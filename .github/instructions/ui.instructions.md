---
applyTo: "src/app/**,src/components/**,src/styles/**,src/audio/**,src/visual/**,tests/browser/**,e2e/**"
---

# Experience instructions

Before you edit, read `docs/specs/spec-000-milestone-index.md` and each applicable user interface (UI) specification.
The primary UI specifications are Milestones 015 through 019 and 023 through 026.
Include their dependencies.

Use Lit only as the view layer. Screens use light Document Object Model (DOM).
Child components receive immutable snapshots and emit typed commands.
Use native controls when possible.

Keep tactical state readable. Protect hidden hotseat content.
Run pointer-input tests in real browsers.

Run tests at the supported landscape matrix and every blocking
viewport boundary that the applicable specification names.

## Locators

Interaction tests find an element through a stable test identifier (ID).
Do not use its visible text, role name, or Cascading Style Sheets (CSS) class as the locator.
If a control has no `data-testid`, add one.
Give the ID a stable, kebab-case name that identifies its owner and purpose, for example `lock-player-one`.

```ts
await page.getByTestId('lock-player-one').click();
```

Use `getByRole` only for tests of accessibility semantics.
These tests examine a role, an accessible name, or a labeled relationship.
Assert that accessibility contract. Do not use it to find a control for an interaction test.

Visible text changes with translation and revision.
Thus, text-based locators can fail for reasons unrelated to the behavior under test.
For example, the setup lock controls show `Confirm selection` in both languages and both states.
Their test IDs identify the correct controls.
