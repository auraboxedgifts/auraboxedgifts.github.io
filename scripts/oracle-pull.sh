#!/usr/bin/env bash
# Oracle / production sync helper for Aura Boxed Gifts.
#
# Why you need this:
#   Admin panel + app write live data into:
#     aura-ai/backend/data/site.json
#     aura-ai/backend/data/products.json
#     aura-ai/backend/data/collections.json
#   Those files are tracked by git, so a normal `git pull` fails with
#   "unstaged changes" after you edit shipping, products, etc.
#
# Usage (from repo root on Oracle):
#   ./scripts/oracle-pull.sh           # pull latest code, keep live data, restart pm2
#   ./scripts/oracle-pull.sh --setup   # one-time: mark live data files skip-worktree
#                                      # so plain `git pull` also stops complaining
#   ./scripts/oracle-pull.sh --status  # show git + skip-worktree state
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RUNTIME_FILES=(
  "aura-ai/backend/data/site.json"
  "aura-ai/backend/data/products.json"
  "aura-ai/backend/data/collections.json"
)

PM2_NAMES=("aura-ai" "aura-backend")

die() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "→ $*"; }

backup_runtime() {
  local dir="$1"
  mkdir -p "$dir"
  local f
  for f in "${RUNTIME_FILES[@]}"; do
    if [[ -f "$f" ]]; then
      mkdir -p "$dir/$(dirname "$f")"
      cp -a "$f" "$dir/$f"
    fi
  done
}

restore_runtime() {
  local dir="$1"
  local f
  for f in "${RUNTIME_FILES[@]}"; do
    if [[ -f "$dir/$f" ]]; then
      mkdir -p "$(dirname "$f")"
      cp -a "$dir/$f" "$f"
    fi
  done
}

set_skip_worktree() {
  local f
  for f in "${RUNTIME_FILES[@]}"; do
    if [[ -f "$f" ]] && git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
      git update-index --skip-worktree "$f"
      info "skip-worktree: $f"
    fi
  done
}

clear_skip_worktree() {
  local f
  for f in "${RUNTIME_FILES[@]}"; do
    if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
      git update-index --no-skip-worktree "$f" 2>/dev/null || true
    fi
  done
}

show_status() {
  echo "Repo: $ROOT"
  echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
  git status -sb
  echo
  echo "Runtime files (skip-worktree flag):"
  local f
  for f in "${RUNTIME_FILES[@]}"; do
    if git ls-files -v "$f" 2>/dev/null | grep -q .; then
      git ls-files -v "$f"
    else
      echo "  (missing) $f"
    fi
  done
}

restart_pm2() {
  local name restarted=0
  if ! command -v pm2 >/dev/null 2>&1; then
    info "pm2 not found — skip restart"
    return 0
  fi
  for name in "${PM2_NAMES[@]}"; do
    if pm2 describe "$name" >/dev/null 2>&1; then
      info "pm2 restart $name"
      pm2 restart "$name" --update-env
      restarted=1
    fi
  done
  if [[ "$restarted" -eq 0 ]]; then
    info "No known pm2 process (tried: ${PM2_NAMES[*]}). Restart manually if needed."
  fi
}

do_setup() {
  info "Marking live data files as skip-worktree (one-time Oracle setup)"
  set_skip_worktree
  echo
  echo "Done. Local admin edits to site/products/collections will no longer block git pull."
  echo "From now on you can usually just run:"
  echo "  git pull origin main"
  echo "Or (recommended, also restarts backend):"
  echo "  ./scripts/oracle-pull.sh"
}

do_pull() {
  info "Working tree: $ROOT"

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    die "Not a git repo: $ROOT"
  fi

  local backup
  backup="$(mktemp -d /tmp/aura-oracle-data.XXXXXX)"
  info "Backing up live data → $backup"
  backup_runtime "$backup"

  # Make pull possible even if files were dirty / skip-worktree was unset
  clear_skip_worktree
  local f
  for f in "${RUNTIME_FILES[@]}"; do
    if [[ -f "$f" ]]; then
      git checkout -- "$f" 2>/dev/null || true
    fi
  done

  # Drop other accidental unstaged noise that blocks pull (keep .env etc. untracked)
  if ! git diff --quiet || ! git diff --cached --quiet; then
    info "Stashing remaining local tracked changes so pull can proceed"
    git stash push -m "oracle-pull auto-stash $(date -u +%Y%m%dT%H%M%SZ)" -- || true
  fi

  info "Fetching origin…"
  git fetch origin

  local branch
  branch="$(git rev-parse --abbrev-ref HEAD)"
  info "Updating $branch from origin/$branch…"

  # Prefer fast-forward; if Oracle has leftover local commits, hard-reset to origin
  # AFTER we already backed up live data files.
  if git pull --ff-only "origin" "$branch"; then
    info "Fast-forward pull OK"
  else
    info "Fast-forward failed (local commits or diverged). Resetting to origin/$branch"
    info "(Live site/products/collections were backed up and will be restored.)"
    git reset --hard "origin/$branch"
  fi

  info "Restoring live admin data"
  restore_runtime "$backup"
  rm -rf "$backup"

  set_skip_worktree
  restart_pm2

  echo
  echo "✓ Code updated. Live shipping / products / collections kept."
  git status -sb
}

cmd="${1:-}"
case "$cmd" in
  --setup|-s)
    do_setup
    ;;
  --status)
    show_status
    ;;
  ""|--pull|-p)
    do_pull
    ;;
  -h|--help)
    sed -n '2,20p' "$0"
    ;;
  *)
    die "Unknown option: $cmd (try --help)"
    ;;
esac
