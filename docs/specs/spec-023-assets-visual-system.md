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
Use CSS, sprite sheets, and Canvas 2D first. WebGL or a graphics runtime needs a
new specification with bundle, frame-time, accessibility, and alternative proof.

Keep lossless masters ignored or external. Sharp generates committed AVIF and
WebP runtime variants and a manifest with dimensions, crop, owner, source, and
license. Import through the manifest. Load setup art first and only the selected
match package next. Use self-hosted licensed WOFF2 fonts with metric fallbacks.

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
