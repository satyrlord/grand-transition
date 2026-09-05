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
directory scan. The baseline contains 27 character PNG files and four scene PNG
files.

The character baseline contains the 18 default portraits that Milestone 026
defines and these nine current alternate portraits:

- `government-ai--alternate.png`.
- `midnight-sensationalist--alternate.png`.
- `oat-milk-reformist--alternate.png`.
- `red-folded-chairman--alternate.png`.
- `retiring-cassandra--statesman.png`.
- `thunder-tribune--alternate.png`.
- `velvet-mogul--boardroom-patriarch.png`.
- `velvet-mogul--silk-diplomat.png`.
- `velvet-mogul--velvet-statesman.png`.

The retired `black-sea-captain--alternate.png` is not regenerated, shipped, or
counted in this baseline.

The retired `presidential-sphinx.png` is not regenerated, shipped, or counted
in this baseline.

The scene baseline contains these current layers:

- `modern-debate-studio.png`.
- `modern-debate-studio-desks.png`.
- `transition-era-television-studio.png`.
- `transition-era-television-studio-desks.png`.

The current playable catalog also includes four opaque scene masters:
`county-council-ballroom.png`, `midnight-call-in-studio.png`,
`palace-press-hall.png`, and `influencer-campaign-livestream.png`. These use the
same 1920-by-1080 source canvas, six runtime variants, crop core, and shared safe
rectangles. Each has a focal point at `(0.5, 0.5)` and explicitly absent
moderator and foreground-desk focal rectangles. The asset pipeline validates
all eight scene masters. The original four-layer baseline remains the studio
regeneration boundary; the four added backgrounds replace the retired
foundation fallback under Milestone 026.

An asset added after this fixed baseline does not enter Milestone 023
automatically. Milestone 031 owns later portraits, skins, states, scene
identities, and layers. Regenerating the fixed baseline does not move those
future requirements into this milestone.

Regeneration is atomic for each represented archetype. Regenerate its default
portrait and every baseline alternate skin in the same art pass. Review them as
one package before accepting any file. Do not retain, accept, or ship an old
alternate skin beside a regenerated default skin. An alternate added after the
fixed baseline remains under Milestone 031.
Create it from scratch under the same locked art direction and completed
character study.

Regenerate each baseline asset as new art. A current raster can be inspected
only to find a missing, lost, or conflicting decision. Do not give a current
raster to an image generator. Do not trace it or edit it.

Do not composite it into a new master. Do not use
it as an image-to-image, identity, composition, or style reference. Generation
inputs are the approved public art direction and a
complete private character study or approved scene specification.

### Character readiness

Each of the 18 represented archetypes must have one complete private character
study before regeneration starts for any of its skins. An existing prompt does
not qualify as a complete study. The study must define the archetype,
silhouette, proportions, face or mechanical
display, and clothing or chassis. It must also define gesture rhythm, prop logic,
palette, every baseline skin, state language, and exclusions. Any required
product-owner approval is recorded in the private
study.

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
visual consistency. The complete set must use one flat cel-shaded cartoon language, contour system,
shape construction, and value-step limit. Material simplification, lighting
logic, proportion system, texture density, and level of exaggeration must also agree.

Each of the four Milestone 023 vertical-slice characters has one default skin
and zero through eight alternate skins. One archetype has no more than eight
alternate skins. The Black Sea Captain has no alternate skin in this baseline.
Default portraits use `<character-id>.png`.

Alternate portraits use
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
composition. One authored scene fills the play field.

Opponents face each other
at the sides. Status frames the top, and speech spans the confrontation.
Sentence construction owns the center.

This direction supports immediate video-game readability. It reduces reliance
on realistic facial and material detail that can expose generated artifacts or
create an accidental close likeness. It does not replace originality, license,
provenance, or editorial review requirements.

Secondary actions use the perimeter. Do not put the scene above a separate
three-column dashboard.

Use the same flat cel-shaded construction for every character, skin, state,
robot, fixed moderator, scene, and foreground plate. Apply it to each
architecture element, furniture item, lighting fixture, and prop. No
representational raster can use a
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

Designed shapes and color can preserve a scene's era, palette, architecture,
and materials. The scene must remain visibly part of the same flat cartoon
world as its characters.

This structure is adapted from user-supplied original-game references. It is a
composition and interaction precedent, not a parity target. Keep the cartoon
stage as authored art and rebuild every game value, phrase, and control as HTML
components. Use original characters and product truth. Do not copy another
game's art, brands, names, exact ornament, fonts, proportions, unsupported
actions, or rasterized interface text. Do not use generic dashboard cards and
stock fantasy frames.

