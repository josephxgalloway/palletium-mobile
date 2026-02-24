#!/bin/bash
# Phase 95-A3: CI guard for forbidden StoreKit/IAP/Google Play Billing imports
# Kernel-locked constraint: Palletium mobile must never import purchase APIs
#
# Policy: See docs/APPLE_COMPLIANCE_MATRIX.md
# Run:    npm run guard:no-iap

set -euo pipefail

EXCLUDE_DIRS="--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=ios --exclude-dir=android --exclude-dir=.expo --exclude-dir=dist --exclude-dir=build"
EXCLUDE_SELF="--exclude=check-forbidden-imports.sh --exclude=*.md"
SOURCE_TYPES="--include=*.ts --include=*.tsx --include=*.js --include=*.jsx --include=package.json --include=app.json --include=expo.json"
EXIT_CODE=0

# --- JS/TS: Fixed-string library names ---
FORBIDDEN_LIBS=(
  "react-native-iap"
  "expo-in-app-purchases"
  "react-native-purchases"
  "@react-native-iap"
  "RNIap"
  "InAppPurchases"
  "expo-iap"
  "react-native-billing"
  "expo-billing"
)

for lib in "${FORBIDDEN_LIBS[@]}"; do
  matches=$(grep -RFIn $EXCLUDE_DIRS $EXCLUDE_SELF $SOURCE_TYPES "$lib" . 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "FORBIDDEN LIBRARY REFERENCE: '$lib'"
    echo "   Found in:"
    echo "$matches" | sed 's/^/     /'
    echo ""
    echo "   This violates the kernel-locked 'No StoreKit/IAP' constraint."
    echo "   All monetization must use external web checkout (Stripe via browser)."
    echo "   See docs/APPLE_COMPLIANCE_MATRIX.md for details."
    echo ""
    EXIT_CODE=1
  fi
done

# --- JS/TS: Regex patterns for import statements ---
FORBIDDEN_IMPORT_PATTERNS=(
  "from ['\"].*StoreKit"
  "import ['\"].*StoreKit"
  "from ['\"].*BillingClient"
  "import ['\"].*BillingClient"
)

for pattern in "${FORBIDDEN_IMPORT_PATTERNS[@]}"; do
  matches=$(grep -RInE $EXCLUDE_DIRS $EXCLUDE_SELF $SOURCE_TYPES "$pattern" . 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "FORBIDDEN IMPORT PATTERN: '$pattern'"
    echo "   Found in:"
    echo "$matches" | sed 's/^/     /'
    echo ""
    echo "   This violates the kernel-locked 'No StoreKit/IAP' constraint."
    echo ""
    EXIT_CODE=1
  fi
done

# --- Native iOS: Swift/ObjC StoreKit imports (only if ios/ exists) ---
if [ -d "ios/" ]; then
  NATIVE_IOS_PATTERNS=(
    "import StoreKit"
    "@import StoreKit"
  )
  for pattern in "${NATIVE_IOS_PATTERNS[@]}"; do
    matches=$(grep -RFIn --exclude-dir=build --exclude-dir=Pods "$pattern" ios/ 2>/dev/null || true)
    if [ -n "$matches" ]; then
      echo "FORBIDDEN NATIVE iOS IMPORT: '$pattern'"
      echo "   Found in:"
      echo "$matches" | sed 's/^/     /'
      echo ""
      echo "   This violates the kernel-locked 'No StoreKit/IAP' constraint."
      echo ""
      EXIT_CODE=1
    fi
  done
fi

# --- Native Android: Google Play Billing (only if android/ exists) ---
if [ -d "android/" ]; then
  NATIVE_ANDROID_PATTERNS=(
    "com.android.billingclient"
    "BillingClient"
  )
  for pattern in "${NATIVE_ANDROID_PATTERNS[@]}"; do
    matches=$(grep -RFIn --exclude-dir=build "$pattern" android/ 2>/dev/null || true)
    if [ -n "$matches" ]; then
      echo "FORBIDDEN NATIVE ANDROID IMPORT: '$pattern'"
      echo "   Found in:"
      echo "$matches" | sed 's/^/     /'
      echo ""
      echo "   This violates the kernel-locked 'No IAP' constraint."
      echo ""
      EXIT_CODE=1
    fi
  done
fi

# --- package.json: Forbidden dependencies ---
FORBIDDEN_DEPS=(
  "react-native-iap"
  "expo-in-app-purchases"
  "react-native-purchases"
  "@react-native-iap"
  "react-native-billing"
  "expo-billing"
)

for dep in "${FORBIDDEN_DEPS[@]}"; do
  if grep -Fq "\"$dep\"" package.json 2>/dev/null; then
    echo "FORBIDDEN DEPENDENCY IN package.json: '$dep'"
    echo "   Remove this dependency. All monetization must use external web checkout."
    EXIT_CODE=1
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "No forbidden StoreKit/IAP/Billing imports or dependencies found."
fi

exit $EXIT_CODE
