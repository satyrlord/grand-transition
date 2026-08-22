---
name: "Grand Transition: A Verbal Republic"
description: "A civic-ledger title system for a verbal republic."
colors:
  municipal-blue: "#062840"
  deep-municipal-blue: "#041d2e"
  warm-ledger-paper: "#e0d6c2"
  pale-paper: "#eee4d3"
  registry-ink: "#202020"
  official-oxblood: "#6d2823"
  deep-oxblood: "#481c1a"
  registry-rule: "rgb(23 25 22 / 38%)"
typography:
  display:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(3.2rem, 8vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.78
    letterSpacing: "-0.035em"
  body:
    fontFamily: 'Georgia, "Times New Roman", serif'
  record-subtitle:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "clamp(1.05rem, 2vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.18em"
  status:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(0.8rem, 1vw, 0.95rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
spacing:
  edge: "clamp(1.25rem, 4vw, 4.5rem)"
components:
  title-record-stamp:
    textColor: "{colors.official-oxblood}"
    typography: "{typography.status}"
    padding: "0.6rem 0.85rem 0.55rem"
    width: "min(13rem, 100%)"
---

# Design System: Grand Transition: A Verbal Republic

## Overview

**Creative North Star: "The Open Civic Ledger"**

The title surface presents Grand Transition as the first page of an open civic
record. A municipal-blue cloth field meets warm official paper at an oxblood
binding seam. The result is formal, legible, and lightly satirical: a fictional
public record with enough physical logic to make the title feel filed rather
than merely displayed.

The system is deliberately quiet around one large semantic message. Condensed
display type gives the product name an official-register voice, while serif
record text keeps the subtitle and status grounded in the page. Filing rules,
the seam, and the small registration stamp provide structure without adding
controls or later-milestone game behavior to the title placeholder.

**The Open Record Rule.** Treat the title as an entry in an open civic record:
formal, legible, and specific to this fictional republic.

**Key Characteristics:**
- Open civic-ledger character with understated political-theatre satire.
- Asymmetric blue-cloth and warm-paper fields joined by a narrow oxblood seam.
- One oversized title, precise ruled registration, and a quiet prepared-status stamp.
- Semantic light-DOM text and code-native material structure.

## Colors

The palette uses municipal blue and warm paper as structural fields, near-black
ink for the primary title, and restrained oxblood for the binding, rules, and
status mark.

### Primary

- **Official Oxblood**: Use for the subtitle rules, registration stamp, and selected structural emphasis.

### Secondary

- **Municipal Blue**: Use as the cloth field behind `Grand`.
- **Deep Municipal Blue**: Use as the darker seam-adjacent blue in the binding geometry.
- **Deep Oxblood**: Use as the narrow binding seam that joins the two fields.

### Neutral

- **Warm Ledger Paper**: Use as the main paper field behind `Transition` and the page body.
- **Pale Paper**: Use as the light display ink on the blue field.
- **Registry Ink**: Use for the main title on paper and the body text baseline.
- **Translucent Rule Ink**: Use for quiet filing lines and registration marks.

**The Binding Rule.** Keep oxblood as a narrow structural join and precise
record accent. It connects the two fields; it does not become a broad wash.

## Typography

**Display Font:** Barlow Condensed (self-hosted, with sans-serif fallback)
**Body Font:** Georgia (with Times New Roman and serif fallbacks)

**Character:** The pairing combines a condensed official-register voice with a
serif ledger voice. Display text is assertive and compressed; record text is
formal and readable.

### Hierarchy

- **Display**: Heavy condensed uppercase for the single product heading. The desktop scale is fluid and the mobile scale remains bounded for reflow.
- **Record subtitle**: Bold serif uppercase with generous tracking and ruled oxblood edges. It names the fictional republic without competing with the title.
- **Status**: Condensed uppercase in a small rectangular stamp. It states the prepared condition and does not imply loading or playable behavior.
- **Body**: Georgia is the inherited record face for semantic page text.

**The One Heading Rule.** Keep the product name as one semantic `h1` even when
the two words occupy separate color fields.

## Layout

The title record fills the viewport with a minimum height of `100svh` and uses
an edge spacing token that scales from `1.25rem` to `4.5rem`. On wide screens,
the record uses a 38/62 column split: `Grand` sits on municipal blue and
`Transition` sits on warm paper, with the title crossing the seam as one
heading. Quiet pseudo-element rules stay behind the semantic content.

At the proven `700px` boundary (`max-width: 43.75rem`), the ledger changes to a
vertical 37/63 blue-to-paper stack. The heading remains one semantic unit, but
the words occupy their own contrast-safe fields. The status stays at the lower
right on ordinary mobile widths and can use the available page width at 200%
text scaling. At `1440px` and above (`min-width: 90rem`), the subtitle receives
the source-defined upward offset.

## Elevation & Depth

This implementation is flat by default and uses structural depth instead of
shadows. Contrast between cloth blue and paper, the narrow binding seam, ruled
registration marks, borders, and layered pseudo-elements make the record feel
physical. The title surface has no box-shadow vocabulary and no production
raster texture.

**The Structural Depth Rule.** Create depth with tonal fields, seams, rules, and
layering; do not add ornamental shadows to this title record.

## Shapes

The form language is square and official. The record fields, rules, and stamp
use sharp corners with no rounded treatment. The status stamp uses a 2px
oxblood border, compact internal padding, centered uppercase text, and a small
counter-clockwise rotation to suggest a hand-registered mark. Filing lines are
thin and quiet; the binding seam is narrow rather than pill-shaped or card-like.

## Components

This milestone establishes one signature pattern only. It does not establish
shared button, input, chip, card, or navigation primitives.

### Title record / registration stamp

The title record is an edge-to-edge semantic header composition. Its distinctive
custom mark is the static status stamp at the lower right of the paper field.

- **Record:** A single semantic `h1` crosses the desktop seam and becomes a vertical two-field title below the mobile boundary.
- **Stamp:** A rectangular oxblood outline contains the prepared-status text in condensed uppercase. It is a status mark, not a control.
- **Motion:** The stamp arrives once with the source-defined `register-stamp` animation. `prefers-reduced-motion: reduce` removes the animation while retaining the text.
- **Accessibility:** The title uses light-DOM semantic text with one `main`, one `h1`, and a visible status paragraph. Forced colors remove decorative fields but keep the text hierarchy and border contrast.
- **Scope:** The Milestone 001 surface has no action, navigation, game state, or claim of playable behavior.

## Do's and Don'ts

The following guardrails apply to the implemented title record and its direct
visual descendants. Future screens need their own surface briefs and may add
patterns that this title-only milestone does not contain.

### Do:

- **Do** keep the public-record mood formal, legible, and lightly satirical.
- **Do** keep `Grand` and `Transition` in one semantic heading while placing them in contrast-safe fields at the responsive seam.
- **Do** use Barlow Condensed for the display and status voice and Georgia for ledger text.
- **Do** preserve the visible prepared status and semantic light-DOM text.

### Don't:

- **Don't** add controls, navigation, gameplay, or playability claims to the Milestone 001 title placeholder; its surface brief has no action.
- **Don't** add raster grain, metal punches, or literal registry metadata from the approved comp; they are concept evidence, not production requirements.
- **Don't** invent shared button, input, card, chip, or navigation components from this title-only surface.
