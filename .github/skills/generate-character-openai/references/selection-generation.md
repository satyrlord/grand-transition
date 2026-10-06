# Generate a selection candidate

Read this module before selection generation or selection review.
Use the written art direction in the [style contract](../../../../docs/assets/flat-editorial-style.md).
Generate only the human selections that the owner authorized.

## Research identity before selection generation

Before each new selection, confirm the private inspiration mapping.
Open reliable, clearly labeled web sources.
Find and visually inspect five distinct usable web photographs of that subject.
Inspect more when likeness remains unclear, then select five clear photographs for attachment.
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

Select five distinct researched photographs from the selected era.
Include front, three-quarter, and profile views when available.
Use varied expressions and at least one view that shows the build.
Inspect each selected photograph before attachment.
Keep the selected files and their source URLs in the task record.
Attach only those five photographs to a human selection request.
Use photographs for face shape, feature relationships, hair shape, age cues, and build only.
Use the fixed written style block for the drawing technique.
Do not copy photographic lighting, skin texture, costume, scenery, or props.
Do not put the name of the subject in a prompt.
Keep the fictional role, costume, props, and proportions in the written brief.

Change the research into a written caricature brief:

1. Name the two or three features that identify the subject most strongly.
2. Give each feature's individual shape and use restrained exaggeration without losing natural facial anatomy.
3. Give the nose shape and the nose size in each brief, also when the nose is small or usual.
4. Give the face shape, hair shape, age cue, and build in one short sentence each.
5. Give the height class and the head-size class from the next section.
6. Give the clothing, palette, signature prop, and visual joke.
7. Give the expression and the gesture that make the character funny.

Describe shapes, not surfaces.
Do not describe skin texture, wrinkles in detail, makeup detail, or hair strands.
Use natural adult facial anatomy with individual shapes and expression, as the fixed style block gives.
Keep the approved whole-head proportion. Do not substitute an oversized geometric or mascot-like face.
Keep the fictional public identity and approved species.
Give each character a different face shape, build, and silhouette.
Exaggerate a feature only when the research shows that it identifies this subject.
Do not copy an exaggerated feature from a different character.
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
Choose the height, head-size, and build from the researched study.
Resolve an unclear category from the study or owner. Do not invent a fallback.
Attach the five selected identity photographs in their recorded order.
Do not attach a design template, installed character, generated candidate, or comparison sheet.
Use this text, word for word, as the image-role part of the prompt:

```text
The five attached images are distinct researched web photographs of the same identity subject.
Use them only for the subject's likeness: face shape, feature relationships, hair shape, age cues, and build.
Do not copy their lighting, skin texture, costume, background, or props.
Use only the fixed written style block for the drawing technique. No image is a style reference.
Keep the new character's fictional role, costume, props, and proportions from the written brief.
```

Request one native transparent square PNG of at least 1024 pixels per edge.
Give the requested canvas size in the prompt. Record the observed output size without enlargement.
Request the stature and the positions of the height class of the character.
Do not generate a separate draft when the same request can make a shipping candidate.
Save the returned source unchanged in the task directory.
Save the sent prompt in the task directory.
Record the measured dimensions and the route.
Record the model only if the tool exposes it.

## Examine and present

Compare the face with all five identity photographs before detailed measurements.
Examine the comic expression and action against the written role.
Reject a generic face even when the costume and prop are correct.
Identify the missing or incorrect features before the next request.
Change the five-photo set or brief when likeness fails.
Do not repeat only style corrections while the face stays generic.
Then use [style review](style-review.md).
Then use [candidate review](../../generate-scene-openai/references/candidate-review.md).
Reject photographic facial rendering, mixed rendering, generic identity, damaged anatomy, missing props, duplicate props, or crop loss.
Natural facial anatomy and believable clothing construction are required, not rejection reasons.
Examine resemblance and rendering as separate conditions for acceptance.
Put the candidate and the research photographs side by side on one resemblance sheet.
Keep that sheet in the task directory in `tmp/character-generation/`. Do not put it in a request, in `research/`, or in the repository.
Do not accept style agreement as proof of resemblance.
If resemblance is weak, select a clearer identity photograph or correct the named feature shapes in the brief.
Generate again with five distinct identity photographs and the fixed written style block.
Continue necessary built-in chat retries without an attempt cap or per-request approval.
Ask the owner only when an unresolved identity decision prevents a grounded brief.
Inspect actual transparency with [native alpha](../../generate-scene-openai/references/native-alpha.md).
Keep good generated alpha unchanged.
Run the runtime-window overlay:

```text
node tools/character-runtime-window.ts <candidate.png> <overlay.png>
```

Inspect the face, silhouette, contour, and prop at source and runtime scales.
Show the resemblance sheet, light and dark composites, and runtime window to the product owner.
The product owner decides the resemblance.
Reject generic identity or an unrequested feature that conflicts with the photographs and brief.
Check small roster crops, setup portraits, and the two match sides.
Do not call isolated thumbnails production-browser evidence.

## Keep accepted work

Record the candidate path, the acceptance decision, and the accepted source hash once.
Keep the accepted source unchanged.
Use it as the only image reference for that character's poses.
Stop at the requested selection boundary.
Continue to poses only after the product owner accepts the selection.
