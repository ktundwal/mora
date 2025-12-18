# Migrations

Goal: make Firestore schema changes safe.

Principles:
- Every document has `schemaVersion`.
- Migrations are idempotent (safe to rerun).
- Migrations are explicit scripts run intentionally (not automatic on deploy).

Planned:
- A Node/TS script that reads docs, upgrades them, and writes back.
- A dry-run mode + progress logging.
