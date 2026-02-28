#!/bin/bash
# Mobile Parity Guard: No financial calculations in mobile
# Prevents regression of formula-based earnings, heuristic currency detection,
# and duplicate rewards screens.
#
# Run:    npm run guard:no-financial-math
# Policy: Mobile is a read-only projection layer. All amounts from API or $0.00.

set -euo pipefail

EXCLUDE_DIRS="--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=ios --exclude-dir=android --exclude-dir=.expo --exclude-dir=dist --exclude-dir=build --exclude-dir=scripts"
SOURCE_TYPES="--include=*.ts --include=*.tsx"
EXIT_CODE=0

echo "Checking for financial calculation anti-patterns..."
echo ""

# --- 1. Formula-based earnings: deriving dollar amounts from play counts ---
# Pattern: multiplying listen counts by rates (e.g., first_listens * 100, repeat_listens * 1)
FORMULA_PATTERNS=(
  "first_listens.*\*.*100"
  "repeat_listens.*\*"
  "first_listens \|\| 0) \*"
  "total_plays.*\*.*0\."
)

for pattern in "${FORMULA_PATTERNS[@]}"; do
  matches=$(grep -RInE $EXCLUDE_DIRS $SOURCE_TYPES "$pattern" . 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "FORBIDDEN: Formula-based earnings derivation"
    echo "  Pattern: '$pattern'"
    echo "  Found in:"
    echo "$matches" | sed 's/^/    /'
    echo ""
    echo "  Mobile must not derive earnings from play counts."
    echo "  Use API-returned amounts or display \$0.00."
    echo ""
    EXIT_CODE=1
  fi
done

# --- 2. Heuristic currency detection (> 1000 cents guessing) ---
HEURISTIC_PATTERNS=(
  "isCents"
  "> 1000.*cents"
  "look like cents"
)

for pattern in "${HEURISTIC_PATTERNS[@]}"; do
  matches=$(grep -RInE $EXCLUDE_DIRS $SOURCE_TYPES "$pattern" . 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "FORBIDDEN: Heuristic currency unit detection"
    echo "  Pattern: '$pattern'"
    echo "  Found in:"
    echo "$matches" | sed 's/^/    /'
    echo ""
    echo "  Know the unit of the endpoint. Normalize deterministically."
    echo "  Never guess whether values are cents or dollars."
    echo ""
    EXIT_CODE=1
  fi
done

# --- 3. Ghost features: referral bonuses, special bonuses ---
GHOST_PATTERNS=(
  "Referral Bonus"
  "Special Bonus"
  "referral.*reward"
  "bonus.*reward"
)

for pattern in "${GHOST_PATTERNS[@]}"; do
  matches=$(grep -RInE $EXCLUDE_DIRS $SOURCE_TYPES "$pattern" . 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "WARNING: Possible ghost feature reference"
    echo "  Pattern: '$pattern'"
    echo "  Found in:"
    echo "$matches" | sed 's/^/    /'
    echo ""
    echo "  Referral and bonus reward features do not exist."
    echo "  Do not promise features that are not implemented."
    echo ""
    EXIT_CODE=1
  fi
done

# --- 4. Payout minimum: must be $50, not $10 ---
matches=$(grep -RInF $EXCLUDE_DIRS $SOURCE_TYPES "exceeds \$10" . 2>/dev/null || true)
if [ -n "$matches" ]; then
  echo "FORBIDDEN: Wrong payout minimum (\$10 instead of \$50)"
  echo "  Found in:"
  echo "$matches" | sed 's/^/    /'
  echo ""
  echo "  Canonical minimum withdrawal is \$50.00."
  echo ""
  EXIT_CODE=1
fi

# --- 5. Duplicate rewards screen rendering (not redirect) ---
if [ -f "app/stats/dividends.tsx" ]; then
  line_count=$(wc -l < "app/stats/dividends.tsx" | tr -d ' ')
  if [ "$line_count" -gt 20 ]; then
    echo "WARNING: app/stats/dividends.tsx has $line_count lines"
    echo "  This file should be a redirect to /(tabs)/rewards, not a full screen."
    echo "  Canonical rewards surface is /(tabs)/rewards.tsx."
    echo ""
    EXIT_CODE=1
  fi
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo "No financial calculation anti-patterns found."
fi

exit $EXIT_CODE
