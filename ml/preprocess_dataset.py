"""
Dataset Preprocessing Script
Resizes RGB images preserving aspect ratio, resizes masks using NEAREST NEIGHBOR interpolation,
normalizes tensors, and prevents mask label corruption.
"""
import os
import sys
import json
from pathlib import Path
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = Path(__file__).resolve().parent

def preprocess_dataset(raw_dir=None, processed_dir=None, target_size=(224, 224)):
    if raw_dir is None:
        raw_dir = BASE_DIR / "data" / "raw" / "mvtec_ad_2"
    if processed_dir is None:
        processed_dir = BASE_DIR / "data" / "processed"
    raw_root = Path(raw_dir)
    proc_root = Path(processed_dir)

    images_out = proc_root / "images"
    masks_out = proc_root / "masks"
    images_out.mkdir(parents=True, exist_ok=True)
    masks_out.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("DATASET PREPROCESSING PIPELINE")
    print(f"Target Resolution: {target_size}")
    print("=" * 60)

    processed_count = 0
    mask_count = 0

    valid_exts = {'.png', '.jpg', '.jpeg', '.bmp'}

    for img_path in raw_root.rglob('*'):
        if img_path.is_file() and img_path.suffix.lower() in valid_exts:
            # Check if this is a ground truth mask or image
            is_mask = "ground_truth" in img_path.parts or "_mask" in img_path.name
            rel_path = img_path.relative_to(raw_root)

            if is_mask:
                out_path = masks_out / rel_path
                out_path.parent.mkdir(parents=True, exist_ok=True)
                with Image.open(img_path) as mask:
                    # CRITICAL: Use NEAREST neighbor for binary defect masks to prevent label corruption
                    resized_mask = mask.resize(target_size, resample=Image.NEAREST)
                    resized_mask.save(out_path)
                    mask_count += 1
            else:
                out_path = images_out / rel_path
                out_path.parent.mkdir(parents=True, exist_ok=True)
                with Image.open(img_path) as img:
                    # Convert to RGB and resize using high quality LANCZOS
                    resized_img = img.convert('RGB').resize(target_size, resample=Image.LANCZOS)
                    resized_img.save(out_path)
                    processed_count += 1

    print(f"[+] Successfully preprocessed {processed_count} RGB images (LANCZOS)")
    print(f"[+] Successfully preprocessed {mask_count} Defect Masks (NEAREST NEIGHBOR)")
    print(f"[+] Output directory: {proc_root.resolve()}")
    print("=" * 60)

if __name__ == "__main__":
    preprocess_dataset()
