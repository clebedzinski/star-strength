# Strength in Character test report

Historical snapshot from 2026-11-07 (`1.0.0-sic`). The APK, HTML, and zip names below were removed when the release candidate was packaged. The launcher name on current builds is Strength in Character.

Date: 2026-11-07. App version `1.0.0-sic`. This environment has no physical phone, gamepad, or owner Google account.

## What was executed

- `node --test tests/sic-logic.test.mjs` — 22 passed, 0 failed.
- jsdom boot of all 8 skins. Each page rendered a LOG SET / LOG IT control and a finish control.
- jsdom interaction on Classic: LOG SET started a 4:00 rest and an Undo toast; FINISH WORKOUT asked before saving; the summary opened; Settings showed bug reports as **not configured** and named localStorage; `/mcphersonstrut` replied `Reserved. No effect.`; `/msg.user=hi` replied `not available yet`.
- A fresh (non-demo) session left the weight input blank with placeholder `205`. Demo incline rows were blank with placeholder `175`. Typed demo bench values stayed.
- Headless Chrome screenshots, phone 390×844 and Classic desktop 1280×800, saved in this folder. Chrome was killed after the screenshot because the rest ticker keeps the page alive; the PNGs were written.

## Android package

- File: `artifacts/sic-debug.apk` (also copied for the parent).
- Built with `bash scripts/build-apk.sh` (Gradle 8.7, compileSdk 34, debug signing).
- `apksigner` certificate: `C=US, O=Android, CN=Android Debug`
- SHA-256: `05997529f7a751b9f5c1a7860c52625e885339d95092bb128dbd4eca74697d0e`
- SHA-1: `2942e6838887a1c77b785df5408c59208e1b61db`
- The APK contains `classes.dex` and `assets/www/` (index, css, js). Launcher label: `SIC (debug build)`.
- This signature will not update an older APK signed with a different key.
- Not installed on a device or emulator here. Overlay permission, Storage Access Framework, alarms, and controller `KeyEvent`s are in the project and are **untested on hardware**.

## Web bundle

- `artifacts/sic-web.zip` — multi-file offline site plus `gas/` and the README.
- `artifacts/sic.html` — same app with CSS and JS inlined.

## Bug reports

Reports stay on the phone. Share and Copy send them. There is no server and no network call.

## Screenshots

- `sic-classic-phone.png`, `sic-classic-desktop.png`
- `sic-pixel-phone.png`, `sic-iron-phone.png`, `sic-chalk-phone.png`
- `sic-score-phone.png`, `sic-transit-phone.png`, `sic-vinyl-phone.png`, `sic-hex-phone.png`
- `sic-settings-phone.png`, `sic-mini-phone.png` (mini flag still shows the full Iron Dial behind the in-page mini)

## Implemented

- Forward migration of `ss_routines`, `ss_history`, `ss_current_session`, `ss_prs`, `ss_custom_themes`, `ss_duo_mode`, `ss_partner_names`, `ss_active_theme_id`, `ss_sound`, `ss_fx`, `ss_rest`, with one raw backup in `ss_migration_v1`.
- BLS5 exercise content unchanged. `ss_active_routine_id` is saved.
- Blank new-set inputs, template numbers only as placeholders, resumed drafts kept, PREV from history (or —).
- LOG SET marks the current set, lockout, undo. FINISH WORKOUT confirms, saves logged sets only, and stops rest, metronome, and scheduled tones. Duo can finish both or the active partner.
- Add and delete sets in the full app and in the ± Sets popout. Empty delete is immediate. Logged or filled delete confirms and can undo.
- Add or remove an exercise for today only, or from the routine going forward. History rows are not rewritten.
- Eight skins with different full layouts, mini silhouettes, and popout frames. Community packs are validated JSON. Script, remote assets, and bad SVG are rejected. Skin Studio is not built.
- In-page mini. Document Picture-in-Picture only if `documentPictureInPicture` exists. Android overlay service is in the project.
- Rest stored as an end timestamp. Per-partner tempo. Metronome keeps clicking unless every active partner is resting. One click loop.
- Per-event sound on/off, repeats, instrument, volume, master mute.
- Original rest lines only. No invented attributions. The first line is the old “big dawg” line.
- XML export/import for routines and history. Rejects `<!` and custom entities. Round-trip covered by tests. Import previews conflicts and can merge or replace after a snapshot.
- History defaults oldest first, with reverse and muscle filters including hamstrings and glutes. Edits recalculate records. Routine renames do not rewrite old names.
- Autosave, tmp-then-real writes, rolling snapshots, save/error pill, manual save, clear limited to `ss_` keys after a JSON download.
- Files & storage explains localStorage vs a granted folder. Desktop `showDirectoryPicker` when present. Otherwise download and file input. Android uses the system folder picker. No typed path writes.
- Searchable Basic/Advanced settings. A fixed Settings control stays on screen in every skin.
- Console commands from the brief, including reserved `/mcphersonstrut` and future `/msg.user=`.
- Keyboard and Gamepad API map, last-used prompts, PS confirm swap, hold-repeat only on steppers, shortcuts off while typing. No background capture.
- Opt-in schedule inference and an in-app sneak peek. What’s New credits Ryan (ryno). Web notifications only while the page can run. Android schedules an inexact alarm.
- Duo flips the active logger after a set and does not complete the other person’s set.

## Partial

- Weather is the same five effects (off, snow, rain, ripples, fire, smoke) drawn on a canvas. It is not a line-for-line copy of the previous particle code. Reduced motion turns it off.
- Classic variants Midnight Strong, Bulk Barbie, Blue Steel, and Locked-In Lemon still apply when the skin is Star Strength Classic. Colors for that skin’s Midnight Strong variant are `#0B0F17`, `#1E293B`, `#334155`, `#F8FAFC`, `#F59E0B`.
- Stored numbers stay in pounds. The screen and XML can show kilograms.
- Gamepad brand is a guess from the id string, then the last manual choice.
- The Android overlay window is rectangular. `FLAG_NOT_TOUCH_MODAL` is set so taps outside the window are intended to reach other apps. Taps in the padding around a shaped mini still hit SIC. Not measured on a device.
- Picture-in-Picture, overlay, SAF, notifications, and controllers were not exercised on hardware.

## Not in this build

- A bug-report server. Reports stay on the phone and leave only through Share or Copy.
- Skin Studio.
- A defined action for `/mcphersonstrut`.
- `/msg.user=`.
- Official connections to other workout apps. The routines screen says file import later, and there is no fake sign-in.
- iOS overlay, or a mobile-web overlay over other apps.
- Verified athlete quotations.
- Changes to the BLS5 program text.
- A promise that uninstall, eviction, or a wiped browser cannot lose data.

## Rebuild

```bash
node --test tests/sic-logic.test.mjs
node scripts/build-web.mjs
export ANDROID_SDK_ROOT="$HOME/android-sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
bash scripts/build-apk.sh
```
