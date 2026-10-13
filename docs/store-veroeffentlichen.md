# Calcumeter in den App Store und zu Google Play bringen

Die App ist für die Stores vorbereitet:
- App-Hülle (Capacitor) für Android und iOS
- Widgets: Wechselkurs und Schnellstart
- App-Shortcuts
- Werbung (AdMob: Banner + Belohnungsvideo) und Kauf „Werbefrei“ (RevenueCat)
- Datenschutz/Impressum, Store-Texte (de/en) und Screenshots

Was noch fehlt: **deine IDs, ein paar Klicks in Xcode und das Hochladen.**

Wo was liegt:
- `store/listing/de.json`, `store/listing/en.json` – Name, Untertitel, Beschreibung, Keywords, „Neu“
- `store/screenshots/<sprache>/ios-1…5.png` (1290 × 2796) und `android-1…5.png` (1080 × 1920)
- `store/products.md` – das In-App-Produkt `no_ads`
- `store/privacy-answers.md` – Antworten für App-Datenschutz, Datensicherheit, Altersfreigabe
- `resources/icon.png` – App-Icon 1024 × 1024, `icons/icon-512.png` für Google Play

Die Konten (Apple Developer, Google Play Console, AdMob, RevenueCat) und `app-ads.txt` auf
https://almaz6380.github.io/ hast du von Mountain-Ride schon – sie gelten auch für Calcumeter.

---

## 1. AdMob ✔

Erledigt: Apps „Calcumeter“ (Android und iOS) mit je einem Banner und einem Anzeigenblock „Mit Prämie“ angelegt,
alle IDs sind eingetragen (`money.js` → `MONEY.adUnits`, Android `strings.xml`, iOS `Info.plist`).

Noch zu tun:
- Unter **Datenschutz und Mitteilungen** die DSGVO-Mitteilung und die IDFA-Erklärung um die beiden
  Calcumeter-Apps ergänzen und veröffentlichen.
- `adsTesting` steht seit Version 1.0 (2) auf `false` (echte Anzeigen). Zum Testen auf eigenen Geräten in AdMob das Gerät als Testgerät eintragen.
  Bitte nie auf eigene echte Anzeigen tippen, das kann zur Sperre des AdMob-Kontos führen.
- Nach der Veröffentlichung in AdMob bei beiden Apps „App-Shop-Details hinzufügen“ (Verknüpfung mit dem Store).

## 2. Kauf „Werbefrei“ einrichten

1. In App Store Connect und der Play Console das Produkt aus `store/products.md` anlegen – **ID exakt `no_ads`**.
2. In RevenueCat ein Projekt „Calcumeter“ anlegen, beide Apps verbinden, das Produkt importieren.
3. Die zwei öffentlichen SDK-Keys (`appl_…`, `goog_…`) in `money.js` bei `MONEY.revenueCatKey` eintragen.
   Solange sie leer sind, ist der Kaufbereich im Menü einfach ausgeblendet.

## 3. Empfehlungslink (optional)

Deinen Wise-/Revolut-Empfehlungslink in `currency.js` bei `REFERRAL.url` eintragen. Er erscheint dann im
Währungsrechner unter den Favoriten, gekennzeichnet als „Anzeige“. Leer = nichts sichtbar.

## 4. App bauen

Einmalig auf dem Mac: Node.js (LTS), Xcode, Android Studio. Dann:

```bash
git clone https://github.com/almaz6380/Calcumeter.git
cd Calcumeter
npm install
npm run sync          # baut www/ aus der Web-App und kopiert es in beide App-Projekte
```

Nach jeder Änderung an der Web-App wieder `npm run sync`.

### Android (Google Play)

1. `npm run android` öffnet Android Studio.
2. Testen: Handy per USB anschließen → grüner Play-Knopf. Danach auf dem Homescreen lange drücken →
   **Widgets** → „Wechselkurse“ und „Calcumeter Schnellstart“ ausprobieren; langes Drücken auf das App-Symbol
   zeigt die Shortcuts Währung, Einheiten, Graph.
