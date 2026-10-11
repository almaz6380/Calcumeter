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

## 1. AdMob einrichten

1. In AdMob **zwei Apps** anlegen: „Calcumeter“ für Android und für iOS (noch nicht im Store → „Nein“).
2. Pro App **zwei Anzeigenblöcke** anlegen: **Banner** (adaptiv) und **Belohnt** (Rewarded).
3. Unter **Datenschutz und Mitteilungen** die DSGVO-Mitteilung und (iOS) die IDFA-Erklärung auch für die
   neuen Apps veröffentlichen.
4. IDs eintragen (oder mir schicken):
   - App-IDs (`ca-app-pub-…~…`): Android → `android/app/src/main/res/values/strings.xml` (`admob_app_id`),
     iOS → `ios/App/App/Info.plist` (`GADApplicationIdentifier`)
   - Anzeigenblock-IDs (`ca-app-pub-…/…`): in `money.js` bei `MONEY.adUnits`, dort `adsTesting: false` setzen.
5. Bis dahin zeigt die App **Google-Testanzeigen**.

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

### iOS (App Store) – einmalig: Widget-Ziel anlegen

Das Widget braucht in Xcode ein eigenes Ziel. Das geht nur in Xcode, dauert aber nur ein paar Minuten:

1. `npm run ios` öffnet Xcode.
2. **File → New → Target… → iOS → Widget Extension** → Product Name **`CalcumeterWidgets`**.
   Häkchen bei „Include Live Activity“, „Include Control“ und „Include Configuration App Intent“ **entfernen** →
   Finish → die Frage „Activate scheme?“ mit **Cancel** beantworten.
3. Xcode legt einen Ordner `CalcumeterWidgets` mit Beispieldateien an. Darin **alle `.swift`-Dateien löschen**
   (Move to Trash).
4. Die Datei `ios/App/WidgetSource/CalcumeterWidgets.swift` aus dem Finder in diesen Ordner in Xcode ziehen,
   dabei nur das Ziel **CalcumeterWidgets** anhaken.
5. Ziel **CalcumeterWidgets** → General → Minimum Deployments: **iOS 15.0**.
6. Für beide Ziele (**App** und **CalcumeterWidgets**) unter **Signing & Capabilities**: Team = dein Konto,
   dann **+ Capability → App Groups** → Gruppe **`group.com.almaz6380.calcumeter`** anhaken
   (beim App-Ziel ist sie schon eingetragen, dort nur kontrollieren).
   Beim Widget-Ziel kann statt dessen auch `ios/App/WidgetSource/CalcumeterWidgets.entitlements` als
   „Code Signing Entitlements“ eingetragen werden.
7. Beim App-Ziel zusätzlich **+ Capability → In-App Purchase**.

### iOS – bauen und hochladen

1. Testen: iPhone anschließen, oben als Ziel wählen → ▶︎. Widgets: Homescreen lange drücken → **+** → Calcumeter.
   Shortcuts: lange auf das App-Symbol drücken.
2. Für den Store: Ziel „Any iOS Device“ → **Product → Archive** → „Distribute App“ → App Store Connect → Upload.
3. Bei jedem Update unter „General“ **Build** um 1 erhöhen.

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
