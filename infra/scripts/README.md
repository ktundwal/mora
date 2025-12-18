# Bootstrap scripts

These scripts aim to make the "one-time" Firebase + GitHub setup repeatable.

They are designed to be **idempotent-ish** (safe to rerun): if something already exists, they skip or update.

## Prereqs
- `gcloud` installed and authenticated (`gcloud auth login`)
- `firebase-tools` installed (`npm i -g firebase-tools`)
- `gh` installed and authenticated (`gh auth login`)

## Quick start
- `./infra/scripts/bootstrap-all.sh dev`
- `./infra/scripts/bootstrap-all.sh prod`

Default mode is **Workload Identity Federation (WIF)** via GitHub OIDC (no JSON keys).

See `docs/BOOTSTRAP.md` for details.
