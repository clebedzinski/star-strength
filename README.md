# SIC (Strength in Character)

A workout logger that keeps the original Star Strength spreadsheet as the **Star Strength Classic** skin and adds seven other layouts on the same log. Data stays on the device. The only network feature is an optional bug report, and that receiver is not deployed in this repository.

## Run the web app

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`. `?demo=1&skin=irondial` loads sample numbers in memory and does not write your saved workouts.

Offline bundle:

```bash
node scripts/build-web.mjs
```

That writes `artifacts/sic-web.zip` and a single-file `artifacts/sic.html`.

## Tests

```bash
node --test tests/sic-logic.test.mjs
```

## Android debug APK

Requires the Android SDK (platform 34, build-tools 34.0.0) and Gradle 8.7. The script copies the web app into the APK assets and builds a **debug-signed** package.

```bash
export ANDROID_SDK_ROOT="$HOME/android-sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
bash scripts/build-apk.sh
```

Output: `artifacts/sic-debug.apk`.

```bash
adb install -r artifacts/sic-debug.apk
keytool -printcert -jarfile artifacts/sic-debug.apk
```

This key will not update an older Star Strength APK that was signed with a different key. The launcher name is `SIC (debug build)`. Overlay permission, notifications, and gamepads are implemented and were **not** run on a physical phone or controller in this environment.

## Bug reports

See `gas/SETUP.md`. Until that Web App is deployed and a response `{ "ok": true, "id": "..." }` is read back, the app keeps reports on the device and does not call them submitted.

## What stayed

The Bigger Leaner Stronger 5-day routine content is unchanged. Existing `ss_routines`, `ss_history`, `ss_current_session`, `ss_prs`, `ss_custom_themes`, `ss_duo_mode`, `ss_partner_names`, `ss_active_theme_id`, `ss_sound`, `ss_fx`, and `ss_rest` values are migrated forward. A raw copy is stored once in `ss_migration_v1` when those keys already exist.
