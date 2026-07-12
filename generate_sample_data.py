"""
Generates a realistic sample_data.csv for local testing without Google Sheets.
Run: python generate_sample_data.py
"""
import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

AIRLINES   = ["GA", "JT", "ID", "QG", "IW", "SJ", "IN"]
BRANCHES   = ["CGK", "SUB", "DPS", "BPN", "UPG", "MDC", "SOC", "PLM", "PKU", "KNO"]
STATUSES   = ["OPEN", "CLOSED", "PENDING", "CLOSED", "CLOSED", "RESOLVED"]  # weighted towards closed

CATEGORIES = {
    "Baggage": {
        "subcategories": ["Lost & Found", "Damaged Baggage", "Delayed Baggage", "Excess Baggage", "Misrouted Baggage"],
        "root_causes":   ["Human Error", "Conveyor Belt Malfunction", "Incorrect Tag", "Communication Failure", "High Volume"],
        "templates": [
            "Penumpang melaporkan koper tidak ditemukan di belt bagasi setelah penerbangan {flight}.",
            "Bagasi penumpang ditemukan rusak, handle patah dan zipper terbuka saat tiba di {branch}.",
            "Bagasi terlambat tiba, ketinggalan penerbangan sebelumnya akibat kapasitas berlebih.",
            "Penumpang membawa bagasi melebihi batas yang diizinkan tanpa deklarasi sebelumnya.",
            "Bagasi dikirim ke kota yang salah akibat kesalahan penempelan tag di counter check-in.",
        ],
    },
    "Ramp": {
        "subcategories": ["FOD Found", "Equipment Damage", "Unauthorized Access", "Spill/Leak", "Wing Clearance"],
        "root_causes":   ["Procedure Non-Compliance", "Equipment Malfunction", "Human Error", "External Factor", "Training Gap"],
        "templates": [
            "Ditemukan benda asing (FOD) berupa baut logam di area apron sebelum pushback pesawat {flight}.",
            "Terjadi benturan antara Ground Support Equipment (GSE) dan fuselage pesawat saat parking.",
            "Petugas tidak berkepentingan terdeteksi memasuki area restricted ramp tanpa izin.",
            "Tumpahan bahan bakar avtur terdeteksi di area apron setelah proses refueling selesai.",
            "Clearance sayap pesawat terlalu dekat dengan garbarata saat proses docking berlangsung.",
        ],
    },
    "Passenger": {
        "subcategories": ["Unruly Passenger", "Denied Boarding", "Special Assistance", "WCHR Request", "Deportee Handling"],
        "root_causes":   ["Communication Failure", "Policy Non-Compliance", "External Factor", "Human Error", "System Error"],
        "templates": [
            "Penumpang bersikap tidak kooperatif dan menolak mengikuti prosedur keamanan bandara.",
            "Penumpang ditolak boarding karena dokumen perjalanan tidak lengkap atau tidak valid.",
            "Permintaan kursi roda untuk penumpang berkebutuhan khusus tidak tertangani sesuai SOP.",
            "Penumpang deportasi memerlukan penanganan khusus sesuai prosedur imigrasi yang berlaku.",
            "Penumpang terlambat check-in melewati batas waktu yang ditentukan dan meminta pengecualian.",
        ],
    },
    "Documentation": {
        "subcategories": ["DCS Error", "Missing Manifest", "Weight & Balance Error", "Incorrect Boarding Pass", "No-Show Record"],
        "root_causes":   ["System Error", "Human Error", "Communication Failure", "Training Gap", "Procedure Non-Compliance"],
        "templates": [
            "Terjadi kesalahan input data penumpang pada sistem DCS sehingga boarding pass tidak valid.",
            "Manifest penumpang tidak lengkap saat diserahkan ke pihak kru sebelum keberangkatan.",
            "Terdapat selisih data berat muatan antara load sheet dan data aktual di bagasi hold.",
            "Boarding pass diterbitkan dengan gate yang salah sehingga menyebabkan kebingungan penumpang.",
            "Penumpang no-show tidak tercatat dengan benar sehingga bagasi tidak di-offload tepat waktu.",
        ],
    },
    "Equipment": {
        "subcategories": ["GPU Failure", "Pushback Delay", "Belt Loader Issue", "Catering Truck Delay", "Airbridge Malfunction"],
        "root_causes":   ["Equipment Malfunction", "Maintenance Overdue", "Human Error", "External Factor", "Procedure Non-Compliance"],
        "templates": [
            "GPU tidak berfungsi saat dibutuhkan untuk power pesawat sebelum APU start, menyebabkan delay.",
            "Pushback tractor mengalami kerusakan mendadak sehingga proses pushback terpaksa ditunda.",
            "Belt loader mengalami malfungsi di tengah proses loading bagasi, memperlambat keberangkatan.",
            "Catering truck terlambat tiba di pesawat sehingga menyebabkan keterlambatan keberangkatan.",
            "Garbarata tidak dapat bergerak normal saat proses docking akibat kerusakan motor penggerak.",
        ],
    },
}

def random_date(start_days_ago: int = 180) -> str:
    base = datetime.now() - timedelta(days=start_days_ago)
    offset = random.randint(0, start_days_ago)
    # More incidents on weekdays and peak hours
    return (base + timedelta(days=offset)).strftime("%Y-%m-%d")

def make_row(i: int) -> dict:
    airline  = random.choice(AIRLINES)
    branch   = random.choice(BRANCHES)
    category = random.choices(
        list(CATEGORIES.keys()),
        weights=[25, 20, 20, 15, 20],  # Baggage is most common
        k=1
    )[0]
    cat_data  = CATEGORIES[category]
    subcat    = random.choice(cat_data["subcategories"])
    root      = random.choice(cat_data["root_causes"])
    template  = random.choice(cat_data["templates"])
    flight_no = f"{airline}{random.randint(100, 999)}"
    status    = random.choice(STATUSES)

    description = template.format(flight=flight_no, branch=branch)
    # Add some variation in length
    if random.random() > 0.5:
        extras = [
            f"Kejadian terjadi pada pukul {random.randint(5,22):02d}:{random.choice(['00','15','30','45'])} WIB.",
            f"Petugas yang bertugas langsung melaporkan ke supervisor shift.",
            f"Tindakan awal telah dilakukan sesuai prosedur standar operasional yang berlaku.",
            f"Dokumentasi telah disiapkan untuk proses investigasi lebih lanjut.",
        ]
        description += " " + random.choice(extras)

    return {
        "tanggal":           random_date(),
        "maskapai":          airline,
        "nomor_penerbangan": flight_no,
        "cabang":            branch,
        "area":              random.choice(["Terminal 1", "Terminal 2", "Terminal 3", "Apron", "Airside", "Landside"]),
        "kategori":          category,
        "uraian_kejadian":   description,
        "akar_masalah":      root,
        "subkategori":       subcat,
        "status":            status,
    }


def generate(n: int = 200, output: str = "sample_data.csv") -> None:
    rows = [make_row(i) for i in range(n)]
    # Sort by date for realistic time-series ordering
    rows.sort(key=lambda r: r["tanggal"])

    out = Path(output)
    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {n} rows → {out.resolve()}")
    print(f"Columns: {list(rows[0].keys())}")

    # Print category distribution
    from collections import Counter
    cats = Counter(r["kategori"] for r in rows)
    print("\nCategory distribution:")
    for cat, count in cats.most_common():
        print(f"  {cat}: {count}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=200, help="Number of rows to generate")
    parser.add_argument("--output", default="sample_data.csv", help="Output file path")
    args = parser.parse_args()
    generate(args.n, args.output)
