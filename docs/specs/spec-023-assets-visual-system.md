# Milestone 023: Asset Pipeline and Visual System

**Status:** Complete

**Depends on:** 022  
**Owns:** Art direction, runtime asset pipeline, tokens, and slice motion  
**Production-file budget:** 10

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

Each non-fallback skin has one transparent 2048-square selection master. It has
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
style reference. Its replacement is
the only visual reference for the shared funny big-head character standard. The
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
Decode larger native AVIF variants after encoding. If lossy compression puts
border pixels that are not transparent back, encode that variant losslessly.
Then record quality 100 and `lossless: true` in the manifest. Keep the same
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
run `node tools/sidekick-assets.mjs build`. Run
`node tools/sidekick-assets.mjs validate` to validate the generated metadata.

## Regeneration baseline and decision recovery

### Fixed replacement baseline

This milestone generates again the fixed character and scene Portable
Network Graphics (PNG) baseline below. The list is explicit. Do not get the
scope from a subsequent directory scan. The baseline contains 27 character PNG
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
scenes. The asset pipeline validates all twelve scene masters.

Keep the four-layer baseline as the boundary for studio regeneration. Use the
four opaque backgrounds as the foundation scenes of Milestone 026.

An asset that the project adds after this fixed baseline does not go into
Milestone 023 automatically. Milestone 028 controls subsequent portraits,
skins, states, scene identities, and layers. When the fixed baseline is
generated again, those future requirements do not move into this milestone.

Regeneration is atomic for each archetype in the baseline. Generate again its
default portrait and each baseline alternate skin in the same art pass. Review
them as one package before you accept a file. If the default skin is regenerated, do not keep, accept, or ship an
alternate skin that is not regenerated. An alternate that the project adds after the fixed
baseline stays in Milestone 028.
Make it from the start with the same locked art direction and the completed
character study.

For targeted repairs of skin consistency, conforming project portraits can be
visual style references in the approved repair task. Keep
their source, license, hash, and role in the private input record. Use them to
match the rendering technique. Do not use them to replace the identity of the
target character. For those repairs, this style-reference path replaces the
input prohibition below. It does not give approval for references from
external art that is not related.

Generate each baseline asset again as new art. You can examine a raster of this
time only to find a decision that is missing or that does not agree with a different decision. Do not give
a raster of this time to an image generator. Do not trace it or edit it.

Do not composite it into a new master. Do not use
it as an image-to-image, identity, composition, or style reference. The
generation inputs are the approved public art direction and a
complete private character study or approved scene specification.

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

Use one locked art direction for the full baseline. Review all the regenerated assets together. One correct portrait or scene alone does not show
visual consistency. The full set must use one flat cel-shaded cartoon language,
contour system, shape construction, and value-step limit. Material
simplification, lighting logic, proportion system, texture density, and level
of exaggeration must also agree.

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

Use a dark institutional palette with navy, charcoal, paper,
oxide red, brass, television blue, and cream. Tricolor is a sparse accent.

### Color and white balance

Use neutral sRGB white balance and a color treatment with no grade. Do not
apply a global yellow, amber, sepia, golden-hour, mustard, beige, or brown
wash. Warm color is local to an authored material or light, for example brass,
wood, cream, skin, oxide red, or a lamp. Navy and charcoal shadows must keep
their cool or neutral separation, and declared neutral anchors must not become
yellow. Do not cancel a warm cast with a global blue filter. Reject the asset,
and generate it again from the approved direction.

### Character art direction

The product term **office clip-art style** is the name of the approved
playable-character finish. It is a funny adult political-office caricature. It
has limited oversized-head proportions, formal clothing that is easy to
read, and one immediate visual joke. It uses controlled dark contours,
expressive interior lines, large clean shapes, and broad hard-edged cel
shading. It does not let the art use generic stock clip art or vector art that looks
like a sticker. It also does not let the art use photographic faces that are
pasted on or mixed rendering styles.

The Algorithmic Prophet has a small plain gray wizard hat. Keep the face,
expression, gesture, clothing, and funny big-head character style consistent.
The owner gave the instruction for this targeted headwear edit. It can use its portrait as the
edit target. It is an exception to the clean-room replacement rule of the
baseline. The shared selection master gives the roster, setup, and match
portraits.

Make all five AVIF and WebP sizes again
from the reviewed transparent 2048-square master.
The master uses native OpenAI API transparency with `gpt-image-2.5-sunburst`.
The background cleanup that the owner approved clears only alpha-1 pixels
that are more than four pixels from near-opaque content. Keep all RGB values
and the contour alpha.

