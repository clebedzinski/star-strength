# Install Strength in Character 1.2.0

Workout data stays on the phone. This release is not on the Play Store. The APK in this folder is unsigned. Sign it with your own release key before you install it. Do not sign it with the debug key.

## Move off an older build

1.2.0 uses a new release signature. Android will not install it over an older Strength in Character build, including the 1.1.0 package that was signed with the debug key.

1. Open the old app.
2. Settings → Data & files.
3. Export XML for routines and for history. Keep those files somewhere outside the app (a drive, a computer, or a message you trust).
4. Uninstall the old app. Uninstalling deletes workout data that was not exported.
5. Sign `strength-in-character-1.2.0-unsigned.apk` with your release key, copy that signed file onto the phone, and install it.
6. Open Strength in Character 1.2.0.
7. Settings → Data & files → Import XML. Import the routines file and the history file. Choose Merge to add them, or Replace to overwrite what is already on the phone.

If Android says the install is blocked, allow installs for the app that opened the file (Files, Chrome, or Drive): tap Settings on the prompt, then allow **Install unknown apps**, go back, and tap Install. The name on the home screen is **Strength in Character**.

## Mini over other apps

The in-app Mini button works inside Strength in Character. Floating that same mini over other apps needs one system permission:

1. Open Strength in Character → Settings → Input & mini → Permission.
2. Android opens **Display over other apps** (some phones call it Appear on top).
3. Turn it on for Strength in Character, then come back and tap Show mini.

You can turn that permission off later in system settings. The mini is a small window. Drag it by the handle.

## Web and the single-file page

The page does not need a network connection. Fonts are included.

- Unzip `strength-in-character-1.2.0-web.zip` and open `index.html` in a browser. You can also serve that folder with `python3 -m http.server 8080` and open `http://127.0.0.1:8080/`.
- Or open `strength-in-character-1.2.0.html` by itself. That one file contains the styles, scripts, pictures, and fonts.
- `?demo=1` shows sample numbers and does not write your saved workouts. Add `&skin=hexhive` (or `starclassic`, `pixelforecast`, `irondial`, `chalkboard`, `scoreboard`, `transitline`, `vinyldeck`) to open a look.
- On the web, export and import use the same Settings → Data & files buttons. The browser downloads the XML and asks you to choose a file to import.
