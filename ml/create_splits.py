"""
Create Splits & Generate Manifest
Partitions normal and anomalous defect data across train, validation, and test splits.
Prevents data leakage across physical product instances.
"""
import os
import sys
import json
import random
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = Path(__file__).resolve().parent

def create_splits(processed_dir=None, manifest_out=None, seed=42):
    if processed_dir is None:
        processed_dir = BASE_DIR / "data" / "processed"
    if manifest_out is None:
        manifest_out = BASE_DIR / "data" / "processed" / "manifests" / "dataset_manifest.json"
    random.seed(seed)
    proc_root = Path(processed_dir)
    images_dir = proc_root / "images"

    manifest = {
        "metadata": {
            "dataset": "MVTec AD 2 & E-Commerce Defect Benchmark",
            "seed": seed,
            "categories": []
        },
        "train": [],
        "validation": [],
        "test": []
    }

    if not images_dir.exists():
        print(f"[!] Preprocessed images directory not found at: {images_dir}")
        return manifest

    valid_exts = {'.png', '.jpg', '.jpeg'}

    for cat_dir in images_dir.iterdir():
        if not cat_dir.is_dir():
            continue

        cat_name = cat_dir.name
        manifest["metadata"]["categories"].append(cat_name)

        # 1. Normal training images
        train_good_dir = cat_dir / "train" / "good"
        if train_good_dir.exists():
            goods = [str(f.resolve()) for f in train_good_dir.iterdir() if f.suffix.lower() in valid_exts]
            random.shuffle(goods)
            # 80% to train, 20% to validation normal
            split_idx = int(len(goods) * 0.8)
            for f in goods[:split_idx]:
                manifest["train"].append({
                    "image_path": f,
                    "category": cat_name,
                    "label": "good",
                    "is_anomalous": False
                })
            for f in goods[split_idx:]:
                manifest["validation"].append({
                    "image_path": f,
                    "category": cat_name,
                    "label": "good",
                    "is_anomalous": False
                })

        # 2. Test images (both normal and anomalous)
        test_dir = cat_dir / "test"
        if test_dir.exists():
            for sub in test_dir.iterdir():
                if sub.is_dir():
                    is_anom = (sub.name != "good")
                    defect_label = sub.name
                    files = [str(f.resolve()) for f in sub.iterdir() if f.suffix.lower() in valid_exts]
                    for f in files:
                        manifest["test"].append({
                            "image_path": f,
                            "category": cat_name,
                            "label": defect_label,
                            "is_anomalous": is_anom
                        })

    out_path = Path(manifest_out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    print("=" * 60)
    print("DATASET SPLITS MANIFEST CREATED")
    print(f"Categories: {len(manifest['metadata']['categories'])}")
    print(f"Train (Normal):        {len(manifest['train'])}")
    print(f"Validation (Normal):   {len(manifest['validation'])}")
    print(f"Test (Normal + Defect): {len(manifest['test'])}")
    print(f"Saved Manifest:        {out_path.resolve()}")
    print("=" * 60)
    return manifest

if __name__ == "__main__":
    create_splits()
