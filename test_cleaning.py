"""Data hygiene & self-healing canonicalization guards. Run: python test_cleaning.py"""
import pandas as pd

from canonicalize import build_entity_mapping, build_label_mapping, consolidate_labels
from config import today
from data_fetcher import clean_dataframe, enrich_dataframe


def _mk_df(**overrides):
    base = {
        "Date of Event": ["January 25, 2025", "March 3, 2025", "December 1, 2099", "April 1, 2025"],
        "Airlines": ["Garuda Indonesia", "TEST", "Garuda Indonesia", "IndiGO"],
        "Station": ["CGK", "TEST", "DPS", "CGK"],
        "Area": ["Apron Area", "TEST", "APRON", "Terminal Area"],
        "Status": ["CLOSED", "TEST", "OPEN", "CLOSED"],
        "Report Category": ["Irregularity", "Test", "Complaint", "Complaint"],
        "Report": ["GSE menabrak pesawat", "TEST", "kargo penyok", "bagasi hilang"],
    }
    base.update(overrides)
    return pd.DataFrame(base)


def test_test_rows_dropped():
    out = clean_dataframe(_mk_df())
    assert not (out["Airlines"].astype(str).str.upper() == "TEST").any()
    assert len(out) == 2  # TEST row and future-dated row both gone


def test_future_dates_dropped():
    out = clean_dataframe(_mk_df())
    assert "December 1, 2099" not in set(out["Date of Event"])


def test_airline_canonicalization_handles_novel_variants():
    # variants never listed in any static map must still merge
    s = pd.Series(["Garuda Indonesia"] * 10 + ["garuda indonesia", "Garuda  Indonesia",
                                               "Qatar Airways", "Qatar  airways"])
    m = build_entity_mapping(s)
    assert m.get("garuda indonesia") == "Garuda Indonesia"
    assert m.get("Garuda  Indonesia") == "Garuda Indonesia"
    assert m.get("Qatar  airways") == "Qatar Airways"


def test_airline_fuzzy_does_not_merge_distinct_carriers():
    s = pd.Series(["Lion Air"] * 5 + ["Wings Air"] * 3 + ["Batik Air"] * 3 + ["AirAsia"] * 2)
    m = build_entity_mapping(s)
    assert m == {}, f"distinct carriers wrongly merged: {m}"


def test_area_canonicalization():
    out = clean_dataframe(_mk_df())
    assert "APRON" not in set(out["Area"])
    assert "Apron Area" in set(out["Area"])


def test_label_typo_and_suffix_merge():
    y = pd.Series(
        ["Accuracy & Completeness of Service"] * 10
        + ["Accurancy & Completeness of Service (Apron)"] * 2
        + ["Safety and Security"] * 8
        + ["Safety and Security (General)"] * 2
    )
    m = build_label_mapping(y, min_samples=8)
    assert m.get("Accurancy & Completeness of Service (Apron)") == "Accuracy & Completeness of Service"
    assert m.get("Safety and Security (General)") == "Safety and Security"


def test_label_containment_rescues_only_tail_classes():
    y = pd.Series(
        ["Baggage/Special/Irregularities Handling"] * 20
        + ["Baggage Handling"] * 2          # below min → rescued via containment
        + ["Boarding Management"] * 10      # big enough → must NOT be merged
    )
    out = consolidate_labels(y, min_samples=8)
    vc = out.value_counts()
    assert vc["Baggage/Special/Irregularities Handling"] == 22
    assert vc["Boarding Management"] == 10
    assert "Baggage Handling" not in vc


def test_root_cause_rules_recover_english_narratives():
    df = pd.DataFrame({
        "Root Caused": [
            "a mechanical malfunction occurred with the baggage towing tractor (btt)",
            "lack of awareness dari tim porter make up saat proses loading",
            "bagasi masih belum ditemukan",
            "indikasi manipulasi berat bagasi dengan menukar label",
            "unserviceable vacuum while handling cabin cleaning",
            "-",
        ],
    })
    out = enrich_dataframe(df)
    labels = out["_root_cause_clustered"].tolist()
    assert labels[0] == "Equipment Issue"
    assert labels[1] == "Human Error"
    assert labels[2] == "Lost / Missing"
    assert labels[3] == "Security Issue"
    assert labels[4] == "Equipment Issue"
    assert pd.isna(labels[5])  # noise stays unlabeled — never fabricate


def test_today_is_tz_anchored():
    t = today()
    assert t == t.normalize()
    assert t.tzinfo is None  # naive, comparable with sheet dates


if __name__ == "__main__":
    test_test_rows_dropped()
    test_future_dates_dropped()
    test_airline_canonicalization_handles_novel_variants()
    test_airline_fuzzy_does_not_merge_distinct_carriers()
    test_area_canonicalization()
    test_label_typo_and_suffix_merge()
    test_label_containment_rescues_only_tail_classes()
    test_root_cause_rules_recover_english_narratives()
    test_today_is_tz_anchored()
    print("cleaning & canonicalization guards passed ✓")
