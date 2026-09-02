# Milestone 023: Asset Pipeline and Visual System

**Status:** Approved  
**Depends on:** 022  
**Owns:** Art direction, runtime asset pipeline, tokens, and slice motion  
**Production-file budget:** 10

## Deliver

Build the Sharp pipeline, manifest validation, visual tokens, and landscape
asset loading. Regenerate the fixed current character and scene asset baseline
from scratch as original final-quality static art. Complete state and motion art
for the four vertical-slice characters and one scene. Add core reactions,
ambience, and transitions.

## Regeneration baseline and decision recovery

### Fixed replacement baseline

This milestone regenerates the explicit fixed character and scene Portable
Network Graphics (PNG) baseline below. Do not derive the scope from a later
directory scan. The baseline contains 29 character PNG files and four scene PNG
files.

The character baseline contains the 19 default portraits that Milestone 026
defines and these ten current alternate portraits:

- `black-sea-captain--alternate.png`;
- `government-ai--alternate.png`;
- `midnight-sensationalist--alternate.png`;
- `oat-milk-reformist--alternate.png`;
- `red-folded-chairman--alternate.png`;
- `retiring-cassandra--statesman.png`;
- `thunder-tribune--alternate.png`;
- `velvet-mogul--boardroom-patriarch.png`;
- `velvet-mogul--silk-diplomat.png`; and
- `velvet-mogul--velvet-statesman.png`.

The scene baseline contains these current layers:

- `modern-debate-studio.png`;
- `modern-debate-studio-desks.png`;
- `transition-era-television-studio.png`; and
- `transition-era-television-studio-desks.png`.

An asset added after this fixed baseline does not enter Milestone 023
automatically. Milestone 031 owns later portraits, skins, states, scene
identities, and layers. Regenerating the fixed baseline does not move those
future requirements into this milestone.

Regeneration is atomic for each represented archetype. Regenerate its default
portrait and every baseline alternate skin in the same art pass. Review them as
one package before accepting any file. Do not retain, accept, or ship an old
alternate skin beside a regenerated default skin. An alternate added after the
fixed baseline remains under Milestone 031, but it must be created from scratch
under the same locked art direction and completed character study.

Regenerate each baseline asset as new art. A current raster can be inspected
only to find a missing, lost, or conflicting decision. Do not give a current
raster to an image generator. Do not trace it, edit it, composite it into a new
master, or use it as an image-to-image, identity, composition, or style
reference. Generation inputs are the approved public art direction, a complete
private character study or approved scene specification, and approved external
research references.

### Character readiness

Each of the 19 represented archetypes must have one complete private character
study before regeneration starts for any of its skins. An existing prompt does
not qualify as a complete study. The study must define the archetype,
silhouette, proportions, face or mechanical display, clothing or chassis,
gesture rhythm, prop logic, palette, every baseline skin, state language,
references, exclusions, and recorded reference approval when it is required.

The art agent must audit the study before generation. When information is
missing, lost, unclear, or contradictory, the agent must use `$grill-me` with
the product owner. It must resolve one decision at a time and record each answer
in the private study. The agent must not infer the missing decision from a
current raster or prompt. It must not start generation while one required
decision remains unresolved or deferred.

### Scene readiness

Each baseline scene layer must have a complete direction in its approved owning
specification. The direction must define the camera, composition, layer
boundary, moderator when present, architecture, furniture, props, lighting,
palette, focal regions, interface-safe regions, and responsive crop. A prompt
in the temporary folder is implementation evidence only and does not complete
this direction.

When scene information is missing, lost, unclear, or contradictory, the art
agent must use `$grill-me` with the product owner. It must resolve one decision
at a time and record each answer in the owning approved specification before
generation starts.

Use one locked art direction for the complete baseline. Review all regenerated
assets together. A successful isolated portrait or scene does not establish
visual consistency. The complete set must use one flat cel-shaded cartoon
language, contour system, shape construction, value-step limit, material
simplification, lighting logic, proportion system, texture density, and level
of exaggeration.

