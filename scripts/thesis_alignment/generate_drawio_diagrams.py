#!/usr/bin/env python3
"""Generate editable Draw.io sources for the corrected thesis diagrams.

The generator deliberately uses fixed geometry instead of automatic layout so the
exports remain stable and readable when inserted at A4 width.
"""

from __future__ import annotations

import html
import sys
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


FONT = "Helvetica"
BLUE = "#0B5CAD"
LIGHT_BLUE = "#EAF3FB"
GREEN = "#E8F5E9"
ORANGE = "#FFF3E0"
PURPLE = "#F3E5F5"
GRAY = "#F5F7FA"
DARK = "#243447"


def esc(value: str) -> str:
    return html.escape(value, quote=True)


@dataclass
class Page:
    name: str
    width: int = 1600
    height: int = 900

    def __post_init__(self):
        self.root = ET.Element("mxGraphModel", {
            "dx": "1600", "dy": "900", "grid": "1", "gridSize": "10",
            "guides": "1", "tooltips": "1", "connect": "1", "arrows": "1",
            "fold": "1", "page": "1", "pageScale": "1",
            "pageWidth": str(self.width), "pageHeight": str(self.height),
            "math": "0", "shadow": "0", "background": "#FFFFFF",
        })
        r = ET.SubElement(self.root, "root")
        ET.SubElement(r, "mxCell", {"id": "0"})
        ET.SubElement(r, "mxCell", {"id": "1", "parent": "0"})
        self.cells = r
        self.seq = 1

    def _id(self, prefix="c"):
        self.seq += 1
        return f"{prefix}{self.seq}"

    def vertex(self, value, x, y, w, h, style, ident=None):
        ident = ident or self._id("v")
        cell = ET.SubElement(self.cells, "mxCell", {
            "id": ident, "value": value, "style": style,
            "vertex": "1", "parent": "1",
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(x), "y": str(y), "width": str(w), "height": str(h),
            "as": "geometry",
        })
        return ident

    def edge(self, source, target, label="", style=None, points=None, ident=None):
        ident = ident or self._id("e")
        style = style or (
            "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;"
            "jettySize=auto;html=1;strokeColor=#607D8B;strokeWidth=2;"
            "endArrow=block;endFill=1;fontSize=14;fontFamily=Helvetica;"
            "labelBackgroundColor=#FFFFFF;"
        )
        cell = ET.SubElement(self.cells, "mxCell", {
            "id": ident, "value": label, "style": style,
            "edge": "1", "parent": "1", "source": source, "target": target,
        })
        geom = ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})
        if points:
            arr = ET.SubElement(geom, "Array", {"as": "points"})
            for x, y in points:
                ET.SubElement(arr, "mxPoint", {"x": str(x), "y": str(y)})
        return ident

    def text(self, value, x, y, w, h, size=18, bold=False, align="left", color=DARK):
        return self.vertex(value, x, y, w, h,
            f"text;html=1;strokeColor=none;fillColor=none;align={align};"
            f"verticalAlign=middle;whiteSpace=wrap;overflow=hidden;fontFamily={FONT};"
            f"fontSize={size};fontColor={color};fontStyle={'1' if bold else '0'};")

    def title(self, title, subtitle):
        self.text(esc(title), 55, 25, self.width - 110, 42, 26, True, "center", BLUE)
        self.text(esc(subtitle), 80, 70, self.width - 160, 30, 14, False, "center", "#52616B")

    def box(self, value, x, y, w, h, fill=LIGHT_BLUE, stroke=BLUE, size=16,
            rounded=True, bold=False, ident=None):
        return self.vertex(esc(value).replace("\n", "<br>"), x, y, w, h,
            f"rounded={'1' if rounded else '0'};whiteSpace=wrap;html=1;overflow=hidden;"
            f"fillColor={fill};strokeColor={stroke};strokeWidth=2;align=center;"
            f"verticalAlign=middle;fontFamily={FONT};fontSize={size};fontColor={DARK};"
            f"fontStyle={'1' if bold else '0'};spacing=8;", ident)

    def actor(self, label, x, y, ident=None):
        return self.vertex(esc(label).replace("\n", "<br>"), x, y, 110, 120,
            "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;"
            "whiteSpace=wrap;overflow=hidden;strokeColor=#37474F;fillColor=#FFFFFF;"
            "fontFamily=Helvetica;fontSize=14;fontColor=#243447;", ident)


