# Antworten für die Store-Fragebögen

Datenschutzerklärung (für beide Stores): https://almaz6380.github.io/Calcumeter/privacy.html
Support-/Marketing-URL: https://almaz6380.github.io/Calcumeter/
Impressum: https://almaz6380.github.io/Calcumeter/imprint.html · Kontakt: kontakt@wellbooked.at

## Apple – App-Datenschutz (App Store Connect → App-Datenschutz)

„Werden Daten erfasst?“ → **Ja**. Folgende Datentypen anhaken:

| Datentyp (Apple) | Zweck | Mit Identität verknüpft? | Zum Tracking? | Wer |
|---|---|---|---|---|
| Kennungen → **Geräte-ID** | Werbung durch Drittanbieter | Nein | **Ja** | AdMob (Werbe-ID, nur nach ATT-Zustimmung) |
| Kennungen → **Nutzer-ID** | App-Funktionalität | Nein | Nein | RevenueCat (zufällige App-Nutzer-ID für den Kauf) |
| Standort → **Ungefährer Standort** | Werbung durch Drittanbieter | Nein | Ja | AdMob (aus der IP-Adresse) |
| Nutzungsdaten → **Produktinteraktion**, **Werbedaten** | Werbung durch Drittanbieter, Analysen | Nein | Ja | AdMob |
| Diagnose → **Absturzdaten**, **Leistungsdaten** | App-Funktionalität | Nein | Nein | Google Mobile Ads SDK |
| Käufe → **Kaufhistorie** | App-Funktionalität | Nein | Nein | RevenueCat |

Nicht erfasst: Kontaktdaten, Gesundheit, Finanzinfos, genauer Standort, Kontakte, Nutzerinhalte, Browser-/Suchverlauf.
Rechnungen, Verlauf, Favoriten und Einstellungen bleiben auf dem Gerät. Der Abruf der Wechselkurse überträgt keine Nutzerdaten.

Tracking: **Ja** (nur mit Zustimmung über die App-Tracking-Abfrage; die App fragt beim ersten Start).

## Google Play – Datensicherheit (Play Console → App-Inhalte → Datensicherheit)

- Werden Daten erhoben oder geteilt? **Ja**
- Werden alle Daten bei der Übertragung verschlüsselt? **Ja** (HTTPS)
- Können Nutzer das Löschen ihrer Daten beantragen? **Ja** (per E-Mail, siehe Datenschutzerklärung)

| Datentyp (Google) | Erhoben | Geteilt | Zweck | Optional? |
|---|---|---|---|---|
| Standort → Ungefährer Standort | Ja | Ja (AdMob) | Werbung | Nein |
| App-Aktivitäten → App-Interaktionen | Ja | Ja (AdMob) | Werbung, Analysen | Nein |
| App-Informationen und Leistung → Absturzprotokolle, Diagnose | Ja | Ja (AdMob) | App-Funktionen | Nein |
| Geräte- oder andere IDs | Ja | Ja (AdMob) | Werbung | Nein |
| Finanzinformationen → Kaufverlauf | Ja | Nein | App-Funktionen | Nein |

## Weitere Angaben

- **Werbung enthalten:** Ja (Google Play: „Enthält Anzeigen“).
- **Zielgruppe:** ab 13 Jahren; nicht für Kinder gestaltet (keine Teilnahme an „Für Kinder“/Families).
- **Altersfreigabe:** Fragebogen überall „Nein“ (keine Gewalt, keine Glücksspiele, keine Nutzerinhalte) → USK 0 / PEGI 3 / Apple 4+.
- **Kategorie:** Apple: Dienstprogramme (zweite: Finanzen) · Google: Tools.
- **Export-Compliance (Apple):** keine eigene Verschlüsselung (`ITSAppUsesNonExemptEncryption` = false ist gesetzt).
