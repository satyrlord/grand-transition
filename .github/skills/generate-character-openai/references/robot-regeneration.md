# Regenerate a robot package

Read this module before a Government AI robot selection or pose.
The product owner authorized this regeneration on 2026-10-05, so that each robot meets the contour range in Specification 023.

## Know the differences from a human character

- A robot uses written artistic instructions without a design template.
- A robot uses the [robot style block](../assets/style-block-robot.txt) as its only style text.
- A robot has no height class and no head-size class. It keeps the proportions of its approved selection.
- A robot needs no photograph research. Its identity is the approved selection and Specification 023.
- A robot gets no caricature of a person. Keep it fully mechanical.

The three skins are `government-ai`, `government-ai--alternate`, and `government-ai--schoolteacher`.
Read the "Government AI robot skins" section of Specification 023 and the private study of the skin.
The private study names the works that gave the idea for the skin.
Do not put a name from those works in a prompt. Do not copy a design from those works.

## Prepare the selection request

Write one prompt in the sequence that [identity and prop consistency](prompt-consistency.md) gives.
Use the robot style block in place of the human style block.
Attach the installed selection of the skin as the only image.
Use this text, word for word, as the image-role part of the prompt:

```text
The one attached image is the approved drawing of this robot. It is the identity reference.
Draw the same robot again cleanly: the same construction, proportions, parts, base colors, props, pose, and facing.
Keep the same height and the same position on the canvas.
Change only the drawing technique, as the style block tells you, and the surface condition, as this prompt tells you.
```

In the identity part, give the parts that Specification 023 gives for the skin, with the count of each prop.
Also give the surface condition of the skin. It is a part of the identity:

- `government-ai`: oxidized, with patches of red-brown rust.
- `government-ai--alternate`: oxidized, with patches of blue-green oxide.
- `government-ai--schoolteacher`: well-maintained and polished, with no oxide. Its construction shows that it is an old model.

Give the oxide as six to ten flat patches at seams, edges, and joints. Do not hide a part or the face with oxide.
Request one square native-transparent PNG.
Run the two prompt checks before the request.

## Examine the selection

Use [style review](style-review.md) and [candidate review](../../generate-scene-openai/references/candidate-review.md).
Put the installed selection and the candidate on one sheet at equal canvas heights, on light and dark backgrounds.
Do not measure a stature or a head-height ratio.
Measure the outer contour width as the style review tells you, with the same reference height.
Use edges of the head, the arms, the body, and the legs or the wheel carriage.

Reject the candidate when one of these conditions is true:

- A part, a prop, a color, or a proportion of the approved robot is missing or changed.
- The robot has human anatomy, skin, or hair.
- The schoolteacher skin has an apron, frills, a maid cap, a skirt, or a cleaning tool.
- The robot looks like a character from a different work.
- The median contour width is out of its range, or the contour weight changes between body parts.
- A material has more than one shadow tone, a gradient, or a texture.
- The surface condition is not the condition of the skin: the oxide has the incorrect color, a polished robot has oxide, or an oxidized robot is clean.
- The oxide is a texture, a speckle pattern, or a soft stain, and not a small number of flat patches.
- The display throws light or glow on the body or outside the silhouette.
- The figure height differs from the installed selection by more than 2 percent of the canvas height.

After a rendering defect, generate again from the prompt.
Do not change pixels to correct the contour width.
Run the runtime-window overlay from [identity and prop consistency](prompt-consistency.md).
Show the sheets and the measurement to the product owner.
Continue to poses only after the product owner accepts the selection.

## Regenerate the poses and integrate

Use [pose generation](pose-generation.md) with these differences:

- Attach the accepted new selection as the only image.
- Use the robot style block in each pose prompt.
- Keep the action of each installed pose. Look at the installed pose, and describe its action in the prompt.

Keep each installed source until the complete package of the skin passes the review.
Then use [character integration](../../generate-scene-openai/references/character-integration.md).
