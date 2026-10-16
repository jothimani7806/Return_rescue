"""
Reproducible Vision Model Training Script
Fine-tunes a MobileNetV3 / ResNet backbone for universal defect classification.
"""
import os
import sys
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from PIL import Image
from pathlib import Path

class DefectDataset(Dataset):
    def __init__(self, items, class_to_idx, transform=None):
        self.items = items
        self.class_to_idx = class_to_idx
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        item = self.items[idx]
        image = Image.open(item['path']).convert('RGB')
        label = self.class_to_idx[item['label']]
        if self.transform:
            image = self.transform(image)
        return image, label

def train_model(manifest_path="data/processed/dataset_manifest.json", epochs=3, batch_size=8, lr=0.001):
    if not os.path.exists(manifest_path):
        print(f"[!] Manifest not found at {manifest_path}. Generating starter splits...")
        from prepare_dataset import prepare_splits
        prepare_splits()

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    classes = manifest.get('classes', [])
    if not classes:
        print("[!] No classes found in manifest. Please provide image data in data/raw.")
        return

    class_to_idx = {c: i for i, c in enumerate(classes)}
    idx_to_class = {i: c for i, c in enumerate(classes)}

    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    train_dataset = DefectDataset(manifest['train'], class_to_idx, transform=train_transform)
    val_dataset = DefectDataset(manifest['val'], class_to_idx, transform=val_transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True) if len(train_dataset) > 0 else []
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False) if len(val_dataset) > 0 else []

    # Model architecture
    model = models.mobilenet_v3_small(weights=None)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, len(classes))

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)

    print(f"[+] Starting training for {epochs} epochs on {device} with {len(classes)} classes: {classes}")

    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

        epoch_loss = running_loss / max(total, 1)
        epoch_acc = correct / max(total, 1)
        print(f"Epoch [{epoch+1}/{epochs}] Loss: {epoch_loss:.4f} | Acc: {epoch_acc*100:.2f}%")

    weights_dir = Path("weights")
    weights_dir.mkdir(exist_ok=True)
    save_path = weights_dir / "vision_model.pth"
    torch.save({
        'model_state_dict': model.state_dict(),
        'classes': classes,
        'class_to_idx': class_to_idx,
    }, save_path)
    print(f"[+] Model checkpoint successfully exported to {save_path.resolve()}")

if __name__ == '__main__':
    train_model()