3. Für den Store: **Build → Generate Signed App Bundle** → neuen Schlüssel anlegen (Datei und Passwörter gut
   aufbewahren) → `release` → `android/app/release/app-release.aab`.
4. Bei jedem Update in `android/app/build.gradle` `versionCode` um 1 erhöhen (und `versionName`).

### iOS (App Store) – ohne eigenen Mac über GitHub Actions

Das Widget-Ziel `CalcumeterWidgets` ist bereits im Xcode-Projekt (`tools/add-widget-target.rb`).
Gebaut und hochgeladen wird auf einem Mac von GitHub (`.github/workflows/ios-release.yml`).

Einmalig:
1. App Store Connect → Benutzer und Zugriff → Integrationen → **App Store Connect API** → Team-Schlüssel **+**
   (Name „GitHub Calcumeter“, Zugriff **App-Manager**) → `.p8` laden, Schlüssel-ID notieren.
2. Team-ID: developer.apple.com → Konto → Mitgliedschaftsdetails (10 Zeichen).
3. GitHub → Repo → Settings → Secrets and variables → Actions → **New repository secret**:
   `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (kompletter Inhalt der .p8). Die Team-ID JU8STVD4SJ steht schon im Projekt.

Jede Version: GitHub → **Actions → iOS Release → Run workflow**. Nach etwa 20 Minuten ist der Build in
App Store Connect (TestFlight), dort auswählen und einreichen. Die Build-Nummer zählt automatisch hoch,
die Version (`MARKETING_VERSION`, 1.0) steht im Xcode-Projekt.

Mit eigenem Mac geht es weiterhin klassisch: `npm run ios` → Xcode → Product → Archive → Distribute App.

## 5. Store-Einträge

**App Store Connect** (Meine Apps → + → Bundle-ID `com.almaz6380.calcumeter`):
- Texte aus `store/listing/de.json` und `en.json` (Lokalisierungen Deutsch und Englisch (USA/UK)).
- Screenshots `store/screenshots/<sprache>/ios-*.png` ins Feld **iPhone 6,9"**.
- Datenschutz-URL, App-Datenschutz, Altersfreigabe: `store/privacy-answers.md`.
- Kategorie: Dienstprogramme (zweite: Finanzen). Preis: kostenlos.

**Google Play Console** (App erstellen → App, kostenlos):
- Store-Eintrag aus `store/listing/<sprache>.json` (`name`, `shortDescription`, `description`).
- Symbol 512 × 512: `icons/icon-512.png`; Screenshots `store/screenshots/<sprache>/android-*.png`.
- Feature-Grafik 1024 × 500: `store/feature-graphic.png`.
- App-Inhalte (Datenschutz, Werbung, Datensicherheit, Zielgruppe, Altersfreigabe): `store/privacy-answers.md`.

## 6. Testen und Einreichen

- **Google:** Neue private Konten brauchen vor der Veröffentlichung einen geschlossenen Test mit mindestens
  12 Testern über 14 Tage (Play Console → Test → Geschlossener Test).
- **Apple:** Build in TestFlight freigeben; den Kauf mit einem Sandbox-Konto testen.

Checkliste:
- [ ] Einwilligungsdialog beim ersten Start (EU), auf dem iPhone danach die Tracking-Frage
- [ ] Banner erscheint in Währung/Einheiten/Graph/Programmierer, **nicht** im Rechner, und verdeckt keine Tasten
- [ ] Menü → „24 Stunden werbefrei“ zeigt ein Video, danach ist das Banner weg
- [ ] „Werbefrei kaufen“ und „Käufe wiederherstellen“ funktionieren (Sandbox / Lizenztester)
- [ ] Wechselkurs-Widget zeigt deine Favoriten (in der App einmal den Währungsrechner öffnen), Tippen öffnet Währung
- [ ] Schnellstart-Widget und App-Shortcuts öffnen den richtigen Bereich
- [ ] Teilen öffnet das System-Teilen-Menü
- [ ] Vor dem Einreichen: echte AdMob-IDs, `adsTesting: false`, RevenueCat-Keys eingetragen