def entity(page, name, x, y, attrs, ident):
    ent = page.vertex(esc(name).replace("\n", "<br>"), x, y, 210, 62,
        "rounded=0;whiteSpace=wrap;html=1;overflow=hidden;fillColor=#EAF3FB;"
        "strokeColor=#0B5CAD;strokeWidth=2.5;fontFamily=Helvetica;fontSize=17;"
        "fontStyle=1;fontColor=#243447;align=center;verticalAlign=middle;", ident)
    # Attribute ovals are laid out in a compact fan above/below the entity.
    positions = [(-30, -95), (105, -95), (-30, 78), (105, 78)]
    for idx, (label, primary) in enumerate(attrs[:4]):
        dx, dy = positions[idx]
        val = f"<u>{esc(label)}</u>" if primary else esc(label)
        aid = page.vertex(val, x + dx, y + dy, 95, 42,
            "ellipse;whiteSpace=wrap;html=1;overflow=hidden;fillColor=#FFFFFF;"
            "strokeColor=#78909C;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;"
            "fontColor=#243447;align=center;verticalAlign=middle;")
        page.edge(aid, ent, "", "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;"
                  "strokeColor=#90A4AE;strokeWidth=1.2;endArrow=none;startArrow=none;")
    return ent


def relationship(page, label, x, y, source, target, left_card="1", right_card="N",
                 logical=False):
    rid = page.vertex(esc(label), x, y, 100, 64,
        "rhombus;whiteSpace=wrap;html=1;overflow=hidden;fillColor=#FFF3E0;"
        "strokeColor=#F57C00;strokeWidth=2;fontFamily=Helvetica;fontSize=12;"
        "fontStyle=1;fontColor=#5D4037;align=center;verticalAlign=middle;")
    dash = "dashed=1;dashPattern=5 5;" if logical else ""
    base = "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#607D8B;strokeWidth=2;endArrow=none;startArrow=none;labelBackgroundColor=#FFFFFF;fontSize=13;" + dash
    page.edge(source, rid, "", base)
    page.edge(rid, target, "", base)
    return rid