Each of the four Milestone 023 vertical-slice characters has one default skin
and one through eight alternate skins. One archetype has no more than eight
alternate skins.
Default portraits use `<character-id>.png`. Alternate portraits use
`<character-id>--<skin-id>.png`. Asset discovery derives the skin catalog from
this filename convention. It does not use a TypeScript skin registry.

The default skin is first. The roster uses only the default skin.

Setup stages and matches use the selected skin. All skins for one character share its character
identity and phrase content.

## Overall art direction

The only approved direction for generated representational raster art is a flat
cel-shaded editorial cartoon. It combines exaggerated political caricature,
theatrical staging, late-2000s post-socialist broadcast graphics, bureaucracy,
decayed luxury, and restrained modern overlays. Use an integrated arena
composition. One authored scene fills the play field. Opponents face each other
at the sides. Status frames the top, and speech spans the confrontation.
Sentence construction owns the center.

This direction supports immediate video-game readability and reduces reliance
on realistic facial and material detail that can expose generated artifacts or
create an accidental close likeness. It does not replace originality,
reference approval, license, provenance, or editorial review requirements.

Secondary actions use the perimeter. Do not put the scene above a separate
three-column dashboard.

Use the same flat cel-shaded construction for every character, skin, state,
robot, fixed moderator, scene, foreground plate, architecture element,
furniture item, lighting fixture, and prop. No representational raster can use a
secondary or blended rendering style.

Construct each asset with these mandatory rules:

- Use bold dark contours around the main silhouette and important internal
  forms. Keep one consistent relative contour weight across people, robots,
  furniture, props, and architecture.
- Build forms from large, clean, flat color shapes. Each local color can use a
  base value, one hard-edged shadow value, and one optional hard-edged highlight
  value. Do not use soft modeled transitions.
- Use deliberate caricature. Exaggerate selected head, face, body, posture,
  gesture, prop, furniture, and architectural shapes while preserving coherent
  human or mechanical anatomy, functional perspective, and readable occlusion.
- Show material differences through silhouette, color, contour, and limited
  flat pattern. Do not simulate skin pores, fabric weave, polished metal,
  glossy plastic, marble depth, or other microtexture.
- Express light with designed hard-edged shadow and highlight shapes. Do not use
  photographic light falloff, soft airbrushing, bloom, depth of field,
  volumetric light, or ray-traced reflection.
- A sparse low-contrast paper or screen-print texture can cover large shapes.
  It must not model volume, imitate realistic material, obscure contours, or
  create generated clutter.

Painted comic-book rendering, painterly semi-realism, realistic concept art,
photographic or stock-photo rendering, hyper-realism, and
three-dimensional-render styling are prohibited. Also reject soft blended
shading, glossy model-like surfaces, realistic portrait finish, inconsistent
outline weight, tiny decorative noise, accidental symbols, malformed anatomy,
and nonsensical construction detail.

A scene can keep its own era, palette, architecture, and material identity
through designed shapes and color while it remains visibly part of the same
flat cartoon world as its characters.

This structure is adapted from user-supplied original-game references. It is a
composition and interaction precedent, not a parity target. Keep the cartoon
stage as authored art and rebuild every game value, phrase, and control as HTML
components. Use original characters and product truth. Do not copy another
game's art, brands, names, exact ornament, fonts, proportions, unsupported
actions, or rasterized interface text. Do not use generic dashboard cards and
stock fantasy frames.

Use a dark institutional palette with navy, charcoal, paper,
oxide red, brass, television blue, and cream. Tricolor is a sparse accent.

### Character art direction

Every playable character must communicate one distinct fictional political,
media, civic, or bureaucratic archetype before the nameplate is visible. This
is a mandatory direction for all characters and all skins. Do not use a generic
politician, generic presenter, generic official, generic robot, or placeholder
portrait.

