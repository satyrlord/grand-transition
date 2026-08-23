# Milestone 023: Asset Pipeline and Visual System

**Status:** Approved  
**Depends on:** 022  
**Owns:** Art direction, runtime asset pipeline, tokens, and slice motion  
**Production-file budget:** 10

## Deliver

Build the Sharp pipeline, manifest validation, visual tokens, and responsive
asset loading. Produce original final-quality art for two characters and one
scene. Add core reactions, ambience, transitions, and reduced-motion variants.

The art combines editorial caricature, painted theatre, post-socialist broadcast
graphics, collage type, bureaucracy, decayed luxury, and modern overlays. Avoid
generic dashboard cards, stock fantasy frames, and copied reference-game
composition. Use a dark institutional palette with navy, charcoal, paper,
oxide red, brass, television blue, and cream. Tricolor is a sparse accent.

Characters use three-quarter opponent-facing silhouettes, layered parts, at
least five expressions and six poses, plus idle, selection, thinking, delivery,
light and heavy hit, weakness, comeback, fault, victory, and defeat states.
Use Cascading Style Sheets (CSS), sprite sheets, and two-dimensional Canvas
first. The Web Graphics Library (WebGL) or another graphics runtime needs a
new specification with bundle, frame-time, accessibility, and alternative proof.

Keep lossless masters ignored or external. Sharp generates committed AV1 Image
File Format (AVIF) and WebP runtime variants. The manifest records dimensions,
crop, owner, source, and license. Import through the manifest. Load setup art
first and only the selected match package next. Use self-hosted licensed Web
Open Font Format 2 (WOFF2) fonts with metric fallbacks.

## Asset and motion contract

Scene masters are layered 1920 by 1080 files. Runtime wide scene variants are
640 by 360, 1280 by 720, and 1920 by 1080. Each scene also has a 720 by 1280
portrait crop with focal coordinates. Character masters are transparent,
square, and at least 2048 by 2048. Runtime character widths are 320, 640, and
960. Portrait or token variants are 128 and 256 square pixels.

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
milliseconds, and idle loops 2 through 8 seconds. Reduced motion removes loops,
shake, parallax, and large translation; an optional opacity change is at most
150 milliseconds.

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
- **AC-023-04:** Two characters expose all 11 states with at least five
  expressions and six poses. Missing mappings fail validation.
- **AC-023-05:** Desktop, narrow-landscape, and portrait crops keep declared
  focal regions visible and meet CLS limits.
- **AC-023-06:** Normal and reduced-motion procedures meet all timing,
  flashing, pointer, and semantic-DOM requirements.

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
