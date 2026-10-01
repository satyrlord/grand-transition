# Milestone 023: Asset Pipeline and Visual System

**Status:** Approved, evidence pending: AC-023-15, AC-023-16, AC-023-21, AC-023-22

**Depends on:** 022  
**Owns:** Art direction, runtime asset pipeline, tokens, and slice motion  
**Production-file budget:** 10

The rendering direction, the three researched pilot selections, and all fifteen
matching poses have product-owner approval. The complete pilot packages are
installed; final runtime verification remains pending.
The approved default Red-Folded Chairman selection and five matching poses are installed,
together with the new Transition-Era Television Studio background. Focused asset
checks and production-browser checks passed for all nine Chairman states on both
player sides at 1024 by 768 and 1280 by 720.
The owner tested that background in the game and accepted its moderator/speech
clearance. There is no outstanding moderator-clearance concern for this
background. Other scenes' clearance requirements stay unchanged. The remaining
human-roster and scene replacements remain open.
The owner-approved Modern Debate Studio replacement is installed with its
corrected 72-percent floor join and detailed broadcast equipment. Its accepted
pixels include soft tonal variation on the walls and floor. Retain this
source-specific acceptance; it does not change the flat-shading direction for
future generations. The approved Red-Folded Chairman alternate selection and
five matching poses are also installed. Its six native 1254-square sources
retain the approved pixels after the bounded alpha-1 cleanup and metadata
registration. Each pose used only the accepted alternate selection as its
image reference.
The owner-approved County Council Ballroom background is installed with its
derived runtime variants and existing foreground. Its accepted composition
has a wall/carpet join near 70.6 percent and a carpet/tile join near 78.8 percent.
Retain its accepted soft tonal variation without changing the flat-shading
direction for future generations. The approved Thunder Tribune default selection
and five matching poses are installed at their native 1254-square dimensions.
Delivery and comeback use the approved angry delivery pose. Each pose used
only the approved selection as its image reference. Registration preserves
the reviewed pixels; the existing nine-state mappings remain unchanged.
The owner-approved Thunder Tribune alternate selection is installed with five
reviewed matching poses under the authorized package integration. Each pose
used only that selection as its image reference. All six sources are native
1254-square images. Keep the accepted selection's tonal modeling as a
source-specific decision. Angry delivery also supplies comeback; the existing
nine-state mappings are unchanged. Native pixels remain unchanged after
inspection, bounded alpha-1 cleanup where needed, and metadata registration.
The approved Midnight Call-In Studio background is installed at native
3840 by 2160 with derived variants and its existing foreground. It uses a
modest Romanian cable studio, older broadcast props, and a layered city
skyline with restrained Romanian roof silhouettes. Preserve the approved
source's tonal variation. This acceptance is specific to this source and does
not change the flat-shading direction for future artwork.
The three approved pilot packages use their canonical source paths under
`src/assets/characters/`. Private research and review material do not ship.

## Terms

- AI: artificial intelligence.
- CSS: Cascading Style Sheets.
- HTML: Hypertext Markup Language.
- PNG: Portable Network Graphics.
- AVIF: AV1 Image File Format.
- API: application programming interface.
- ID: identifier.
- IDs: identifiers.
- RGB: red, green, and blue.
- RGBA: red, green, blue, and alpha.
- sRGB: standard red, green, and blue.
- KiB: kibibytes.
- HTTP: Hypertext Transfer Protocol.

## Government AI robot skins

Government AI has three original mechanical skins. The default skin is a tall,
thin, obsolete civic robot with a trapezoid amber display and a bent antenna.
It has a patched cream-and-blue chassis, an empty form folder, long limbs, and
oversized work boots. The `alternate` skin is a wide analytical records robot.
It has a hexagonal cyan display, a tapered aluminum cabinet chassis, an empty
dossier, a drawer with three tools, and an undercarriage with four wheels. The
two skins keep the administrative function, the dry temperament, and the
paperwork prop logic of the character. Each skin has its own original
silhouette and face system.

The `schoolteacher` skin is a strict, female-coded communist robot
schoolteacher, with the voice Microsoft Zira. It uses a rounded enamel
mechanical face, angular brass spectacles, three antenna vanes, and burgundy
academic chassis panels. It also uses a ruler, an empty gradebook, a
bell-shaped lower chassis, and a teaching platform with three wheels. Do not
use an apron, frills, a maid cap, or a skirt.
Do not use a vacuum, a cleaning tool, or a different domestic-service costume cue.

Each non-fallback skin has one transparent square selection master of at least 1024 pixels per edge. It has
five state masters with the usual AVIF/WebP variants: `thinking`,
`delivery`, `light-hit`, `heavy-hit`, and `weakness`. Each package maps `idle`
to selection, `comeback` to delivery, and `grammar-mistake` to weakness. The
executable inventory at this time contains 30 selection masters and 28 state
packages, which contain 140 state masters. Keep the 27-entry
replacement-baseline record with no changes. Declare all reviewed selections in
`portrait-layout.json`, and keep the full manifest inventories coherent.

The 2026-09-14 replacement selections use OpenAI generation from text only.
Their state masters use only the new original selection masters as identity
references. No portrait or state raster that a newer raster replaced is a
generation input. All replacement masters use the native-first transparency
workflow below. Keep a uniform canvas padding of 32 pixels around the smallest
variant.

Keep the fixed 27-entry selection manifest as the baseline inventory. Store
more slice states in a different location from the portrait skins that the
build finds from filenames. State art must not make more setup skins or go into
the fixed replacement inventory. The runtime resolves one character, one
selected skin, and one named state. Vite writes the state-manifest data in a
different JavaScript chunk.

Each generated
JavaScript chunk stays in the production gate of 500,000 bytes.
The remaining roster uses its selection portrait until Milestone 028.

Local Baron adds the selection-only `municipal-patron` skin in Milestone
028. Its master is `county-baron--municipal-patron.png`. The OpenAI API
generated it with `gpt-image-2.5-sunburst`. The generation used native 2048 by
2048 dimensions, native alpha, and an approved conforming portrait as a
style reference. This describes the existing asset provenance, not the route or style reference for new work. The
background repair that the owner approved clears only alpha-1 pixels that are
more than four pixels from near-opaque content.

Subsequently, the owner approved a deterministic
white-balance correction. It decreases the visible warm cast without
regeneration, resizing, geometry changes, or alpha changes. Keep the native
border and contour validation rules with no changes.
For native character variants, clear only the outer-border alpha that resizing
generated at 8 or less. Reject stronger border coverage, and do not clip the
figure. Encode the native AVIF variants of 128 and 256 pixels losslessly, so
that compression cannot put border haze back.

Record the lossless setting in the selection manifest.
Keep all the byte budgets and the encoding settings for larger images.
Decode larger native AVIF variants after encoding. If quality 70 puts pixels
that are not transparent on the border, retry at quality 90 and decode again.
If that border still fails, encode the variant losslessly. Record the actual
quality and, for lossless output, `lossless: true` in the selection manifest. Keep the same
byte budget, and reject each variant that continues to fail alpha validation.

Build the five AVIF/WebP sizes, and record the reviewed left-facing direction
and the source hash of the skin. Keep the default portrait and the baseline
hashes with no changes.

The roster shows all portrait variants of 128, 256, 320, 640, and 960 pixels.
Its image size hint of 21vw includes the cover fit of the square source.
It also includes the active headshot scale of 3.12 in the grid of six columns. The browser
selects the resolution for the viewport and the device pixel ratio, up to the
maximum of 960 pixels. Selected setup stages use their own size hint for the
selection art. The match image size hints agree with the reserved portrait
plane, min(80svh, 60vw).
Supported viewports do not use the roster hint or the setup hint for a larger
match image.

`src/assets/characters/portrait-layout.json` records the reviewed left or right
facing direction and the source hash of each baseline source. The builder
rejects missing, incorrect, or out-of-date layout records, and it copies the
facing direction into the selection manifest. Layout records do not make skins.
Filename discovery continues to control the skin catalog. State drawings use
the facing direction of their selected skin. A subsequent temporary portrait
that is not in the manifest uses the right-facing default until Milestone 028
promotes it.

Setup stages and matches mirror the drawing when its source direction is
different from the direction of the opponent. The two opponents face the
confrontation. Mirror the drawing layer independently of the reaction
transform. The reaction movement goes away from the opponent on each side, also when the
source faces left. This also applies to selection-only fallback portraits and
their turn-entry motion. Keep text, controls, and scene layers in their usual
orientation.

## Deliver

Build the Sharp pipeline, manifest validation, visual tokens, and responsive
asset loading. Milestone 018 controls the compact landscape and portrait layout
adaptations. Portrait uses the same aligned scene planes in a scene region
above its full-width phrase pool. Scene-canvas geometry applies to that region,
not to the full page, which scrolls. The integrated scene-and-pool placement
below stays the desktop landscape contract.

Generate again, from the start, the fixed character and scene asset baseline of
this time, as original static art of release quality. Complete the state art
and motion art for the four vertical-slice characters and one scene. Add core
reactions, visual lighting effects, and transitions.
Keep each code package in the budget of ten production files. Keep each
character-state art package to one master and six runtime files.

### Comeback sidekick pilot

