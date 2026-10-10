# Calcumeter

Wissenschaftlicher Taschenrechner als Web-App – ohne Abhängigkeiten, offline-fähig und installierbar (PWA).

## Starten

```bash
npm start          # startet einen lokalen Server auf http://localhost:8080
npm test           # führt die Tests des Rechenkerns aus
```

Alternativ `index.html` einfach im Browser öffnen.

## Funktionen

| Bereich | Umfang |
| --- | --- |
| Grundrechenarten | `+ − × ÷`, Klammern (fehlende `)` werden ergänzt), Punkt-vor-Strich, ± |
| Potenzen & Wurzeln | `x²`, `x³`, `xʸ`, `10ˣ`, `eˣ`, `1/x`, `√`, `∛`, `root(x, n)` |
| Logarithmen | `ln`, `log` (Basis 10), `log(x, b)`, `log₂` |
| Trigonometrie | `sin cos tan`, Umkehrfunktionen (**2nd**), Hyperbelfunktionen (**hyp**), Grad/Bogenmaß |
| Kombinatorik | `n!` (auch Gammafunktion für Dezimalzahlen), `nCr`, `nPr` |
| Weitere | `%` (inkl. `200 + 10 % = 220`), `mod`, `abs`, `round`, `floor`, `ceil`, `gcd`, `lcm`, `min`, `max`, `Rand` |
| Konstanten | `π`, `e`, `φ` (phi), `τ` (tau), `Ans` (letztes Ergebnis), `EXP` für Zehnerpotenzen (`3E8`) |
| Speicher | `MC`, `MR`, `M+`, `M−`, `MS` |
| Komfort | Live-Vorschau, Verlauf (Klick übernimmt Ergebnis, Umschalt+Klick die Rechnung), Ergebnis per Klick kopieren, implizite Multiplikation (`2π`, `3(4+1)`), Hell/Dunkel nach Systemeinstellung |

## Tastatur

| Taste | Funktion |
| --- | --- |
| `0–9`, `.` / `,` | Ziffern, Dezimalpunkt |
| `+ - * / ^ ( ) % !` | Operatoren |
| `Enter` / `=` | Berechnen |
| `Backspace` | Letztes Zeichen bzw. Funktion löschen |
| `Esc` / `Entf` | Alles löschen |
| `Umschalt+H` | Verlauf ein-/ausblenden |
| Buchstaben | Funktionen direkt tippen, z. B. `sqrt(2)`, `sin(30)`, `gcd(12,18)` |

## Aufbau

- `calculator.js` – Rechenkern: Tokenizer, Parser (rekursiver Abstieg, kein `eval`) und Auswertung
- `app.js` – Bedienung, Anzeige, Speicher, Verlauf, Tastatur
- `index.html`, `style.css` – Oberfläche
- `sw.js`, `manifest.webmanifest`, `icon.svg` – Offline-Betrieb und Installation
- `test/` – Tests mit dem eingebauten Node-Testrunner