def make_erd():
    p = Page("01 ERD Chen", 1800, 1040)
    p.title("Entity Relationship Diagram — Notasi Chen",
            "Sumber: metadata skema live Supabase gapura-irrs, diamati 18 Juli 2026; garis putus-putus = asosiasi logis aplikasi")
    station = entity(p, "STATIONS", 70, 220, [("id", True), ("code", False), ("name", False)], "station")
    users = entity(p, "USERS", 620, 220, [("id", True), ("email", False), ("role", False), ("division", False)], "users")
    sec = entity(p, "SECURITY\nSESSIONS", 1320, 220, [("id", True), ("session_id", False), ("expires_at", False)], "sec")
    evidence_session = entity(p, "EVIDENCE UPLOAD\nSESSIONS", 70, 710, [("id", True), ("mode", False), ("status", False)], "evs")
    evidence_file = entity(p, "EVIDENCE FILES", 440, 710, [("id", True), ("original_name", False), ("drive_file_id", False)], "evf")
    comments = entity(p, "REPORT COMMENTS", 620, 710, [("id", True), ("report_id", False), ("content", False)], "comments")
    reports = entity(p, "GROUND HANDLING\nIRREGULARITY REPORT", 1320, 710, [("id", True), ("sheet_id", False), ("status", False), ("category", False)], "reports")
    relationship(p, "berlokasi", 365, 220, station, users, "1", "0..N")
    relationship(p, "memiliki", 1050, 220, users, sec, "1", "0..N")
    relationship(p, "membuka", 330, 706, evidence_session, evidence_file, "1", "1..N")
    relationship(p, "mengunggah", 365, 470, users, evidence_session, "1", "0..N")
    relationship(p, "menulis", 675, 470, users, comments, "1", "0..N")
    relationship(p, "mengajukan", 1050, 470, users, reports, "1", "0..N")
    relationship(p, "dikomentari", 1050, 706, comments, reports, "0..N", "1", logical=True)
    # Cardinalities are separate labels so they never collide with the diamonds.
    for label, x, y in [
        ("1", 300, 235), ("0..N", 550, 235),
        ("1", 870, 235), ("0..N", 1240, 235),
        ("1", 286, 730), ("1..N", 420, 730),
        ("1", 690, 390), ("0..N", 250, 600),
        ("1", 780, 390), ("0..N", 790, 630),
        ("1", 940, 390), ("0..N", 1525, 600),
        ("0..N", 920, 730), ("1", 1240, 730),
    ]:
        p.text(label, x, y, 55, 24, 12, False, "center", "#37474F")
    p.text("PK digarisbawahi • Relasi solid berasal dari foreign key live • REPORT_COMMENTS.report_id berjenis text dan diperlakukan sebagai asosiasi logis.",
           120, 985, 1560, 28, 13, False, "center", "#52616B")
    return p


def table_box(p, name, rows, x, y, w=300, ident=None):
    row_h = 29
    h = 42 + row_h * len(rows)
    ident = ident or name.lower()
    head = p.vertex(esc(name), x, y, w, 42,
        "rounded=1;arcSize=8;whiteSpace=wrap;html=1;overflow=hidden;fillColor=#0B5CAD;"
        "strokeColor=#0B5CAD;strokeWidth=2;fontFamily=Helvetica;fontSize=16;"
        "fontStyle=1;fontColor=#FFFFFF;align=center;verticalAlign=middle;", ident)
    body = "<table style='width:100%;border-collapse:collapse;font-family:Helvetica;font-size:12px'>" + "".join(
        f"<tr><td style='padding:4px 7px;border-bottom:1px solid #D7E3EC'>{r}</td></tr>" for r in rows
    ) + "</table>"
    p.vertex(body, x, y + 42, w, row_h * len(rows),
        "rounded=0;whiteSpace=wrap;html=1;overflow=hidden;fillColor=#FFFFFF;"
        "strokeColor=#0B5CAD;strokeWidth=2;align=left;verticalAlign=top;spacing=0;")
    return head