Comeback sidekicks are optional transparent prop layers that a character
controls. Their filename is `<character-id>.png` in `src/assets/sidekicks/`.
Runtime discovery must not use a character map that a person edits by hand.
Each approved source is one static, right-facing, native-alpha square image.
The match mirrors that same image for player two.

Sidekicks use the shared flat cel-shaded editorial-cartoon
language, but they are different from selection skins and character-state
packages. Each sidekick is cartoony and anthropomorphic. Human concepts are
compact minions with no strings. Animal concepts are expressive pets. Object,
plant, or vehicle concepts keep the base silhouette that a person can recognize.

They get an integrated face or clear expressions and gestures like a human character.
Use bold connected shapes, thick near-opaque contours, and simplified details.
These stay easy to read at the runtime scale, and they pass native-alpha
preparation. Do not use a realistic object with no expression or a realistic
animal. Do not use puppet strings, marionette joints, hairline rigging, haze
that is not connected, or thin semi-transparent ornament.

At this time, the playable rollout contains these files that the user approved
manually:

- `algorithmic-prophet.png`.
- `apartment-block-geopolitician.png`.
- `black-sea-captain.png`.
- `coalition-acrobat.png`.
- `county-baron.png`.
- `diaspora-oracle.png`.
- `eu-funds-alchemist.png`.
- `football-tycoon.png`.
- `government-ai.png`.
- `luxury-minister.png`.
- `marble-diplomat.png`.
- `midnight-sensationalist.png`.
- `oat-milk-reformist.png`.
- `red-folded-chairman.png`.
- `reluctant-theorem.png`.
- `retiring-cassandra.png`.
- `spreadsheet-technocrat.png`.
- `thunder-tribune.png`.
- `velvet-mogul.png`.

Unknown character IDs intentionally resolve no sidekick. A
missing sidekick is correct, and it must not stop catalog loading, match setup,
or a Comeback.

`src/assets/sidekicks/layout.json` records the source height of each PNG and
the exclusive last pixel row that is not transparent. Get these values from
decoded native alpha. The view compensates for this transparent lower padding,
so that the visible base touches the viewport floor. The approved raster does
not change.
`tests/unit/sidekick-assets.test.ts` does checks of the full filename inventory
and the pixel bounds against each source PNG. After you change a source PNG,
run `node tools/sidekick-assets.ts build`. Run
`node tools/sidekick-assets.ts validate` to validate the generated metadata.
Milestone 030 emits lossless WebP sidekicks during the production build.
These derivatives keep the source canvas, visible pixel values, and alpha bounds.
The PNG masters stay in the source package and in the development asset path.

## Regeneration baseline and decision recovery

### Fixed replacement baseline

The fixed character and scene Portable Network Graphics (PNG) baseline below
remains the inventory-validation boundary. It does not authorize a new bulk
regeneration. The three-character trial and robot-preservation rules control
new character work. Do not get replacement scope from a directory scan. The baseline contains 27 character PNG
files and four scene PNG files.

The fixed character baseline contains 18 default portraits and these nine
alternate portraits. Characters that the project adds to the roster subsequently do not change this baseline:

- `government-ai--alternate.png`.
- `midnight-sensationalist--alternate.png`.
- `oat-milk-reformist--alternate.png`.
- `red-folded-chairman--alternate.png`.
- `retiring-cassandra--statesman.png`.
- `thunder-tribune--alternate.png`.
- `velvet-mogul--boardroom-patriarch.png`.
- `velvet-mogul--silk-diplomat.png`.
- `velvet-mogul--velvet-statesman.png`.

Do not generate again, ship, or count `black-sea-captain--alternate.png` in
this baseline.

Do not generate again, ship, or count `presidential-sphinx.png` in this
baseline.

`tools/scene-replacement-baseline.json` records the four replaced studio-layer
hashes only for inventory validation. It is not an art input. Validation
rejects those source hashes if they come back. Private generation records
keep the new diagram, the draft input graph, and the approved deterministic
finishing procedure for flat color and geometry.

The scene baseline contains these layers of this time:

- `modern-debate-studio.png`.
- `modern-debate-studio-desks.png`.
- `transition-era-television-studio.png`.
- `transition-era-television-studio-desks.png`.

The playable catalog of this time also includes four opaque scene masters:
`county-council-ballroom.png`, `midnight-call-in-studio.png`,
`palace-press-hall.png`, and `influencer-campaign-livestream.png`. These use the
same 16:9 source canvas, runtime variants for each resolution, crop core, and
shared safe rectangles. Each has a focal point at `(0.5, 0.5)`. For each, the
moderator focal rectangle and the foreground-desk focal rectangle are
explicitly absent. Milestone 028 adds four foreground layers for the foundation
scenes. The asset pipeline validates each scene master in the scene manifest.

Keep the four-layer baseline as the boundary for studio regeneration. Use the
four opaque backgrounds as the foundation scenes of Milestone 026.

An asset that the project adds after this fixed baseline does not go into
Milestone 023 automatically. Milestone 028 controls subsequent portraits,
skins, states, scene identities, and layers. When the fixed baseline is
generated again, those future requirements do not move into this milestone.

Keep the baseline source hashes for replacement-inventory validation.
Do not change the inventory to approve a rejected source.
For new character work, apply the current character art direction and trial
acceptance boundary below. Preserve approved robots and unrelated shipping
packages. The initial trial uses researched identity briefs without old raster
style inputs. After acceptance, the trial provides shared style references.
A pose uses its accepted selection as its only image reference.

### Character readiness

Each of the 19 archetypes in the baseline must have one complete private
character study before regeneration starts for one of its skins. A prompt that
the project has does not count as a complete study. The study must give the
archetype, silhouette, proportions, face or mechanical
display, and clothing or chassis. It must also give the gesture rhythm, prop
logic, palette, each baseline skin, state language, and exclusions. Record the
contract sources and the important implementation assumptions in the private
study. A different sign-off from the product owner is not necessary.

The art agent audits the study before generation. Use the owner contracts to
resolve usual missing details, and record important assumptions in the
private study. A raster or prompt of this time can identify a difference, but
it does not override the art direction. Tell the user about an input only when
the contracts cannot resolve a necessary input and it blocks generation. A
mandatory interview or human approval is not part of readiness.

### Scene readiness

Each baseline scene layer must have a complete direction in its approved owner
specification. The direction must give the camera, the composition, the layer
boundary, the moderator when there is one, the architecture, the furniture,
and the props. It must also give the lighting, the palette, the focal regions,
the interface-safe regions, and the responsive crop. A prompt in the temporary
folder is only implementation evidence, and it does not complete this
direction.

When scene data is missing, not clear, or does not agree with other data, use the shared art and
scene contracts to resolve usual details. Record important assumptions. When
the durable direction of the owner specification changes, update that
specification. Tell the user only about a necessary input that those contracts
cannot resolve and that blocks generation. A different interview or human
sign-off is not necessary.

Use one approved rendering direction for new art. Compare generated assets
together at equal displayed figure height. Keep contour treatment, broad shapes,
and cel shading consistent while varying adult proportions and face shapes.
Do not treat a three-character trial as evidence that the full roster is complete.

Each of the four Milestone 023 vertical-slice characters has one default skin
and zero through eight alternate skins. One archetype has no more than eight
alternate skins. The Black Sea Captain has no alternate skin in this baseline.
Default portraits use `<character-id>.png`.

Alternate portraits use
`<character-id>--<skin-id>.png`. Asset discovery gets the skin catalog from
this filename convention. It does not use a TypeScript skin registry.

The default skin is first. The setup roster shows each selectable skin that
discovery finds as one portrait choice. If no skin is selected, the default
stays the first fallback of the archetype.

Setup stages and matches use the selected skin. All skins for one character
share its character identity and phrase content.

## Overall art direction

The only approved direction for generated representational raster art is a flat
cel-shaded editorial cartoon. It is a mix of exaggerated political caricature,
theatrical staging, late-2000s post-socialist broadcast graphics, bureaucracy,
decayed luxury, and limited modern overlays. Use an integrated arena
composition. One authored scene fills the play field.

Opponents face each other
at the sides. Status is at the top, and speech goes across the confrontation.
Sentence construction controls the center.

This direction helps the player read the game immediately, and it agrees with
the intentionally silly tone of a browser game. It decreases the use of
realistic facial detail and material detail. That detail can show generated
artifacts or make an accidental close likeness. It does not replace the
requirements for originality, license, or provenance.

Secondary actions use the perimeter. Do not put the scene above a different
dashboard with three columns.

Use the same flat cel-shaded construction for each character, skin, state,
robot, fixed moderator, scene, and foreground plate. Apply it to each
architecture element, furniture item, lighting fixture, and prop. No
representational raster can use a
secondary or blended rendering style.

Make each asset with these mandatory rules:

- Use bold dark contours around the main silhouette and the important internal
  forms. Keep one consistent relative contour weight across people, robots,
  furniture, props, and architecture.
- Make forms from large, clean, flat color shapes. Each local color can use a
  base value, one hard-edged shadow value, and one optional hard-edged highlight
  value. Do not use soft modeled transitions.
- Use intentional caricature. Exaggerate the selected shapes of the head, face,
  body, posture, gesture, prop, furniture, and architecture. Keep coherent
  human or mechanical anatomy, functional perspective, and occlusion that is
  easy to read.
