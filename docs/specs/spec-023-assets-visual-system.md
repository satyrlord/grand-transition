# Milestone 023: Asset Pipeline and Visual System

**Status:** Approved  
**Depends on:** 022  
**Owns:** Art direction, runtime asset pipeline, tokens, and slice motion  
**Production-file budget:** 10

## Deliver

Build the Sharp pipeline, manifest validation, visual tokens, and landscape
asset loading. Produce original final-quality art for four characters and one
scene. Add core reactions, ambience, and transitions.

Each catalog character has a default skin and at least one alternate skin.
Default portraits use `<character-id>.png`. Alternate portraits use
`<character-id>--<skin-id>.png`. Asset discovery derives the skin catalog from
this filename convention. It does not use a TypeScript skin registry.

The default skin is first. The roster uses only the default skin.

Setup stages and matches use the selected skin. All skins for one character share its character
identity and phrase content.

The art combines editorial caricature, painted theatre, late-2000s
post-socialist broadcast graphics, bureaucracy, decayed luxury, and restrained
modern overlays. Use an integrated arena composition. One authored scene fills
the play field. Opponents face each other at the sides. Status frames the top,
and speech spans the confrontation. Sentence construction owns the center.

Secondary actions use the perimeter. Do not put the scene above a separate
three-column dashboard.

Use one hand-painted editorial-caricature language for playable portraits,
fixed moderators, studio architecture, furniture, lighting fixtures, and props.
Use visible painterly brushwork, simplified material detail, expressive edges,
and restrained comic exaggeration. Do not combine these illustrated portraits
with photographic, stock-photo, or hyper-realistic scene layers. A scene can
keep its own era, materials, palette, and lighting while it remains visibly part
of the same illustrated world.

This structure is adapted from user-supplied original-game references. It is a
composition and interaction precedent, not a parity target. Keep the painted
stage as authored art and rebuild every game value, phrase, and control as HTML
components. Use original characters and product truth. Do not copy another
game's art, brands, names, exact ornament, fonts, proportions, unsupported
actions, or rasterized interface text. Do not use generic dashboard cards and stock
fantasy frames.

Use a dark institutional palette with navy, charcoal, paper,
oxide red, brass, television blue, and cream. Tricolor is a sparse accent.

Each character is human or fully mechanical. Animal words in names, titles,
insults, or metaphors must not produce animal anatomy. Human character masters
and runtime variants reject animal heads, ears, muzzles, beaks, feathers,
tails, wings, paws, fur, scales, and human-animal hybrids. Robot characters
reject human, animal, and hybrid anatomy.

The pre-pipeline match slice uses a rendered municipal studio with one fixed
fictional moderator. It uses transparent interim portraits for the Red-Folded
Chairman, Thunder Tribune, Black Sea Captain, and Government AI. It also uses
one transparent foreground plate with two tall standing desks. The back scene
must not contain a playable character. The desk plate clips the lower portrait
bodies without fixing either
selected character into the scene. Milestone 023 replaces or promotes these
interim files through the approved manifest and variant pipeline without
changing the selected-character contract.

Interim portrait planes use a tall two-to-three canvas and continue below the
foreground desks. Their lower raster edges must not appear in the composite.
The Black Sea Captain default skin wears a warm-cream naval officer uniform and
cap and holds one unbranded cigar. His skins have no wheel or helm prop. His
alternate female skin wears a fitted navy-blue formal suit with restrained
nautical details.

The Thunder Tribune keeps his full-body pose, raised hand, papers, and
expression. He is tall and heavyset, with a broad adult body, dark side-parted
hair, and large clear gold-rimmed eyeglasses. On the 1024 by 1536 interim
plane, his opaque full-body silhouette spans 95 through 98 percent of the
canvas height. The portrait must not use a fixed face crop or fixed head width.

The redesign must select exactly four self-hosted sans-serif font families. The
present Barlow Condensed, Cormorant SC, Georgia, and system-monospace
combination is implementation evidence, not visual authority.

