#!/usr/bin/env python3
"""Extract a DOCX thesis into review-friendly JSON and Markdown."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

from docx import Document
from docx.document import Document as _Document
from docx.oxml.ns import qn
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph


def iter_blocks(parent):
    if isinstance(parent, _Document):
        element = parent.element.body
    elif isinstance(parent, _Cell):
        element = parent._tc
    else:
        raise TypeError(type(parent))
    for child in element.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, parent)
        elif child.tag == qn("w:tbl"):
            yield Table(child, parent)


def para_payload(p: Paragraph, index: int) -> dict:
    xml = p._p
    texts = xml.xpath(".//w:t/text()")
    deleted = xml.xpath(".//w:delText/text()")
    instr = xml.xpath(".//w:instrText/text()")
    drawings = len(xml.xpath(".//w:drawing | .//w:pict"))
    equations = len(xml.xpath(".//m:oMath | .//m:oMathPara"))
    ppr = xml.pPr
    num_id = None
    ilvl = None
    if ppr is not None and ppr.numPr is not None:
        if ppr.numPr.numId is not None:
            num_id = ppr.numPr.numId.val
        if ppr.numPr.ilvl is not None:
            ilvl = ppr.numPr.ilvl.val
    return {
        "index": index,
        "style": p.style.name if p.style else None,
        "text": "".join(texts),
        "deleted_text": "".join(deleted),
        "field_instructions": [s.strip() for s in instr if s.strip()],
        "drawings": drawings,
        "equations": equations,
        "numbering": {"num_id": num_id, "level": ilvl} if num_id is not None else None,
    }


def table_payload(table: Table, index: int) -> dict:
    rows = []
    for row in table.rows:
        rows.append(["\n".join(p.text for p in cell.paragraphs).strip() for cell in row.cells])
    return {"index": index, "rows": rows, "row_count": len(rows), "col_count": max((len(r) for r in rows), default=0)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--json", required=True)
    ap.add_argument("--markdown", required=True)
    args = ap.parse_args()

    doc = Document(args.input)
    blocks = []
    paragraphs = []
    tables = []
    p_idx = t_idx = 0
    for block in iter_blocks(doc):
        if isinstance(block, Paragraph):
            item = para_payload(block, p_idx)
            paragraphs.append(item)
            blocks.append({"kind": "paragraph", **item})
            p_idx += 1
        else:
            item = table_payload(block, t_idx)
            tables.append(item)
            blocks.append({"kind": "table", **item})
            t_idx += 1

    section_data = []
    for i, s in enumerate(doc.sections, 1):
        section_data.append({
            "index": i,
            "start_type": str(s.start_type),
            "orientation": str(s.orientation),
            "width_in": round(s.page_width.inches, 3),
            "height_in": round(s.page_height.inches, 3),
            "margins_in": {
                "left": round(s.left_margin.inches, 3),
                "right": round(s.right_margin.inches, 3),
                "top": round(s.top_margin.inches, 3),
                "bottom": round(s.bottom_margin.inches, 3),
            },
        })

    all_text = "\n".join(p["text"] for p in paragraphs)
    years = Counter(re.findall(r"\b(?:19|20)\d{2}\b", all_text))
    role_names = [
        "STAFFCABANG", "MANAGERCABANG", "DIVISIOCS", "DIVISIOS", "DIVISIOP",
        "DIVISIOT", "DIVISIUQ", "DIVISIHC", "DIVISIHT", "DIVISIESKALASI",
        "ANALYST", "SUPERADMIN", "SISTEM",
    ]
    roles = {r: len(re.findall(rf"\b{re.escape(r)}\b", all_text, flags=re.I)) for r in role_names}
    payload = {
        "source": str(Path(args.input).resolve()),
        "paragraph_count": len(paragraphs),
        "table_count": len(tables),
        "section_count": len(doc.sections),
        "inline_shapes": len(doc.inline_shapes),
        "style_counts": Counter(p["style"] for p in paragraphs),
        "year_counts": dict(sorted(years.items())),
        "role_counts": roles,
        "sections": section_data,
        "paragraphs": paragraphs,
        "tables": tables,
        "blocks": blocks,
    }
    Path(args.json).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    md = [
        f"# Ekstraksi {Path(args.input).name}",
        "",
        f"Paragraf: {len(paragraphs)} | Tabel: {len(tables)} | Bagian: {len(doc.sections)} | Inline shapes: {len(doc.inline_shapes)}",
        "",
        "## Isi berurutan",
        "",
    ]
    for b in blocks:
        if b["kind"] == "paragraph":
            text = b["text"].replace("\n", " ").strip()
            markers = []
            if b["drawings"]:
                markers.append(f"gambar={b['drawings']}")
            if b["equations"]:
                markers.append(f"rumus={b['equations']}")
            if b["field_instructions"]:
                markers.append("field=" + " | ".join(b["field_instructions"]))
            suffix = f" [{' ; '.join(markers)}]" if markers else ""
            md.append(f"P{b['index']:04d} [{b['style']}] {text}{suffix}")
        else:
            md.append("")
            md.append(f"### TABLE {b['index']} ({b['row_count']}x{b['col_count']})")
            for ridx, row in enumerate(b["rows"]):
                md.append(f"R{ridx}: " + " || ".join(cell.replace("\n", " / ") for cell in row))
            md.append("")
    Path(args.markdown).write_text("\n".join(md), encoding="utf-8")


if __name__ == "__main__":
    main()