- Show material differences through silhouette, color, contour, and a small
  quantity of flat pattern. Do not simulate skin pores, fabric weave, polished
  metal, glossy plastic, marble depth, or other microtexture.
- Show light with designed hard-edged shadow shapes and highlight shapes. Do not
  use photographic light falloff, soft airbrushing, bloom, depth of field,
  volumetric light, or ray-traced reflection.
- A sparse low-contrast paper or screen-print texture can cover large shapes.
  It must not model volume, imitate realistic material, hide contours, or
  make generated clutter.

These styles are not permitted: painted comic-book rendering, painterly
semi-realism, and realistic concept art. Photographic or stock-photo
rendering, hyper-realism, and three-dimensional-render styling are also
not permitted. Also reject these results:

- Soft blended shading, glossy surfaces that look like a model, and a realistic
  portrait finish.
- Outline weight that is not consistent and tiny decorative noise.
- Accidental symbols, malformed anatomy, and construction detail that has no
  sense.

Designed shapes and color can keep the era, palette, architecture,
and materials of a scene. The scene must stay visibly part of the same flat
cartoon world as its characters.

This structure comes from references from the source game that the user gave. It is
an example for composition and interaction. It is not a target for parity. Keep
the cartoon stage as authored art, and make each game value, phrase, and
control again as HTML components. Use original characters and product truth.
Do not copy the art, brands, names, ornament, fonts, or proportions of a
different game. Also do not copy its unsupported actions or its rasterized
interface text. Do not use generic dashboard cards and stock fantasy frames.

Keep the institutional interface palette of navy, charcoal, paper,
oxide red, brass, television blue, and cream. Give scene artwork its own
researched palette with clear character/background separation. Tricolor is a sparse accent.

### Color and white balance

Use neutral sRGB white balance and a color treatment with no grade. Do not
apply a global yellow, amber, sepia, golden-hour, mustard, beige, or brown
wash. Warm color is local to an authored material or light, for example brass,
wood, cream, skin, oxide red, or a lamp. Navy and charcoal shadows must keep
their cool or neutral separation, and declared neutral anchors must not become
yellow. Do not cancel a warm cast with a global blue filter. Reject the asset,
and generate it again from the approved direction.

### Character art direction

New human character art uses **flat editorial cartoons**. Use clearly drawn
faces, varied adult body and head shapes, moderate head exaggeration, broad
clean color shapes, controlled dark contours, and two-tone cel shading.
Keep face and body rendering consistent. Do not use realistic skin detail,
photographic portrait shading, glossy modeling, or one repeated head template.
The approved Government AI robot skins remain unchanged.

Each fictional archetype has a distinct silhouette, face shape, costume,
gesture rhythm, and prop system. Keep anatomy coherent and recognizably adult.
Natural adult proportions are permitted. Exaggerate selected features only
when they improve the character's identity and comic expression. A large head
is not an acceptance requirement. Preserve space for hands, props, and poses.

Before each new selection master, confirm its private inspiration mapping.
Open reliable, clearly labeled web sources and visually inspect at least three
distinct usable photographs. Target five and inspect more when likeness remains
unclear. Duplicates, crops, and resized copies of one photograph count as one
image. Use varied angles and expressions, with front, three-quarter, and profile
views when available.
Use a coherent, dated era when appearance differs across sources. Record
each source URL, inspection date, selected era, and observed face, hair, and build
traits in the private study. Search snippets and unviewed images are not
appearance evidence. Verified web evidence takes precedence over conflicting
private research about identity and appearance. Correct that study before
generation. Keep factual appearance separate from the approved fictional role
and deliberate cartoon exaggeration. Do not invent a missing mapping.

A previous dossier can be reused only after its sources, relevant appearance,
and minimum distinct-image count are checked again. The accepted cartoon rendering does not replace the need
for recognizable researched resemblance. Style references control style only.
Poses inherit the researched, accepted selection without repeating web research
for each state.

Use one stable private identity and prop brief per character. It gives the
face shape, age cues, build, clothing, palette, gesture, prop count, and prop
placement. Keep these decisions across the accepted selection and all poses.
An approved likeness must use drawn features consistent with the body.
A separate private portrait generation or two-stage identity process is not
required. Keep private references and real-person source names out of public
metadata and shipped assets.

Complete a three-character trial with Football Tycoon, EU-Funds Alchemist,
and Luxury Minister before roster expansion. The trial must demonstrate
stocky, slender, and curvy adult silhouettes with distinct drawn faces.
Use researched identity briefs and authorized identity references. Do not impose an existing
portrait as its visual style reference. Show the actual trial artwork to the
product owner at source, roster, setup, and match scales. Obtain acceptance of
the artwork before bulk regeneration. The accepted triplet then becomes the
shared style reference. The product owner accepted the trial rendering style,
all three researched replacement selections, and their fifteen matching poses.
The replacements use the expanded five-photo research workflow and correct the
earlier identity differences. Each pose uses its accepted selection as the only
image reference. Complete package integration and runtime checks before treating
the pilot work as verified in the game.
Use the approved [Football Tycoon](../../src/assets/characters/football-tycoon.png),
[EU-Funds Alchemist](../../src/assets/characters/eu-funds-alchemist.png), and
[Luxury Minister](../../src/assets/characters/luxury-minister.png) selections
together for style comparison, not as identity sources for another character.
The approved default and alternate Red-Folded Chairman selections and their
five-pose packages are installed at their canonical source paths. Each pose
used only its own approved selection as the image reference. This approval does not
complete the remaining human roster.

Generate selections and poses with the built-in chat image generator using
native transparency. Use a square source of at least 1024 pixels per edge.
Keep larger accepted native sources, including existing 2048-square masters.
Do not enlarge a smaller source or sharpen it to simulate missing detail.
Use one generation as a shipping candidate. Inspect its actual dimensions,
alpha, face, silhouette, and props. Keep clean generated pixels unchanged.

Make the broad shapes and facial expressions readable at the smallest runtime
size. Inspect contours at large display sizes for blur or insufficient detail.
Inspect reductions for excessive edge contrast, lost expressions, and props
that become unreadable. Do not claim scale quality from source resolution
alone. Use actual roster crops, setup previews, and both match sides.

Keep the signature prop in the inner visible region at chest height or higher.
The source-space runtime window hides the outer 34 percent of the square and
the area below 46 percent of its height in the most restrictive match layout.
Use the runtime-window overlay and inspect the actual composition. Do not
accept necessary props that the desk, viewport, face, or hand hides.

Get selection acceptance before generating its five poses. Use that accepted
selection as the only pose image reference. Keep one short task record with
the brief, source paths, measured dimensions, decisions, and incomplete states.
Reuse accepted work. Do not repeat completed requests or requests with unknown
results. Structured prompt briefs remain an optional local check, not an API
requirement or a substitute for image review.

A new selection with changed proportions needs matching state art before it
replaces the shipping package. Keep the existing shipping selection and poses
until that package is complete and checked. Do not replace approved robot art.
Retain stable character and skin identifiers, gameplay data, and unaffected
assets. The three-character trial does not authorize bulk roster replacement
before artwork acceptance.

The Algorithmic Prophet keeps its small plain gray wizard hat. Targeted edits
preserve the accepted identity, clothing, gesture, and other unchanged features.
Existing source descriptions remain facts about those sources. They do not
force a new generation to reuse the same model, resolution, or old proportions.

Each character is human or fully mechanical. Animal words in names and titles
do not authorize animal or hybrid anatomy. Alternate skins can change age,
gender, hair, and clothing while preserving the fictional role, temperament,
and prop logic. Keep approved robot construction and expression systems.

Private studies stay in the ignored research folder. They are generation
inputs within the approved contract, not an independent product authority.
Public specifications and source metadata use fictional names and factual,
generic provenance. They do not publish private prompts or reference identities.

### Scene art direction

Opaque scene backgrounds use Flare at native 3840 by 2160.
The approved Transition-Era Television Studio, Modern Debate Studio,
County Council Ballroom, and Midnight Call-In Studio artwork is installed with derived runtime variants. The owner accepted the
first studio's moderator/speech clearance after testing in the game.
Keep these approved sources and the existing interface geometry. The Modern
Debate Studio and County Council Ballroom retain their accepted wall and floor
tonal variation. Midnight Call-In Studio also retains its approved source's
tonal variation and Romanian city silhouettes. The three other background replacements remain open.
Use the accepted flat editorial cartoon rendering of
the character trial: broad clean shapes, controlled contours, one base tone,
and one hard-edged shadow tone. Use a sparse highlight only for readability.
Fictional moderators and crowd figures have clearly drawn, nonrealistic faces
and varied adult proportions. Avoid photographic surfaces, painterly blending,
realistic portrait modeling, and tiny decorative texture.

Research each real-world setting, period, architecture, furniture, equipment,
and color language before a new scene. Start with user-supplied references.
Visually inspect at least five distinct relevant images across different views
or real examples, and use more when needed. Prefer original portfolios,
institutional photographs, and reliable archives. Record sources, dates when
known, and observed design choices in private research. Verified web evidence
overrides conflicting private notes.