1. Poiret One Regular 400 is the selected Art Deco feature-display family. It
   owns the game title, main menu, character names, Pause, End, Comeback, and
   other decisive features. Use `0.06em` tracking. Apply a responsive 0.9
   through 1.4-pixel synthetic stroke to large feature text and a 0.65 through
   0.95-pixel stroke to major actions. This synthetic emboldening is an approved
   exception because Poiret One has no bold master. Use it only at medium and
   large sizes.

   Fascinate and Fascinate Inline are permanently disqualified. Do
   not propose, test, install, or use either family.
2. Nunito Black 900 is the selected rounded speech family. It owns delivered
   speech, the current construction, and sentence previews. Render it in visual
   uppercase. Preserve the authored case for source text, accessibility, and
   speech output. Do not use Fredoka Bold without new explicit approval.
3. Rubik is the selected rounded interface family. Use regular 400, semibold
   600, and bold 700. It owns phrase lists, private phrases, setup fields,
   labels, validation, disabled reasons, score explanations, and compatibility
   text. Its tabular figures own Pride,
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
localized grammar and phrase content, including Romanian diacritics.

Test
uppercase and mixed-case English names, the longest localized speech and
phrase, digits, punctuation, disabled text, and the 1024 by 720 viewport. Except
for the approved Poiret One treatment, reject a family if it needs condensed
spacing or outline effects to fit. Also reject it if it needs synthetic weights
or text smaller than 11 pixels.

Record the selected families, weights, licenses,
metric fallbacks, and use rules in this specification. Record them in the design
record before implementation is complete. The wide speech bubble uses light
paper. The compact phrase path uses a near-black broadcast plate and thin
oxblood row rules. It uses Rubik phrase text without visible role, ownership,
weakness, disabled-reason, or hint metadata.

Action plates use coherent authored icons and framing.

Characters use three-quarter opponent-facing silhouettes and layered parts.
Human characters use human anatomy, and robot characters use only mechanical
anatomy. They use at least five expressions and six poses. They include idle,
selection, thinking, delivery, and light and heavy hit states. They also include
weakness, comeback, and grammar-mistake states.
Use Cascading Style Sheets (CSS), sprite sheets, and two-dimensional Canvas
first. The Web Graphics Library (WebGL) or another graphics runtime needs a
new specification with bundle, frame-time, and fallback proof.

Keep lossless masters ignored or external. Sharp generates committed AV1 Image
File Format (AVIF) and WebP runtime variants. The manifest records dimensions,
crop, owner, source, and license. Import through the manifest. Load setup art
first and only the selected match package next. Use self-hosted licensed Web
Open Font Format 2 (WOFF2) fonts with metric fallbacks.

Milestone 015 already promotes the title emblem and proscenium to focused WebP
runtime files with Portable Network Graphics fallbacks and entry preloads. That
title-only slice does not satisfy this milestone's Sharp reproducibility, AVIF,
manifest, crop, license, or complete package contracts.

Every transparent scene and character asset uses the
`green-chroma-key-v1` workflow. Its generation intermediate uses a flat
`#00FF00` matte. Transparent art does not use that key color intentionally.
The deterministic converter replaces the matte with genuine alpha and embeds
the workflow identifier and key color in the shipping Portable Network Graphics
(PNG) file. It samples the matte from border-connected green pixels. It uses
green-channel dominance and sample distance to classify the matte, foreground,
and uncertain contour.

It uses the sample in the known-matte compositing
equation. It estimates uncertain coverage from nearby foreground samples and
reconstructs foreground red, green, and blue values.

If the source has a binary
contour, one three-by-three binomial pass creates a bounded partial-alpha edge.
The pass copies the nearest foreground color into new edge pixels. The converter records
`Alpha Source=soft-green-key-v1`,
`Alpha Matte=green-dominance-neighbor-matte-v1`, and
`Foreground Reconstruction=known-green-unmix-v1`.

