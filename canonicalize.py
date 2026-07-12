"""
Self-healing entity & label canonicalization.

The sheet is hand-typed: airlines appear as "IndiGo"/"IndiGO", labels as
"On time performance"/"On Time Performance", typos like "Accurancy", and
suffixed variants like "Safety and Security (Apron)". Rather than asking the
sheet owners to fix data, these functions resolve variants automatically on
every fetch/retrain, so NEW variants are handled without code changes.

Two entry points:
  canonicalize_entities — short proper names (airlines, areas, stations)
  consolidate_labels    — classification target labels (also rescues tail
                          classes that would otherwise be dropped)

Both are deterministic: canonical form = the most frequent spelling observed.
Merges only flow small→large, so a dominant correct spelling can never be
renamed after a typo.
"""
from __future__ import annotations

import difflib
import re
from typing import Optional

import pandas as pd

from config import get_logger

log = get_logger("canonicalize")

_NIL = {"", "none", "nan", "n/a", "#n/a", "-", "--", "nil", "unknown"}


def _norm_key(value: str) -> str:
    """Aggressive normalization for grouping: lowercase alphanumerics only."""
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def _tokens(value: str) -> frozenset[str]:
    return frozenset(re.findall(r"[a-z0-9]+", str(value).lower()))


def _is_nil(value) -> bool:
    return value is None or str(value).strip().lower() in _NIL


# ── Entities (airlines, areas, stations) ─────────────────────────────────────

def build_entity_mapping(
    series: pd.Series,
    overrides: Optional[dict[str, str]] = None,
    fuzzy_threshold: float = 0.93,
) -> dict[str, str]:
    """
    Returns {observed_value → canonical_value}.

    Pass 1 — overrides: known business aliases (lowercased keys).
    Pass 2 — key collapse: values identical after removing case/space/punct
             ("Hongkong Airlines" ≡ "Hong Kong Airlines") share the most
             frequent original spelling.
    Pass 3 — fuzzy merge: a rarer key that matches a more frequent key at
             ≥ fuzzy_threshold (SequenceMatcher on normalized keys) adopts the
             frequent key's canonical form ("ethiopiaairlines" →
             "ethiopianairlines"). Threshold is high on purpose: merging two
             genuinely different carriers is far worse than missing a typo.
    """
    overrides = {k.lower().strip(): v for k, v in (overrides or {}).items()}
    values = series.dropna().astype(str).str.strip()
    values = values[~values.str.lower().isin(_NIL)]
    if values.empty:
        return {}

    counts = values.value_counts()

    # Pass 2: group by normalized key, canonical = modal spelling in group
    key_groups: dict[str, list[str]] = {}
    for v in counts.index:
        key_groups.setdefault(_norm_key(v), []).append(v)
    key_canon: dict[str, str] = {}     # norm_key → canonical spelling
    key_weight: dict[str, int] = {}    # norm_key → total occurrences
    for key, variants in key_groups.items():
        canonical = max(variants, key=lambda v: counts[v])
        key_canon[key] = canonical
        key_weight[key] = int(sum(counts[v] for v in variants))

    # Pass 3: fuzzy-merge rare keys into frequent keys
    keys_by_weight = sorted(key_canon, key=lambda k: -key_weight[k])
    accepted: list[str] = []
    for key in keys_by_weight:
        best, best_score = None, 0.0
        for cand in accepted:
            score = difflib.SequenceMatcher(None, key, cand).ratio()
            if score > best_score:
                best, best_score = cand, score
        if best is not None and best_score >= fuzzy_threshold:
            key_canon[key] = key_canon[best]
        else:
            accepted.append(key)

    mapping: dict[str, str] = {}
    for v in counts.index:
        target = overrides.get(v.lower()) or key_canon[_norm_key(v)]
        if target != v:
            mapping[v] = target
    if mapping:
        log.info("entity canonicalization (%s): %s", series.name, mapping)
    return mapping