Richness comes from specific large and medium architectural forms, furnishing,
equipment, authored color, and layered composition. Flat shading does not
require empty walls, sparse scenes, or one repeated palette. Keep identifying
details inside the narrow crop. Use quieter detail behind faces and controls
without turning those regions into featureless voids. Compare the palette
with real roster art: silhouettes, faces, hands, and props must remain clear.
Do not place navy clothing against a dominant navy field without separation.

For a source-inspired moderator, apply the character identity research rules
before generation. Reference inputs have explicit environment, palette,
identity, and rendering roles. Make an original design rather than copying
one photograph, its branding, or its exact arrangement. Source photographs,
private mappings, prompts, and review pages do not belong in public documents.

Keep the identity, camera, normalized geometry, focal regions, crop, and
interface clearance of each scene. This pending regeneration is not completed
by the pipeline refactor. Retain existing shipping backgrounds until each
replacement passes review and local integration checks. Generate desks, props,
and transparent foregrounds in chat under their native-size contract.

Use the flat cel-shaded editorial-cartoon direction for Transition-Era
Television Studio. Keep the identity direction of the blonde adult moderator
in the private generation brief. Use an attentive adult caricature that is a
small quantity angry, with a navy jacket and a light blouse. Reject anime,
childlike, doll-like, and geometric-placeholder faces. The owner-authorized
reference workflow replaces the earlier text-only restriction: inspected
studio references inform design, identity references inform the moderator,
and approved cartoon art informs rendering. Keep these roles separate.

Keep the shared camera, layer separation, focal regions,
color controls, and interface clearance below. A correct generation does not
show that the output conforms. The agent compares the artifact with these
contracts, and it keeps the result that it saw.

All four fixed scene layers use one straight-on orthographic 16:9 camera.
Center the camera on the center axis of the stage. Keep its view level and
perpendicular to the stage. Do not use camera pitch, yaw, roll, lens
distortion, or perspective convergence. Keep vertical and horizontal
architectural lines parallel.

Put the eye lines of the two standing characters on one shared horizontal
band. An orthographic scene does not make a subject smaller when it is farther
away. Show depth with overlap, layer order, color, and hard-edged value
changes, not with perspective scale. The back scene and its foreground desk
plate must use the same canvas, stage origin, camera, scale, and alignment.

Use one mirrored duel grid for the two scene packages. Divide the stage into a
left opponent zone, a clear central confrontation zone, and a right opponent
zone. Center each playable portrait and standing desk in its outer zone.
Keep the bodies of playable characters and the mass of the standing desks out
of the central zone. The physical moderator is in the dedicated central window
between the speech record and the common phrase pool.

The two physical moderators sit at the stage center. Keep each full head
above the common phrase pool. The pool can cover the moderator furniture and
the lower body. Its background uses 88 percent opacity, so that the furniture
stays visible and the phrase text stays easy to read. Keep the foreground
standing desks in the opponent zones.

The
back scene controls the moderator, the architecture, the fixed furniture, and
the rear props. The transparent foreground plate controls the two standing
desks and the props that are attached to them or put on them. No layer contains
a playable character.

Use one central moderator focal point at 50 percent of the master width and
43 percent of the master height. Keep each moderator as a person in a chair in the
studio. Do not replace a moderator with a screen image or a floating head. Use
one authored scale across viewport ratios. Keep the full head in the central
focal rectangle. The head is above the common phrase pool, which is at 52
percent of the scene height.

The transition-era moderator keeps her physical desk of wood and brass.
The modern moderator keeps his beige chair, crossed legs, and a low table.

Playable character layers have visual priority over the bodies and the
furniture of the moderators. A playable character or standing desk can cover
part of the body, chair, platform, or desk of a moderator. But the full face
of the moderator must stay visible. A foreground standing desk can cover only
the lower part of a playable body. It must not cover a playable face, a
signature hand gesture, or a necessary prop. Hypertext Markup Language (HTML)
content must also stay away from those three features of playable characters.

Render each studio foreground plate one time, complete and not clipped, above
the playable portraits. Its standing desks, microphones, bottles, desktop,
trim, and fronts are in one physical furniture plane. Do not copy one raster
into front and rear planes that do not agree. Keep each plate pointer-inert.
Put its props at positions where faces, signature hand gestures, and necessary
character props stay easy to read. The furniture must keep physically coherent
occlusion.

The usual face center of the left player is at 20 percent of the master width
and 34 percent of the master height. Mirror it at 80 percent of the master
width for the right player. The protected left face rectangle is from 14 through 26
percent of the width and 22 through 46 percent of the height.
For the right face, mirror it from 74 through 86 percent of the width. An approved
character-height rule can move a face vertically in its protected rectangle.
At a named acceptance viewport, no part of the face can go out of that
rectangle.

Measure vertical anchors from the top edge of the 16:9 canvas. Use these
vertical references as percentages of the canvas height:

- Normal-adult standing eye line: 34 percent.
- Seated-moderator focal center: 43 percent.
- Standing-desk top: 62 percent.
- Main floor break: 72 percent.

Apply the same normalized anchors to the 16:9 master and to each runtime
variant.

Runtime portrait frames use the same bottom-aligned scene canvas as the back
and foreground layers. Each square portrait frame is 80 percent of the scene
height, and it starts at 24 percent of the scene height. Its center is at 20 or
80 percent of the scene width. Keep the full square source without a
letterbox offset. The speech record stays in the central 32 percent
of the scene width, from 18 through 34 percent of the scene height.

Validate the visible
character anatomy and the speech together, not only the bounds of the image
element. Oversized sentence text scrolls vertically in that fixed speech record,
as AC-016-12 gives. Its text region can get keyboard focus, and it contains each
word. For longer sentences, do not make the record larger, and do not make the
speech type sizes smaller. Do not move the board or the moderator for longer
sentences.

An approved character-height contract can move a playable face above or below
the normal-adult eye-line reference. Keep the character on the same floor and
desk-occlusion system. Do not scale the scene again or move the desks to remove
an approved height difference. Desk fronts continue below the canvas edge, so
that their lower contours do not show.

Use one shared model for focal regions and interface-safe regions for the two
scene packages. Mirror the playable-character regions. Keep the moderator at
the center in the two studios. The speech record ends above the moderator
focal rectangle. The common phrase pool starts below it, and it can cover the
desk, chair, or lower body of the moderator.

Record all focal regions and interface-safe regions as normalized rectangles
in the normalized 16:9 master coordinate system. Apply the same rectangles to
each runtime variant before the crop. A decorative element of one scene cannot
move, make smaller, or cover a shared interface-safe region.

For each focal class, use fixed normalized rectangles for each layer. Do not use
a shared envelope with overrides for each scene.
For each back layer or foreground layer, record the rectangle coordinates.
If the focal class is not in that layer, record that it is missing.

Keep these character-layer focal rectangles in each back and foreground
scene layer. The left raised signature-gesture rectangle is
`x=22, y=18, width=10, height=18`. The mirrored right rectangle is
`x=68, y=18, width=10, height=18`. The left torso and required-prop rectangle is
`x=14, y=46, width=12, height=20`. The mirrored right rectangle is
`x=74, y=46, width=12, height=20`. Scene art does not control these rectangles.
It must keep them free of a face, a necessary prop, an identifier, or
high-contrast ornament.

Use these focal rectangles for each layer. All values are percentages of the
master width and height.

| Scene layer | Moderator face | Left desk top and props | Right desk top and props |
| --- | --- | --- | --- |
| Transition-era back | `x=46, y=35, width=8, height=14` | Absent | Absent |
| Modern back | `x=46, y=35, width=8, height=14` | Absent | Absent |
| Transition-era foreground | Absent | `x=26, y=56, width=6, height=16` | `x=68, y=56, width=6, height=16` |
| Modern foreground | Absent | `x=26, y=56, width=6, height=16` | `x=68, y=56, width=6, height=16` |

Desk extraction zones are bounds for the mask search. They are not focal
rectangles. Use
`x=12.5, y=54, width=19.5, height=46` for the left standing desk and
`x=68, y=54, width=19.5, height=46` for the right standing desk. A correct desk
mask contains changed pixels only in its extraction zone. It
touches its desk top and prop focal rectangle.

It is one connected
desk-and-prop component.
Do not include the moderator desk, the moderator body, the architecture, the
floor, or the rear props.
This rule applies also when they show in an extraction zone.
The composite input, the input with no desks, the back output, the foreground
output, and the result output must resolve to five different paths. Reject a
path collision before a tool writes a file.

Use these shared interface-safe rectangles. All coordinates are percentages of
the master width and height:

- Protected top band: `x=12.5-87.5`, `y=0-18`.
- Central interaction region: `x=32-68`, `y=18-94`.
- Lower-left action region: `x=12.5-24`, `y=66-94`.
- Lower-right action region: `x=76-87.5`, `y=66-94`.

Move speech bubbles to their speakers. Set the red bubble to x=23-55 and
the blue bubble to x=45-77 in scene coordinates. Keep the two bubbles in the
top vertical band, and point each tail to its speaker. Do not cover a
character face, a necessary gesture, a prop, or the moderator focal rectangle.

The central interaction region contains a reserved moderator window at
`x=46-54`, `y=35-49`. No live text or control can cover that window. Its
moderator face is the only face that is permitted in the central region. Use
background shapes with a small quantity of detail behind live text.
Do not put a different face or a necessary prop in it.
Also do not put a scene identifier, a mark that looks like text, or
high-contrast ornament in it. A desk front can go across a lower action
region only as a plain flat surface without a prop or important ornament.

