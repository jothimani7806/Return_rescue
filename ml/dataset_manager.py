"""
Dataset Manager for Return Rescue ML Pipeline
Tracks dataset inventory, license adherence, verification status, and disk resources.
"""
import os
import sys
import json
import shutil
import psutil
from pathlib import Path
from datetime import datetime

class DatasetManager:
    def __init__(self, base_dir="data", reports_dir="ml/reports"):
        self.base_dir = Path(base_dir)
        self.reports_dir = Path(reports_dir)
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        self.inventory_file = self.reports_dir / "dataset_inventory.json"
        self._load_inventory()

    def _load_inventory(self):
        if self.inventory_file.exists():
            try:
                with open(self.inventory_file, 'r', encoding='utf-8') as f:
                    self.inventory = json.load(f)
            except Exception:
                self.inventory = {}
        else:
            self.inventory = {
                "system_audit": self.check_resources(),
                "datasets": {}
            }
            self.save_inventory()

    def save_inventory(self):
        self.inventory["last_updated"] = datetime.now().isoformat()
        with open(self.inventory_file, 'w', encoding='utf-8') as f:
            json.dump(self.inventory, f, indent=2)

    def check_resources(self):
        mem = psutil.virtual_memory()
        disk = shutil.disk_usage(str(self.base_dir if self.base_dir.exists() else "."))
        return {
            "ram_total_gb": round(mem.total / (1024**3), 2),
            "ram_available_gb": round(mem.available / (1024**3), 2),
            "disk_total_gb": round(disk.total / (1024**3), 2),
            "disk_free_gb": round(disk.free / (1024**3), 2),
            "sufficient_disk": disk.free > (2 * 1024**3),
            "sufficient_ram": mem.available > (0.5 * 1024**3),
        }

    def register_dataset(self, name, version, source_url, license_name, commercial_allowed, local_dir, status="CONFIGURED"):
        resources = self.check_resources()
        entry = {
            "name": name,
            "version": version,
            "source_url": source_url,
            "license": license_name,
            "commercial_use_allowed": commercial_allowed,
            "local_dir": str(local_dir),
            "status": status,
            "download_date": datetime.now().isoformat(),
            "total_files": 0,
            "total_size_mb": 0.0,
            "verified": False,
            "notes": ""
        }
        self.inventory["datasets"][name] = entry
        self.inventory["system_audit"] = resources
        self.save_inventory()
        return entry

    def update_dataset_stats(self, name, total_files, total_size_mb, verified=True, notes=""):
        if name in self.inventory["datasets"]:
            self.inventory["datasets"][name]["total_files"] = total_files
            self.inventory["datasets"][name]["total_size_mb"] = round(total_size_mb, 2)
            self.inventory["datasets"][name]["verified"] = verified
            self.inventory["datasets"][name]["status"] = "VERIFIED" if verified else "VALIDATION_FAILED"
            self.inventory["datasets"][name]["notes"] = notes
            self.save_inventory()

    def get_summary(self):
        return {
            "system": self.check_resources(),
            "datasets_count": len(self.inventory.get("datasets", {})),
            "datasets": self.inventory.get("datasets", {})
        }

if __name__ == "__main__":
    mgr = DatasetManager()
    print("=== RETURN RESCUE DATASET INVENTORY ===")
    print(json.dumps(mgr.get_summary(), indent=2))
