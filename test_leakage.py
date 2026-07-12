"""Guard against target leakage regressions. Run: python test_leakage.py"""
import pandas as pd
from preprocessor import prepare_classification

# Tiny synthetic sheet: the label column also exists as a context column.
_WORDS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel",
          "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa",
          "quebec", "romeo", "sierra", "tango"]
_df = pd.DataFrame({
    "Report":      [f"incident narrative {w} something happened" for w in _WORDS],
    "Report Category": (["Irregularity"] * 10) + (["Complaint"] * 10),
    "Root Caused": (["staff lalai human error"] * 10) + (["cargo penyok dented"] * 10),
    "Action Taken": ["followed up"] * 20,
})


def test_category_does_not_leak_its_own_label():
    X_serve, y, X_aug, X_raw = prepare_classification(
        _df, {"category": "Report Category", "description": "Report"},
        "category", min_samples_per_class=3)
    for name, series in (("X_serve", X_serve), ("X_aug", X_aug)):
        blob = " ".join(series.tolist())
        assert "__cat_irregularity__" not in blob, f"category leaked its label token in {name}"
        assert "__cat_complaint__" not in blob, f"category leaked its label token in {name}"


def test_root_cause_does_not_leak_source_column():
    schema = {"root_cause": "_rc", "description": "Report"}
    df = _df.copy()
    df["_rc"] = (["Human Error"] * 10) + (["Cargo Dented"] * 10)   # label derived from Root Caused
    X_serve, y, X_aug, X_raw = prepare_classification(df, schema, "root_cause", min_samples_per_class=3)
    for name, series in (("X_serve", X_serve), ("X_aug", X_aug)):
        blob = " ".join(series.tolist()).lower()
        assert "penyok" not in blob and "lalai" not in blob, \
            f"root_cause leaked its source 'Root Caused' text in {name}"


def test_aug_contains_investigation_text_for_category():
    # augmentation SHOULD carry investigation text for roles where it's not the label source
    X_serve, y, X_aug, X_raw = prepare_classification(
        _df, {"category": "Report Category", "description": "Report"},
        "category", min_samples_per_class=3)
    serve_blob = " ".join(X_serve.tolist()).lower()
    aug_blob = " ".join(X_aug.tolist()).lower()
    assert "penyok" not in serve_blob, "serve shape must not contain post-investigation text"
    assert "penyok" in aug_blob, "augmentation shape should contain investigation text"


if __name__ == "__main__":
    test_category_does_not_leak_its_own_label()
    test_root_cause_does_not_leak_source_column()
    test_aug_contains_investigation_text_for_category()
    print("leakage guards passed ✓")