Scene 3 through Scene 6 use full foreground plates above the portraits,
without horizontal CSS clipping. Their central interaction rectangle must be
fully transparent in the source and in each runtime variant. Transparency is
not necessary in the lower action rectangles. Plain desk
fronts must continue behind the HTML controls and cover the lower bodies of the
candidates. Do not erase these
surfaces to clear an action rectangle.

For each of these four foreground plates, validate the two lower-body strips,
in source-canvas percentages:

- Left: `x=18, y=74, width=4, height=18`.
- Right: `x=78, y=74, width=4, height=18`.

In each row, 90 percent or more of the pixels must be near-opaque, with the
shared native-alpha opacity threshold. This check rejects fronts that are cut,
missing, or moved, in sources and variants. It does not replace the visual
checks of the desk height, perspective, contours, or last portrait occlusion at
each viewport.

The central 75 percent of the master width is the protected four-by-three crop
core. All moderators, standing desks, attached props, focal regions, and
interface-safe regions must stay in that core. The outer 12.5 percent on
each side is decorative bleed, and the crop can remove it. It must not contain
a necessary subject, prop, architectural identifier, or layer-alignment marker.

Use the full master at 16:9. For aspect ratios between 16:9 and 4:3, remove
equal quantities from the left and right decorative bleed. At 4:3, remove the
full 12.5 percent from each side. At the named acceptance viewports, do not use
letterboxing, and do not crop in the protected core.

For ratios wider than 16:9, scale all scene planes uniformly to the viewport
width, and center the vertical crop. Keep the back, the ambience, the props,
and the foreground aligned, without side bars or image distortion. Keep the
portrait size based on the viewport height and the horizontal portrait anchors
based on the scene width. Move the speech record above the cropped moderator
face region and make it shorter.
The record is then at the height of the Pride plaques and the status rail.
Keep it in the band between its speaker's plaque and the rail, with 1rem clear on each side.
Its width is the smaller of 32 percent of the scene width and that band.
Do checks at 1920 by 950, 2560 by 1080, and 3440 by 1050, the sizes of desktop browser windows that have toolbars or developer tools.
Do checks of the coverage at 2560 by 1080, 3424 by 1427, and 5120 by 1440.

For a supported landscape ratio narrower than 4:3, fit the protected 4:3 core
to the full viewport width. Do not crop its left or right edge. Fill the
remaining height with authored continuation of the scene, not with black bars
or a texture that repeats. The back layer extends ceiling shapes above and floor
shapes below.

The foreground layer stays transparent above the standing desks, and it
extends plain desk fronts below them. Do not add a new subject, prop,
identifier, or ornament in an extension area. Use one scale and one vertical
alignment for the two layers, and keep all focal regions and interface-safe
regions.

Each scene uses the same flat cel-shaded cartoon construction as the playable
characters. Simplify and intentionally exaggerate architecture, curtains,
screens, platforms, desks, chairs, lamps, microphones, bottles, and decorative
objects. Keep one coherent camera, perspective system, floor plane, human
scale, and layer boundary. Functional perspective does not make realistic
rendering correct.

Each fixed moderator obeys the same human caricature, contour, flat-color,
value-step, and texture rules as playable human characters. Foreground plates
must agree with their back scenes in contour weight, palette, hard-edged
lighting, shape language, and texture density. A realistic moderator, a glossy
desk, a photographic prop, or a softly rendered background causes the full
scene package to fail.

### Vertical-slice integration

The match slice before the pipeline uses a rendered municipal studio with one
fixed fictional moderator. It uses transparent temporary portraits for the
Red-Folded Chairman, Thunder Tribune, Black Sea Captain, and Government AI. It
also uses one transparent foreground plate with two tall standing desks. The
back scene must not contain a playable character. The desk plate clips the
lower portrait bodies, but it does not attach the
selected characters to the scene. Milestone 023 replaces or promotes these
temporary files through the approved manifest and variant pipeline, and it
does not change the selected-character contract.

Temporary portrait planes use a tall two-to-three canvas, and they continue
below the foreground desks. Their lower raster edges must not show in the
composite. Each portrait uses the shared character art direction and its
private study. On a temporary plane of 1024 by 1536, the opaque full-body
silhouette is 95 through 98 percent of the canvas height. A portrait must not
use a fixed face crop or a fixed head width.

The redesign must select four self-hosted sans-serif font families. The
Barlow Condensed, Cormorant SC, Georgia, and system-monospace combination that
the game used before is implementation evidence. It is not a visual authority.

1. Poiret One Regular 400 is the selected Art Deco feature-display family. It
   controls the game title, the main menu, character names, Pause, End,
   Comeback, and other decisive features. Use `0.06em` tracking.

   Apply a responsive synthetic stroke of 0.9 through 1.4 pixels to large
   feature text. Apply a stroke of 0.65 through 0.95 pixels to major actions.
   This synthetic emboldening is an approved exception, because Poiret One has
   no bold master. Use it only at medium and large sizes.

   Fascinate and Fascinate Inline are permanently disqualified. Do
   not propose, test, install, or use these two families.
2. Nunito Black 900 is the selected rounded speech family. It controls the
   delivered speech, the construction of this time, and sentence previews.
   Render it in visual uppercase. Keep the authored case for source text,
   accessibility, and speech output. Do not use Fredoka Bold for this speech
   role.
3. Rubik is the selected rounded interface family. Use regular 400, semibold
   600, and bold 700. It controls phrase lists, private phrases, setup fields,
   labels, validation, the causes of disabled states, score explanations, and
   compatibility text. Its tabular figures control Pride,
   damage, scores, and rounds.
4. Share Tech Mono is the selected retro liquid-crystal-display family. It
   controls only the timer and normalized technical-record data. Do not use it
   for other numbers or text.

The implementation uses `@fontsource/poiret-one`,
`@fontsource-variable/nunito`, `@fontsource-variable/rubik`, and
`@fontsource/share-tech-mono`. Each package includes the SIL Open Font License
1.1. Keep the full notice of each package in `public/licenses/fonts/`,
and ship it with no changes in `dist/licenses/fonts/`. Disable Git newline
conversion for these notices, so that Windows checkouts keep the package bytes.
Poiret One, Nunito, and Rubik load Basic Latin and Latin Extended coverage
with explicit Unicode subset declarations.

The metric fallback for the feature,
speech, and interface families is Arial and then sans-serif. The timer
fallback is Cascadia Mono, Consolas, and then monospace.

The shipped Poiret One Latin Extended WOFF2 is a local SIL Open Font License
derivative of the Fontsource file. It maps Romanian `Ț` and `ț` to the
comma-below T outlines that the source font has. Keep its source and its build
method in `docs/assets/poiret-one-romanian-font.md`. Ship the full Poiret One
license notice.

Do checks of all four selected families together in the built arena. The
Art Deco feature family must include English and Romanian interface display
text, with Romanian diacritics. The timer family must have
digits, timer punctuation, and glyphs for normalized technical-record data.
The speech family and the interface family must include localized grammar and
phrase content, with Romanian diacritics.

Do tests with these items:

- Uppercase and mixed-case English names.
- The longest localized speech and phrase.
- Digits, punctuation, and disabled text.

Include the 1024 by 720 viewport. Other than
for the approved Poiret One treatment, reject a family if it must have
condensed spacing or outline effects to fit. Also reject it if it must have
synthetic weights or text smaller than 11 pixels.

Match nameplates keep two lines for the full compact character name.
They do not use an ellipsis. The turn-status slot keeps one fixed minimum
width, and it keeps its layout space while it is hidden. A change between the
waiting, active, and thinking states must not reflow a character name.

Shared phrase rows can have two lines without an ellipsis. Their font size
changes with the viewport width and height, and it stays at 11 pixels or more.
When a long phrase goes on two lines, the reserved geometry of the nine-row board does not
change.

Record the selected families, weights, licenses,
metric fallbacks, and use rules in this specification. Record them in the design
record for subsequent font changes. The wide speech bubble uses light
paper. The compact phrase path uses a near-black broadcast plate and thin
oxblood row rules. It uses Rubik phrase text without visible metadata for
role, ownership, weakness, the cause of a disabled state, or hints.

Action plates use coherent authored icons and framing.

Characters use three-quarter silhouettes that face the opponent, and layered
parts. Human characters use human anatomy, and robot characters use only
mechanical anatomy. Each non-fallback skin uses six visual poses: the
selection and the five state masters `thinking`, `delivery`, `light-hit`,
`heavy-hit`, and `weakness`. These give five or more expressions. The nine
logical states map `idle` to selection, `comeback` to delivery, and
`grammar-mistake` to weakness.

A dedicated master for a state that a package uses again is not correct.
Use Cascading Style Sheets (CSS), sprite sheets, and two-dimensional Canvas
first. The Web Graphics Library (WebGL) or a different graphics runtime must
have a new specification with proof of bundle, frame time, and fallback.

Keep temporary renders and lossless working rasters in the temporary folder.
Keep private character studies and custom prompts in the research folder.
Sharp generates committed AV1 Image File Format (AVIF) and
WebP runtime variants. The manifest records dimensions, crop, owner, source,
and license.