Use a dark institutional palette with navy, charcoal, paper,
oxide red, brass, television blue, and cream. Tricolor is a sparse accent.

### Color and white balance

Use neutral sRGB white balance and an ungraded color treatment. Do not apply a
global yellow, amber, sepia, golden-hour, mustard, beige, or brown wash. Warm
color is local to an authored material or light, such as brass, wood, cream,
skin, oxide red, or a lamp. Navy and charcoal shadows must retain their cool or
neutral separation, and declared neutral anchors must not become yellow. Do not
cancel a warm cast with a global blue filter. Reject the asset and regenerate
it from the approved direction.

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

- a dominant full-body silhouette and body proportion.
- a distinct head shape, face design, hair design, or mechanical face system.
- role-specific clothing or chassis construction.
- a signature posture and gesture rhythm.
- one meaningful prop, one coherent prop system with one dominant object and
  at most one supporting object, or an explicit no-prop rule.
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

Character-specific visual descriptions and other private study data belong only
in the Git-ignored research folder. The research folder supplies approved
private generation briefs, but it is not a published product contract and
never ships. Public specifications, shipped prompts, source notes, and asset
metadata use fictional names and generic source descriptions. They do not
include real-person names. Research can inform original, transformative work,
but it does not permit copying one photograph, artwork, logo, or exact pose.

### Scene art direction

All four fixed scene layers use one straight-on orthographic 16:9 camera. Center
the camera on the stage center axis. Keep its view level and perpendicular to
the stage. Do not use camera pitch, yaw, roll, lens distortion, or perspective
convergence. Keep vertical and horizontal architectural lines parallel.

Place both standing-character eye lines on one shared horizontal band. An
orthographic scene does not make a more distant subject smaller. Show depth
with overlap, layer order, color, and hard-edged value changes instead of
perspective scale. The back scene and its foreground desk plate must use the
same canvas, stage origin, camera, scale, and alignment.

Use one mirrored duel grid for both scene packages. Divide the stage into a
left opponent zone, a clear central confrontation zone, and a right opponent
zone. Center each playable portrait and standing desk within its outer zone.
Keep playable character bodies and standing-desk mass out of the central
zone. The physical moderator occupies its dedicated central window between
the speech record and common phrase pool.

Both physical moderators sit at the stage center. Keep each complete head
above the common phrase pool. The pool may cover moderator furniture and the
lower body. Its background uses 78 percent opacity so furniture remains
visible while phrase text stays legible. Keep the foreground standing desks
in the opponent zones.

The
back scene owns the moderator, architecture, fixed furniture, and rear props.
The transparent foreground plate owns both standing desks and their attached
or placed props. Neither layer contains a playable character.

Use one central moderator focal point at 50 percent of master width and
43 percent of master height. Preserve each moderator as a seated person in the
studio. Do not replace a moderator with a screen image or floating head. Use
one authored scale across viewport ratios. Keep the full head inside the
central focal rectangle, above the common phrase pool at 52 percent of scene
height. The transition-era moderator keeps her physical wood-and-brass desk.
The modern moderator keeps his beige chair, crossed legs, and a low table.

Playable character layers have visual priority over moderator bodies and
moderator furniture. A playable character or standing desk can cover part of a
moderator body, chair, platform, or desk, but the complete moderator face must
remain visible. A foreground standing desk can cover only the lower part of a
playable body. It must not cover a playable face, signature hand gesture, or
required prop. Hypertext Markup Language (HTML) content must also stay outside
those three playable-character features.

Use 20 percent of master width and 34 percent of master height as the normal
left-player face center. Mirror it at 80 percent of master width for the right
player. Protect the left face rectangle from 14 through 26 percent of width and
22 through 46 percent of height. Mirror it from 74 through 86 percent of width
for the right face. An approved character-height rule can move a face vertically inside its
protected rectangle. No part of the face can leave that rectangle at a named
acceptance viewport.

Measure vertical anchors from the top edge of the 16:9 canvas. Use these
vertical references as percentages of canvas height:

- Normal-adult standing eye line: 34 percent.
- Seated-moderator focal center: 43 percent.
- Standing-desk top: 62 percent.
- Main floor break: 72 percent. Apply the same normalized anchors to the
1920-by-1080 master and every runtime variant.

Runtime portrait frames use the same bottom-aligned scene canvas as the back
and foreground layers. Each square portrait frame is 80 percent of scene
height, starts at 24 percent of scene height, and centers at 20 or 80 percent
of scene width. Preserve the complete square source without an additional
letterbox offset. The speech record stays within the central 32 percent of
scene width, from 18 through 34 percent of scene height. Validate visible
character anatomy and speech together, not only the image element bounds.

