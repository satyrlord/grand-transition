# Romanian Poiret One subset

The file `src/assets/fonts/poiret-one-latin-ext-ro-400-normal.woff2` comes from the Fontsource Poiret One
version 18 Latin Extended Web Open Font Format 2 (WOFF2) file.
It adds Unicode mappings for the Romanian `Ț` (U+021A) and `ț` (U+021B) to the `Ţ` and `ţ` outlines of the font.
In this source file, those outlines use the same comma-below shape as `Ș` and `ș`.
They have no cedilla difference that you can see.
All the other outlines and advance widths stay the same.

The source file is
`node_modules/@fontsource/poiret-one/files/poiret-one-latin-ext-400-normal.woff2`.
Its SHA-256 hash is
`bcfc2f5d5f828c3aee7ec2ed422c086aa42fa582d22e503c956ca261e96da0dc`.
The SHA-256 hash of the derived file is
`a55b2e450ce53af7cee2cdb4533ec2e044d132eaa689441292d6813906aed5ca`.
Install `fonttools[woff]`.
Then, to make the file again, run `py tools/build-romanian-display-font.py`.
Before the script writes the file, it examines the source hash and the comma outlines.

The source file and the derived file use the SIL Open Font License 1.1.
The full copyright and license notice is in the shipped file `public/licenses/fonts/poiret-one-OFL.txt`.
