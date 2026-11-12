#!/usr/bin/env bash
# Unsigned release APK. No signingConfig. Do not sign this with the debug key.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/android-sdk}"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
GRADLE="${GRADLE:-$HOME/gradle-8.7/bin/gradle}"
ASSETS="$ROOT/android/app/src/main/assets/www"
rm -rf "$ASSETS"
mkdir -p "$ASSETS/css" "$ASSETS/js" "$ASSETS/assets"
cp "$ROOT/index.html" "$ASSETS/index.html"
cp "$ROOT/css/sic.css" "$ASSETS/css/sic.css"
cp "$ROOT/js/"*.js "$ASSETS/js/"
cp -R "$ROOT/assets/skins" "$ASSETS/assets/skins"
cp -R "$ROOT/assets/fonts" "$ASSETS/assets/fonts"
cd "$ROOT/android"
"$GRADLE" --no-daemon assembleRelease
APK="$ROOT/android/app/build/outputs/apk/release/app-release-unsigned.apk"
OUT="$ROOT/artifacts/strength-in-character-1.2.0-unsigned.apk"
cp "$APK" "$OUT"
echo "APK $OUT"
