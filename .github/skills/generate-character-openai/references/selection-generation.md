# Generate a selection candidate

Read this module before selection generation or selection review.
Do not start before the product owner accepts the [style master](style-master.md).

## Research identity before selection generation

Before each new selection, confirm the private inspiration mapping.
Open reliable, clearly labeled web sources.
Visually inspect at least three distinct usable photographs of that subject.
Target five photographs.
Inspect more when the likeness remains unclear.
Do not count duplicates, crops, or resized copies of the same photograph as different images.
Choose varied views and expressions, with front, three-quarter, and profile views when available.
Do not infer appearance from search snippets, an unviewed image, or a stale private description.
Use dated photos from a coherent role or era when appearances differ over time.
Record each source URL, the inspection date, the selected era, and observed face, hair, and build traits.
Keep that short record in the private character study.
Separate factual appearance from deliberate cartoon exaggeration and the fictional role.

Verified web evidence takes precedence over conflicting private research about identity and appearance.
Correct the private study before generation.
Do not average conflicting traits or preserve a disproved description.
Keep the user's approved cartoon style and fictional role as the rendering and satire contract.
When the inspiration mapping is unresolved, research it before making a selection.
Do not invent a mapping.

Reuse a previously researched dossier only after its sources, appearance, and minimum distinct-image count are checked again.
Keep real names, source photos, and private reference descriptions out of shipped metadata.
Poses inherit the researched, accepted selection and do not need a new web study for each state.

## Write the caricature brief

The research photographs are for the agent only.
Do not attach a photograph to a generation request.
Do not put the name of the subject in a prompt.
A photograph in the request makes the generator copy realistic skin and portrait shading.

Change the research into a written caricature brief:

1. Name the two or three features that identify the subject most strongly.
2. Tell the generator to exaggerate each of them strongly, and give its shape.
3. Give the face shape, hair shape, age cue, and build in one short sentence each.
4. Give the clothing, palette, signature prop, and visual joke.
5. Give the expression and the gesture that make the character funny.

Describe shapes, not surfaces.
Do not describe skin texture, wrinkles in detail, makeup detail, or hair strands.
Do not tell the generator to copy natural proportions or to keep a feature subtle.
Keep the fictional public identity and approved species.
Give each character a different face shape, build, height, and silhouette.
Keep the caricature strength and the head-height band the same for all characters.

Use [identity and prop consistency](prompt-consistency.md) to build the prompt and to place props.
Give the facing, full-body placement, safe margins, and prop count.
Use neutral sRGB white balance and ungraded colors.
Keep warm color local to materials or lights.
Do not add a global warm wash, text, labels, scenery, or extra subjects.

## Generate the shipping candidate

Use the built-in chat image generator.
Attach one image only: `docs/assets/character-style-master.png`.
Tell the generator that it is the style reference image and that it gives the drawing technique only.
Request one square native-transparent PNG at the canvas dimensions of the style master.
Request a complete figure at 86 percent of the canvas height, with 7 percent margins above and below.
Use the same figure height for each selection, so that the contour weight stays equal.
Do not generate a separate draft when the same request can make a shipping candidate.
Save the returned source unchanged in the task directory.
Save the sent prompt in the task directory.
Record the measured dimensions and the route.
Record the model only if the tool exposes it.

## Examine and present

Use [style review](style-review.md) first.
Then use [candidate review](../../generate-scene-openai/references/candidate-review.md).
Reject realistic faces, mixed rendering, generic identity, damaged anatomy, missing props, duplicate props, or crop loss.
After the rendering checks pass, compare the candidate with the researched subject.
Do not accept style agreement as proof of resemblance.
If the resemblance is weak, make the named features stronger in the brief and generate again.
Inspect actual transparency with [native alpha](../../generate-scene-openai/references/native-alpha.md).
Keep good generated alpha unchanged.
Run the runtime-window overlay:

```text
node tools/character-runtime-window.ts <candidate.png> <overlay.png>
```

Inspect the face, silhouette, contour, and prop at source and runtime scales.
Show the comparison sheets, the light and dark composites, and the runtime window to the product owner.
Make sure that the shape and identity of the candidate stay distinct from the style master.
Check small roster crops, setup portraits, and the two match sides.
Do not call isolated thumbnails production-browser evidence.

## Keep accepted work

Record the candidate path, the acceptance decision, and the accepted source hash once.
Keep the accepted source unchanged.
Use it as the only image reference for that character's poses.
Stop at the requested selection boundary.
Continue to poses only after the product owner accepts the selection.