Import through the manifest. Load setup art first, and then only the
selected match package. Keep each scene variant in an external asset file.
Do not put a scene or character variant inline in the initial JavaScript bundle.

Use self-hosted licensed Web Open Font Format 2 (WOFF2) fonts with metric
fallbacks.

The live character inventory uses
`src/assets/characters/character-manifest.json`. Its 30 entries map one default
or alternate skin to the canonical `selection` state, pose, and expression.
The fixed replacement baseline is a subset of 27 entries.
`tools/character-replacement-baseline.json` records the replaced
source hashes only for inventory verification. It is not a generation input.

`tools/build-character-assets.ts` makes square AVIF and WebP variants of 128,
256, 320, 640, and 960. `tools/validate-character-assets.ts` does checks of these items:

- The fixed inventory and the new source hashes.
- The transparent masters that agree with provenance.
- The manifest fields, the byte limits, and each generated file.

 A
subsequent portrait that the filename convention adds does not go into this
fixed baseline automatically. It can use its source PNG until Milestone 028
promotes it through the release asset pipeline.

`tools/build-character-package.ts` controls a targeted rebuild of one skin in
a staged character tree. It builds again only the ten variants of the selected
portrait and the thirty state variants of that skin. It uses all other variant
bytes again only after validation of the source, manifest, hash, format,
dimension, and byte budget. It builds the two global manifests again, runs the
full character validators, and does not operate directly on the shipping
character root.

Milestone 023 promotes the Milestone 015 title emblem, proscenium, and setup
portrait frame through `tools/brand-assets.ts`. Their
`src/assets/brand/brand-manifest.json` is a different manifest. It records the
source hashes, ownership, license, dimensions, centered focal points,
full-canvas crops, and AVIF/WebP variants.
The runtime dimensions of the emblem are 640 square. The proscenium keeps 1672
by 941 pixels, and the portrait frame keeps 1086 by 1448 pixels. These
interface assets do not go into the fixed character and scene replacement
inventory.

Runtime views resolve these files through the brand manifest. The title uses
AVIF first and WebP as the fallback. Milestone 030 removes the source PNG from production. The build
gets its two AVIF preloads from the manifest before the app module. A
browser that does not support AVIF does not use them, and it loads WebP. For
each title format, the combined package stays at 300 KiB or less.

The build and asset-validation scripts validate
the brand and state manifests and also the baseline scene and character
manifests. The asset-build script makes all four packages again with Sharp.

### Generation routes and local asset preparation

Select the generation route by asset role:

| Role | Route | Native source |
| --- | --- | --- |
| Opaque scene background | Flare API | 3840 by 2160 |
| Character selection or pose | Built-in chat image generator, native alpha | Square, at least 1024 pixels per edge |
| Desk or scene foreground | Built-in chat image generator, native alpha | 16:9, at least 1280 by 720 |
| Prop or other isolated art | Built-in chat image generator, native alpha | Sufficient for its approved runtime use |
| Draft or other shared art | Built-in chat image generator | Appropriate native dimensions |

Only opaque 4K scene backgrounds use `gpt-image-2.5-flare`. The repository API
helper requires the scene-background role, opaque output, and 3840 by 2160.
Transparency, accurate requested dimensions, high pixel counts in other roles,
and a missing chat tool do not select the API. Do not fall back to Flare for
characters, poses, desks, props, or foregrounds. If the chat tool is unavailable,
retain the brief and report the blocked generation step.

An artwork instruction authorizes generation in its scope. Workflow maintenance
alone does not authorize image requests. Honor the user's cost and request
limits. Use one candidate and at most one corrective request for a measured
visual defect unless the user gives a different limit. Reuse accepted results.
Do not repeat a request whose outcome is unknown.

The API helper uses the fixed OpenAI endpoint and credentials from ignored
`.env.local`. It keeps safe status records without provider error bodies.
It does not follow redirects or retry automatically. Its dry run builds and
validates the request without credentials, network calls, or output writes.
Keep the initial API output and its recorded request result. Do not duplicate
those records in a second workflow ledger.

For chat generation, use one stable brief and one direct shipping candidate.
Save the initial source and record its path, measured dimensions, known route,
and visual decision. Record a model name only when generation evidence gives
it. Plain Markdown is sufficient. Do not require separate private identity
requests, mandatory JSON review stages, or duplicate hashes at each stage.
Keep the accepted source hash required by the asset manifest and layout record.

Use generated transparency directly when inspection passes. Do not apply
routine background removal, chroma keying, alpha normalization, color changes,
or enlargement. Inspect the real alpha and light and dark composites.
Only a measured detached alpha-1 defect can use the bounded cleanup helper.
It clears alpha-1 pixels more than four pixels from content with alpha 250 or
more using Chebyshev distance. It keeps all RGB values and all other alpha.
Keep the initial source and the separately inspected repair. Reject output
that still fails the alpha contract. Do not extend this repair to stronger
alpha, missing contours, or silhouettes.

Build runtime AVIF and WebP variants locally with Sharp. Cap variant dimensions
to the native source. Keep source provenance, byte budgets, geometry, alpha,
and color checks. Complete the build before validation. Inspect actual runtime
scale and prop visibility before replacing a shipping package.

The existing EU-Funds Alchemist package has a recorded safe-margin operation:
its native 2048-square sources were reduced to 2032 square pixels and centered
with eight pixels of transparent padding per side. Preserve that source
provenance. New trial artwork uses its own native dimensions and safe margins;
it does not inherit that operation as a mandatory stage.

Register native output with `adopt-native` in the alpha utility.
Record `Alpha Workflow=native-alpha-v1` and
`Alpha Source=generated-alpha-v1`. For native output, do not record a statement
about a chroma key or matte reconstruction. Native near-opaque interior pixels
can use alpha 250 through 255. This limits the background contribution to
approximately two percent. Half or more of the pixels that are not transparent
(alpha above 0) must be at that near-opacity threshold or above it.

Transparent corners and contour coverage
with alpha from 1 through 249 continue to be necessary. An interior that is
very translucent does not pass.

Each native-alpha outer-border pixel must be fully transparent. 90 percent or
more of the partial-alpha pixels must be four pixels or less from near-opaque
content. This keeps partial alpha only on the antialiased contour. It rejects
particles that are not connected, veils across the full canvas, and haze around
the subject.

Keep `green-chroma-key-v1` for existing legacy assets and explicitly approved repairs of existing matte art.
Do not generate new character or foreground art through a green-matte fallback.
A legacy repair intermediate uses a flat
`#00FF00` matte. Transparent art does not use that key color intentionally.
The deterministic converter replaces the matte with real alpha.
It embeds the workflow identifier and the key color in the shipping Portable
Network Graphics (PNG) file. It samples the matte from green pixels that
connect to the border. It uses the dominance of the green channel and the
sample distance to classify each pixel. A pixel is matte, foreground, or
contour that is not clearly matte or foreground.

It uses the sample in the known-matte compositing
equation. It estimates the coverage of those contour pixels from foreground samples
near it, and it reconstructs the red, green, and blue values of the foreground.

If the source has a binary
contour, one three-by-three binomial pass makes a bounded partial-alpha edge.
The pass copies the nearest foreground color into new edge pixels. The
converter records
`Alpha Source=soft-green-key-v1`,
`Alpha Matte=green-dominance-neighbor-matte-v1`, and
`Foreground Reconstruction=known-green-unmix-v1`.

An asset that has real alpha can use the `adopt` path. It records
`Alpha Source=adopted-alpha-v1`, and it does not say that it used soft-key
conversion. An opaque raster can use `provenance <png> --source <origin>` when
its verified source origin is known and its generation prompt is not
available. Do not invent a source or a prompt.

Asset validation rejects each PNG that does not have an embedded
generation source. It also rejects a character PNG that embeds its custom
prompt. Key-derived shipping assets contain no chroma-key residue.
Native-alpha subjects can contain intentional green material.
Key-derived lossy AVIF and WebP runtime variants can keep chroma-coded RGB only
where the alpha is 16 of 255 or lower.

A key-derived chroma-green runtime pixel above that bounded
compression fringe fails validation. Key-derived PNG masters keep the
zero-residue rule.

Validation also rejects each alpha-bearing PNG that does not have its workflow
metadata or alpha-source metadata, or that has outer corners that are not zero.
Legacy key-derived assets must also have key metadata. Their validation
rejects opaque chroma-green pixels.
A soft-key conversion also fails when it has no
partial-alpha pixels or does not have its matte and foreground reconstruction
metadata.

`npm run assets:convert-green -- <green-root> <output-root>` converts a full
green-render tree that has its prompts adjacent to the renders. For character
art, use
`npm run assets:convert-green -- <green-root> <output-root> --prompt-root
<prompt-root>`. The green renders stay in the temporary folder, and the
relative prompt files that agree with them stay in the research folder. The
converter does checks of each prompt, but it embeds only a generic source
record in all conversion modes.

It does
not embed private study data. The converter keeps the relative path of each
Portable Network Graphics file. The input root and the output root must be
different.

## Asset and motion contract

Each opaque scene background uses a native 3840 by 2160 master.
A desk or foreground plate uses a native 16:9 transparent master from
1280 by 720 through 3840 by 2160. Its pixel dimensions can differ from the background. Keep the
layers aligned through the same normalized camera, geometry, and crop.
Keep accepted 4K foreground sources. Do not enlarge new foregrounds to 4K.
Milestone 026 controls the foundation scenes. Milestone 032 controls the
seventh scene, which has no foreground plate.

