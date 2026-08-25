# Milestone 023: Asset Pipeline and Visual System

**Status:** Approved  
**Depends on:** 022  
**Owns:** Art direction, runtime asset pipeline, tokens, and slice motion  
**Production-file budget:** 10

## Deliver

Build the Sharp pipeline, manifest validation, visual tokens, and landscape
asset loading. Produce original final-quality art for three characters and one
scene. Add core reactions, ambience, and transitions.

The art combines editorial caricature, painted theatre, late-1990s
post-socialist broadcast graphics, bureaucracy, decayed luxury, and restrained
modern overlays. Use an integrated arena composition. One authored scene fills
the play field, opponents face each other at the sides, status frames the top,
speech spans the confrontation, sentence construction owns the center, and
secondary actions use the perimeter. Do not put the scene above a separate
three-column dashboard.

This structure is adapted from user-supplied original-game references. It is a
composition and interaction precedent, not a parity target. Keep the painted
stage as authored art and rebuild every game value, phrase, and control as HTML
components. Use original characters and product truth. Do not copy another
game's art, brands, names, exact ornament, fonts, proportions, unsupported
actions, or rasterized interface text. Avoid generic dashboard cards and stock
fantasy frames. Use a dark institutional palette with navy, charcoal, paper,
oxide red, brass, television blue, and cream. Tricolor is a sparse accent.

Every character is human. Animal words in names, titles, insults, or metaphors
must not produce animal anatomy. Character masters and runtime variants reject
animal heads, ears, muzzles, beaks, feathers, tails, wings, paws, fur, scales,
and human-animal hybrids.

The pre-pipeline match slice uses a separate character-free rendered scene and
transparent interim portraits for the Red-Folded Chairman, Thunder Tribune, and
Black Sea Captain. It must not use a baked raster that fixes two characters
into one scene. Milestone 023 replaces or promotes these interim files through
the approved manifest and variant pipeline without changing the
selected-character contract.

The redesign must select exactly four self-hosted sans-serif font families. The
present Barlow Condensed, Cormorant SC, Georgia, and system-monospace
combination is implementation evidence, not visual authority.

1. Poiret One Regular 400 is the selected Art Deco feature-display family. It
   owns the game title, main menu, character names, Pause, End, Comeback, and
   other decisive features. Use `0.06em` tracking. Apply a responsive 0.9
   through 1.4-pixel synthetic stroke to large feature text and a 0.65 through
   0.95-pixel stroke to major actions. This synthetic emboldening is an approved
   exception because Poiret One has no bold master. Use it only at medium and
   large sizes. Fascinate and Fascinate Inline are permanently disqualified. Do
   not propose, test, install, or use either family.
2. Nunito Black 900 is the selected rounded speech family. It owns delivered
   speech, the current construction, and sentence previews. Render it in visual
   uppercase while preserving the authored case for source text, accessibility,
   and speech output. Fredoka Bold is rejected. Do not restore it without new
   explicit approval.
3. Rubik is the selected rounded interface family. Use regular 400, semibold
   600, and bold 700. It owns phrase lists, private phrases, setup fields,
   labels, validation, disabled reasons, score explanations, tutorial text,
   privacy handovers, and compatibility text. Its tabular figures own Pride,
   damage, scores, and rounds.
4. Share Tech Mono is the selected retro liquid-crystal-display family. It owns
   the timer only. Do not use it for any other number or text.

The implementation uses `@fontsource/poiret-one`,
`@fontsource-variable/nunito`, `@fontsource-variable/rubik`, and
`@fontsource/share-tech-mono`. Each package includes the SIL Open Font License
1.1. Poiret One uses its Basic Latin subset. Nunito and Rubik load Basic Latin
and Latin Extended coverage through Fontsource subset declarations. The feature,
speech, and interface metric fallback is Arial and then sans-serif. The timer
fallback is Cascadia Mono, Consolas, and then monospace.

