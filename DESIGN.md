---
name: 'Grand Transition: A Verbal Republic'
description: 'A civic-ledger interface system for a verbal republic.'
colors:
  municipal-blue: '#062840'
  deep-municipal-blue: '#041d2e'
  warm-ledger-paper: '#e0d6c2'
  pale-paper: '#eee4d3'
  registry-ink: '#202020'
  official-oxblood: '#6d2823'
  deep-oxblood: '#481c1a'
  registry-brass: '#9a7331'
  registry-rule: 'rgb(23 25 22 / 38%)'
typography:
  display:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: 'clamp(3.2rem, 8vw, 6rem)'
    fontWeight: 700
    lineHeight: 0.78
    letterSpacing: '-0.035em'
  body:
    fontFamily: 'Georgia, "Times New Roman", serif'
  record-subtitle:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: 'clamp(1.05rem, 2vw, 2rem)'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '0.18em'
  status:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: 'clamp(0.8rem, 1vw, 0.95rem)'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '0.06em'
  tactical-label:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: '0.69rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '0.05em'
rounded:
  square: '0'
spacing:
  edge: 'clamp(1.25rem, 4vw, 4.5rem)'
  compact: '0.5rem'
components:
  title-record-stamp:
    textColor: '{colors.official-oxblood}'
    typography: '{typography.status}'
    padding: '0.6rem 0.85rem 0.55rem'
    width: 'min(13rem, 100%)'
  match-phrase-docket:
    backgroundColor: '{colors.pale-paper}'
    textColor: '{colors.registry-ink}'
    typography: '{typography.body}'
    rounded: '{rounded.square}'
    padding: '0.55rem'
---

# Design System: Grand Transition: A Verbal Republic

## Overview

### Design direction: "The Open Civic Ledger"

Grand Transition presents each surface as part of an open civic record. A
municipal-blue cloth field meets warm official paper at an oxblood binding
seam. The result is formal, legible, and subtly satirical. The title resembles
a filed public record; the playable match opens that record into a live
parliamentary dispatch table.

The title gives visual priority to one large semantic message. Condensed
display type makes the product name resemble an official register. Serif text
makes the subtitle and status resemble ledger entries. Filing rules, the seam,
and the small registration stamp provide structure. The setup screen extends
the record into a semantic register. The match screen uses the same material
language for public status rails, sentence records, phrase dockets, and exact
typed actions without copying the setup form composition.

**The Open Record Rule.** Treat the title as an entry in an open civic record:
formal, legible, and specific to this fictional republic.

**Key Characteristics:**

- Open civic-ledger character with understated political-theatre satire.
- Asymmetric blue-cloth and warm-paper fields joined by a narrow oxblood seam.
- One oversized title, precise ruled registration, and a low-emphasis
  prepared-status stamp.
- Dense tactical dockets that keep grammar, ownership, legality, and weakness
  evidence visible in one scan.
- Semantic light Document Object Model (DOM) text and code-native material
  structure.

## Colors

The palette uses municipal blue and warm paper as structural fields, near-black
ink for the primary title, and restrained oxblood for the binding, rules, and
status mark.

### Primary

- **Official Oxblood**: Use for the subtitle rules, registration stamp, and
  selected structural emphasis.

### Secondary

- **Municipal Blue**: Use as the cloth field behind `Grand`.
- **Deep Municipal Blue**: Use as the darker seam-adjacent blue in the binding
  geometry.
- **Deep Oxblood**: Use as the narrow binding seam that joins the two fields.
- **Registry Brass**: Use for active lectern borders and chamber geometry.

### Neutral

- **Warm Ledger Paper**: Use as the main paper field behind `Transition` and
  the page body.
- **Pale Paper**: Use as the light display ink on the blue field.
- **Registry Ink**: Use for the main title on paper and the body text baseline.
- **Translucent Rule Ink**: Use for low-contrast filing lines and registration
  marks.

**The Binding Rule.** Keep oxblood as a narrow structural join and precise
record accent. It connects the two fields; it does not become a broad wash.

## Typography

**Display Font:** Barlow Condensed (self-hosted, with sans-serif fallback)
**Body Font:** Georgia (with Times New Roman and serif fallbacks)

