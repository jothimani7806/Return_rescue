#!/usr/bin/env bash
# Exit on error
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
python seed_data.py
python -c "from core.mongodb import restore_records_from_mongodb_if_needed; restore_records_from_mongodb_if_needed()" || true