Character exaggeration must be intentional and stable. Each private study names
the features that become larger, smaller, sharper, rounder, longer, shorter, or
more angular. Do not enlarge all features equally. Do not preserve realistic
portrait proportions by default. Alternate skins apply the same degree of
caricature and the same contour, value-step, texture, and shape rules as the
default skin.

Define each character through one coherent set of visual decisions:

- a dominant full-body silhouette and body proportion;
- a distinct head shape, face design, hair design, or mechanical face system;
- role-specific clothing or chassis construction;
- a signature posture and gesture rhythm;
- one meaningful prop, or an explicit no-prop rule; and
- one character accent color within the shared institutional palette.

The silhouette, posture, face system, and prop logic must remain legible at the
smallest supported match size. At least three of these traits must distinguish
the character from every other character with a similar social role. Do not
depend on one color or one handheld object for recognition.

The default skin establishes the archetype. An alternate human skin can change
gender, age, hair, and clothing, but it must preserve the archetype's role,
temperament, gesture rhythm, and prop logic. An alternate robot skin can change
the chassis, but it must preserve the same administrative function, expression
system, temperament, and prop logic. Every pose and expression must look like
the same fictional character under a new game condition.

Each character is human or fully mechanical. Animal words in names, titles,
insults, or metaphors must not produce animal anatomy. Human character masters
and runtime variants reject animal heads, ears, muzzles, beaks, feathers,
tails, wings, paws, fur, scales, and human-animal hybrids. Robot characters
reject human, animal, and hybrid anatomy.

Character-specific visual descriptions, real-world references, source links,
and private approval records belong only in the Git-ignored research folder.
The research folder supplies approved private generation briefs, but it is not
a published product contract and never ships. Public specifications, shipped
prompts, source notes, and asset metadata use fictional names and generic source
descriptions. They do not include real-person names or character-reference
links. Research can inform original, transformative work, but it does not
permit copying one photograph, artwork, logo, or exact pose.

### Scene art direction

Each scene uses the same flat cel-shaded cartoon construction as the playable
characters. Simplify and deliberately exaggerate architecture, curtains,
screens, platforms, desks, chairs, lamps, microphones, bottles, and decorative
objects. Preserve one coherent camera, perspective system, floor plane, human
scale, and layer boundary. Functional perspective does not permit realistic
rendering.

Every fixed moderator follows the same human caricature, contour, flat-color,
value-step, and texture rules as playable human characters. Foreground plates
must match their back scenes in contour weight, palette, hard-edged lighting,
shape language, and texture density. A realistic moderator, glossy desk,
photographic prop, or softly rendered background fails the complete scene
package.

### Vertical-slice integration

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
Each portrait follows the shared character art direction and its private study.
On a 1024 by 1536 interim plane, the opaque full-body silhouette spans 95
through 98 percent of the canvas height. A portrait must not use a fixed face
crop or fixed head width.

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

Keep temporary renders and lossless working rasters in the temporary folder.
Keep private character descriptions, references, and custom prompts in the
research folder. Sharp generates committed AV1 Image File Format (AVIF) and
WebP runtime variants. The manifest records dimensions, crop, owner, source,
and license. Import through the manifest. Load setup art first and only the
selected match package next. Use self-hosted licensed Web Open Font Format 2
(WOFF2) fonts with metric fallbacks.

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
generation source. It also rejects a character PNG that embeds its exact custom
prompt. Shipping assets contain no chroma-key residue.

Validation also rejects every alpha-bearing PNG that lacks the workflow, key,
or alpha-source metadata, has nonzero outer corners, or retains an opaque
chroma-green pixel. A soft-key conversion also fails when it has no
partial-alpha pixels or lacks its matte and foreground reconstruction metadata.

