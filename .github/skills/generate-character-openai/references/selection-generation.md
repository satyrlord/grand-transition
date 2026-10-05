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
3. Give the nose shape and the nose size in each brief, also when the nose is small or usual.
4. Give the face shape, hair shape, age cue, and build in one short sentence each.
5. Give the height class and the head-size class from the next section.
6. Give the clothing, palette, signature prop, and visual joke.
7. Give the expression and the gesture that make the character funny.

Describe shapes, not surfaces.
Do not describe skin texture, wrinkles in detail, makeup detail, or hair strands.
Do not tell the generator to copy natural proportions or to keep a feature subtle.
Keep the fictional public identity and approved species.
Give each character a different face shape, build, and silhouette.
Exaggerate a feature only when the research shows that it identifies this subject.
Do not copy an exaggerated feature from a different character or from the style master.
Keep the caricature strength the same for all characters.

## Set the height and the head size

Find the real height of the subject in the research, or compare the subject with other persons in group photographs.
Select one height class. The stature is the distance from the top of the hair or the bare scalp to the shoe soles.

| Height class | Stature, as a percentage of the canvas height | Top of the head, y |
| --- | --- | --- |
| Short | 82 | 17 percent |
| Medium | 88 | 11 percent |
| Tall | 94 | 5 percent |

Put the shoe soles of each character at 99 percent of the canvas height.
Headwear and raised hands go above the top of the head. They do not change the height class.
Keep 1 percent of the canvas clear above the highest part.
A tall character with headwear thus fills 98 percent of the canvas height.
The asset validation rejects a selection whose full height, with headwear, is less than 80 percent of the canvas.
Keep the stature of a short character without headwear at 81 percent or more.

Select one head-size class. The head height is the distance from the chin to the top of the hair or the bare scalp.

| Head-size class | Head height, as a percentage of the stature |
| --- | --- |
| Usual | 19 through 22 |
| Large | 26 through 29 |

Use the large class only when the character study records a large head as a feature of that character.
Record the two classes in the character study.
Do not change the contour width for a class. The contour width in source pixels is the same for all classes.

Use [identity and prop consistency](prompt-consistency.md) to build the prompt and to place props.
Give the facing, full-body placement, safe margins, and prop count.
Use neutral sRGB white balance and ungraded colors.
Keep warm color local to materials or lights.
Do not add a global warm wash, text, labels, scenery, or extra subjects.

## Generate the shipping candidate

Use the built-in chat image generator.
Attach one image only: `docs/assets/character-style-master.png`.
Use this text, word for word, as the image-role part of the prompt:

```text
The one attached image is the style reference sheet. It shows three other characters.
Use only its drawing technique: the weight of the outer line, the flat colors,
the hard two-tone shading, and the faces drawn with a few lines.
The three characters on the sheet have different heights, head sizes, noses, and builds,
and one drawing technique. Draw one new character in that technique.
The new character is none of the three.
Use the height, the head, the face, and the build that this prompt gives.
```

Request one square native-transparent PNG at the canvas dimensions of the style master.
Request the stature and the positions of the height class of the character.
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
Put the candidate and the research photographs side by side on one resemblance sheet.
Keep that sheet in the task directory in `tmp/character-generation/`. Do not put it in a request, in `research/`, or in the repository.
Do not accept style agreement as proof of resemblance.
If the resemblance is weak, make the named features stronger in the brief and generate again.
If the resemblance stays weak after three requests, stop and tell the product owner.
Inspect actual transparency with [native alpha](../../generate-scene-openai/references/native-alpha.md).
Keep good generated alpha unchanged.
Run the runtime-window overlay:

```text
node tools/character-runtime-window.ts <candidate.png> <overlay.png>
```

Inspect the face, silhouette, contour, and prop at source and runtime scales.
Show the comparison sheets, the resemblance sheet, the light and dark composites, and the runtime window to the product owner.
The product owner decides the resemblance.
Make sure that the candidate does not have the face, the nose, the head size, or the build of a figure on the style master.
Check small roster crops, setup portraits, and the two match sides.
Do not call isolated thumbnails production-browser evidence.

## Keep accepted work

Record the candidate path, the acceptance decision, and the accepted source hash once.
Keep the accepted source unchanged.
Use it as the only image reference for that character's poses.
Stop at the requested selection boundary.
Continue to poses only after the product owner accepts the selection.