def make_lrs():
    p = Page("02 LRS", 1800, 1040)
    p.title("Logical Record Structure",
            "Tabel dan relasi terpilih dari skema live Supabase; asosiasi aplikasi tanpa FK ditandai garis putus-putus")
    boxes = {}
    boxes['stations'] = table_box(p, "stations", ["<b>PK</b> id : text", "UQ code : text", "name : text"], 60, 145, 320, "l_station")
    boxes['users'] = table_box(p, "users", ["<b>PK</b> id : uuid", "UQ email : text", "role : text?", "division : text?", "<b>FK</b> station_id → stations.id"], 620, 130, 350, "l_users")
    boxes['security'] = table_box(p, "security_sessions", ["<b>PK</b> id : uuid", "UQ session_id : text", "<b>FK</b> user_id → users.id", "expires_at : timestamptz", "is_revoked : boolean"], 1260, 130, 350, "l_sec")
    boxes['evs'] = table_box(p, "evidence_upload_sessions", ["<b>PK</b> id : text", "<b>FK</b> user_id → users.id?", "mode : text", "status : text", "expires_at : timestamptz"], 60, 470, 350, "l_evs")
    boxes['reports'] = table_box(p, "ground_handling_irregularity_report", ["<b>PK</b> id : uuid", "UQ sheet_id : text", "<b>FK</b> user_id → users.id?", "status/category : text?", "target_division : text?", "synced_at : timestamptz?"], 620, 470, 390, "l_reports")
    boxes['comments'] = table_box(p, "report_comments", ["<b>PK</b> id : uuid", "report_id : text", "<b>FK</b> user_id → users.id?", "content : text", "created_at : timestamptz?"], 1260, 470, 350, "l_comments")
    boxes['evf'] = table_box(p, "evidence_files", ["<b>PK</b> id : uuid", "<b>FK</b> session_id → sessions.id", "<b>FK</b> user_id → users.id?", "UQ google_drive_file_id", "original_name : text"], 60, 790, 350, "l_evf")
    solid = "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#607D8B;strokeWidth=2;endArrow=block;endFill=1;labelBackgroundColor=#FFFFFF;fontSize=12;"
    dashed = solid + "dashed=1;dashPattern=5 5;"
    p.edge(boxes['users'], boxes['stations'], "N:1", solid, [(520, 110)])
    p.edge(boxes['security'], boxes['users'], "N:1", solid, [(1110, 110)])
    p.edge(boxes['evs'], boxes['users'], "N:1", solid, [(520, 430), (520, 330)])
    p.edge(boxes['evf'], boxes['evs'], "N:1", solid)
    p.edge(boxes['evf'], boxes['users'], "N:1", solid, [(480, 900), (480, 350)])
    p.edge(boxes['reports'], boxes['users'], "N:1", solid)
    p.edge(boxes['comments'], boxes['users'], "N:1", solid, [(1120, 430), (1120, 330)])
    p.edge(boxes['comments'], boxes['reports'], "asosiasi report_id", dashed)
    p.text("Tanda ? menunjukkan kolom nullable. Relasi solid = foreign key live.", 80, 960, 1640, 28, 13, False, "center", "#52616B")
    return p


def make_architecture():
    p = Page("03 Arsitektur", 1600, 900)
    p.title("Arsitektur Sistem dan Integrasi Pipeline AI", "Alur transaksi, sinkronisasi, bukti, dokumen final, ML, dan RAG")
    browser = p.box("Pengguna\nBrowser", 60, 350, 170, 90, GRAY, "#546E7A", 17, True, True, "browser")
    app = p.box("Gapura OneClick\nNext.js + API Routes", 310, 315, 240, 160, LIGHT_BLUE, BLUE, 18, True, True, "app")
    sheets = p.box("Google Sheets\npenulisan laporan pertama", 680, 160, 250, 105, GREEN, "#2E7D32", 17, True, True, "sheets")
    supa = p.box("Supabase PostgreSQL\nsinkronisasi metadata/read model\nusers • sessions • comments • audit", 680, 350, 270, 145, LIGHT_BLUE, BLUE, 15, True, True, "supa")
    drive = p.box("Google Drive\nbukti laporan", 680, 600, 250, 90, ORANGE, "#F57C00", 17, True, True, "drive")
    storage = p.box("Supabase Storage\nDOCX/PDF final", 1040, 600, 240, 90, PURPLE, "#7B1FA2", 17, True, True, "storage")
    ml = p.box("ML Service (FastAPI)\nklasifikasi • forecast • risiko", 1090, 170, 300, 110, GREEN, "#2E7D32", 16, True, True, "ml")
    rag = p.box("Gapura RAG (FastAPI)\nretrieval • reranking • jawaban\nsumber + halaman", 1090, 350, 300, 130, PURPLE, "#7B1FA2", 16, True, True, "rag")
    p.edge(browser, app, "HTTPS")
    p.edge(app, sheets, "1. append laporan")
    p.edge(sheets, supa, "2. sinkron metadata")
    p.edge(app, supa, "auth, read, komentar, sesi")
    p.edge(app, drive, "unggah bukti")
    p.edge(app, storage, "dokumen final")
    p.edge(app, ml, "API berautentikasi")
    p.edge(ml, sheets, "baca data operasional")
    p.edge(app, rag, "session + kuota 5/hari")
    p.text("Catatan: Supabase bukan tujuan write-first laporan; akses dokumen per divisi belum ditanamkan dalam metadata chunk RAG.",
           120, 810, 1360, 38, 14, False, "center", "#8A4B08")
    return p