An existing genuine-alpha asset can use the `adopt` path. It records
`Alpha Source=adopted-alpha-v1` and does not claim soft-key conversion.
An existing opaque raster can use `provenance <png> --source <origin>` when its
verified source origin exists and its generation prompt does not. Do not invent
a source or prompt. Asset validation rejects every PNG that lacks an embedded
generation prompt or source. Shipping assets contain no chroma-key residue.

Validation also rejects every alpha-bearing PNG that lacks the workflow, key,
or alpha-source metadata, has nonzero outer corners, or retains an opaque
chroma-green pixel. A soft-key conversion also fails when it has no
partial-alpha pixels or lacks its matte and foreground reconstruction metadata.

`npm run assets:convert-green -- <green-root> <output-root>` converts a complete
green-master tree. It preserves each Portable Network Graphics file's relative
path. Each master requires a sibling `<asset-name>.prompt.txt` source record.
The input and output roots must be different.

## Asset and motion contract

Scene masters are layered 1920 by 1080 files. Runtime wide scene variants are
640 by 360, 1280 by 720, and 1920 by 1080. Character masters are transparent,
square, and at least 2048 by 2048. Runtime character widths are 320, 640, and
960. Character portrait or token variants are 128 and 256 square pixels.
Foreground scene plates use the same wide dimensions as their matching back
scene and preserve transparent outer corners.

Every raster runtime size has AVIF and WebP output. The manifest contains the ID,
owner type, owner ID, source description, and license identifier. It contains
the SHA-256 source hash, format, pixel dimensions, and byte size. It also
contains the focal point, crop rectangle, and generated variant paths.
Dimensions are present in markup before decode.

At the largest size, one AVIF scene is at most 350 kibibytes (KiB). Its WebP
fallback is at most 500 KiB. One AVIF character state is at most 250 KiB. Its
WebP fallback is at most 350 KiB. The selected scene and both selected
character image packages total at most 3 mebibytes (MiB) in their preferred
formats. Setup does not preload unselected match packages.

Each named character state maps to one pose and one expression. The set uses at
least five distinct expressions and six distinct poses. The 11 named states do
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
- **AC-023-04:** Four characters expose all 11 states with at least five
  expressions and six poses. Missing mappings fail validation.
- **AC-023-05:** All supported landscape variants keep declared focal regions
  visible and meet CLS limits.
- **AC-023-06:** Motion procedures meet all timing and pointer requirements.
- **AC-023-07:** The approved font comparison covers all four exclusive roles,
  specified content, and viewports. The evidence records the selected local
  WOFF2 files, licenses, weights, metric fallbacks, and use rules.
  Fallback rendering causes no hidden or clipped text. Visual uppercase does not change source,
  accessible, or spoken sentence text.
- **AC-023-08:** A synthetic near-green matte fixture has known foreground
  colors. It converts to a transparent background, opaque interior, and
  partial-alpha contour. The reconstructed contour color stays within the
  alpha-aware eight-bit Canvas round-trip tolerance. A
  binary green-matte fixture gains a partial-alpha edge. Asset validation
  rejects a soft-key output with missing method metadata or no partial alpha.
- **AC-023-09:** Every discovered character has a default skin and at least one
  alternate skin. Filename discovery is deterministic, and the default is
  first. The roster resolves only the default. Setup and match views resolve the
  requested skin without changing character or phrase data.

## Impeccable UI validation

1. Run `$impeccable audit` on the final-art title, setup, and match surfaces.
2. After audit repairs, run `$impeccable critique` on the visual-system slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Validation proves formats, sizes, crops, ownership, and licenses. Browser tests
show correct variants without layout shift at target viewports. Manual evidence
reviews the approved visual direction and motion modes. `npm run ci` passes.
Stop before the remaining roster, audio, speech, or presentation reactions.

## Reference

[Sharp image processing](https://sharp.pixelplumbing.com/)
