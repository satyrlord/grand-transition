# Scene diagnosis reference

Read this module before the first finding or edit, in all modes.

## Make one evidence packet

Record the source canvas, the viewport, the browser, the crop mode, the layer sequence, and the layer dimensions.
Record each Cascading Style Sheets (CSS) transform.
Examine each raster as an isolated image.
Examine the last composite with the real interface content.

Use the screenshot that the user gives as evidence.
Capture new screenshots only when the user lets you run tests.
Do not use a development mock as an alternative to the production composition.

Measure the relative geometry.
For each person, include the head dimensions, the eye line, and the shoulder width.
Also include the torso length that you can see.
Include the position of the desk top, the desk width, the moderator scale, and the prop dimensions.
Include the regions that the interface must keep clear and the layer seams that you can see.
Normalize the measurements to the scene viewport.
Do not use only the asset dimensions to find incorrect proportions.

## Identify the cause

Give each defect one of these causes:

1. Asset composition or perspective.
2. Layer extraction or alpha quality.
3. Runtime scale, crop, position, or transform.
4. Layer sequence or occlusion.
5. Interface collision or visual hierarchy.
6. A difference that occurs only at one viewport.
7. A contract or content difference.

Keep symptoms and causes apart.
A desk that is too large can come from the desk raster, the character scale, the camera perspective, or the viewport crop.
It can also come from more than one of these causes.
Do not change a value until the evidence identifies the owner.

## Select the repair scope

Use a runtime repair only when these conditions are correct:

- The source assets agree.
- One placement rule operates at each supported viewport.

Generate one layer again when that layer has an incorrect perspective, intrinsic scale, edge quality, or focal position.

Generate the full scene package again when one or more of these conditions occur:

- Two local scale repairs did not pass the manual review.
- The layers must have transforms that do not agree at different viewports.
- The character, moderator, prop, and desk scales do not use one camera model.
- You can see alpha seams or extracted edges in the composite.
- A foreground layer can align only when it is in front of necessary anatomy or interface content.
- The user rejects the full composition, not only one isolated detail.

Do not add more transforms to a scene that does not have one camera model.
Make one master composition.
Make the back scene, the character planes, and the foreground occlusion layers from that master.
Keep the same camera, canvas, light, and focal coordinates in all the derived assets.

## Use one coordinate system

Record all geometry as a ratio of the scene viewport that you can see.
Use `x / width`, `y / height`, `width / viewport width`, and `height / viewport height`.

Record the intrinsic raster coordinates as a different record.
Record the mapping from each raster to the viewport.
Include `object-fit`, `object-position`, the crop, the transform origin, the translation, the scale, and the clipping.

Do not compare two layers until they use the same coordinate system.

## Examine the full scene

Use this checklist for each viewport and each character pair:

- **Camera:** Record the horizon, the vanishing lines, and the stage depth.
  When layers use different camera models, generate a layer or the full package again.
- **Human scale:** Record the head height, the eye line, the shoulders, and the torso length that you can see.
  When the scale is not correct, repair the portrait placement or the master composition.
- **Relative scale:** Compare the candidates, the moderator, desks, microphones, glasses, and papers.
  When they do not use one reference, generate them again from one master.
- **Desk fit:** Compare each desk top with the nearest waist, elbow, chest, and chin.
  When the fit is not correct, repair the foreground layer or the character plane.
- **Occlusion:** Examine each face, hand, prop, and torso.
  When a mass is in front of necessary anatomy, repair the z-order, the crop, or the foreground asset.
- **Interface clearance:** Examine the status, speech, phrases, actions, and review regions.
  When focal regions and interface regions touch, repair the scene composition or the interface layout.
- **Responsive crop:** Examine the focal points at all supported viewports.
  When the crop changes the composition, repair the asset focal points or the runtime mapping.
- **Edge quality:** Examine the edges for halos, checkerboards, cut contours, and shadow seams.
  When an edge is not correct, generate the alpha layer again or build it again.
- **Color and white balance:** Examine neutral anchors, navy and charcoal shadows, paper, skin, brass, and other named warm regions one at a time.
  Do not accept a yellow, amber, sepia, beige, or brown cast on the full scene.
  Do not let local warm light become a color grade for the full scene.
