# Strength in Character

A workout logger. Star Strength Classic keeps the original spreadsheet. Seven other looks log the same sets: Pixel Forecast, Iron Dial, Chalk Board, Scoreboard, Transit Line, Vinyl Deck, and Hex Hive. None of them is marked as a beta look. Workout data stays on the device. The app does not call Google Fonts or any other network service. The typefaces are woff2 files in `assets/fonts`.

## What you can do

- LOG SET records the current set and starts rest. Finish ends the session and keeps only the sets you logged.
- Duo keeps a second partner's numbers. Each partner has a previous column, a rest timer, and a tempo pattern.
- Rest, tempo, and the mini window follow the skin. On Android, the mini can float over other apps after you allow Display over other apps. That uses a foreground service.
- Notifications can show a sneak peek of today's workout. That idea is from Ryan "ryno". Learning stays off until you turn it on. Quiet hours are in Settings → Notifications.
- Settings → Data & files exports and imports routines and history as XML. Autosave writes on this device. A wiped install cannot recover a log that was never exported.
- Settings → About & support → Bugs saves a report on the phone, with the phone's local time. Share sends it through the Android share sheet or the Web Share API. Copy puts it on the clipboard. There is no bug-report server and no receiver URL.

`?demo=1&skin=irondial` loads sample numbers in memory and does not write your saved workouts.

## Run the web app

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

How to open the single-file page and the zip, and how to move an older Android install onto this release, is in `INSTALL.md`.

## Tests

```bash
node --test tests/*.test.mjs
```

`tests/offline-load.test.mjs` loads all eight skins and fails if the page makes an external network request.

## Android app

Requires the Android SDK (platform 34, build-tools 34.0.0) and Gradle 8.7. The release build copies the web app into the APK. The launcher name is Strength in Character. A physical phone and a physical controller were not used for this package. Install steps are in `INSTALL.md`.

## What stayed

The Bigger Leaner Stronger 5-day routine content is unchanged. Existing `ss_routines`, `ss_history`, `ss_current_session`, `ss_prs`, `ss_custom_themes`, `ss_duo_mode`, `ss_partner_names`, `ss_active_theme_id`, `ss_sound`, `ss_fx`, and `ss_rest` values are migrated forward. A raw copy is stored once in `ss_migration_v1` when those keys already exist.
