# Visual review candidate — not a release

Version `1.0.1-sic`. Same debug signing key as the previous APK.

SHA-256 `05997529f7a751b9f5c1a7860c52625e885339d95092bb128dbd4eca74697d0e`

No Android emulator or physical device was available in this environment. These shots are headless Chrome at CSS pixel widths 360, 390, and 412, plus 800×360 landscape. Phone screenshots from the earlier APK were the repro, not these images.

## What changed

- Page content reflows inside the screen. Measured `scrollWidth` of the app and the document stayed within the client width at 360, 390, and 412, and in landscape.
- Inputs and buttons use explicit colors. Dialogs use a light neutral surface so a skin cannot blank the labels.
- Previous results are a “Last …” line. New fields are empty.
- Touch does not print “click” on controls. Prompts show after a keyboard or controller.
- The save chip sits in a bar above the app. The extra floating Settings button is gone. Each skin still has Settings.
- Weather is faint and behind the controls. Off remains available.
- Settings is a category grid. One category is open at a time, with Back and, where needed, three subtabs (Skin / Customize / Motion, or Sounds / Rest / Haptics). Search returns matching categories, not every control.
- Midnight Strong, Bulk Barbie, Blue Steel, and Locked-In Lemon appear only under Appearance → Customize while Star Strength Classic is selected.

## Look here first

- `artifacts/review/contact-skins-390.png`
- `artifacts/review/contact-minis-390.png`
- `artifacts/review/contact-manage-390.png`
- `artifacts/review/contact-dialogs-390.png`
- `artifacts/review/contact-landscape.png`
- `artifacts/review/contact-settings-390.png`
- `artifacts/review/390-settings-home.png`
- `artifacts/review/390-settings-classic-variants.png`
- `artifacts/review/390-settings-iron-customize.png`
- `artifacts/review/390-settings-data.png`

Individual skin shots are `artifacts/review/390-<skin>-log.png`, plus `360-` and `412-` and `land-` copies, and `390-<skin>-mini.png` / `390-<skin>-manage.png`.

## Packages

- `artifacts/sic.html`
- `artifacts/sic-web.zip`
- `artifacts/sic-debug.apk` (versionCode 2, versionName 1.0.1-sic-debug)

Bug reports stay on the phone. Share and Copy send them. There is no server.