def make_usecase():
    p = Page("04 Use Case", 1800, 1050)
    p.title("Use Case Diagram Keseluruhan Sistem", "OS, OP, HT, UQ, dan OT tetap terpisah dengan hak yang setara; OCS memiliki workspace tersendiri")
    staff = p.actor("STAFF_\nCABANG", 50, 130, "staff")
    manager = p.actor("MANAGER_\nCABANG", 205, 130, "manager")
    divs = []
    for i, (lab, x) in enumerate(zip(["DIVISI_\nOS","DIVISI_\nOP","DIVISI_\nHT","DIVISI_\nUQ","DIVISI_\nOT"], [470,610,750,890,1030])):
        divs.append(p.actor(lab, x, 130, f"div{i}"))
    ocs = p.actor("DIVISI_\nOCS", 1240, 130, "ocs")
    analyst = p.actor("ANALYST", 1430, 130, "analyst")
    admin = p.actor("SUPER_\nADMIN", 1620, 130, "admin")
    p.vertex("", 30, 330, 1740, 650,
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FBFCFE;strokeColor=#90A4AE;"
        "strokeWidth=2;dashed=1;dashPattern=8 4;")
    p.text("Gapura OneClick", 690, 345, 420, 35, 20, True, "center", BLUE)
    ellipse = "ellipse;whiteSpace=wrap;html=1;overflow=hidden;strokeWidth=2;fontSize=15;fontFamily=Helvetica;"
    u_submit = p.vertex("Ajukan laporan + bukti", 55, 430, 250, 64, ellipse+"fillColor=#E8F5E9;strokeColor=#2E7D32;")
    u_own = p.vertex("Pantau laporan milik sendiri", 55, 555, 250, 64, ellipse+"fillColor=#EAF3FB;strokeColor=#0B5CAD;")
    u_branch = p.vertex("Pantau laporan cabang", 55, 710, 250, 64, ellipse+"fillColor=#EAF3FB;strokeColor=#0B5CAD;")
    u_approve = p.vertex("Setujui akun staf", 55, 835, 250, 64, ellipse+"fillColor=#FFF3E0;strokeColor=#F57C00;")
    panel = p.vertex("", 400, 405, 720, 500, "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#0B5CAD;strokeWidth=2;")
    p.text("Hak setara tiap peran (tetap lima aktor terpisah)", 450, 425, 620, 35, 17, True, "center", BLUE)
    u_monitor = p.vertex("Pantau laporan & dashboard", 505, 500, 510, 64, ellipse+"fillColor=#EAF3FB;strokeColor=#0B5CAD;")
    u_follow = p.vertex("Komentar / tindak lanjut", 505, 610, 510, 64, ellipse+"fillColor=#FFF3E0;strokeColor=#F57C00;")
    u_ai = p.vertex("Analisis AI", 505, 720, 240, 64, ellipse+"fillColor=#F3E5F5;strokeColor=#7B1FA2;")
    u_rag = p.vertex("Asisten virtual RAG", 775, 720, 240, 64, ellipse+"fillColor=#F3E5F5;strokeColor=#7B1FA2;")
    u_ocs = p.vertex("Kelola workspace OCS", 1220, 430, 260, 64, ellipse+"fillColor=#E8F5E9;strokeColor=#2E7D32;")
    u_ocs_rag = p.vertex("Asisten virtual RAG", 1220, 555, 260, 64, ellipse+"fillColor=#F3E5F5;strokeColor=#7B1FA2;")
    u_analyst = p.vertex("Analisis lintas cabang", 1490, 680, 240, 64, ellipse+"fillColor=#F3E5F5;strokeColor=#7B1FA2;")
    u_admin = p.vertex("Kelola pengguna, sesi, audit", 1490, 835, 240, 64, ellipse+"fillColor=#EAF3FB;strokeColor=#0B5CAD;")
    assoc = "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#607D8B;strokeWidth=1.5;endArrow=none;startArrow=none;"
    p.edge(staff, u_submit, "", assoc)
    p.edge(staff, u_own, "", assoc, [(350, 350), (350, 585)])
    p.edge(manager, u_branch, "", assoc)
    p.edge(manager, u_approve, "", assoc, [(365, 350), (365, 865)])
    for i, a in enumerate(divs):
        x = 525 + i*140
        anchor = p.vertex("", x, 395, 10, 10, "ellipse;html=1;fillColor=#0B5CAD;strokeColor=#0B5CAD;")
        p.edge(a, anchor, "", assoc)
    p.edge(ocs, u_ocs, "", assoc)
    p.edge(ocs, u_ocs_rag, "", assoc, [(1175, 350), (1175, 585)])
    p.edge(analyst, u_analyst, "", assoc)
    p.edge(admin, u_admin, "", assoc)
    return p


