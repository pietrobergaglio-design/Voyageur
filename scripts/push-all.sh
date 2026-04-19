#!/usr/bin/env bash
# scripts/push-all.sh — safe push helper for Voyageur
# Usage: ./scripts/push-all.sh  OR  npm run push

set -euo pipefail

BOLD="\033[1m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
RESET="\033[0m"

ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()  { echo -e "${RED}✗ ERROR:${RESET} $*" >&2; exit 1; }
hdr()  { echo -e "\n${BOLD}${CYAN}── $* ──${RESET}"; }

# ── 1. Location & branch check ────────────────────────────────────────────────
hdr "1/7  Location & branch"

EXPECTED_DIR="$HOME/Voyageur"
ACTUAL_DIR="$(pwd)"

if [[ "$ACTUAL_DIR" != "$EXPECTED_DIR" ]]; then
  warn "Not in $EXPECTED_DIR (you are in $ACTUAL_DIR)"
  warn "Script will continue, but make sure you're in the right repo."
fi

if ! git rev-parse --git-dir &>/dev/null; then
  err "Not inside a git repository."
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  warn "You are on branch '$CURRENT_BRANCH', not 'main'."
  read -rp "  Continue anyway? [y/N] " CONTINUE
  [[ "$CONTINUE" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
fi

ok "Branch: $CURRENT_BRANCH"

# ── 2. Security: ensure secrets are NOT tracked ───────────────────────────────
hdr "2/7  Security check"

BLOCKED_PATTERNS=(".env" "node_modules/" ".expo/" "ios/build" "android/build")
BLOCK=false

for PATTERN in "${BLOCKED_PATTERNS[@]}"; do
  # Check if any tracked file matches
  if git ls-files --error-unmatch "$PATTERN" &>/dev/null 2>&1; then
    echo -e "${RED}✗ BLOCKED:${RESET} '$PATTERN' is tracked by git — remove it with: git rm -r --cached $PATTERN"
    BLOCK=true
  fi
  # Check if staged
  if git diff --cached --name-only | grep -q "^${PATTERN%/}"; then
    echo -e "${RED}✗ BLOCKED:${RESET} '$PATTERN' is staged — unstage it with: git restore --staged $PATTERN"
    BLOCK=true
  fi
done

# Extra: scan staged files for .env-like names
STAGED_ENV=$(git diff --cached --name-only 2>/dev/null | grep -E "^\.env" || true)
if [[ -n "$STAGED_ENV" ]]; then
  echo -e "${RED}✗ BLOCKED:${RESET} Staged secret file(s): $STAGED_ENV"
  BLOCK=true
fi

$BLOCK && err "Fix the above issues before pushing."
ok "No secrets or ignored folders are tracked/staged."

# ── 3. Sanity: critical files must exist and be tracked ───────────────────────
hdr "3/7  Sanity check — critical files"

check_exists() {
  local PATH_CHECK="$1"
  local LABEL="${2:-$1}"
  if [[ ! -e "$PATH_CHECK" ]]; then
    err "Missing: $LABEL (Barto can't run the app without this)"
  fi
  ok "Exists: $LABEL"
}

check_exists "package.json"    "package.json"
check_exists "app.json"        "app.json"
check_exists "tsconfig.json"   "tsconfig.json"
check_exists "app/_layout.tsx" "app/_layout.tsx"
check_exists "src"             "src/ directory"

# ── 4. .env.example sync check ────────────────────────────────────────────────
hdr "4/7  .env.example sync"

# Extract all EXPO_PUBLIC_* vars used in source (exclude node_modules and dist)
USED_VARS=$(grep -r "EXPO_PUBLIC_" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=".expo" \
  -h . 2>/dev/null \
  | grep -o "EXPO_PUBLIC_[A-Z_]*[A-Z]" | sort -u || true)

MISSING_IN_EXAMPLE=()
if [[ -f ".env.example" ]]; then
  for VAR in $USED_VARS; do
    if ! grep -q "^$VAR=" .env.example; then
      MISSING_IN_EXAMPLE+=("$VAR")
    fi
  done
  if [[ ${#MISSING_IN_EXAMPLE[@]} -gt 0 ]]; then
    warn ".env.example is missing these vars used in code:"
    for V in "${MISSING_IN_EXAMPLE[@]}"; do
      echo "    $V"
      echo "$V=your-key-here" >> .env.example
    done
    warn "  → Added them to .env.example with placeholder values."
  else
    ok ".env.example is in sync with source code."
  fi
else
  warn ".env.example not found — creating it."
  {
    echo "# Copy to .env and fill in your API keys. Never commit .env."
    echo ""
    for VAR in $USED_VARS; do
      echo "$VAR=your-key-here"
    done
  } > .env.example
  ok "Created .env.example"
fi

# ── 5. Show pending changes ───────────────────────────────────────────────────
hdr "5/7  Pending changes"

PENDING=$(git status --porcelain 2>/dev/null || true)

if [[ -z "$PENDING" ]]; then
  echo ""
  warn "Nothing to commit — working tree is clean."
  read -rp "  Push anyway (e.g. to sync branch)? [y/N] " PUSH_EMPTY
  if [[ ! "$PUSH_EMPTY" =~ ^[Yy]$ ]]; then
    echo "Aborted."; exit 0
  fi
else
  echo ""
  echo -e "${BOLD}Files that will be committed:${RESET}"
  while IFS= read -r LINE; do
    STATUS="${LINE:0:2}"
    FILE="${LINE:3}"
    case "$STATUS" in
      " M"|"M "|"MM") TYPE="modified " ;;
      " A"|"A "|"AM") TYPE="new file  " ;;
      " D"|"D "|"DD") TYPE="deleted   " ;;
      "??")            TYPE="untracked " ;;
      " R"|"R ")       TYPE="renamed   " ;;
      *)               TYPE="changed   " ;;
    esac
    echo "   $TYPE  $FILE"
  done <<< "$PENDING"
fi

# ── 6. Commit message ─────────────────────────────────────────────────────────
hdr "6/7  Commit message"

echo ""
read -rp "  Commit message (blank = abort): " COMMIT_MSG
if [[ -z "$COMMIT_MSG" ]]; then
  echo "Aborted — no commit message."; exit 0
fi

# ── 7. Add, commit, push ──────────────────────────────────────────────────────
hdr "7/7  git add → commit → push"

git add .

# Only commit if there's something staged
if git diff --cached --quiet; then
  warn "Nothing staged after git add — skipping commit."
else
  git commit -m "$COMMIT_MSG"
  ok "Committed: $COMMIT_MSG"
fi

echo ""
echo -e "${BOLD}Pushing to origin/$CURRENT_BRANCH…${RESET}"
git push origin "$CURRENT_BRANCH"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✓ Push completato.${RESET}"
echo ""
echo "  Barto può fare:"
echo -e "    ${CYAN}cd Voyageur${RESET}"
echo -e "    ${CYAN}git pull${RESET}"
echo -e "    ${CYAN}npm install --legacy-peer-deps${RESET}"
echo -e "    ${CYAN}npx expo start --clear${RESET}"
echo ""
echo -e "  ${YELLOW}Se Barto non ha il file .env, mandaglielo via messaggio privato.${RESET}"
echo ""
