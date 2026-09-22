# Romanian Poiret One subset

`src/assets/fonts/poiret-one-latin-ext-ro-400-normal.woff2` derives from Fontsource's Poiret One
version 18 Latin Extended Web Open Font Format 2 (WOFF2). It adds Unicode mappings for Romanian `Ț`
(U+021A) and `ț` (U+021B) to the font's existing `Ţ` and `ţ` outlines. In this
source file, those outlines already use the same comma-below shape as `Ș` and
`ș`, with no visible cedilla difference. All existing outlines and advance
widths stay unchanged.

The source file is
`node_modules/@fontsource/poiret-one/files/poiret-one-latin-ext-400-normal.woff2`
at SHA-256
`bcfc2f5d5f828c3aee7ec2ed422c086aa42fa582d22e503c956ca261e96da0dc`.
The derived file's SHA-256 is
`a55b2e450ce53af7cee2cdb4533ec2e044d132eaa689441292d6813906aed5ca`.
Install `fonttools[woff]`. Then regenerate the file with `py tools/build-romanian-display-font.py`. The script examines the source hash and comma outlines before
writing the file.

The source and derived files use the SIL Open Font License 1.1. The complete
copyright and license notice ships at `public/licenses/fonts/poiret-one-OFL.txt`.