**Character:** The pairing combines a condensed official-register voice with a
serif ledger style. Display text is bold and compressed. Record text is formal
and readable.

### Hierarchy

- **Display**: Heavy condensed uppercase for the single product heading. The
  desktop scale is fluid. The mobile scale remains bounded for reflow.
- **Record subtitle**: Bold serif uppercase with generous tracking and ruled
  oxblood edges. It names the fictional republic without competing with the
  title.
- **Status**: Condensed uppercase in a small rectangular stamp. It states the
  prepared condition and does not imply loading or playable behavior.
- **Tactical label**: Compact condensed uppercase for role, ownership, state,
  timer, and action facts inside the match dispatch table.
- **Body**: Georgia is the inherited record face for semantic page text.

**The One Heading Rule.** Keep the product name as one semantic `h1` even when
the two words occupy separate color fields.

## Layout

The title record fills the viewport with a minimum height of `100svh` and uses
an edge spacing token that scales from `1.25rem` to `4.5rem`. On wide screens,
the record uses a 38/62 column split. `Grand` sits on municipal blue, and
`Transition` sits on warm paper. The title crosses the seam as one heading.
Low-contrast pseudo-element rules stay behind the semantic content.

At the proven `700px` boundary (`max-width: 43.75rem`), the ledger changes to a
vertical 37/63 blue-to-paper stack. The heading remains one semantic unit, but
the words occupy their own contrast-safe fields. The status stays at the lower
right on ordinary mobile widths and can use the available page width at 200%
text scaling. At `1440px` and above (`min-width: 90rem`), the subtitle receives
the source-defined upward offset.

The setup register uses one paper field with a narrow municipal-blue and
oxblood binding at the leading edge. At wide sizes, Match and Characters are
two balanced field groups. Below `700px`, they become one reading column. The
action row stays last in the visible and keyboard order.

The playable match uses one dense desktop record at `1280px` by `720px`.
Status, opposing lecterns, the reaction docket, and the sentence ledger form a
top-to-bottom public sequence. Nine equal shared dockets fill one row. The
private register and current actions share the last row. Non-desktop match
composition remains provisional until its owning responsive milestone.

**The Dispatch Table Rule.** Keep the current sentence between public match
state and draft choices. It is the hinge that explains what each phrase action
will do.

## Elevation & Depth

This implementation is flat by default and uses structural depth instead of
shadows. Contrast between cloth blue and paper, the narrow binding seam, ruled
registration marks, borders, and layered pseudo-elements make the record feel
physical. The title surface has no box-shadow vocabulary and no production
raster texture.

**The Structural Depth Rule.** Create depth with tonal fields, seams, rules, and
layering; do not add ornamental shadows to this title record.

## Shapes

The form language is square and official. The record fields, rules, stamp,
native selects, tactical dockets, overlays, and action buttons use sharp
corners with no rounded treatment.
The status stamp uses a 2px
oxblood border, compact internal padding, centered uppercase text, and a small
counter-clockwise rotation to suggest a hand-registered mark. Filing lines are
thin and low-contrast. The binding seam is narrow. It is not pill-shaped or
card-like.

## Components

The implemented system includes the title record, setup register, match
dispatch table, phrase dockets, resolution record, final match record, and
square action treatment. It does not yet establish navigation, settings, or
tutorial components.

### Title record / registration stamp

The title record is an edge-to-edge semantic header composition. Its distinctive
custom mark is the static status stamp at the lower right of the paper field.

- **Record:** A single semantic `h1` crosses the desktop seam. It becomes a
  vertical two-field title below the mobile boundary.
- **Stamp:** A rectangular oxblood outline contains the prepared-status text in
  condensed uppercase. It is a status mark, not a control.
- **Motion:** The stamp arrives once with the source-defined `register-stamp`
  animation. `prefers-reduced-motion: reduce` removes the animation but retains
  the text.
- **Accessibility:** The title uses light-DOM semantic text with one `main`, one
  `h1`, and a visible status paragraph. Forced colors remove decorative fields
  but keep the text hierarchy and border contrast.
- **Scope:** The Milestone 015 title adds the satire disclaimer and one setup
  action. It does not claim that a match is playable.

### Setup register

The setup register is a flat semantic form. It does not use dashboard cards.

