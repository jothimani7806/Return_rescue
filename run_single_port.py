"""
Return Rescue - Single-Port Application Launcher
Runs both the compiled React frontend and the Django REST Framework backend on a single externally accessible port.
Usage:
    python run_single_port.py [--port 8000] [--build]
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / 'frontend'
BACKEND_DIR = ROOT_DIR / 'backend'
DIST_INDEX = FRONTEND_DIR / 'dist' / 'index.html'

def build_frontend():
    print("=" * 60)
    print("1. BUILDING REACT FRONTEND (Vite)")
    print("=" * 60)
    npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
    result = subprocess.run([npm_cmd, "run", "build"], cwd=FRONTEND_DIR)
    if result.returncode != 0:
        print("[!] Frontend build failed.")
        sys.exit(result.returncode)
    print("[+] Frontend build successful: dist/ generated.")

def apply_migrations():
    print("=" * 60)
    print("2. APPLYING DATABASE MIGRATIONS")
    print("=" * 60)
    result = subprocess.run([sys.executable, "manage.py", "migrate"], cwd=BACKEND_DIR)
    if result.returncode != 0:
        print("[!] Migration step failed.")
        sys.exit(result.returncode)

def run_server(port=8000):
    print("=" * 60)
    print(f"3. STARTING RETURN RESCUE (SINGLE PORT: {port})")
    print("=" * 60)
    print(f"[*] Access the Complete Application at: http://127.0.0.1:{port}/")
    print(f"[*] Unified Login Page:                http://127.0.0.1:{port}/login")
    print(f"[*] Customer Dashboard:               http://127.0.0.1:{port}/customer/dashboard")
    print(f"[*] Manager Inspection Dashboard:     http://127.0.0.1:{port}/manager/dashboard")
    print(f"[*] AI Return Inspection Queue:       http://127.0.0.1:{port}/manager/returns")
    print(f"[*] REST Framework API Root:          http://127.0.0.1:{port}/api/")
    print("-" * 60)
    print("[*] Demo Accounts:")
    print("    Customer: customer / Customer@123")
    print("    Manager:  manager  / Manager@123")
    print("    Admin:    admin    / Admin@123")
    print("=" * 60)

    # Launch Django on configured port
    subprocess.run([sys.executable, "manage.py", "runserver", f"0.0.0.0:{port}"], cwd=BACKEND_DIR)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Run Return Rescue on a single port.")
    parser.add_argument('--port', type=int, default=8000, help="Port to run the single-port application (default: 8000)")
    parser.add_argument('--build', action='store_true', help="Force rebuild of frontend before starting")
    args = parser.parse_args()

    # Build if dist/index.html doesn't exist or --build flag provided
    if args.build or not DIST_INDEX.exists():
        build_frontend()
    else:
        print(f"[i] Existing frontend build found at {DIST_INDEX}.")

    apply_migrations()
    run_server(port=args.port)