The approved Transition-Era Television Studio background uses native
3840 by 2160 `gpt-image-2.5-flare` output with inspected reference inputs and
a focused composition edit. It uses ivory and terracotta architecture,
wood and metal furniture, and detailed broadcast equipment. It replaces the
previous background without moving its approved pixels. The owner accepted
its moderator/speech clearance in the game. The approved Modern Debate Studio
background uses native 3840 by 2160 `gpt-image-2.5-flare` output from a researched
text-only design followed by reference edits for composition and floor placement.
Its generated pixels are installed without resizing or post-generation pixel
preparation. The foundation backgrounds retain their recorded native
`gpt-image-2.5-flare` provenance. Existing
studio and foundation foregrounds retain their recorded Flare composition,
extraction, fitting, and green-matte conversion provenance. These are facts
about installed sources. New generations use the role-based routes above.
Do not relabel existing art as chat-generated or copy an old model name onto
new output. Preserve each source's recorded finishing operations.

Opaque backgrounds give AVIF and WebP variants at 640 by 360, 1280 by 720,
1920 by 1080, 2560 by 1440, and 3840 by 2160. Foregrounds use the same target
widths only up to their native width. Include the native width when it is not
one of those sizes. For example, a 1536 by 864 foreground gives widths 640,
1280, and 1536. Do not encode larger variants from a smaller source.
Keep the approved moderator, furniture, focal regions, and interface clearance
at each runtime size.

Character masters are transparent native squares of at least 1024 pixels per
edge. Existing 2048-square sources remain valid. Runtime character widths are
320, 640, and 960. Selection portraits also have 128 and 256 pixel token
variants. Larger roster headshots use the larger portrait variants.

The visible full-body silhouette fills at least 12 percent of each square
canvas and 80 through 99 percent of its height. The trial targets 82 through
88 percent height to leave generous space for hands and props. The silhouette
width can vary with the pose. Do not impose one minimum width or head ratio
on all characters. Keep transparent outer borders and complete extremities.

Each raster runtime size has AVIF and WebP output. The manifest contains the
ID, the owner type, the owner ID, the source description, and the license
identifier. It contains the SHA-256 source hash, the format, the pixel
dimensions, and the byte size. It also contains the focal point, the crop
rectangle, and the generated variant paths.

The scene builder has the option `--only id1,id2` for selected asset IDs. The
default build encodes each layer. A selected build uses an unselected layer
again only when its master hash and source metadata agree with the manifest.
Before encoding, do checks of the expected path, the declared quality, the
byte size, and the hash of each variant that the build uses again. Also do
checks of its decoded dimensions, format, and byte budget of this time. Reject
an unknown ID, an incomplete manifest, a changed source, or an incorrect cached
variant.

Build the full manifest again from the contracts of this time, and install the
full package together. Do checks of this with
`tests/unit/build-scene-assets.test.ts`.

The scene builder installs variants and their manifest as one package. If
installation fails, put back only the backups that that build made. Do not
delete a file or directory when the move of its backup failed. After the two
new outputs are installed, a backup cleanup failure must keep the new package
with no changes and give the failure. Do checks of these paths with
`tests/unit/scene-output-installation.test.ts`.

The markup has the dimensions before decode.
Validation rejects a crop, focal point, focal rectangle, or interface-safe
rectangle that is different from the approved geometry. This includes values
that stay in the normalized canvas. The production build validates the scene
package and the fixed character package before Vite writes `dist/`.

The color guard decodes each raster in sRGB. It ignores transparent pixels and
the temporary green matte, and it measures muted or neutral pixels. It uses the
shared policy in `tools/asset-color-policy.json`. A rule for average red or
average green does not reject intentional warm materials.

At the largest size, one AVIF scene is 350 kibibytes (KiB) or less. Its WebP
fallback is 500 KiB or less. One AVIF character state is 250 KiB or less. Its
WebP fallback is 350 KiB or less. In their preferred formats, the selected
scene and the two selected character image packages have a total of 3
mebibytes (MiB) or less.

Setup does not preload unselected match packages.
Package validation selects the largest declared runtime dimensions of each
asset for each format. This includes all scene layers of 3840 pixels. It
compares the larger total of the AVIF package or the WebP package with the
limit.

Each named character state maps to one pose and one expression. The set uses
five or more different expressions and six or more different poses. When the
manifest declares the combination, a unique image for each of the
nine named states is not necessary.
Usual reactions are 150 through 600 milliseconds. Transitions are 700
milliseconds or less. Idle loops are 2 through 8 seconds.

### State package and event projection

`src/assets/characters/state-contract.json` records the 19 character IDs and
the nine named states. Milestone 028 gives the 28 mandatory packages, and it
declares the two selection-art fallbacks. Get the default and alternate
packages from the selection manifest. Do not keep a different skin list. Each
package contains five more masters at
`src/assets/characters/states/<portrait-stem>/<state-id>.png`, for 140 state
masters in total.

The only correct master state IDs are `thinking`, `delivery`,
`light-hit`, `heavy-hit`, and `weakness`.
`states/state-manifest.json` controls the state mappings and the additional
runtime assets. Selection refers to the baseline asset. Additional states have
square AVIF and WebP variants of 320, 640, and 960 in `states/variants/`.
Each asset keeps the baseline contracts for ownership, source, license, hash,
focal point, crop, dimension, alpha, and color.

Use these fixed state durations, in milliseconds: idle 4000, selection 320,
thinking 3000, and delivery 400. Use light hit 300, heavy hit 520, weakness
500, comeback 500, and grammar mistake 520. Idle and thinking can loop.
Transient movement plays one time. Milestone 025 can hold the last pose during
the narration interval or damage interval that it controls.

A new public event replaces the state before it.
Do not queue events that are out of date, and do not change a game result for
animation.

Show the selection when the match starts. The active picker, human or AI,
thinks. The other character is idle. Usual picks and commits do not recite.
Milestone 025 holds the delivery pose of the narrator of this time, and then it
shows the damage after its total.

Positive damage below 16 uses light hit. Damage 16 or more uses heavy
hit, which agrees with the sound thresholds of Milestone 024. Grammar
self-damage keeps its own state. These presentation rules do not change
scoring. No state decision reads a private card that the player did not play
or an AI candidate evaluation.

Keep the image of this time visible until its replacement is decoded. A newer
cue has priority over a pending decode. When optional display data is missing
or fails, the last decoded portrait stays visible. Production validation
continues to reject a missing necessary package. Load only the state packages
of the selected skins after the match starts. Do not preload state packages in
setup.

Pause, viewport interruption, document hiding, and exit stop the loops that
are not necessary, and they discard pending transient motion. Resume at the
stable state of this time, and do not play a previous reaction again. Reduced
motion keeps the state and the public result information visible, and it stops
spatial movement and flashing.
This includes the entrance motion of the private hand and the action rail on
the two player sides. Rules for one side must not override the reduced-motion
setting.

All image layers and ambience layers are pointer-inert. State changes use
reserved absolute image planes, and they cannot move a control or a sentence.

The transition-era studio adds a four-second lamp loop with low amplitude over
its four outer lamp faces. Two sides have a phase offset of two seconds.
The opacity of the neutral overlay is 0.03 through 0.15. It uses the same
16:9 coordinate plane and protected crop as the back scene. It adds no
lamp, beam, prop, or runtime raster. Pause, hiding, going out of the viewport,
and reduced motion remove this decorative overlay, and they keep the static
lamps.

The initial page cumulative layout shift (CLS) is 0.05 or less. When a card, a
reaction, or a character state is replaced or updated, the layout shift is
0.

## Acceptance criteria

- **AC-023-01:** The manifest rejects these items at the asset path:

  - A missing field, a duplicate ID, or an incorrect hash.
  - An unsupported format or an incorrect dimension.
  - A crop out of range or a missing license.

- **AC-023-02:** From masters with no changes, Sharp makes the variant
  dimensions and paths again with the same bytes. Each file is in its budget for each
  file and in the package budget. The AVIF encoder output depends on the platform
  and the CPU. Thus on a platform that did not build the shipped files, an AVIF
  variant keeps its format and dimensions, a byte size in 10 percent, and a mean
  absolute pixel difference of 2.5 or less. WebP variants keep the same bytes on
  each platform.
- **AC-023-03:** Browser tests select AVIF when the browser can use it, and
  they use WebP as the fallback. They keep the dimensions before decode, and
  they load no unselected match package.
- **AC-023-04:** All 28 state packages show all nine logical states through
  five state masters and the selection. They have five or more expressions
  and six or more poses. These fail validation: missing mappings, dedicated
  masters for states that a package uses again, and source PNGs that are not
  in the inventory.
- **AC-023-05:** All supported landscape variants keep the declared focal
  regions visible, and they are in the CLS limits.
- **AC-023-06:** Motion procedures obey all timing requirements and pointer
  requirements.
- **AC-023-07:** The font comparison includes all four exclusive roles, the
  content that this specification gives, and the viewports. The evidence
  records the selected local WOFF2 files, licenses, weights, metric fallbacks,
  and use rules.
  Fallback rendering causes no hidden or clipped text. Visual uppercase does
  not change the source, accessible, or spoken sentence text.