An approved character-height contract can move a playable face above or below
the normal-adult eye-line reference. Keep the character on the same floor and
desk-occlusion system. Do not rescale the scene or move the desks to erase an
approved height difference. Desk fronts continue below the canvas edge so that
their lower contours never appear.

Use one shared focal and interface-safe model for both scene packages. Mirror
the playable-character regions. Keep the moderator centered in both studios.
The speech record ends above the moderator focal rectangle. The common phrase
pool begins below it and may cover the moderator desk, chair, or lower body.

Record all focal and interface-safe regions as normalized rectangles in the
1920-by-1080 master coordinate system. Apply the same rectangles to each runtime
variant before crop. A scene-specific decorative element cannot move, shrink,
or cover a shared interface-safe region.

Use fixed per-layer normalized rectangles for every focal class. Do not use a
shared envelope with scene-specific overrides. For each back or foreground
layer, record the exact rectangle or explicitly record that the focal class is
absent from that layer.

Reserve these character-layer focal rectangles in every back and foreground
scene layer. The left raised signature-gesture rectangle is
`x=22, y=18, width=10, height=18`. The mirrored right rectangle is
`x=68, y=18, width=10, height=18`. The left torso and required-prop rectangle is
`x=14, y=46, width=12, height=20`. The mirrored right rectangle is
`x=74, y=46, width=12, height=20`. Scene art does not own these rectangles and
must keep them free of a face, required prop, identifier, or high-contrast
ornament.

Use these per-layer focal rectangles. All values are percentages of master
width and height.

| Scene layer | Moderator face | Left desk top and props | Right desk top and props |
| --- | --- | --- | --- |
| Transition-era back | `x=46, y=35, width=8, height=14` | Absent | Absent |
| Modern back | `x=46, y=35, width=8, height=14` | Absent | Absent |
| Transition-era foreground | Absent | `x=26, y=56, width=6, height=16` | `x=68, y=56, width=6, height=16` |
| Modern foreground | Absent | `x=26, y=56, width=6, height=16` | `x=68, y=56, width=6, height=16` |

Desk extraction zones are mask-search bounds, not focal rectangles. Use
`x=12.5, y=54, width=19.5, height=46` for the left standing desk and
`x=68, y=54, width=19.5, height=46` for the right standing desk. A valid desk
mask contains changed pixels only inside its extraction zone. It
touches its desk top and prop focal rectangle.

It forms one connected
desk-and-prop component.
Exclude the moderator desk, moderator body, architecture, floor, and rear props
even when they appear inside an extraction zone.
The composite input, deskless input, back output, foreground output, and report
output must resolve to five different paths. Reject a path collision before a
tool writes a file.

Use these shared interface-safe rectangles, with all coordinates measured as
percentages of master width and height:

- protected top band: `x=12.5-87.5`, `y=0-18`.
- central interaction region: `x=32-68`, `y=18-94`.
- lower-left action region: `x=12.5-24`, `y=66-94`.
- lower-right action region: `x=76-87.5`, `y=66-94`.

Keep speech inside the central interaction region. Do not add a speech-safe
extension across a player gesture, player prop, or moderator focal rectangle.

The central interaction region contains a reserved moderator window at
`x=46-54`, `y=35-49`. No live text or control may cover that window. Its
moderator face is the only face permitted within the central region. Use
low-detail background shapes behind live text. Do not put another face,
required prop, scene identifier, text-like mark,
or high-contrast ornament in it. A desk front can cross a lower action region
only as a plain flat surface without a prop or important ornament.

Protect the central 75 percent of master width as the four-by-three crop core.
All moderators, standing desks, attached props, focal regions, and
interface-safe regions must stay inside that core. The outer 12.5 percent on
each side is decorative bleed and can be removed. It must not contain a required
subject, prop, architectural identifier, or layer-alignment marker.

Use the complete master at 16:9. For aspect ratios between 16:9 and 4:3, remove
equal amounts from the left and right decorative bleed. At 4:3, remove the full
12.5 percent from each side. Do not use letterboxing or crop inside the
protected core at any named acceptance viewport.

For a supported landscape ratio narrower than 4:3, fit the protected 4:3 core
to the full viewport width. Do not crop its left or right edge. Fill the extra
height with authored scene continuation instead of black bars or repeated
texture. The back layer extends ceiling shapes above and floor shapes below.

The foreground layer remains transparent above the standing desks and extends
plain desk fronts below them. Do not add a new subject, prop, identifier, or
ornament in an extension area. Use one scale and vertical alignment for both
layers, and preserve all focal and interface-safe regions.

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
   other decisive features. Use `0.06em` tracking.

   Apply a responsive 0.9
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

