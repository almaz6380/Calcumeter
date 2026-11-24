# Calcumeter – notes for Claude

Calculator web app (GitHub Pages) that is also wrapped as a store app with Capacitor 8 (like Mountain-Ride).
The owner talks German: answer in German. UI in 15 languages (German source, English fallback).

## Files
- `index.html`, `style.css` – the whole UI. Colors only via tokens on `:root` (dark default, light under
  `prefers-color-scheme: light` and `[data-theme="light"]`).
- `calculator.js` – expression parser (no eval), `evaluate`, `compile` (variable x for the graph), `format`.
- `app.js` – calculator view, history, memory, menu/settings (theme, language, vibration), view switching (`setView`),
  sharing, the `hub` object handed to the other views.
- `keypad.js` – shared amount input (amounts are stored with a dot, shown per language), picker sheet with search,
  swipe/long-press gestures, haptics.
- `currency.js` (favourites, rates from open.er-api.com, fallback Frankfurter/ECB, `REFERRAL` link slot, feeds the
  widget), `units.js`, `graph.js` (canvas), `programmer.js` (BigInt).
- `i18n.js` – German is the source text; `EN` maps German → English, `lang/<code>.js` adds 13 more languages
  (es fr it pt tr pl nl sv da ja ko zh-Hans zh-Hant) via `I18n.add(code, {deutsch: übersetzt})`, incl. unit names
  (key = German unit name from `units.js`). Missing texts fall back to English. `t('deutscher Text')` in JS, static
  HTML is translated by `apply()`. **Every new UI text needs an `EN` entry and an entry in every `lang/*.js`**
  (`test/i18n.test.js` checks this). Numbers follow `LOCALES`: decimal-comma languages `1.234,5` and `log(8;2)`
  (fr/pl/sv group with a space), decimal-point languages (en ja ko zh) `1,234.5` and `log(8,2)`.
- Widget/shortcut texts for Android and iOS: edit `tools/native-strings.json`, then `python3 tools/native-strings.py`
  (writes `res/values-*/widget_strings.xml`, the `L10n` tables in the Swift files and `CFBundleLocalizations`).
- `native.js` – bridge to Capacitor (share, `shareFile` via `@capacitor/filesystem` + Share for PNG/CSV, haptics,
  deep links `calcumeter://view/<view>` and `#<view>`, `widgetData`). `money.js` – AdMob banner at the bottom of every view
  (calculator too since 11/2026, except phone landscape; space is reserved via `--ad-h`, class `has-banner` on `<html>`)
  + rare interstitial on view switch (`darfVollbild`, `ADMOB.interstitial` – empty = off) + rewarded video (24 h ad-free,
  or 24 h extras, own timestamp `extrasUntil`) + RevenueCat `no_ads`; real banner/rewarded ids are live
  (`adsTesting: false`). Extras (graph as PNG, history CSV export, palettes Ozean/Abendrot via `data-palette` on `<html>`)
  go through `Money.mitExtras(fn)`: free with the purchase, 24 h after an extras video, and always on the web.
- `privacy.html`, `imprint.html` + `assets/legal/` (de/en). `assets/fonts/` – Geist, served locally.
- `sw.js` – **bump `CACHE` (`calcumeter-vNN`) on every web release** and list new files in `ASSETS`.
- Store app: `package.json`, `capacitor.config.json` (`com.almaz6380.calcumeter`), `android/`, `ios/` (checked in;
  `www/`, `dist/`, `node_modules/` are not). Native widgets: Android `android/app/src/main/java/.../RateWidget.java`,
  `QuickWidget.java`, `WidgetStore.java`, `WidgetBridgePlugin.java` + `res/layout/widget_*.xml`,
  `res/xml/*_widget_info.xml`, `res/xml/shortcuts.xml`; iOS `ios/App/App/CalcumeterBridge.swift` (plugin,
  shortcuts, `MainViewController`) and `ios/App/WidgetSource/` (widget extension target `CalcumeterWidgets`, already in
  the Xcode project). App group `group.com.almaz6380.calcumeter`.
- `store/` – listing texts, screenshots (`tools/store-shots.js`), feature graphic, products, privacy answers.

## Release workflow
1. Bump `CACHE` in `sw.js`; `npm test`.
2. Commit and push `master`.
3. `python3 tools/build.py` → copy `dist/` into the `gh-pages` worktree (replace everything), commit, push `gh-pages`.
4. Check `https://almaz6380.github.io/Calcumeter/sw.js` shows the new version.
5. Store app: `npm run sync` (builds `www/` and copies it into both native projects).
6. Android release (needs env vars `CALCUMETER_KEYSTORE_BASE64`, `CALCUMETER_KEYSTORE_PASSWORD`, alias `upload`):
   bump `versionCode` in `android/app/build.gradle`, decode the keystore to a temp file, then
   `./gradlew bundleRelease -Pandroid.injected.signing.store.file=… -Pandroid.injected.signing.store.password=…
   -Pandroid.injected.signing.key.alias=upload -Pandroid.injected.signing.key.password=…`.
   Upload to Google Play with the service account JSON in `PLAY_SERVICE_ACCOUNT_JSON` (Android Publisher API v3:
   edits.insert → edits.bundles.upload → edits.tracks.update `production` with release notes → edits.commit).
   Package `com.almaz6380.calcumeter`; in-app product `no_ads`; RevenueCat keys are in `money.js`.
   **Without a local SDK:** workflow `.github/workflows/android-release.yml` (builds, signs, optional upload via
   `tools/play_release.py`; needs repo secrets `CALCUMETER_KEYSTORE_BASE64`, `CALCUMETER_KEYSTORE_PASSWORD`,
   `PLAY_SERVICE_ACCOUNT_JSON`; `upload` defaults to false). Release notes come from `whatsNew` in `store/listing/*.json`.