def activity_page(name, title, lanes, steps, decisions=None):
    p = Page(name, 1600, 950)
    p.title(title, "Alur disesuaikan dengan implementasi aplikasi saat ini")
    lane_w = 1400 / len(lanes)
    x0, y0, h = 100, 140, 700
    for i, lane in enumerate(lanes):
        x = x0 + i * lane_w
        p.vertex(esc(lane), x, y0, lane_w, 52,
            "rounded=0;whiteSpace=wrap;html=1;overflow=hidden;fillColor=#0B5CAD;strokeColor=#0B5CAD;strokeWidth=2;fontSize=15;fontStyle=1;fontColor=#FFFFFF;fontFamily=Helvetica;")
        p.vertex("", x, y0 + 52, lane_w, h - 52,
            "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#90A4AE;strokeWidth=1;")
    nodes = []
    for idx, (lane_idx, label, y, kind) in enumerate(steps):
        x = x0 + lane_idx * lane_w + (lane_w - 220) / 2
        if kind == "start":
            nid = p.vertex("", x + 90, y, 36, 36, "ellipse;html=1;fillColor=#263238;strokeColor=#263238;")
        elif kind == "end":
            nid = p.vertex("", x + 87, y, 42, 42, "ellipse;html=1;fillColor=#FFFFFF;strokeColor=#263238;strokeWidth=3;perimeter=ellipsePerimeter;")
            p.vertex("", x + 98, y + 11, 20, 20, "ellipse;html=1;fillColor=#263238;strokeColor=#263238;")
        elif kind == "decision":
            nid = p.vertex(esc(label), x + 55, y, 110, 74, "rhombus;whiteSpace=wrap;html=1;overflow=hidden;fillColor=#FFF3E0;strokeColor=#F57C00;strokeWidth=2;fontSize=13;fontFamily=Helvetica;")
        else:
            nid = p.box(label, x, y, 220, 64, LIGHT_BLUE if lane_idx else GREEN, BLUE if lane_idx else "#2E7D32", 14, True, False)
        nodes.append(nid)
    for i in range(len(nodes)-1):
        label = decisions.get(i, "") if decisions else ""
        p.edge(nodes[i], nodes[i+1], label)
    return p


