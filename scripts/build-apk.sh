#!/usr/bin/env bash
# Debug-signed SIC APK. Not a Play Store key. Will not update an APK signed differently.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/android-sdk}"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
GRADLE="${GRADLE:-$HOME/gradle-8.7/bin/gradle}"
ASSETS="$ROOT/android/app/src/main/assets/www"
rm -rf "$ASSETS"
mkdir -p "$ASSETS/css" "$ASSETS/js" "$ASSETS/assets" "$ROOT/artifacts"
cp "$ROOT/index.html" "$ASSETS/index.html"
cp "$ROOT/css/sic.css" "$ASSETS/css/sic.css"
cp "$ROOT/js/"*.js "$ASSETS/js/"
cp -R "$ROOT/assets/skins" "$ASSETS/assets/skins"
cd "$ROOT/android"
"$GRADLE" --no-daemon assembleDebug
APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
cp "$APK" "$ROOT/artifacts/sic-pixel-iron-debug.apk"
echo "APK $ROOT/artifacts/sic-pixel-iron-debug.apk"
if [ -x "$ANDROID_SDK_ROOT/build-tools/34.0.0/apksigner" ]; then
  "$ANDROID_SDK_ROOT/build-tools/34.0.0/apksigner" verify --print-certs "$ROOT/artifacts/sic-pixel-iron-debug.apk" || true
fi
echo "Debug review build. Same keystore. adb install -r artifacts/sic-pixel-iron-debug.apk"