- **Groups:** Native fieldsets group Match and Characters. Each group uses one
  oxblood heading and one filing rule.
- **Controls:** Native selects use pale paper, registry ink, square borders,
  and a municipal-blue focus ring. Buttons use the condensed display face.
- **Validation:** Errors sit directly after their control, use deep oxblood,
  and name the problem and recovery. Color is not the only error signal.
- **Actions:** Back is an outlined record action. Start match is the filled
  oxblood primary action. Both keep a minimum 44-pixel target height.
- **Accessibility:** Visible labels, native controls, fieldsets, error
  associations, source-order focus, deterministic heading focus after screen
  changes, forced colors, and text reflow are part of the component contract.

### Match dispatch table

The match surface is a dense parliamentary record. Municipal blue contains the
public chamber and private register. Warm paper contains the status rail,
sentence record, and shared phrase dockets.

- **Public facts:** Turn, required role, Pride, round, opening player, timer,
  reaction, and damage stay in semantic text.
- **Sentence ledger:** One ruled pale-paper field shows authoritative text or
  focus-only preview and names the next required role.
- **Temporary art:** Crisp geometric vector portraits and chamber geometry
  support identity. They do not replace semantic names or state.

### Phrase dockets

Phrase dockets are square ledger slips, not generic elevated cards.

- **Information:** Each available docket shows role, value, phrase, ownership,
  legal state, and weakness or disabled reason.
- **State:** Solid, double, and dashed rules plus visible state text distinguish
  legal, illegal, denied, disabled, selected, and empty states without color
  alone.
- **Focus:** A municipal-blue three-pixel outline identifies keyboard focus.
  Focus changes only the visible sentence preview.
- **Removal:** A selected shared phrase leaves its numbered docket empty.

### Match actions and comeback register

- **Actions:** Primary, secondary, disabled, and strategic-foul actions use
  square two-pixel oxblood rules and condensed uppercase labels.
- **Keyboard hints:** Small keycaps appear after keyboard input. They remain
  hidden during pointer-only use.
- **Comebacks:** An interrupting ruled paper register contains only affordable
  choices and a clear Close action. Escape restores its trigger focus.

### Resolution and final match records

The resolution surface opens the completed exchange as one ordered public
record. Square speech balloons and short reaction lines retain the political
theatre character without hiding score facts. Construction status, ordered
terms, rule activations, outgoing damage, continuation, simultaneous meters,
and the round result remain in semantic text before motion starts.

- **Calculation:** Two parallel ledgers keep each player's terms in engine
  order. The outgoing equation separates sentence damage from the
  unmultiplied comeback bonus.
- **Meters:** Visible before-and-after values own the meaning. One 420
  millisecond bar change confirms the simultaneous update. Reduced motion
  shows the same final state without animation.
- **Results:** A municipal-blue final record keeps every statistic label,
  including zero and `None` values. Rematch and setup remain separate square
  controls after the complete explanation.
- **Responsive reading:** Player records become one reading column on narrow
  screens. The complete ledger scrolls vertically without horizontal page
  movement.

## Do's and Don'ts

The following guardrails apply across the implemented title, setup, and match
records. Each later game screen still needs its own surface brief.

### Do

- Keep the public-record presentation formal, legible, and subtly satirical.
- Keep `Grand` and `Transition` in one semantic heading. Place them in
  contrast-safe fields at the responsive seam.
- Use Barlow Condensed for the display and status text. Use Georgia for ledger
  text.
- Preserve the visible prepared status and semantic light DOM text.
- Keep the satire disclaimer visible on the title screen.
- Keep setup choices in native labeled controls with visible recovery text.
- Keep tactical legality, ownership, disabled reasons, and weaknesses visible
  in text or symbols as well as color.
- Keep match truth in the reducer and use the sentence ledger for focus-only
  previews.

### Don't

- Do not add artificial intelligence options, persistence, privacy handover,
  or tutorial presentation before their owning milestones.
- Do not add raster grain, metal punches, or literal registry metadata from the
  approved composition. They are concept evidence, not production requirements.
- Do not turn setup fields into tactical dockets or phrase dockets into generic
  dashboard cards.
- Do not use a rounded, shadowed, or color-only card language for match state.