All default skins, alternate skins, and their state drawings use one funny
big-head cel-shaded editorial-cartoon style. The
`county-baron--municipal-patron` selection portrait is the only visual north
star for character proportions, comic tone, shape language, contour hierarchy,
and cel shading. Compare the rendering at the same displayed figure height. The
visual reference does not cancel the alpha, provenance, color, anatomy, or
other technical requirements. Identity, species, age, build, clothing, pose,
and expression can be different. Rendering technique, comic tone, and
exaggeration level cannot be different for each skin.

Each human portrait keeps a full-body silhouette that is recognizably adult
and coherent anatomy, with a head that is visibly oversized. Each mechanical
skin uses an oversized, expressive face or display.
Before the nameplate is visible, the character must look funny through its
face, posture, gesture, prop logic, or a combination of them. These results
fail, also when they have outlines and cel shading:

- A prestige portrait that is not funny.
- A naturalistic head-to-body ratio.
- An illustration that is only handsome or glamorous.
- A straight realistic likeness.

For an approved likeness that a real person inspired, keep photographs only
in the private identity study. First make a private face design that does not
ship. This design changes the identity into the office clip-art style. The
last full-body Flare request can use that stylized face design and Municipal
Patron as different identity and style references. Do not give the last
full-body request a photograph. Reject photographic skin modeling that is
pasted onto a simplified body.

Use controlled dark silhouette contours with clear expressive interior lines.
Keep eyelids, brows, and the construction of the nose and mouth easy to read.
Also keep hand articulation, grouped hair detail, and purposeful clothing
folds easy to read. Keep these
details less important than the large clean shapes and the broad hard-edged
cel-shaded value regions. Do not use detailed portrait modeling, realistic surface
rendering, or tailoring detail.
These move a character to prestige illustration.

Reject heavy uniform marker outlines, minimalist vector or cut-paper rendering,
hair blocks with no features, and simplified figures that look like stickers.
Also reject anime facial rendering, painterly realism, photographic texture,
and glossy three-dimensional shading. A young face, an exaggerated build, or
mechanical anatomy is not a different style when the rendering stays
consistent.

Audit each selection portrait and each available state drawing against this
same standard. Generate again only the drawings that do not conform. Keep the
conforming art, the stable identifiers, the character identity, the pose
purpose, and the gameplay data.
This targeted consistency repair replaces the atomic baseline-regeneration
rule above. Before import, a replacement must pass a comparison with the only
visual reference and with its own newly accepted selection.

Transparency acceptance and
style conformance are different checks. Agents can do the image comparison
and keep their observations. No skin has an individual style exception. After
agent integration and validation, the product owner does the necessary manual
acceptance of the archetype in the game.

Each playable character must show one fictional political, media, civic, or
bureaucratic archetype that is different from the others, before the nameplate
is visible. This is a mandatory direction for all characters and all skins. Do
not use a generic politician, generic presenter, generic official, generic
robot, or placeholder portrait.

Character exaggeration must be intentional and stable. Each private study names
the features that become larger, smaller, sharper, rounder, longer, shorter, or
more angular. The visibly oversized head or mechanical face is mandatory, but
do not make all facial features larger by the same quantity. Alternate skins
apply the same comic proportion system, rendering technique, contour
hierarchy, shading density, texture, and shape rules as the default skin.

Generate a full skin package again when one of these conditions is true:

- The selection or a state is too realistic, is not visibly funny, or does not
  have the mandatory oversized head or mechanical face.
- The project made a shipping master larger from a generation that was too small.
  A shipping master must come directly from the OpenAI Flare or Sunburst API
  at the necessary dimensions.
- A selection or state has a visible global yellow, amber, sepia, mustard,
  beige, brown, or equivalent warm wash. When the image passes the numeric color
  guard, this does not override a visible failure of the comparison with the
  visual reference.

If you replace a selection, replace all five state masters for that skin.
Do not use previous state art that is realistic or that has different
proportions with a new selection. Review and integrate only one playable archetype at a time.
After agent validation and full integration, the product owner manually does
tests of that archetype in the game and accepts it. Do not start a different
archetype without explicit permission.

Do not run `quality:quick` between archetypes. Run it one time
after the user accepts all the regenerated archetypes.

Give each character one coherent set of visual decisions:

- A dominant full-body silhouette and body proportion.
- A head shape, face design, hair design, or mechanical face system that is
  different from the other characters.
- Clothing or chassis construction for the role.
- A signature posture and gesture rhythm.
- One meaningful prop, one coherent prop system, or an explicit no-prop rule.
  A prop system has one dominant object and one secondary object or none.
- One character accent color in the shared institutional palette.

