# Character outline regeneration: asset action list

**Replaced on 2026-10-05.** The product owner set a new range for all playable
characters, robots included: 2.80 through 3.20 source pixels for each 1000
pixels of the reference height, which is 94 percent of the canvas height.
Specification 023 records it. Each installed package gets a regenerated
replacement that meets the new range. The text below records the earlier
target and the work that used it. Do not use its range for new art.

**Earlier target:** 2 outer-contour pixels per 1000 pixels of the selection's visible
figure height. **Accepted range: 1.80 through 2.20 per 1000.** Use the
selection's scale for its five poses. Specification 023 records this range for
new or corrected character art.

There are **27 human skin packages (162 PNGs)**. A package means
`<id>.png` and `states/<id>/{thinking,delivery,light-hit,heavy-hit,weakness}.png`.
The Oat-Milk alternate's six outer silhouettes are processed and installed:
all 46 reviewed exterior edges now measure within range, with alpha unchanged.
The other 26 human packages still need a target check. The current inspection
cannot establish which of their sources already meet the range. Correct a
selection first; retain any pose that passes and process or regenerate the rest.
A diagnostic screen covered all 162 human sources, but two measurement methods
disagree on 41 sources. Review clear outer edges before treating a screen label
as an acceptance decision.

## Finish the visible hair defect

- `oat-milk-reformist--alternate`: its selection and five poses now have
  processed exterior ink. The blonde ends over the orange blazer still lack a
  clear internal boundary. Correct that hair seam without changing the accepted
  hair shape, face, outfit, pose or cup; recheck all six sources afterward.

## Measure and prepare selection corrections

These five selections have a single measured outer-contour segment above 2.20.
Measure several clear edges before deciding how much of each selection
needs correction; compare its five poses after the selection is accepted.

| Skin | Sampled selection width per 1000 figure pixels |
| --- | ---: |
| `eu-funds-alchemist` | 4.1 px |
| `football-tycoon` | 4.1 px |
| `algorithmic-prophet` | 3.6 px |
| `luxury-minister` | 3.1 px |
| `reluctant-theorem` | 2.5 px |

## Compare these bolder packages next

The equal-height visual review found strong or medium-to-bold outlines in all
six states of each package. Measure them against 1.80 through 2.20, then correct the
selection and any poses that miss the target.

No tested bulk reduction method keeps all reviewed thick edges in range yet.

- `coalition-acrobat`, `county-baron`, `diaspora-oracle`.
- `midnight-sensationalist`, `oat-milk-reformist`, `red-folded-chairman`.
- `retiring-cassandra`, `spreadsheet-technocrat`, `thunder-tribune`.
- `velvet-mogul`, `velvet-mogul--boardroom-patriarch`,
  `velvet-mogul--velvet-statesman`.

## Measure these before deciding on regeneration

These nine packages are visually finer or moderate. The inspection does not
establish a pass within 1.80 through 2.20. Keep each source that passes;
correct the rest:

- `apartment-block-geopolitician`, `black-sea-captain`,
  `county-baron--municipal-patron`, `marble-diplomat`.
- `midnight-sensationalist--alternate`, `red-folded-chairman--alternate`,
  `retiring-cassandra--statesman`, `thunder-tribune--alternate`,
  `velvet-mogul--silk-diplomat`.

## Robot sources

The three `government-ai` packages contain 18 installed sources. The initial
sampled medians identified **ten outside 1.80 through 2.20**. One of those
sources, Schoolteacher `delivery`, now has a bounded exterior ink correction:
eight reviewed outer edges and 42 neighboring samples are within range.
The nine other initially flagged robot sources are:

- Alternate: five poses. `thinking` 2.56, `delivery` 2.75, `light-hit` 2.89,
  `heavy-hit` 3.01, and `weakness` 3.04 are above the range. Its selection
  measures 2.07 and is within the range.
- Default: `thinking` 2.24, `delivery` 2.38, `light-hit` 2.29, and `weakness`
  2.34 are above the range.

The other eight original robot medians were within the accepted range. Sampled
medians do not certify every contour. Confirm the nine remaining exceptions at
paired contour regions. Keep each current source until a corrected replacement
passes the range and art review. The linked robot probe ledger is the baseline
before the Schoolteacher delivery correction; the source inventory has current
source hashes.

The [source inventory](character-outline-inspection.csv) records every PNG,
its hash, and its visual finding. The [robot measurements](robot-outline-measurements.csv)
record all accepted and rejected probes. The
[comparison gallery](../../tmp/character-outline-audit-2026-10-03/index.html)
shows the originals at equal figure height and at fixed canvas scale.