`npm run assets:convert-green -- <green-root> <output-root>` converts a complete
green-render tree whose prompts are beside the renders. For character art, use
`npm run assets:convert-green -- <green-root> <output-root> --prompt-root
<prompt-root>`. The green renders stay in the temporary folder, and the matching
relative prompt files stay in the research folder. The converter verifies each
prompt but embeds only a generic source record in all conversion modes. It does
not embed the private prompt, its path, or its links. The converter preserves
each Portable Network Graphics file's relative path. The input and output roots
must be different.

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
- **AC-023-09:** Each of the four vertical-slice characters has one default skin
  and one through eight alternate skins. A ninth alternate fails validation.
  Filename discovery is deterministic, and the default is first. Foundation
  characters can keep only their default interim portrait until Milestone 031.
  The roster resolves only the default. Setup and match views resolve an
  available requested skin without changing character or phrase data.
- **AC-023-10:** Each final character is recognizable without its nameplate by
  its silhouette, posture, face system, and prop logic. Default and alternate
  skins preserve one fictional archetype across all named states. The research
  folder contains the character-specific study and remains excluded from Git,
  builds, and published artifacts. Public files contain no real-person name or
  character-reference link.
- **AC-023-11:** Character-tree conversion resolves every matching prompt from
  a separate research root. A missing or empty prompt fails before conversion.
  The shipping raster contains a generic source record but does not contain the
  exact prompt, its private path, or its links.
- **AC-023-12:** The regeneration inventory contains exactly the 29 character
  and four scene PNG files in the fixed baseline. Each replacement has a new
  source hash and a generation-input record. The input record contains no
  current raster. A missing baseline replacement or an extra asset claimed as a
  Milestone 023 replacement fails the inventory. A later nonbaseline asset
  remains under Milestone 031 and does not fail this inventory.
- **AC-023-13:** All 19 represented archetypes have a complete private character
  study before generation. An existing prompt alone fails readiness. Every
  missing or conflicting decision has a recorded `$grill-me` answer from the
  product owner, and no required decision remains unresolved or deferred.
- **AC-023-14:** Each baseline scene layer has complete camera, composition,
  layer, subject, prop, lighting, focal-region, interface-safe-region, and crop
  direction in its owning approved specification. A temporary prompt alone
  fails readiness. Missing decisions have recorded `$grill-me` answers in that
  specification.
- **AC-023-15:** No current raster is a generation, tracing, editing,
  compositing, identity, composition, or style input for its replacement. A
  side-by-side review of the complete regenerated baseline confirms one shared
  flat cel-shaded cartoon language, contour system, flat-color construction,
  two-or-three-level value system, hard-edged lighting, material
  simplification, proportion system, texture density, and exaggeration level.
  Each archetype package contains its regenerated default and every baseline
  alternate. No package mixes old and regenerated skins.
- **AC-023-16:** A complete inventory review inspects all 29 character PNG files
  and all four scene PNG files individually at source size and together in
  representative stage compositions. It records pass or fail for contour
  weight, flat color shapes, value-step count, hard-edged lighting, deliberate
  exaggeration, simplified material treatment, and restrained texture. Any
  painted comic-book, painterly semi-realistic, realistic concept-art,
  photographic, hyper-realistic, three-dimensional-render, or mixed-style
  result fails the milestone. A sample or selected subset does not satisfy this
  review.

## Impeccable UI validation

1. Run `$impeccable audit` on the final-art title, setup, and match surfaces.
2. After audit repairs, run `$impeccable critique` on the visual-system slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Validation proves formats, sizes, crops, ownership, and licenses. Browser tests
show correct variants without layout shift at target viewports. Manual evidence
reviews every baseline asset and representative complete stage compositions
against the approved flat cel-shaded direction. It also reviews the motion
modes. `npm run ci` passes. Stop before the remaining roster, audio, speech, or
presentation reactions.

## Reference

[Sharp image processing](https://sharp.pixelplumbing.com/)