7. iOS release without a Mac: GitHub Actions workflow `.github/workflows/ios-release.yml` (macos-15, automatic cloud signing
   with an Admin-role App Store Connect API key from repo secrets `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `APPLE_TEAM_ID`;
   exports with `destination=upload`). Trigger via the GitHub MCP (`actions_run_trigger`), read logs with `get_job_logs`.
   iOS store entry: workflow `ios-listing.yml` (`tools/asc_listing.py`): `status` only reads; for an update pass
   `new_version` (e.g. 1.1) + `build` + `submit`; `whatsNew` is sent for every version except 1.0. Bump
   `MARKETING_VERSION` in the pbxproj first (build number = run number + 10).
   The widget target was added to the Xcode project by `tools/add-widget-target.rb` (bundle id
   `com.almaz6380.calcumeter.widgets`).

## Testing
- `npm test` (node test runner): parser, units, programmer, currency, i18n completeness.
- Serve with `python3 -m http.server 8080` and drive with Playwright (`/opt/node-tools/node_modules/playwright`);
  route `https://open.er-api.com/**` to a saved JSON. Use `locale: 'de-DE'` or `'en-GB'` – the language is
  detected from the browser.
- Android debug build: Android SDK in `/root/android-sdk` (`sdk.dir` in `android/local.properties`), Maven Central
  through Google's mirror (`~/.gradle/init.d/mirror.gradle`), then `cd android && ./gradlew assembleDebug`.
- Swift can only be syntax-checked here (`swiftc -parse`); real builds happen in the owner's Xcode.

## Owner preferences
- Design matters: check visual changes with screenshots on phone portrait/landscape and desktop before shipping.
- Since 22.11.2026: rare full-screen ads (interstitial) only on a view switch, via `darfVollbild()` in `money.js`:
  not before the 4th switch of a session, at most every 4 min, at most 3 per session, never in the first minute,
  never when ad-free (purchase or 24-h video), and 4 min of rest after any rewarded video. Only shown if preloaded.
  Never advertise full-screen ads in store texts. Extras can be unlocked by video (24 h) or the purchase.
- The banner is also in the calculator view – it must never cover keys and keeps a gap to the bottom key row
  (accidental taps on ads endanger the AdMob account).
- iOS asks for tracking permission natively in `SceneDelegate.swift` (the plugin bridge does not show the dialog
  reliably); `money.js` only waits for the answer.

## Release state
- **22.11.2026 (Abend), Zweig `claude/optimistic-darwin-k01rmb`, NICHT gebaut:** Version 1.3 (Android vc7) / iOS 1.2,
  Web `calcumeter-v14`. Seltene Vollbildwerbung + Extras per Video (Graph als Bild, Verlauf-CSV, Themen Ozean/Abendrot),
  neues Plugin `@capacitor/filesystem` (per `npx cap update` in Gradle/Package.swift eingetragen).
  Interstitial-Blöcke seit 24.11.2026 in `ADMOB.interstitial` (money.js): iOS `…/3523234928`,
  Android `…/8041064436` (leer = Vollbild aus, kein Fehler).
  Store-Datenschutzangaben ändern sich nicht (dieselben AdMob-Daten). Rechtstexte erwähnen die Vollbildwerbung.
- **22.11.2026 (später):** Bitte um Store-Bewertung (`review.js`, `@capacitor-community/in-app-review` 8.0.0):
  nach 10 Rechnungen an mindestens 3 Tagen, höchstens alle 90 Tage, nur nativ. Steckt in Android 1.2 (vc6);
  iOS bekommt sie erst mit der nächsten Version (1.1 war schon eingereicht). Web `calcumeter-v13`.
  **Android 1.2 (vc6) auf `production`, Edit `06246510643727956360` committet** (22.11.2026, gebaut lokal in der
  Cloud-Umgebung „Fal-kie“, die Keystore und Play-Schlüssel als Umgebungsvariablen hat).
- **22.11.2026:** Banner in the calculator view, native tracking prompt. Web `calcumeter-v12` pushed to `gh-pages`.
  **iOS 1.1 (build 16) submitted**, `WAITING_FOR_REVIEW` (`ios-release` run 45038700938, `ios-listing` run 45039772476);
  1.0 (build 15) was live before. Android: banner shipped with 1.2 (vc6), see the entry above (before that Play served
  1.1 / vc5). The three repo secrets for `android-release.yml` exist and work since 22.11.2026 (run 45062174496 built and
  signed; dry run 45064347023 got a Play edit and only failed on the already used versionCode 6).
