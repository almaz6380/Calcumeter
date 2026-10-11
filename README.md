# Calcumeter

Taschenrechner mit wissenschaftlichen Funktionen, Währungs- und Einheitenrechner, Funktionsplotter und Programmierer-Modus als Web-App – ohne Abhängigkeiten, offline-fähig und installierbar (PWA).

Rechnen und installieren: **https://almaz6380.github.io/Calcumeter/**

Veröffentlichen: die App-Dateien auf den Branch `gh-pages` kopieren und pushen.

## Starten

```bash
npm start          # startet einen lokalen Server auf http://localhost:8080
npm test           # führt die Tests des Rechenkerns aus
```

Alternativ `index.html` einfach im Browser öffnen.

## Bedienung

- **Bereiche**: Oben links wechselt der Bereichsschalter zwischen Rechner, Währung, Einheiten, Graph und Programmierer. Dort sind auch die Einstellungen (Design Auto/Hell/Dunkel, Vibration).
- **Design**: Vollbild in Grafit mit Bernstein-Akzent, auf Wunsch hell; die Tasten füllen den Bildschirm. Zahlen erscheinen deutsch (`1.234,5`).
- **Gesten**: Wischen über die Anzeige löscht die letzte Eingabe, langes Drücken auf AC löscht auch den Speicher. Auf Android vibriert jede Taste kurz (abschaltbar).
- **Rechner**: Zuerst sind nur die Grundrechenarten zu sehen. Die wissenschaftlichen Tasten blendet der Knopf **f(x)** ein (Tastatur: Umschalt+S); auf dem Handy erscheinen sie automatisch im Querformat. Grad/Bogenmaß wechselt per Tipp auf DEG/RAD. Funktionsargumente werden mit `;` getrennt, z. B. `log(8;2)`.
- **Währung**: Umrechnung zwischen rund 160 Währungen mit Tageskursen (ExchangeRate-API, ersatzweise EZB). Ohne Netz gelten die zuletzt geladenen bzw. eingebauten EZB-Kurse. Der Betrag wird über die eigene Zifferntastatur eingegeben (am Computer auch per Tastatur, dort mit Rechenzeichen wie `49,90*3` und Enter). **Ans** übernimmt das letzte Rechner-Ergebnis, **→ Rechner** schickt das umgerechnete Ergebnis in den Rechner. Währungen wählt man über ein Auswahlblatt mit Suche; die Liste darunter zeigt eigene Favoriten (Stern entfernt, „+ Währung hinzufügen“ ergänzt).
- **Einheiten**: Länge, Fläche, Volumen, Gewicht, Temperatur, Geschwindigkeit, Zeit, Daten, Energie, Druck – gleiche Bedienung wie der Währungsrechner.
- **Graph**: bis zu drei Funktionen von `x` (Bogenmaß), z. B. `sin(x)` oder `x^2/4−1`. Ziehen verschiebt, Mausrad oder zwei Finger zoomen, Doppeltipp setzt zurück, Tippen auf eine Kurve zeigt den Punkt.
- **Programmierer**: Ganzzahlen in HEX/DEC/OCT/BIN mit 8/16/32/64 Bit (Zweierkomplement), `AND OR XOR NOT << >> mod`, Bit-Ansicht zum Antippen einzelner Bits.

## Funktionen

| Bereich | Umfang |
| --- | --- |
| Grundrechenarten | `+ − × ÷`, Klammern (fehlende `)` werden ergänzt), Punkt-vor-Strich, ± |
| Potenzen & Wurzeln | `x²`, `x³`, `xʸ`, `10ˣ`, `eˣ`, `1/x`, `√`, `∛`, `root(x; n)` |
| Logarithmen | `ln`, `log` (Basis 10), `log(x; b)`, `log₂` |
| Trigonometrie | `sin cos tan`, Umkehrfunktionen (**2nd**), Hyperbelfunktionen (**hyp**), Grad/Bogenmaß |
| Kombinatorik | `n!` (auch Gammafunktion für Dezimalzahlen), `nCr`, `nPr` |
| Weitere | `%` (inkl. `200 + 10 % = 220`), `mod`, `abs`, `round`, `floor`, `ceil`, `gcd`, `lcm`, `min`, `max`, `Rand` |
| Konstanten | `π`, `e`, `φ` (phi), `τ` (tau), `Ans` (letztes Ergebnis), `EXP` für Zehnerpotenzen (`3E8`) |
| Speicher | `MC`, `MR`, `M+`, `M−`, `MS` |
| Komfort | Live-Vorschau, Verlauf (Klick übernimmt Ergebnis, Umschalt+Klick die Rechnung), Ergebnis per Klick kopieren, implizite Multiplikation (`2π`, `3(4+1)`) |

## Tastatur

| Taste | Funktion |
| --- | --- |
| `0–9`, `,` / `.` | Ziffern, Komma |
| `;` | Trennt Funktionsargumente |
| `+ - * / ^ ( ) % !` | Operatoren |
| `Enter` / `=` | Berechnen |
| `Backspace` | Letztes Zeichen bzw. Funktion löschen |
| `Esc` / `Entf` | Alles löschen |
| `Umschalt+H` | Verlauf ein-/ausblenden |
| `Umschalt+S` | Wissenschaftliche Funktionen ein-/ausblenden |
| Buchstaben | Funktionen direkt tippen, z. B. `sqrt(2)`, `sin(30)`, `gcd(12;18)` |

## Aufbau

- `calculator.js` – Rechenkern: Tokenizer, Parser (rekursiver Abstieg, kein `eval`) und Auswertung
- `app.js` – Bedienung, Anzeige, Speicher, Verlauf, Tastatur
- `keypad.js` – gemeinsame Bausteine: Betragseingabe, Auswahlblatt mit Suche, Gesten, Vibration
- `currency.js` – Währungsrechner: Kurse laden und zwischenspeichern, Umrechnung, Favoriten
- `units.js` – Einheitenrechner
- `graph.js` – Funktionsplotter (Canvas)
- `programmer.js` – Programmierer-Rechner (BigInt)
- `index.html`, `style.css` – Oberfläche
- `sw.js`, `manifest.webmanifest`, `icons/` – Offline-Betrieb, Installation und App-Icons
- `test/` – Tests mit dem eingebauten Node-Testrunner
