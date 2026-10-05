# Make the style master

Read this module before the Master branch.
Read it again before a change to the style block.

## Know the purpose

The style master is a set of 18 invented politicians in separate native transparent square PNG files.
Use every combination of these categories:

- Height: short, medium, tall.
- Build: fat, average, thin.
- Presentation: male, female.

Each file contains one complete figure, with the same canvas rules as a game selection.
Use the source name `character-style-master-{height}-{build}-{male|female}.png`.
The [style contract](../../../../docs/assets/flat-editorial-style.md) lists all 18 files.
Do not generate sheets, lineups, collages, grids, strips, or multi-pose images.
Generate one character per request and file. Preserve the full native canvas.
Do not split a generated sheet into source files.
The figures are not game characters or caricatures of real persons.

Use one technique across the set: the same contour weight, flat colors, faces drawn with few lines,
and strong exaggeration of two or three identity features.
Keep skin one solid flat color, with no facial shadows or highlights.
Use one flat hair silhouette with at most one hard shadow.
Use a base color and at most one hard shadow shape for each clothing material. Do not use gradients or textures.
Vary noses, face shapes, ages, costumes, and individual visual jokes.
Repeat the required height, build, presentation, and head-size categories.
A repeated category does not establish copied identity.

The installed Algorithmic Prophet gives the owner's subjective preference only.
The fixed style block defines the target technique. The accepted templates become the references for new human selections.
The Prophet also gets a regenerated replacement. Do not copy its identity into a template.
A future selection attaches one approved template that matches its researched height, build, and presentation.
The selection's own brief controls identity and likeness. Do not invent a fallback when its category is unresolved.
The later transfer tests must establish successful transfer.

## Prepare each request

Read the existing work record. Write one prompt for each figure in the sequence from
[identity and prop consistency](prompt-consistency.md).
Examine the installed Algorithmic Prophet locally as the owner's subjective preference only.
Generate the pilot from text alone, with no Prophet attachment.
After a pilot passes measurement and rendering review, its separate source can be the technique-only reference for the other templates.
Record it as a provisional reference, not as an owner-accepted master.
Tell the generator that a new figure does not copy the provisional reference's identity.
Do not attach a photograph or put a real person's name in a prompt.
Do not instruct the generator to make the contour thinner than the Prophet based on an uncalibrated measurement.
Use the fixed style block for contour instructions.
Run both prompt checks before each request.

Use these values for every template:

- A square native transparent canvas of at least 1024 pixels per edge.
- The same native canvas dimensions across the set. Do not enlarge or resize sources to pass.
- One centered, complete figure, with shoe soles at y 99 percent.
- No headwear, held prop, extra subject, or text.
- The usual head-size class: 19 through 22 percent of stature, with a target of 20.5 percent.
- Compact hair and jowls within the head box. Do not use an oversized hairstyle to inflate the measured head height.

Give explicit canvas landmarks in every prompt:

| Height | Stature, percent of canvas height | Head top, y percent | Target chin, y percent |
| --- | --- | --- | --- |
| Short | 82 | 17 | 33.81 |
| Medium | 88 | 11 | 29.04 |
| Tall | 94 | 5 | 24.27 |

Head top means the top of the hair or bare scalp. Head height extends to the chin.
The chin target equals head top plus 20.5 percent of stature.
Accept a stature difference of no more than 2 percentage points. Use the measured stature for the head ratio.

## Generate and examine

The built-in chat image generator has no request budget or per-request approval step.
Continue necessary retries within the authorized task. Do not impose an attempt cap.
Flare API budgets and permissions do not apply to this route. Do not use Flare for characters.
Validate a pilot before generating the remaining combinations when that improves consistency.
A pilot does not replace any of the 18 required combinations.
Preserve passing candidates while correcting failures. Artistic acceptance is separate from permission to continue generation.

Use [style review](style-review.md) for each candidate.
Measure stature, head-height ratio, and outer contour width in its own source file.
Use the calibrated helper at `../scripts/measure-contour.ts` as directed by that review.
Do not use the old task-local uncalibrated contour helper for acceptance.
Make local light and dark comparison composites from the separate sources at equal canvas scale.
Use them only for inspection. Never request a composite from the generator or attach it as a reference.

Reject incomplete figures, incorrect categories, invalid alpha, cropping, or failed proportions.
Reject defects in the fixed style block's face, detail, shading, or contour requirements.
Reject copied roster identity or an identifiable real person. Give the combination of features that establishes the match.
A shared category or feature alone is not proof of copied identity.
Examine humor through exaggerated shapes and the visual joke. A serious expression does not itself fail this check.
Record the intended joke. The owner decides artistic acceptance.
Keep unresolved contour measurements pending. Do not record them as passes.
After a rendering defect, revise the brief as needed and generate again. Do not edit pixels to fix contour width.
Use an edit request only for a composition defect, and measure the result again.

## Record the accepted set

Show the separate candidates and their measurements at source and match-portrait scales.
Continue generation and validation without waiting for approval of each attempt.
Copy a source into the canonical reference inventory only after the owner accepts its appearance.
Copy it unchanged to `docs/assets/character-style-master-{height}-{build}-{male|female}.png`.
Record its hash, dimensions, proportions, contour evidence, and visual acceptance in the style contract.
Keep transfer validation pending. Do not call a partial set complete.
Change the fixed style block only when the owner authorizes the change.

The reference files do not go into `src/assets/`.
Stop at the authorized Master scope. After authorization for Selection work, perform the two transfer tests in Specification 023.
Each test uses one matching accepted template. Record its source hash, review path, and owner acceptance.
Complete transfer validation only when both tests pass and the owner accepts them.