At the smallest supported match size, the silhouette, posture, face system,
and prop logic must stay easy to read. Three or more of these traits must make
the character different from each other character with an equivalent social role.
Recognition must not come from only one color or one handheld object.

The default skin sets the archetype. An alternate human skin can change
gender, age, hair, and clothing. But it must keep the role, temperament,
gesture rhythm, and prop logic of the archetype. An alternate robot skin can
change the chassis. But it must keep the same administrative function,
expression system, temperament, and prop logic. Each pose and expression must
look like the same fictional character in a new game condition.

Each character is human or fully mechanical. Animal words in names, titles,
insults, or metaphors must not cause animal anatomy. Human character masters
and runtime variants reject animal heads, ears, muzzles, beaks, feathers,
tails, wings, paws, fur, scales, and human-animal hybrids. Robot characters
reject human, animal, and hybrid anatomy.

Visual descriptions of each character and other private study data are only in
the Git-ignored research folder. The research folder gives approved private
generation briefs, but it is not a published product contract, and it does not
ship. Public specifications, shipped prompts, source notes, and asset
metadata use fictional names and generic source descriptions. They do not
include real-person names. Research can help original, transformative work,
but it does not let you copy one photograph, artwork, logo, or pose.

### Scene art direction

Use the flat cel-shaded editorial-cartoon direction for Transition-Era
Television Studio. Keep the identity direction of the blonde adult moderator
in the private generation brief. Use an attentive adult caricature that is a
small quantity angry, with a navy jacket and a light blouse. Reject anime,
childlike, doll-like, and geometric-placeholder faces. Generate only through
text prompts, without image references.

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

`tools/build-character-assets.mjs` makes square AVIF and WebP variants of 128,
256, 320, 640, and 960. `tools/validate-character-assets.mjs` does checks of these items:

- The fixed inventory and the new source hashes.
- The transparent masters that agree with provenance.
- The manifest fields, the byte limits, and each generated file.

 A
subsequent portrait that the filename convention adds does not go into this
fixed baseline automatically. It can use its source PNG until Milestone 028
promotes it through the release asset pipeline.

`tools/build-character-package.mjs` controls a targeted rebuild of one skin in
a staged character tree. It builds again only the ten variants of the selected
portrait and the thirty state variants of that skin. It uses all other variant
bytes again only after validation of the source, manifest, hash, format,
dimension, and byte budget. It builds the two global manifests again, runs the
full character validators, and does not operate directly on the shipping
character root.

Milestone 023 promotes the Milestone 015 title emblem, proscenium, and setup
portrait frame through `tools/brand-assets.mjs`. Their
`src/assets/brand/brand-manifest.json` is a different manifest. It records the
source hashes, ownership, license, dimensions, centered focal points,
full-canvas crops, and AVIF/WebP variants.
The runtime dimensions of the emblem are 640 square. The proscenium keeps 1672
by 941 pixels, and the portrait frame keeps 1086 by 1448 pixels. These
interface assets do not go into the fixed character and scene replacement
inventory.

Runtime views resolve these files through the brand manifest. The title uses
AVIF first, WebP second, and the source PNG as its last fallback. The build
gets its two AVIF preloads from the manifest before the app module. A
browser that does not support AVIF does not use them, and it loads WebP. For
each title format, the combined package stays at 300 KiB or less.

The build and asset-validation scripts validate
the brand and state manifests and also the baseline scene and character
manifests. The asset-build script makes all four packages again with Sharp.

### Flare generation and preparation workflow

Use `gpt-image-2.5-flare` for transparent assets, masters that must have
accurate dimensions, and requests above 2,073,600 pixels. Use the internal tool
for small opaque drafts that do not have a contract for accurate dimensions.
Resolve character masters to 2048 by 2048 before you select their route.
Resolve scene dimensions from the scene pipeline. A route that the user selects
explicitly has priority, but a result that is too small does not satisfy a
master contract.

The generation dimensions must also
obey the Flare rule for multiples of 16. For a shipping scene of 1920 by 1080,
request a source of 3840 by 2160, and use reviewed downsampling. Do not request
unsupported native output of 1920 by 1080.
Do not change the shipping dimensions to agree with a provider.

The image helper of the repository uses Node.js and the OpenAI Image API.
It does not use or change the installed generic image CLI. Text requests
use the generation endpoint. Approved references use multipart image edits.
Keep the model, the high quality, the PNG format, the explicit dimensions, and
the background mode in the request record.