Test uppercase and mixed-case English names, the longest localized speech and
phrase, digits, punctuation, and disabled text. Include the 1024 by 720 viewport. Except
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
selection, thinking, delivery, and light and heavy hit states.

They also include
weakness, comeback, and grammar-mistake states.
Use Cascading Style Sheets (CSS), sprite sheets, and two-dimensional Canvas
first. The Web Graphics Library (WebGL) or another graphics runtime needs a
new specification with bundle, frame-time, and fallback proof.

Keep temporary renders and lossless working rasters in the temporary folder.
Keep private character studies and custom prompts in the research folder.
Sharp generates committed AV1 Image File Format (AVIF) and
WebP runtime variants. The manifest records dimensions, crop, owner, source,
and license.

Import through the manifest. Load setup art first and only the
selected match package next. Keep each scene variant in an external asset file.
Do not inline a scene or character variant in the initial JavaScript bundle.

Use self-hosted licensed Web Open Font Format 2 (WOFF2) fonts with metric
fallbacks.

The fixed character baseline uses
`src/assets/characters/character-manifest.json`. Each of its 27 entries maps
one default or alternate skin to the canonical `selection` state, pose, and
expression. `tools/character-replacement-baseline.json` records the replaced
source hashes for inventory verification only. It is not a generation input.

`tools/build-character-assets.mjs` creates 128, 256, 320, 640, and 960 square
AVIF and WebP variants. `tools/validate-character-assets.mjs` verifies the
fixed inventory, new source hashes, provenance-compatible transparent masters,
manifest fields, byte limits, and every generated file. A later
convention-added portrait does not enter this fixed baseline automatically. It
can use its source PNG until Milestone 031 promotes it through the final asset
pipeline.

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
a source or prompt.

Asset validation rejects every PNG that lacks an embedded
generation source. It also rejects a character PNG that embeds its exact custom
prompt. Shipping assets contain no chroma-key residue.
Lossy AVIF and WebP runtime variants can retain chroma-coded RGB only where
alpha is 16 of 255 or lower.

A chroma-green runtime pixel above that bounded
compression fringe fails validation. PNG masters retain the zero-residue rule.

Validation also rejects every alpha-bearing PNG that lacks the workflow, key,
or alpha-source metadata, has nonzero outer corners, or retains an opaque
chroma-green pixel. A soft-key conversion also fails when it has no
partial-alpha pixels or lacks its matte and foreground reconstruction metadata.

`npm run assets:convert-green -- <green-root> <output-root>` converts a complete
green-render tree whose prompts are beside the renders. For character art, use
`npm run assets:convert-green -- <green-root> <output-root> --prompt-root
<prompt-root>`. The green renders stay in the temporary folder, and the matching
relative prompt files stay in the research folder. The converter verifies each
prompt but embeds only a generic source record in all conversion modes.

It does
not embed private study data. The converter preserves each Portable Network
Graphics file's relative path. The input and output roots must be different.

## Asset and motion contract

Scene masters are layered 1920 by 1080 files. Runtime wide scene variants are
640 by 360, 1280 by 720, and 1920 by 1080. Character masters are transparent,
square, and at least 2048 by 2048. Runtime character widths are 320, 640, and
960.

Character portrait or token variants are 128 and 256 square pixels.
The visible full-body silhouette occupies at least 12 percent of each square
canvas and 92 through 99 percent of its height. This keeps slim characters
readable while it preserves a safe margin for broad poses and props.
Foreground scene plates use the same wide dimensions as their matching back
scene and preserve transparent outer corners.

Every raster runtime size has AVIF and WebP output. The manifest contains the ID,
owner type, owner ID, source description, and license identifier. It contains
the SHA-256 source hash, format, pixel dimensions, and byte size. It also
contains the focal point, crop rectangle, and generated variant paths.

Dimensions are present in markup before decode.
Validation rejects a crop, focal point, focal rectangle, or interface-safe
rectangle that differs from the exact approved geometry. This includes values
that remain inside the normalized canvas. The production build validates the scene
and fixed character packages before Vite writes `dist/`.

The color guard decodes each raster in sRGB, ignores transparent pixels and the
temporary green matte, and measures muted or neutral pixels. It uses the shared
policy in `tools/asset-color-policy.json`. Intentional warm materials are not
rejected by an average-red or average-green rule.

At the largest size, one AVIF scene is at most 350 kibibytes (KiB). Its WebP
fallback is at most 500 KiB. One AVIF character state is at most 250 KiB. Its
WebP fallback is at most 350 KiB. The selected scene and both selected
character image packages total at most 3 mebibytes (MiB) in their preferred
formats. Setup does not preload unselected match packages.

