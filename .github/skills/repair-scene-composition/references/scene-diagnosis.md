# Scene diagnosis reference

## Build one evidence packet

Record the source canvas, viewport, browser, crop mode, layer order, layer
dimensions, and every CSS transform. Inspect each raster alone. Inspect the
final composite with real interface content.

Use the user-supplied screenshot as evidence. Capture new screenshots only when
the user permits testing. Never substitute a development mock for the production
composition.

Measure relative geometry. Include human head size, eye line, shoulder width,
visible torso, desk top, desk width, moderator scale, prop size, interface-safe
regions, and visible layer seams. Normalize measurements to the scene viewport.
Do not judge proportions from asset dimensions alone.

## Identify the owning cause

Classify each defect as one of these causes:

1. Asset composition or perspective.
2. Layer extraction or alpha quality.
3. Runtime scale, crop, position, or transform.
4. Layer order or occlusion.
5. Interface collision or visual hierarchy.
6. Viewport-specific divergence.
7. Contract or content mismatch.

Separate symptoms from causes. A desk that looks too large can come from the
desk raster, character scale, camera perspective, viewport crop, or several of
these causes. Do not change one value until the evidence selects the owner.

## Choose the repair scope

Use a runtime repair only when the source assets agree and one placement rule
works at every supported viewport.

Regenerate one layer when that layer has the wrong perspective, intrinsic scale,
edge quality, or focal placement.

Regenerate the complete scene package when one or more of these conditions is
true:

- Two local scale corrections failed manual review.
- Layers require contradictory transforms at different viewports.
- Character, moderator, prop, and desk scale do not share one camera model.
- Alpha seams or extracted edges remain visible in the composite.
- A foreground layer cannot align without hiding required anatomy or interface
  content.
- The user rejects the complete composition rather than one isolated detail.

Do not stack more transforms on an incoherent scene. Build one coherent master
composition. Derive the back scene, character planes, and foreground occlusion
layers from that master. Preserve identical camera, canvas, lighting, and focal
coordinates across all derived assets.

## Use one coordinate system

Record all geometry as a ratio of the visible scene viewport. Use `x / width`,
`y / height`, `width / viewport width`, and `height / viewport height`.

Record the intrinsic raster coordinates separately. Record the mapping from
each raster to the viewport. Include `object-fit`, `object-position`, crop,
transform origin, translation, scale, and clipping.

Do not compare two layers until they use the same visible coordinate system.

## Inspect the complete scene

Use this checklist for each viewport and character pair.

- **Camera:** Record the horizon, vanishing lines, and stage depth. Regenerate a
  layer or the complete package when layers use different camera models.
- **Human scale:** Record head height, eye line, shoulders, and visible torso.
  Repair portrait placement or the master composition when the scale is wrong.
- **Relative scale:** Compare candidates, moderator, desks, microphones,
  glasses, and papers. Regenerate from one master when they lack one reference.
- **Desk fit:** Compare each desk top with the nearest waist, elbow, chest, and
  chin. Repair the foreground layer or character plane when the fit is wrong.
- **Occlusion:** Check each face, hand, prop, and torso. Repair z-order, crop,
  or the foreground asset when its mass hides required anatomy.
- **Interface clearance:** Check status, speech, phrases, actions, and review.
  Repair scene composition or interface layout when focal regions conflict.
- **Responsive crop:** Check focal points at all supported viewports. Repair
  asset focal points or runtime mapping when crop changes the composition.
- **Edge quality:** Check for halos, checkerboards, cut contours, and shadow
  seams. Regenerate or rebuild the alpha layer when an edge is invalid.
- **Color and white balance:** Check neutral anchors, navy and charcoal shadows,
  paper, skin, brass, and other named warm regions separately. Reject a
  scene-wide yellow, amber, sepia, beige, or brown cast. Keep local warm light
  from becoming a complete color grade.
- **Hierarchy:** Check candidate dominance, moderator depth, and prop emphasis.
  Repair the master composition, light, or runtime scale when mass is wrong.
- **Stability:** Check layout shift and animated movement. Repair markup,
  manifest data, or CSS when dimensions or transform ownership are wrong.

## Check human proportions

Measure each visible person independently.

- Record head height and width.
- Record the eye-line position.
- Record shoulder width.
- Record the visible torso length.
- Record the amount hidden by furniture or interface content.
- Record the subject scale relative to other people at the same depth.

Perspective can make the moderator smaller than the candidates. The camera and
set geometry must explain the difference. Do not use a smaller person as an
unexplained background symbol.

For a standing desk, the top must align with a plausible standing work height.
The desk must not make an ordinary adult appear seated, child-sized, or reduced
in stature. Use a different rule only for a character whose approved contract
requires a different body scale.

## Check props and furniture

Compare microphones, glasses, paper sheets, folders, and desk trim with the
nearest hand, head, and torso. A prop that has a plausible isolated size can
still be wrong relative to the person or camera.

Check the visible mass of foreground furniture. It must support the scene. It
must not become the primary subject or hide the character performance.

## Check interface-safe regions

Map these regions on the same scene screenshot:

1. Both status rails.
2. Round, timer, and Pause.
3. Wide speech record.
4. Center sentence and phrase path.
5. Waiting speech record.
6. Private phrases and secondary actions.
7. Grammar reaction and round review.

Required interface content can cover decorative set detail. It must not cover a
face, required hand gesture, owned prop, or moderator focal expression.

## Decide whether to regenerate

Use this order:

1. Remove invalid or contradictory runtime transforms.
2. Test one evidence-backed placement model.
3. Regenerate the defective layer if its intrinsic composition is wrong.
4. Regenerate the complete package if layer repair cannot preserve one camera
   and proportion system.

Do not continue local scaling after the regeneration gate is true. Repeated
scaling changes hide the cause and create viewport-specific failures.

For complete regeneration, create one full composite first. Approve its camera,
human scale, furniture scale, focal regions, and interface-safe regions. Then
derive every runtime layer from the same composite and masks. Do not generate
each layer as an independent composition.

## Validate transparent layers

Inspect the file structure and the rendered composite.

- Confirm an alpha-capable pixel format.
- Confirm alpha zero at required outer corners.
- Confirm transparent regions and an opaque or native near-opaque interior.
- Confirm clean antialiased edges.
- Confirm that no checkerboard is baked into color channels.
- Confirm `Alpha Workflow` matches native generation or legacy keying.
- For native output, confirm `native-alpha-v1` and `generated-alpha-v1` metadata.
- For legacy keying, confirm `green-chroma-key-v1` and `Chroma Key=#00FF00`.
- For legacy keying, confirm that no opaque chroma-green pixel remains.
- Confirm neutral sRGB white balance and no global warm color wash.
- Confirm that warm color stays inside named local materials or lights.
- Confirm that shadows belong to the correct layer.
- Confirm that clipped edges continue outside the visible frame when needed.

A structural alpha pass does not prove a clean visual edge. Inspect the layer on
light, dark, and final-scene backgrounds.

## Write the scene report

Use this order:

1. Baseline and user evidence.
2. Measured defects.
3. Owning causes.
4. Repair scope and regeneration decision.
5. Changed assets and source.
6. Production-browser evidence or the testing prohibition.
7. Remaining uncertainty and the largest blind spot.

Rank each defect as blocking, material, or advisory. Pair each defect with one
specific fix and one verification method.
