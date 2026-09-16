"""Build the checked-in Poiret One Latin Extended file with Romanian T-comma mappings.

This maintenance script requires fonttools[woff] (including brotli). It is not
part of the runtime or production build; the resulting WOFF2 is checked in.
"""

from hashlib import sha256
from pathlib import Path

from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "node_modules/@fontsource/poiret-one/files/poiret-one-latin-ext-400-normal.woff2"
OUTPUT = ROOT / "src/assets/fonts/poiret-one-latin-ext-ro-400-normal.woff2"
SOURCE_SHA256 = "bcfc2f5d5f828c3aee7ec2ed422c086aa42fa582d22e503c956ca261e96da0dc"


def comma_outline(font: TTFont, glyph_name: str) -> list[tuple[int, int]]:
    glyph = font["glyf"][glyph_name]
    assert glyph.numberOfContours == 2
    points = glyph.getCoordinates(font["glyf"])[0]
    mark = points[glyph.endPtsOfContours[0] + 1 :]
    left = min(x for x, _ in mark)
    return [(x - left, y) for x, y in mark]


def main() -> None:
    assert sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_SHA256
    font = TTFont(SOURCE)

    # The source's T-cedilla marks already have precisely the same comma-below
    # outline as S-comma, translated horizontally. Reuse them without drawing
    # or synthesizing any glyphs.
    assert comma_outline(font, "uni0162") == comma_outline(font, "uni0218")
    assert comma_outline(font, "uni0163") == comma_outline(font, "uni0219")

    unicode_tables = [table for table in font["cmap"].tables if table.isUnicode()]
    assert unicode_tables
    assert all(0x021A not in table.cmap and 0x021B not in table.cmap for table in unicode_tables)
    for table in unicode_tables:
        assert table.cmap[0x0162] == "uni0162"
        assert table.cmap[0x0163] == "uni0163"
        table.cmap[0x021A] = "uni0162"
        table.cmap[0x021B] = "uni0163"

    font["name"].setName(
        "Poiret One Latin Extended with Romanian T-comma cmap entries; derived from Fontsource Poiret One v18.",
        10, 3, 1, 0x409,
    )
    font["name"].setName(
        "DenisMasharov: Poiret One Romanian cmap: 2026",
        3, 3, 1, 0x409,
    )
    font.recalcTimestamp = False
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(OUTPUT)
    print(f"{OUTPUT}: {sha256(OUTPUT.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    main()
