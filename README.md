# Calcumeter

Taschenrechner mit wissenschaftlichen Funktionen und Währungsrechner als Web-App – ohne Abhängigkeiten, offline-fähig und installierbar (PWA).

Rechnen und installieren: **https://almaz6380.github.io/Calcumeter/**

Veröffentlichen: die App-Dateien auf den Branch `gh-pages` kopieren und pushen.

## Starten

```bash
npm start          # startet einen lokalen Server auf http://localhost:8080
npm test           # führt die Tests des Rechenkerns aus
```

Alternativ `index.html` einfach im Browser öffnen.

## Bedienung

- **Design**: Vollbild in Grafit mit Bernstein-Akzent; die Tasten füllen den Bildschirm. Zahlen erscheinen deutsch (`1.234,5`).
- **Rechner**: Zuerst sind nur die Grundrechenarten zu sehen. Die wissenschaftlichen Tasten blendet der Knopf **f(x)** ein (Tastatur: Umschalt+S); auf dem Handy erscheinen sie automatisch im Querformat. Grad/Bogenmaß wechselt per Tipp auf DEG/RAD. Funktionsargumente werden mit `;` getrennt, z. B. `log(8;2)`.
- **Währung**: Umrechnung zwischen rund 160 Währungen mit Tageskursen (ExchangeRate-API, ersatzweise EZB). Ohne Netz gelten die zuletzt geladenen bzw. eingebauten EZB-Kurse. Der Betrag wird über die eigene Zifferntastatur eingegeben (am Computer auch per Tastatur, dort mit Rechenzeichen wie `49,90*3` und Enter). **Ans** übernimmt das letzte Rechner-Ergebnis, **→ Rechner** schickt das umgerechnete Ergebnis in den Rechner.

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
| Komfort | Live-Vorschau, Verlauf (Klick übernimmt Ergebnis, Umschalt+Klick die Rechnung), Ergebnis per Klick kopieren, implizite Multiplikation (`2π`, `3(4+1)`), Hell/Dunkel nach Systemeinstellung |

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
- `currency.js` – Währungsrechner: Kurse laden und zwischenspeichern, Umrechnung
- `index.html`, `style.css` – Oberfläche
- `sw.js`, `manifest.webmanifest`, `icon.svg` – Offline-Betrieb und Installation
- `test/` – Tests mit dem eingebauten Node-Testrunner
