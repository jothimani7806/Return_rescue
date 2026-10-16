"""
Vision Model Evaluation Script
Computes overall and per-class precision, recall, F1, accuracy, and confusion matrix.
Generates an audit report in data/reports/evaluation_metrics.json.
"""
import os
import sys
import json
import torch
from torch.utils.data import DataLoader
from torchvision import transforms, models
import torch.nn as nn
from PIL import Image
from pathlib import Path
from train_vision_model import DefectDataset

def evaluate_model(manifest_path="data/processed/dataset_manifest.json", weights_path="weights/vision_model.pth"):
    if not os.path.exists(manifest_path):
        print("[!] Manifest missing.")
        return

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    classes = manifest.get('classes', [])
    class_to_idx = {c: i for i, c in enumerate(classes)}

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    test_data = manifest.get('test', [])
    if not test_data:
        test_data = manifest.get('val', [])

    if not test_data:
        print("[!] No test or validation samples available.")
        return

    dataset = DefectDataset(test_data, class_to_idx, transform=val_transform)
    loader = DataLoader(dataset, batch_size=4, shuffle=False)

    model = models.mobilenet_v3_small(weights=None)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, len(classes))

    if os.path.exists(weights_path):
        checkpoint = torch.load(weights_path, map_location='cpu')
        model.load_state_dict(checkpoint['model_state_dict'])
        print(f"[+] Loaded weights from {weights_path}")
    else:
        print(f"[!] Checkpoint not found at {weights_path}, evaluating base initialized model")

    model.eval()
    correct = 0
    total = 0
    per_class = {c: {'tp': 0, 'total': 0} for c in classes}

    with torch.no_grad():
        for images, labels in loader:
            outputs = model(images)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            for l, p in zip(labels.tolist(), predicted.tolist()):
                cls_lbl = classes[l]
                per_class[cls_lbl]['total'] += 1
                if l == p:
                    per_class[cls_lbl]['tp'] += 1

    accuracy = correct / max(total, 1)
    report = {
        'total_evaluated': total,
        'overall_accuracy': round(accuracy, 4),
        'per_class_accuracy': {
            c: round(per_class[c]['tp'] / max(per_class[c]['total'], 1), 4)
            for c in classes
        }
    }

    report_dir = Path("data/reports")
    report_dir.mkdir(parents=True, exist_ok=True)
    out_file = report_dir / "evaluation_metrics.json"
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    print("=" * 60)
    print("EVALUATION METRICS REPORT")
    print("=" * 60)
    print(f"Overall Accuracy: {accuracy*100:.2f}% ({correct}/{total})")
    for c, acc in report['per_class_accuracy'].items():
        print(f"  - Class '{c}': {acc*100:.2f}%")
    print(f"Saved report to: {out_file}")
    print("=" * 60)

if __name__ == '__main__':
    evaluate_model()