def canonicalize_entities(
    series: pd.Series,
    overrides: Optional[dict[str, str]] = None,
    fuzzy_threshold: float = 0.93,
) -> pd.Series:
    mapping = build_entity_mapping(series, overrides, fuzzy_threshold)
    if not mapping:
        return series
    return series.map(lambda v: mapping.get(str(v).strip(), v) if not _is_nil(v) else v)


# ── Classification labels ─────────────────────────────────────────────────────

def build_label_mapping(
    y: pd.Series,
    min_samples: int = 3,
    fuzzy_threshold: float = 0.90,
) -> dict[str, str]:
    """
    Returns {observed_label → canonical_label}. Merge passes, in order:

    1. Case/space collapse — "On time performance" ≡ "On Time Performance".
    2. Parenthetical suffix — "X (Apron)" → "X" when "X" exists on its own
       and is at least as frequent.
    3. Fuzzy typo merge — smaller label merges into a bigger label at ≥
       fuzzy_threshold ("Accurancy…" → "Accuracy…").
    4. Token containment rescue — ONLY for labels below min_samples (they'd
       be discarded anyway): if the small label's tokens are a subset of a
       surviving label's tokens, its rows are rescued into that label
       ("Baggage Handling" ⊂ "Baggage/Special/Irregularities Handling").
       Never applied to labels big enough to stand alone — business taxonomy
       distinctions are preserved.
    """
    y = y.dropna().astype(str).str.strip()
    y = y[~y.str.lower().isin(_NIL)]
    if y.empty:
        return {}
    counts = y.value_counts()
    canon: dict[str, str] = {v: v for v in counts.index}

    def _weight(label: str) -> int:
        return int(sum(counts[v] for v, c in canon.items() if c == label))

    # 1. case/space collapse
    groups: dict[str, list[str]] = {}
    for v in counts.index:
        groups.setdefault(re.sub(r"\s+", " ", v.lower()), []).append(v)
    for variants in groups.values():
        if len(variants) > 1:
            target = max(variants, key=lambda v: counts[v])
            for v in variants:
                canon[v] = target

    # 2. parenthetical suffix strip
    for v in counts.index:
        base = re.sub(r"\s*\([^)]*\)\s*$", "", v).strip()
        if base and base != v:
            base_canon = next((canon[b] for b in counts.index
                               if b.lower() == base.lower()), None)
            if base_canon and _weight(base_canon) >= counts[v]:
                canon[v] = base_canon

    # 3. fuzzy typo merge (small → large). Compared on suffix-stripped forms
    #    so "Accurancy … (Apron)" still reaches "Accuracy …".
    def _strip_suffix(label: str) -> str:
        return re.sub(r"\s*\([^)]*\)\s*$", "", label).strip().lower()

    labels_desc = sorted(set(canon.values()), key=lambda l: -_weight(l))
    for i, small in enumerate(reversed(labels_desc)):
        for big in labels_desc:
            if big == small or _weight(big) < _weight(small):
                continue
            score = difflib.SequenceMatcher(
                None, _strip_suffix(small), _strip_suffix(big)).ratio()
            if score >= fuzzy_threshold:
                for v, c in list(canon.items()):
                    if c == small:
                        canon[v] = big
                break

    # 4. containment rescue for below-threshold labels
    survivors = {l for l in set(canon.values()) if _weight(l) >= min_samples}
    for small in sorted(set(canon.values()), key=_weight):
        if small in survivors or _weight(small) >= min_samples:
            continue
        small_toks = _tokens(small)
        if not small_toks:
            continue
        candidates = [s for s in survivors if small_toks <= _tokens(s)]
        if candidates:
            target = max(candidates, key=_weight)
            for v, c in list(canon.items()):
                if c == small:
                    canon[v] = target

    mapping = {v: c for v, c in canon.items() if v != c}
    if mapping:
        log.info("label consolidation: %s", mapping)
    return mapping


def consolidate_labels(
    y: pd.Series,
    min_samples: int = 3,
    fuzzy_threshold: float = 0.90,
) -> pd.Series:
    mapping = build_label_mapping(y, min_samples, fuzzy_threshold)
    if not mapping:
        return y
    return y.map(lambda v: mapping.get(str(v).strip(), v) if not _is_nil(v) else v)
