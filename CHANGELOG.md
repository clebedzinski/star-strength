# Changelog

## 1.2.0

Release candidate. versionName 1.2.0, versionCode 15.

- Bug reports show the phone's local time, for example Nov 12, 1:43 PM.
- Fonts are bundled as woff2. The app does not request Google Fonts or any other network service.
- All eight skins are finished looks. The skin picker does not say Beta look.
- Bug reports stay on the phone. Share and Copy are how a tester sends one. There is no server and no receiver URL.
- The workout sneak-peek notification idea is from Ryan "ryno".
- The release APK is unsigned. It does not install over a build signed with the earlier debug key. Export XML, uninstall, install 1.2.0, then import. See INSTALL.md.
- No GitHub Release and no Play Store listing.

## 1.1.0

Release candidate you can hand to someone.

- Version 1.1.0, versionCode 14. Release build: not debuggable, R8 and resource shrinking on, signed with the same keystore as the earlier test builds so an installed copy updates in place.
- App label Strength in Character, with an adaptive icon and a splash in the same gold-on-dark branding.
- Star Strength Classic stays the default spreadsheet. The other seven skins stay available and are labeled Beta look in the skin picker.
- Bug reports stay on the phone. Share and Copy are how a tester sends one. There is no server.
- A short welcome covers logging, Duo, and rest/tempo. Skip it once. It does not cover the log. What's New stays a dismissible note.
- About shows the version, credit to Ryan "ryno" for the sneak-peek notification idea, and the privacy note: data stays on the device, XML export is the backup.
- No GitHub Pages publish and no Play Store listing.

## 1.0.x

Development builds. Classic was restored to the original spreadsheet after a shared-layout regression. Logging, Duo, rest, tempo, settings, and controller input were fixed across the skins. Those builds were debug-signed with the same key.