Each named character state maps to one pose and one expression. The set uses at
least five distinct expressions and six distinct poses. The nine named states do
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
- **AC-023-04:** Four characters expose all nine states with at least five
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
  and zero through eight alternate skins. A ninth alternate fails validation.
  Filename discovery is deterministic, and the default is first. Foundation
  characters can keep only their default interim portrait until Milestone 031.
  The roster resolves only the default. Setup and match views resolve an
  available requested skin without changing character or phrase data.
- **AC-023-10:** Each final character is recognizable without its nameplate by
  its silhouette, posture, face system, and prop logic. Default and alternate
  skins preserve one fictional archetype across all named states. The research
  folder contains the character-specific study and remains excluded from Git,
  builds, and published artifacts. Public files contain no real-person name or
  private study data.
- **AC-023-11:** Character-tree conversion resolves every matching prompt from
  a separate research root. A missing or empty prompt fails before conversion.
  A prompt without the shared neutral-white-balance and local-warm-color
  controls also fails before conversion. Required positive controls do not count
  when they occur in a negative-control section. A prohibited global warm grade
  remains invalid when the prompt also contains the required controls. The
  shipping raster contains a generic source record but does not contain the
  exact prompt or private study data.
- **AC-023-12:** The regeneration inventory contains exactly the 27 character
  and four scene PNG files in the fixed baseline. Each replacement has a new
  source hash and a generation-input record. The input record contains no
  current raster. A missing baseline replacement or an extra asset claimed as a
  Milestone 023 replacement fails the inventory.

  The retired Black Sea Captain
  alternate is not a valid replacement. A later nonbaseline asset remains under
  Milestone 031 and does not fail this inventory. The fixed character manifest,
  replacement-hash ledger, builder, and validator provide the objective
  inventory evidence. Focused builder and validator tests reject an unchanged
  source hash, missing license, or missing runtime variant.
- **AC-023-13:** All 18 represented archetypes have a complete private character
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
  side-by-side review of the complete regenerated baseline confirms one
  shared flat cel-shaded cartoon language, contour system, and flat-color
  construction. It confirms consistent two-or-three-level values, hard-edged
  lighting, simplified materials, proportions, texture density, and exaggeration.
  Each archetype package contains its regenerated default and every baseline
  alternate. No package mixes old and regenerated skins.
- **AC-023-16:** A complete inventory review inspects all 27 character PNG files and all four
  scene PNG files individually at source size. It also inspects them together
  in representative stage compositions. It records pass or fail for contour
  weight, flat color shapes, value-step
  count, and hard-edged lighting. It also records white balance, global color
  cast, deliberate exaggeration, simplified material treatment, and restrained
  texture. Any painted comic-book, painterly
  semi-realistic, realistic concept-art, photographic, hyper-realistic,
  three-dimensional-render, or mixed-style result fails the milestone. A
  sample or selected subset does not satisfy this review.
- **AC-023-17:** The asset color guard decodes every supported shipping raster in sRGB. It
  rejects a broad yellow cast over muted or neutral pixels. It accepts local
  brass, cream, skin, wood, oxide-red, and lamp colors when neutral or cool
  anchors remain. An image without a measurable neutral or cool anchor requires
  manual review.

  A small cool anchor does not permit a broad yellow
  cast across near-neutral pixels. The guard reports the asset path and measured
  values. Its neutral, near-neutral, yellow-wash, local-warm-accent, and
  green-matte fixtures pass in `tests/unit/asset-color-guard.test.ts`.

## Impeccable UI validation

1. Run `$impeccable audit` on the final-art title, setup, and match surfaces.
2. After audit repairs, run `$impeccable critique` on the visual-system slice.

Apply the shared Impeccable evidence and severity gate in the milestone index.

## Verify and stop

Validation proves formats, sizes, crops, ownership, licenses, and color policy.
Browser tests show correct variants without layout shift at target viewports.
The moderator-clearance checks in `e2e/playable-match-screen.spec.ts` verify
image readiness and geometry in the same browser evaluation. Pixel reads
require loaded images with positive intrinsic and rendered dimensions. A
delayed replacement portrait must wait for readiness. A real overlap must
still fail the clearance assertion.

Manual evidence reviews every baseline asset and representative complete stage
compositions against the approved flat cel-shaded direction. It also reviews
the motion modes. `npm run ci` passes. Stop before the remaining roster, audio,
speech, or presentation reactions.

## Reference

[Sharp image processing](https://sharp.pixelplumbing.com/)
