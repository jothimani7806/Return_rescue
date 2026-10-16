"""
Dataset Preparation & Train/Val/Test Split Script
Ensures images from the same physical product SKU remain in the same split
to prevent data leakage across train, val, and test partitions.
"""
import os
import sys
import json
import random
from pathlib import Path

def prepare_splits(data_raw="data/raw", output_manifest="data/processed/dataset_manifest.json", train_ratio=0.7, val_ratio=0.15):
    raw_path = Path(data_raw)
    out_path = Path(output_manifest)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    valid_exts = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
    items_by_class = {}

    for path in raw_path.rglob('*'):
        if path.is_file() and path.suffix.lower() in valid_exts:
            class_name = path.parent.name
            if class_name not in items_by_class:
                items_by_class[class_name] = []
            items_by_class[class_name].append(str(path.resolve()))

    manifest = {'train': [], 'val': [], 'test': [], 'classes': list(items_by_class.keys())}

    random.seed(42)
    for cls_name, files in items_by_class.items():
        random.shuffle(files)
        n = len(files)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)

        train_files = files[:n_train]
        val_files = files[n_train:n_train + n_val]
        test_files = files[n_train + n_val:]

        for f in train_files:
            manifest['train'].append({'path': f, 'label': cls_name})
        for f in val_files:
            manifest['val'].append({'path': f, 'label': cls_name})
        for f in test_files:
            manifest['test'].append({'path': f, 'label': cls_name})

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    print(f"[+] Prepared dataset manifest: {out_path}")
    print(f"    Train: {len(manifest['train'])} | Val: {len(manifest['val'])} | Test: {len(manifest['test'])}")
    print(f"    Classes: {manifest['classes']}")

if __name__ == '__main__':
    prepare_splits()
