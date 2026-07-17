#!/usr/bin/env python3
"""Create numbered contact sheets for complete rendered-DOCX inspection."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def page_number(path: Path) -> int:
    return int(re.search(r"(\d+)$", path.stem).group(1))


def main(argv: list[str]) -> None:
    rendered = Path(argv[1])
    output = Path(argv[2])
    output.mkdir(parents=True, exist_ok=True)
    pages = sorted(rendered.glob("page-*.png"), key=page_number)
    font = ImageFont.load_default(size=24)

    for start in range(0, len(pages), 4):
        group = pages[start : start + 4]
        thumbs = []
        for path in group:
            image = Image.open(path).convert("RGB")
            image.thumbnail((620, 875), Image.Resampling.LANCZOS)
            card = Image.new("RGB", (660, 940), "white")
            card.paste(image, ((660 - image.width) // 2, 45))
            ImageDraw.Draw(card).text((18, 12), f"Page {page_number(path)}", fill="black", font=font)
            thumbs.append(card)

        sheet = Image.new("RGB", (1320, 1880), "#D8D8D8")
        for idx, thumb in enumerate(thumbs):
            sheet.paste(thumb, ((idx % 2) * 660, (idx // 2) * 940))
        first = page_number(group[0])
        last = page_number(group[-1])
        sheet.save(output / f"pages-{first:03d}-{last:03d}.jpg", quality=90)

    print(f"created {(len(pages) + 3) // 4} contact sheets for {len(pages)} pages")


if __name__ == "__main__":
    main(sys.argv)