def make_activities():
    login = activity_page("05 Activity Login", "Activity Diagram — Login",
        ["Pengguna", "Gapura OneClick", "PostgreSQL"],
        [(0,"",210,"start"),(0,"Isi email dan kata sandi",280,"action"),(1,"Validasi format & rate limit",380,"action"),(2,"Cari user + verifikasi bcrypt",480,"action"),(1,"Kredensial valid?",580,"decision"),(2,"Buat security_session",690,"action"),(0,"",790,"end")], {4:"ya"})
    submit = activity_page("06 Activity Pengajuan", "Activity Diagram — Pengajuan Laporan",
        ["Pelapor", "Gapura OneClick", "Google Drive", "Google Sheets", "Supabase"],
        [(0,"",190,"start"),(0,"Isi formulir & pilih bukti",250,"action"),(1,"Validasi payload",340,"action"),(2,"Unggah bukti",430,"action"),(3,"Append baris laporan",520,"action"),(4,"Sinkron metadata best-effort",610,"action"),(1,"Tampilkan hasil pengajuan",700,"action"),(0,"",790,"end")])
    approval = activity_page("07 Activity Persetujuan", "Activity Diagram — Persetujuan Akun Staf",
        ["MANAGER_CABANG / SUPER_ADMIN", "Gapura OneClick", "PostgreSQL"],
        [(0,"",190,"start"),(0,"Buka daftar akun pending",250,"action"),(1,"Periksa peran & cakupan",340,"action"),(0,"Pilih setujui / tolak",430,"action"),(1,"Otorisasi valid?",520,"decision"),(2,"Perbarui status akun",630,"action"),(1,"Catat aktivitas & respons",720,"action"),(0,"",810,"end")], {4:"ya"})
    ai = activity_page("08 Activity AI", "Activity Diagram — Analisis AI dan RAG",
        ["Pengguna Terautentikasi", "Gapura OneClick", "ML Service / Gapura RAG"],
        [(0,"",190,"start"),(0,"Pilih analisis / ajukan pertanyaan",250,"action"),(1,"Validasi sesi dan input",340,"action"),(1,"RAG? cek kuota 5/hari",430,"decision"),(2,"Jalankan inferensi / retrieval",540,"action"),(2,"Kembalikan hasil + sumber",640,"action"),(1,"Tampilkan hasil untuk diverifikasi",730,"action"),(0,"",820,"end")], {3:"lolos"})
    return [login, submit, approval, ai]


def sequence_page(name, title, participants, messages, notes=None):
    p = Page(name, 1800, 980)
    p.title(title, "Urutan interaksi berdasarkan rute dan layanan yang diimplementasikan")
    # Keep participant boxes comfortably inside the exported canvas so the
    # rightmost lifeline remains fully visible after Word scales the image.
    xs = [220 + i * (1360 / max(1, len(participants)-1)) for i in range(len(participants))]
    ids = []
    for i, (lab, x) in enumerate(zip(participants, xs)):
        ids.append(p.box(lab, x-90, 140, 180, 60, LIGHT_BLUE, BLUE, 14, True, True, f"part{i}"))
        p.vertex("", x-1, 200, 2, 650, "shape=line;html=1;strokeColor=#90A4AE;strokeWidth=1;dashed=1;dashPattern=6 4;")
    y = 245
    for src, dst, label, ret in messages:
        style = "edgeStyle=none;rounded=0;html=1;strokeColor=#37474F;strokeWidth=1.8;endArrow=" + ("open" if ret else "block") + ";endFill=" + ("0" if ret else "1") + ";dashed=" + ("1" if ret else "0") + ";fontSize=13;fontFamily=Helvetica;labelBackgroundColor=#FFFFFF;"
        e = ET.SubElement(p.cells, "mxCell", {"id": p._id("m"), "value": esc(label), "style": style, "edge":"1", "parent":"1"})
        g = ET.SubElement(e, "mxGeometry", {"relative":"1", "as":"geometry"})
        ET.SubElement(g, "mxPoint", {"x":str(xs[src]), "y":str(y), "as":"sourcePoint"})
        ET.SubElement(g, "mxPoint", {"x":str(xs[dst]), "y":str(y), "as":"targetPoint"})
        y += 62
    if notes:
        p.box(notes, 1130, 830, 500, 80, ORANGE, "#F57C00", 13, True, False)
    return p