- **AC-023-08:** A synthetic near-green matte fixture has known foreground
  colors. It converts to a transparent background, an opaque interior, and a
  partial-alpha contour. The reconstructed contour color stays in the
  alpha-aware eight-bit Canvas round-trip tolerance. A
  binary green-matte fixture gets a partial-alpha edge. Asset validation
  rejects a soft-key output that has no method metadata or no partial alpha.

  Native adoption keeps the decoded RGBA pixels, and it records native
  provenance without key metadata. Native fixtures accept interiors with alpha
  250 through 255 and green material. These fixtures fail: empty, very
  translucent, edgeless, border-contaminated, detached-alpha, and
  surrounding-haze.
- **AC-023-09:** Each of the four vertical-slice characters has one default skin
  and zero through eight alternate skins. A ninth alternate fails validation.
  Filename discovery is deterministic, and the default is first. Foundation
  characters can keep only their default temporary portrait until Milestone
  028. The roster resolves each available selectable skin. Setup views and
  match views resolve an available requested skin, and they do not change the
  character data or the phrase data.
- **AC-023-10:** Each release character is recognizable without its nameplate
  by its silhouette, posture, face system, and prop logic. Default skins and
  alternate skins keep one fictional archetype across all named states. The
  research folder contains the study for each character, and it stays out of
  Git, builds, and published artifacts. Public files contain no real-person name
  or private study data.
- **AC-023-11:** Character-tree conversion resolves each prompt that agrees with
  a render from a different research root. A missing or empty prompt fails
  before conversion. A prompt without the shared controls for neutral white
  balance and local warm color also fails before conversion. Necessary positive
  controls do not count when they are in a negative-control section. A
  global warm grade, which is not permitted, stays incorrect when the prompt also contains the
  necessary controls. The shipping raster contains a generic source record, but
  it does not contain the prompt or private study data.
- **AC-023-12:** The regeneration inventory contains only the 27 character
  PNG files and four scene PNG files in the fixed baseline. Each replacement has
  a new source hash and a generation-input record. The input record contains no
  raster of this time. A missing baseline replacement causes an inventory failure. An asset that is
  not in the baseline but says it is a Milestone 023 replacement also causes an
  inventory failure.

  The Black Sea Captain alternate is not a correct replacement. An asset that is
  not in the baseline stays in Milestone 028, and it does not cause an inventory
  failure. The fixed character manifest,
  the replacement-hash ledger, the builder, and the validator give the objective
  inventory evidence. Focused builder tests and validator tests reject a source
  hash with no changes, a missing license, or a missing runtime variant.
- **AC-023-13:** All 19 archetypes in the baseline have a complete private
  character study before generation. A prompt alone fails readiness. The agent
  records the necessary direction from the contracts and the important
  assumptions. A user response is necessary only for an input that is not
  resolved and that blocks generation.
- **AC-023-14:** Each baseline scene layer has a complete direction in its
  approved owner specification. The direction includes camera, composition,
  layer, subject, prop, lighting, focal region, interface-safe region, and crop. A temporary prompt
  alone fails readiness. The agent uses the contracts to resolve usual details.
  Only a necessary input that blocks generation must have a user response.
- **AC-023-15:** Before each new selection, visually inspect at least three
  distinct usable photographs from reliable, labeled web sources. Target five
  and use more when likeness remains unclear. Duplicates and resized copies
  do not count as different images. Use varied angles and expressions in one
  coherent selected era. Record each URL, date, era, and observed traits privately.
  Correct private notes that conflict with verified web evidence. The initial
  three-character trial uses the approved rendering direction and researched
  identity briefs without an imposed existing raster style
  reference. Its flat editorial cartoons have distinct adult silhouettes,
  clearly drawn faces, moderate head exaggeration, broad shapes, and two-tone
  shading. The product owner accepts the actual trial artwork before roster
  expansion. Approved Government AI robot art stays unchanged.
- **AC-023-16:** Inspect the three trial selections at source, roster, setup,
  and match scales on both player sides. Compare resemblance with the
  researched subject separately from style. Record identity distinction, contour
  quality, color, complete anatomy, and visible signature props. Compare light
  and dark composites. Reject realistic faces, mixed rendering, clipped props,
  blurred upscaling, and detail lost on reduction. A trial pass establishes only
  the tested scope. Later accepted roster packages need their own visual and
  runtime checks.
- **AC-023-17:** The asset color guard decodes each supported shipping raster in
  sRGB. It
  rejects a broad yellow cast over muted or neutral pixels. It accepts local
  brass, cream, skin, wood, oxide-red, and lamp colors when neutral or cool
  anchors stay. An image without a measurable neutral or cool anchor fails
  automated color validation. Repair it or generate it again with the shared
  color contract, and run the validator again. A review note cannot cancel the
  failure.

  A small cool anchor does not make correct a broad yellow
  cast across near-neutral pixels. The guard gives the asset path and the
  measured values. Its neutral, near-neutral, yellow-wash, local-warm-accent, and
  green-matte fixtures pass in `tests/unit/asset-color-guard.test.ts`.

## Impeccable UI validation

1. Run `$impeccable audit` on the title, setup, and match surfaces that the
   change touches.
2. After the audit repairs, run `$impeccable critique` on the changed slice.

Apply the shared Impeccable evidence and severity gate in the milestone index
to those subsequent changes.

## Checks and stop conditions

Validation shows formats, sizes, crops, ownership, licenses, and color policy.
Browser tests show correct variants without layout shift at the target
viewports. The moderator-clearance checks in `e2e/playable-match-screen.spec.ts`
do checks of image readiness and geometry in the same browser evaluation. Pixel
reads must have loaded images with positive intrinsic dimensions and positive
rendered dimensions. A
replacement portrait that is late must wait for readiness. A real overlap must
continue to fail the clearance assertion.

Foreground browser checks use the approved extraction zones. To pass, the
desk-top focal region and the prop focal region must have visible pixels. The
checks reject pixels out of those zones. A regenerated silhouette
does not have to touch the outer edge of the previous raster to pass.

The remaining roster, audio, speech, and presentation reactions stay with their
owner milestones.

## Reference

[Sharp image processing](https://sharp.pixelplumbing.com/)

## Review repair regression

**AC-023-18:** Scene and character AVIF/WebP validation uses the same
chroma-green rule. A pixel fails when its alpha is above 16, its green is 180
or more, and its red and blue are 80 or less.
Alpha of 16 or less keeps the bounded exception for lossy fringes. Validate
the content of each resolved tree prompt before you make output directories or
convert an image. A subsequent incorrect or empty prompt keeps all outputs with
no changes.

`tests/unit/validate-scene-assets.test.ts` rejects visible chroma green, also
when the manifest bytes and hashes agree. `tests/unit/green-chroma-key.test.ts`
does checks that a correct first prompt and an incorrect or empty second prompt
make or change no output.
The character variant checks keep the same limits.

**AC-023-19:** Roster headshots show the full AVIF and WebP variant sets.
The evidence viewports are 1024 by 720, 1024 by 768, 1280 by 720, 1920 by
1080, 3424 by 1427, and 5120 by 1440. At each viewport, do tests with device
pixel ratios 1 and 2. The loaded source has sufficient pixels for the square
image after the cover fit and the active crop scale. If not, it uses the
largest available variant of 960 pixels.

All 30 selectable portraits
keep their canonical skin and their composition.
Do the check with `e2e/roster-resolution.spec.ts` and
`tests/browser/screen-shell.browser.test.ts`.

**AC-023-20:** The API route accepts only the explicit scene-background role
with opaque 3840 by 2160 output. Characters, poses, desks, props, foregrounds,
and drafts select the internal route. Accurate-size and missing-tool fallbacks
do not bypass that boundary. Offline tests check the route, fixed origin,
sanitized failures, and zero automatic retries. Dry runs do not read credentials
or write output. Native preparation keeps RGB, contour alpha, stronger alpha,
and unchanged bytes when no repair is necessary. It removes only the permitted
measured alpha-1 residue. Use `tests/unit/openai-scene.test.ts`,
`tests/unit/flare-api.test.ts`, and `tests/unit/native-alpha-preparation.test.ts`.

**AC-023-21:** Character builders and validators accept native square sources
of at least 1024 pixels per edge without enlargement. Foreground builders and
validators accept native 16:9 sources of at least 1280 by 720 and cap variants
to the source width. Opaque backgrounds remain 3840 by 2160. Existing accepted
2048-square character and 4K foreground sources remain valid. Provenance names
only the observed route, dimensions, operations, and a model supported by the
generation evidence. The trial acceptance record and each later package record
separate agent checks from product-owner artwork acceptance.

**AC-023-22:** Replace all seven opaque scene backgrounds through the Flare
4K route in the accepted flat editorial cartoon style. Preserve each scene's
identity, normalized geometry, camera, crop, focal regions, and interface
clearance. Inspect clearly drawn fictional moderators or crowds, broad shapes,
and hard-edged two-tone shading in representative production compositions.
Do not replace shipping backgrounds until their local asset and runtime checks
pass. Desks, props, and transparent foregrounds retain the built-in chat route.
A workflow update alone does not complete this background-regeneration criterion.
