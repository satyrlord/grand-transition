# Milestone 018: Landscape Layout Support

**Status:** Approved  
**Depends on:** 017  
**Owns:** Supported viewport rules, compatibility screen, and landscape layout
**Production-file budget:** 8

## Deliver

Support only horizontal browser content viewports. The minimum supported
viewport is 1024 by 720 CSS pixels. The recommended viewport is 1920 by 1080.
PC is the recommended platform, but support is device-neutral and does not use
operating-system or device-class detection.

Remove the narrow-landscape, portrait, mobile, and minimum-width layout
branches. Remove their tests. Do not add a compact layout below the supported
minimum. Horizontal layouts can adapt across the supported range, but they must
keep the same information hierarchy and actions.

## Exact viewport contract

The application supports a viewport only when all conditions are true:

1. Its width is at least 1024 CSS pixels.
2. Its height is at least 720 CSS pixels.
3. Its width is greater than its height.

A square viewport is unsupported. Both dimensions use the browser content
viewport, not physical screen resolution or outer-window size. All device and
operating-system classes use the same rule.

An unsupported viewport replaces the current application DOM with a blocking
compatibility screen. It states the minimum, requires landscape orientation,
recommends 1920 by 1080 and PC, and provides no bypass. At title or setup,
returning to a supported viewport restores the same application view and
authoritative state.

During drafting or sudden death, the match component remains alive but renders
only the compatibility screen. The timer stops at its exact displayed value.
The application blocks all match input. It removes the board, private cards,
sentences, and player facts from the rendered match DOM. It also removes the
score and timer values. When the viewport becomes
supported, the same match resumes automatically from that value unless manual
Pause is also active.

## Acceptance criteria

- **AC-018-01:** The accepted matrix is 1024 by 720, 1024 by 768, 1280 by 720,
  and 1920 by 1080. Each viewport renders the functional application without
  page scroll, overlap, clipping, or a hidden required action.
- **AC-018-02:** The rejected matrix is 1023 by 720, 1024 by 719, 720 by 1024,
  1200 by 1600, and 1024 by 1024. Each viewport renders only the compatibility
  screen and no functional application screen.
- **AC-018-03:** Resizing title and setup from supported to unsupported and back
  restores the same view and authoritative state.
- **AC-018-04:** An unsupported resize freezes the exact timer value. It removes
  all match facts and controls from the rendered DOM. It dispatches no command
  while blocked. The supported resize resumes the unchanged match without
  adding time.
- **AC-018-05:** Manual Pause remains active after the viewport support returns.
  Resume is available only in a supported viewport.
- **AC-018-06:** The source and tests contain no narrow-landscape, portrait,
  mobile, or below-minimum functional layout branch.

## Impeccable UI validation

1. Run `$impeccable audit` on the compatibility screen and all supported
   landscape screen states.
2. After audit repairs, run `$impeccable critique` on the same landscape slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Focused browser tests prove every accepted and rejected boundary, exact timer
preservation, manual Pause interaction, and DOM replacement. Production
Playwright checks the supported landscape matrix and blocked examples.
`npm run ci` passes. Stop before settings persistence or production art.
