"""Contrastive fine-tuning of the sentence encoder on incident-report pairs.

Builds same-label positive pairs from all three label roles (multi-task) and
trains with MultipleNegativesRankingLoss (in-batch negatives).

Usage:
  python finetune_encoder.py --rows train_rows.pkl --out /tmp/tuned_encoder
    rows pickle: DataFrame with columns raw / y_category / y_root_cause / y_subcategory
"""
import argparse
import random

import pandas as pd
import torch
from sentence_transformers import (InputExample, SentenceTransformer, losses)
from torch.utils.data import DataLoader

BASE_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
PAIRS_PER_CLASS = 60
EPOCHS = 2
BATCH = 32
SEED = 42


def build_pairs(df: pd.DataFrame, seed: int = SEED) -> list:
    rng = random.Random(seed)
    examples = []
    for role_col in ["y_category", "y_root_cause", "y_subcategory"]:
        if role_col not in df.columns:
            continue
        sub = df.dropna(subset=[role_col])
        for label, grp in sub.groupby(role_col):
            texts = grp["raw"].dropna().astype(str).unique().tolist()
            if len(texts) < 2:
                continue
            n = min(PAIRS_PER_CLASS, len(texts) * 2)
            for _ in range(n):
                a, b = rng.sample(texts, 2)
                examples.append(InputExample(texts=[a, b]))
    rng.shuffle(examples)
    return examples


def finetune(df: pd.DataFrame, out_dir: str, base_model: str = BASE_MODEL,
             epochs: int = EPOCHS, seed: int = SEED, device: str = None) -> str:
    torch.manual_seed(seed)
    device = device or ("mps" if torch.backends.mps.is_available() else "cpu")
    model = SentenceTransformer(base_model, device=device)
    examples = build_pairs(df, seed)
    print(f"[finetune] {len(examples)} pairs, device={device}, epochs={epochs}")
    loader = DataLoader(examples, shuffle=True, batch_size=BATCH, drop_last=True)
    loss = losses.MultipleNegativesRankingLoss(model)
    model.fit(
        train_objectives=[(loader, loss)],
        epochs=epochs,
        warmup_steps=int(0.1 * len(loader) * epochs),
        optimizer_params={"lr": 2e-5},
        show_progress_bar=True,
    )
    model.save(out_dir)
    print(f"[finetune] saved → {out_dir}")
    return out_dir


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--rows", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--base", default=BASE_MODEL)
    ap.add_argument("--epochs", type=int, default=EPOCHS)
    ap.add_argument("--device", default=None)
    args = ap.parse_args()
    df = pd.read_pickle(args.rows)
    finetune(df, args.out, base_model=args.base, epochs=args.epochs, device=args.device)