- **Hierarchy:** Examine the dominance of the candidates, the depth of the moderator, and the emphasis of the props.
  When the visual mass is not correct, repair the master composition, the light, or the runtime scale.
- **Stable layout:** Examine layout shift and animated movement.
  When the dimensions or the transform owners are not correct, repair the markup, the manifest data, or the CSS.

## Examine human proportions

Measure each person that you can see in a different measurement:

- Record the head height and width.
- Record the eye-line position.
- Record the shoulder width.
- Record the torso length that you can see.
- Record the part of the body that is behind furniture or interface content.
- Record the scale of the subject relative to other persons at the same depth.

Perspective can make the moderator smaller than the candidates.
The camera and the set geometry must give the cause of that difference.
Do not use a smaller person as a background symbol without a cause.

For a standing desk, the top must align with a possible standing work height.
The desk must not make a usual adult look short, look like a child, or look like a person on a chair.
Use a different rule only for a character with an approved contract that gives a different body scale.

## Examine props and furniture

Compare microphones, glasses, paper sheets, folders, and desk trim with the nearest hand, head, and torso.
A prop can have a possible dimension when you examine it as an isolated item.
It can also be incorrect relative to the person or the camera.

Examine the mass of the foreground furniture that you can see.
The furniture must help the scene.
It must not become the primary subject, and it must not be in front of the character performance.

## Examine the regions that the interface must keep clear

Map these regions on the same scene screenshot:

1. The two status rails.
2. The round, the timer, and Pause.
3. The wide speech record.
4. The center sentence and the phrase path.
5. The waiting speech record.
6. The private phrases and the secondary actions.
7. The grammar reaction and the round review.

Necessary interface content can be in front of decorative set details.
It must not be in front of a face, a necessary hand gesture, an owned prop, or the focal expression of the moderator.

## Select the regeneration step

Use this sequence:

1. Remove runtime transforms that are not correct or that do not agree.
2. If the user lets you run tests, try one placement model that the evidence shows as correct.
3. If the intrinsic composition of a layer is not correct, generate that layer again.
4. If a layer repair cannot keep one camera and proportion system, generate the full package again.

After the regeneration condition occurs, stop local scale changes.
More local scale changes make the cause not easy to find, and they cause failures that occur only at one viewport.

For a full regeneration, make one full composite first.
Get approval for its camera, human scale, furniture scale, focal regions, and the regions that the interface must keep clear.
Then make each runtime layer from the same composite and the same masks.
Do not generate each layer as a different composition.

## Validate transparent layers

Examine the file structure and the rendered composite:

- Make sure that the pixel format has an alpha channel.
- Make sure that alpha is zero at the necessary outer corners.
- Make sure that there are transparent regions and an opaque or native near-opaque interior.
- Examine antialiased edges for defects.
- Make sure that there is no checkerboard in the color channels.
- Make sure that `Alpha Workflow` agrees with native generation or with legacy keying.
- For native output, do a check of the `native-alpha-v1` and `generated-alpha-v1` metadata.
- For legacy keying, do a check of `green-chroma-key-v1` and `Chroma Key=#00FF00`.
- For legacy keying, make sure that no opaque chroma-green pixel stays.
- Make sure that the sRGB (standard red, green, and blue) white balance is neutral.
- Make sure that there is no warm color wash on the full image.
- Make sure that warm color stays in named local materials or lights.
- Make sure that each shadow is in the correct layer.
- When it is necessary, make sure that clipped edges continue across the edge of the frame.

A structural alpha pass does not show a clean visual edge.
Examine the layer on light, dark, and last-scene backgrounds.

## Write the scene report

Use this sequence:

1. The initial state and the evidence from the user.
2. The measured defects.
3. The causes.
4. The repair scope and the regeneration decision.
5. The changed assets and source code.
6. The production-browser evidence, or the instruction from the user that prevented tests.
7. The open problems and the largest area that you did not examine.

Give each defect one of these ratings: blocking, material, or advisory.
Give each defect one repair and one verification method.
