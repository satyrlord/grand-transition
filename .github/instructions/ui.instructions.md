---
applyTo: "src/app/**,src/components/**,src/styles/**,src/audio/**,src/visual/**,tests/browser/**,e2e/**"
---

# Experience instructions

Read `docs/specs/spec-000-milestone-index.md` and each applicable UI owner
before editing. The primary UI owners are Milestones 015 through 019 and 023
through 026. Follow their dependency closure.

Use Lit only as the view layer. Screens use light DOM. Child components receive
immutable snapshots and emit typed commands. Prefer native controls. Keep
tactical state readable, protect hidden hotseat content, and test pointer input
in real browsers.

Test the supported landscape matrix and every blocking
viewport boundary that the applicable specification names.

## Locators

Interaction tests address an element through a stable test id, never through its
visible copy, role name, or CSS class. Add `data-testid` to the control when it
does not already have one, and give the ids a stable, kebab-case name that names
its owner and purpose, for example `lock-player-one`.

```ts
await page.getByTestId('lock-player-one').click();
```

Keep `getByRole` for the narrow case where the test deliberately verifies
accessibility semantics — a role, an accessible name, or a labelled
relationship. That is a contract to assert, not a way to find a control.

Visible copy is translated and revised, so a copy-based locator fails for
reasons unrelated to the behaviour under test. The setup lock controls are the
worked example: they read `Confirm selection` in both languages and both states,
so nothing but their test id distinguishes them.
