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
- `native.js` – bridge to Capacitor (share, haptics, deep links `calcumeter://view/<view>` and `#<view>`,
  `widgetData`). `money.js` – AdMob banner (not in the calculator view) + rewarded video (24 h ad-free) +
  RevenueCat `no_ads`; test ids until release. Both do nothing on the web.
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
7. iOS release without a Mac: GitHub Actions workflow `.github/workflows/ios-release.yml` (macos-15, automatic cloud signing
   with an Admin-role App Store Connect API key from repo secrets `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `APPLE_TEAM_ID`;
   exports with `destination=upload`). Trigger via the GitHub MCP (`actions_run_trigger`), read logs with `get_job_logs`.
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
- No ads in the calculator itself and no full-screen ads.