Verify all four selected families together in the built arena. The
Art Deco feature family needs English UI coverage only. The timer family needs
digits and timer punctuation only. The speech and interface families must cover
localized grammar and phrase content, including Romanian diacritics. Test
uppercase and mixed-case English names, the longest localized speech and
phrase, digits, punctuation, disabled text, and the 1024 by 720 viewport. Except
for the approved Poiret One treatment, reject a family if it needs condensed
spacing, outline effects, synthetic weights, or text smaller than 11 pixels to
fit. Record the selected families, weights, licenses, metric fallbacks, and use
rules in this specification and the design record before implementation is
complete. The wide speech bubble uses light paper. The compact phrase path uses
a near-black broadcast plate, thin oxblood row rules, and Rubik phrase text
without visible role, ownership, weakness, disabled-reason, or hint metadata.
Action plates use coherent authored icons and framing.

Human characters use three-quarter opponent-facing silhouettes, layered parts, at
least five expressions and six poses, plus idle, selection, thinking, delivery,
light and heavy hit, weakness, comeback, and grammar-mistake states.
Use Cascading Style Sheets (CSS), sprite sheets, and two-dimensional Canvas
first. The Web Graphics Library (WebGL) or another graphics runtime needs a
new specification with bundle, frame-time, and fallback proof.

Keep lossless masters ignored or external. Sharp generates committed AV1 Image
File Format (AVIF) and WebP runtime variants. The manifest records dimensions,
crop, owner, source, and license. Import through the manifest. Load setup art
first and only the selected match package next. Use self-hosted licensed Web
Open Font Format 2 (WOFF2) fonts with metric fallbacks.

## Asset and motion contract

Scene masters are layered 1920 by 1080 files. Runtime wide scene variants are
640 by 360, 1280 by 720, and 1920 by 1080. Character masters are transparent,
square, and at least 2048 by 2048. Runtime character widths are 320, 640, and
960. Character portrait or token variants are 128 and 256 square pixels.

Every raster runtime size has AVIF and WebP output. The manifest contains ID,
owner type and ID, source description, license identifier, SHA-256 source hash,
format, pixel dimensions, byte size, focal point, crop rectangle, and generated
variant paths. Dimensions are present in markup before decode.

At the largest size, one AVIF scene is at most 350 kibibytes (KiB), its WebP
fallback is at most 500 KiB, one AVIF character state is at most 250 KiB, and
its WebP fallback is at most 350 KiB. The selected scene and both selected
character image packages total at most 3 mebibytes (MiB) in their preferred
formats. Setup does not preload unselected match packages.

Each named character state maps to one pose and one expression. The set uses at
least five distinct expressions and six distinct poses; the 11 named states do
not each require a unique image when the manifest declares the combination.
Normal reactions last 150 through 600 milliseconds, transitions at most 700
milliseconds, and idle loops 2 through 8 seconds.

Initial page cumulative layout shift (CLS) is at most 0.05. Replacing or
updating a card, reaction, or character state produces exactly 0 layout shift.

## Acceptance criteria

- **AC-023-01:** The manifest rejects every missing field, duplicate ID, bad
  hash, unsupported format, wrong dimension, out-of-range crop, and missing
  license at the asset path.
- **AC-023-02:** Sharp reproduces byte-identical variant dimensions and paths
  from unchanged masters, and every file meets its per-file and package budget.
- **AC-023-03:** Browser tests select AVIF when supported, fall back to WebP,
  reserve dimensions before decode, and load no unselected match package.
- **AC-023-04:** Three characters expose all 11 states with at least five
  expressions and six poses. Missing mappings fail validation.
- **AC-023-05:** All supported landscape variants keep declared focal regions
  visible and meet CLS limits.
- **AC-023-06:** Motion procedures meet all timing and pointer requirements.
- **AC-023-07:** The approved font comparison covers all four exclusive roles,
  specified content, and viewports. The selected local WOFF2 files, licenses,
  weights, metric fallbacks, and use rules are recorded, and fallback rendering
  causes no hidden or clipped text. Visual uppercase does not change source,
  accessible, or spoken sentence text.

## Impeccable UI validation

1. Run `$impeccable audit` on the final-art title, setup, and match surfaces.
2. After audit repairs, run `$impeccable critique` on the visual-system slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Validation proves formats, sizes, crops, ownership, and licenses. Browser tests
show correct variants without layout shift at target viewports. Manual evidence
reviews the approved visual direction and motion modes. `npm run ci` passes.
Stop before the remaining roster, audio, speech, or tutorial.

## Reference

[Sharp image processing](https://sharp.pixelplumbing.com/)