def make_sequences():
    login = sequence_page("09 Sequence Login", "Sequence Diagram — Login",
        ["Pengguna","Next.js Login","User Service","PostgreSQL","Cookie/Sesi"],
        [(0,1,"POST kredensial",False),(1,2,"validasi + rate limit",False),(2,3,"SELECT user",False),(3,2,"record user",True),(2,2,"bcrypt.compare",False),(2,3,"INSERT security_session",False),(2,4,"set JWT cookie",False),(1,0,"redirect sesuai role",True)])
    submit = sequence_page("10 Sequence Pengajuan", "Sequence Diagram — Pengajuan Laporan",
        ["Pelapor","Next.js API","Google Drive","Google Sheets","Supabase PostgreSQL"],
        [(0,1,"kirim formulir + bukti",False),(1,2,"unggah bukti",False),(2,1,"file_id + URL",True),(1,3,"append report",False),(3,1,"sheet_id",True),(1,4,"upsert metadata (best-effort)",False),(4,1,"hasil sinkronisasi",True),(1,0,"status pengajuan",True)],
        "Jika sinkronisasi Supabase gagal, laporan yang sudah ditulis ke Google Sheets tidak dibatalkan.")
    approval = sequence_page("11 Sequence Persetujuan", "Sequence Diagram — Persetujuan Akun Staf",
        ["Manager/Admin","Halaman Persetujuan","API approve-staff","PostgreSQL","Audit"],
        [(0,1,"pilih akun pending",False),(1,2,"POST keputusan",False),(2,3,"cek aktor + scope",False),(3,2,"otorisasi",True),(2,3,"UPDATE status user",False),(2,4,"catat aktivitas",False),(2,1,"hasil",True),(1,0,"status terbaru",True)])
    ai = sequence_page("12 Sequence AI", "Sequence Diagram — Analisis AI dan RAG",
        ["Pengguna","OneClick API","Auth/Quota","ML Service","Gapura RAG"],
        [(0,1,"analisis teks / pertanyaan",False),(1,2,"validasi sesi",False),(2,1,"izin + quota",True),(1,3,"POST /analyze (bila analitik)",False),(3,1,"klasifikasi/forecast/risiko",True),(1,4,"query RAG (bila asisten)",False),(4,1,"jawaban + sumber/halaman",True),(1,0,"tampilkan untuk verifikasi",True)],
        "RAG tidak mengklaim ACL dokumen per divisi karena metadata chunk saat ini belum memuat kontrol tersebut.")
    return [login, submit, approval, ai]


def diagram_xml(page: Page) -> ET.Element:
    diag = ET.Element("diagram", {"id": uuid.uuid4().hex[:12], "name": page.name})
    diag.append(page.root)
    return diag


def write_drawio(pages, path):
    root = ET.Element("mxfile", {
        "host":"Electron", "modified":"2026-07-18T00:00:00.000Z",
        "agent":"Codex thesis alignment", "version":"30.3.6", "type":"device",
    })
    for page in pages:
        root.append(diagram_xml(page))
    ET.indent(root, space="  ")
    ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)


def main(argv):
    out = Path(argv[1] if len(argv) > 1 else "output/skripsi-system-alignment/diagrams/source")
    out.mkdir(parents=True, exist_ok=True)
    pages = [make_erd(), make_lrs(), make_architecture(), make_usecase(), *make_activities(), *make_sequences()]
    names = [
        "01-erd-chen", "02-lrs", "03-architecture", "04-use-case",
        "05-activity-login", "06-activity-report-submission", "07-activity-staff-approval",
        "08-activity-ai-analysis", "09-sequence-login", "10-sequence-report-submission",
        "11-sequence-staff-approval", "12-sequence-ai-analysis",
    ]
    for page, name in zip(pages, names):
        write_drawio([page], out / f"{name}.drawio")
    write_drawio(pages, out / "Gapura_System_Diagrams.drawio")
    print(f"generated {len(pages)} diagrams in {out}")


if __name__ == "__main__":
    main(sys.argv)