During a dry run, validate the dimensions and make the real
request, without credentials, network calls, or output writes.
Flare dimensions obey the [official image generation guide](https://developers.openai.com/api/docs/guides/image-generation).

Read credentials only from the ignored, untracked `.env.local` file. Use the
fixed OpenAI endpoint. Do not follow redirects, and do not send raw provider
errors forward. Record the safe HTTP status and the failure categories. Do not
try again automatically.

When a request is interrupted, keep its result as not known until evidence
resolves it. Keep the bytes that the API sends and their hash before the dimension and
alpha inspection. A correct HTTP response does not show that the asset is
usable.

An approved image creation or repair includes the correct generation route
and the standard preparation below. Do not get the same approval again.
Workflow maintenance and dry runs do not give approval for image generation.
Keep one candidate and one corrective generation for each asset, unless the
user sets a different limit. Examine measurable defects before you use a
correction.

Standard native preparation can clear only alpha-1 pixels that are more than
four pixels from near-opaque content. It uses Chebyshev distance, and
near-opaque content has alpha 250 or more. Keep all RGB values and all other
alpha values. When no cleanup is necessary, keep the initial bytes. After
this, apply the native-alpha acceptance thresholds. If those checks continue to
fail, reject the result. Do not make the cleanup apply to stronger alpha,
contours, colors, or silhouettes.

Keep the initial candidate, the prepared output, the cleanup count, and the
method. Also keep the alpha evidence from before and after the cleanup. Record each
output hash, including the hash after the subsequent metadata stamp. Review the
prepared image on light and dark backgrounds. An image viewer that shows the
RGB that transparency hides does not show a visible halo. The visual
review stays different from alpha acceptance.

For characters, build the reviewed master and the full runtime variants in a
staging tree. Complete the build before validation. Before you replace the
shipping package, validate the source hashes, byte budgets, alpha, and color.
This includes the AVIF decoded-border check above. Scene preparation uses the
same native alpha rules, and it keeps its declared geometry checks and
resolution checks.

For new transparent scene assets and character assets, use native transparent
PNG generation first, when the selected model can do it. GPT Image 2.5 Sunburst
and Flare have the API `background: "transparent"` option with PNG or WebP.
Keep the initial decoded colors and alpha, other than the standard
preparation above. Do not add a colored matte,
normalize alpha, or make colors flat only to fit the older keying process.
Examine the real transparency, the contour quality, and the light and dark
composites.

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

Keep `green-chroma-key-v1` for the assets that the project has, for models
without native transparency, and for approved matte repairs. Its generation
intermediate uses a flat
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

All six scenes use background masters and foreground masters of 3840 by 2160.

Use the blonde adult editorial-cartoon moderator for Transition-Era Television
Studio through the OpenAI API. Generate the background with
`gpt-image-2.5-sunburst`, high quality, only from text, at native 3840 by 2160.
These operations keep the full head in its initial safe region:

- A translation of 72 pixels down.
- A dark continuation at the top edge.
- A crop of the lower floor.

 The
background is not upscaled. Generic source metadata records this
origin without the private prompt.

All ten AVIF and WebP background variants
come from that master. The foreground desk layer is a different layer. It is
original flat cel-shaded art. `gpt-image-2.5-flare` generated it only from
text on a native 3840 by 2160 green-matte canvas. Fit its two desk groups to
the shared standing-desk coordinates. Use proportional downsampling of each
full tabletop and prop group. Keep a horizontal margin in the two extraction
zones. Thus, the AVIF and WebP alpha fringes stay in those zones. Extend only
the lower segment of the front panel to the canvas edge. Then use the
green-matte conversion of the repository to give antialiased alpha.

Do not upscale it.

Generate the Modern Debate Studio at native 3840 by 2160 with
`gpt-image-2.5-flare`. Start from a composite that is only from text. Use
reference edits of that new composite to make the background with no desks.
Keep its fictional moderator direction. Isolate the desk layer that agrees
with it on a green matte.

Move the last background down 96 pixels without resampling.
For the runtime clearance of the moderator, use a continuation at the top edge
and a crop of the lower floor.
The last desk raster can move to the shared desk line at 62 percent.
This move occurs before the proportional fit and before the green-matte
conversion. The fit uses horizontal margins that are safe for the codecs.
Do not use the previous background of 1672 by 941 as generation input.
Also do not use the previous desk master of 1920 by 1080. Do not
upscale the two assets. Keep the approved moderator, set, and composition at
each runtime size.

Each runtime variant must use its declared last
background. All four studio layers give AVIF and WebP files at these dimensions:

- 640 by 360 and 1280 by 720.
- 1920 by 1080 and 2560 by 1440.
- 3840 by 2160.

Each variant comes
from its last PNG master of 3840 by 2160.
In generic PNG provenance metadata, record the real generation origin and
the deterministic finishing origin.

County Council Ballroom, Midnight Call-In Studio, Palace Press Hall, and
Influencer Campaign Livestream use native OpenAI source art of 3840 by 2160.
Their source is `gpt-image-2.5-flare`, with one composition from text only for
each scene and reference edits for the background with no desks. The
foreground desk contours come from the same opaque composition, and they fit
the shared standing-desk coordinates. The green-matte converter of the
repository gives antialiased alpha. Keep these real operations in the PNG
provenance and the manifest provenance.

Their background masters and foreground masters give AVIF and WebP runtime
variants at five sizes. These are 640 by 360, 1280 by 720, 1920 by 1080, 2560
by 1440, and 3840 by 2160.
Do not upscale their previous masters of 1920 by 1080. All scenes use the same
normalized geometry. Character masters are transparent,
square, and 2048 by 2048 or larger.

Runtime character widths are 320, 640, and
960.

Small character token variants are 128 and 256 square pixels. Larger roster
headshots also use the larger runtime character variants.
The visible full-body silhouette fills 12 percent or more of each square
canvas and 92 through 99 percent of its height. This keeps thin characters
easy to read, and it keeps a safe margin for wide poses and props.
The silhouette width can change with the pose.

Do not replace the requirements for the filled area
and the height with one fixed minimum width for all poses.
Foreground scene plates use the same wide dimensions as the back
scene that agrees with them, and they keep transparent outer corners.

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
  file and in the package budget.
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
- **AC-023-15:** No baseline raster of this time is an input for its baseline
  replacement. This includes generation, tracing, editing, compositing,
  identity, composition, and style inputs.
  A targeted skin-consistency repair can use a conforming project portrait as
  a style reference through the exception for the approved repair above.
  Its private input record contains the reference source, license, hash, role,
  and repair-task scope. An agent compares the full regenerated baseline. The comparison shows one shared cel-shaded cartoon language, contour
  system, and flat-color construction. Character packages obey the funny
  big-head rendering standard. They use `county-baron--municipal-patron` as
  their only visual north star, and they use broad hard-edged cel-shaded value
  regions.

  Other representational
  raster packages keep two or three
  hard-edged value levels. The review shows consistent lighting, simplified
  materials, proportions, texture density, and exaggeration.
  Each archetype package contains its regenerated default and each regenerated
  baseline alternate. No package mixes previous skins and regenerated skins.
- **AC-023-16:** An agent inventory review examines all 27 character PNG files
  and all four scene PNG files one at a time at source size. It also examines
  them together in representative stage compositions. It records pass or fail
  for contour weight, flat color shapes, value-step
  count, and hard-edged lighting. It also records white balance, global color
  cast, intentional exaggeration, simplified material treatment, and limited
  texture. A result in one of these styles causes the milestone to fail:
  painted comic-book, painterly
  semi-realistic, realistic concept-art, photographic, hyper-realistic,
  three-dimensional-render, or mixed-style.

  For a
  character skin or state, the review records the funny big-head rendering
  standard, the immediate comic read, and the comparison with
  `county-baron--municipal-patron`. It does not record an accurate value-step
  quantization. A sample or a selected subset does not satisfy this review.
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

**AC-023-20:** The Flare workflow sends transparent requests and requests for
accurate dimensions to the API before the draft pixel boundary. Offline tests
make native 2048-square requests without an installed CLI. They do checks of
the multipart reference bytes, the credentials for the fixed origin, the
sanitized HTTP failures, and zero automatic retries. Dry runs make no files, and
they do not read credentials. Native preparation keeps RGB, contour alpha,
stronger alpha, and the bytes when there is no change.

It removes only
the permitted alpha-1 pixels that are not connected, and it rejects output that
continues to fail the native thresholds. Do the check with
`tests/unit/openai-scene.test.ts`,
`tests/unit/flare-api.test.ts`, and `tests/unit/native-alpha-preparation.test.ts`.

**AC-023-21:** A source-size agent review compares each selectable selection
portrait with `county-baron--municipal-patron` at equal displayed figure height.
It records the oversized-head or mechanical-face read, the immediate comic
read, the realism result, the visible global warm-wash result, and the
native-size provenance. When one condition fails, the selection and all five
state masters get a mark for package replacement. The private inventory
records all 30 selections and the cause of each replacement. Each replacement
archetype has its own agent integration evidence and a manual acceptance in the
game by the product owner before a different archetype starts.

For the inventory check of this time, use the character regeneration
inventory of this time in `research/HISTORY.md`. Also use the private
acceptance record of each completed cycle.
