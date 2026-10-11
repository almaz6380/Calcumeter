/*
 * Calcumeter – Sprachen (Deutsch, Englisch)
 *
 * Die Oberfläche ist auf Deutsch geschrieben. Für Englisch übersetzt apply()
 * Texte und aria-label/title/placeholder anhand des deutschen Originals;
 * Skripte holen ihre Texte über t('deutscher Text').
 * Zahlen folgen der Sprache: Deutsch 1.234,5 mit ";" zwischen Argumenten,
 * Englisch 1,234.5 mit ",".
 */
(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.I18n = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EN = {
    // Kopfzeile, Verlauf, Menü
    'Verlauf': 'History',
    'Leeren': 'Clear',
    'Verlauf schließen': 'Close history',
    'Noch keine Berechnungen.': 'No calculations yet.',
    'Bereich wechseln': 'Switch section',
    'Rechner': 'Calculator',
    'Winkelmaß': 'Angle unit',
    'Wissenschaftliche Funktionen einblenden': 'Show scientific functions',
    'Wissenschaftliche Funktionen ausblenden': 'Hide scientific functions',
    'Wissenschaftliche Funktionen (Umschalt+S)': 'Scientific functions (Shift+S)',
    'Verlauf anzeigen': 'Show history',
    'Verlauf (Umschalt+H)': 'History (Shift+H)',
    'Kurse aktualisieren': 'Refresh rates',
    'Winkelmaß umschalten': 'Toggle angle unit',
    'Ergebnis teilen': 'Share result',
    'Teilen': 'Share',
    'Bereiche': 'Sections',
    'Schließen': 'Close',
    'Grundrechenarten und wissenschaftliche Funktionen': 'Basic arithmetic and scientific functions',
    'Währung': 'Currency',
    'Rund 160 Währungen mit Tageskursen': 'About 160 currencies with daily rates',
    'Einheiten': 'Units',
    'Länge, Gewicht, Temperatur, Daten und mehr': 'Length, weight, temperature, data and more',
    'Graph': 'Graph',
    'Funktionen zeichnen und Werte ablesen': 'Plot functions and read off values',
    'Programmierer': 'Programmer',
    'HEX, DEC, OCT, BIN und Bitoperationen': 'HEX, DEC, OCT, BIN and bitwise operations',
    'Einstellungen': 'Settings',
    'Design': 'Theme',
    'Auto': 'Auto',
    'Hell': 'Light',
    'Dunkel': 'Dark',
    'Sprache': 'Language',
    'Vibration beim Tippen': 'Vibrate on tap',
    'Tipp: Über die Anzeige wischen löscht die letzte Eingabe, AC lange drücken löscht auch den Speicher.':
      'Tip: Swipe across the display to delete the last input, long-press AC to clear the memory too.',
    'Datenschutz': 'Privacy',
    'Impressum': 'Legal notice',
    'Werbung': 'Ads',
    '24 Stunden werbefrei': '24 hours ad-free',
    'Kurzes Video ansehen': 'Watch a short video',
    'Werbefrei kaufen': 'Remove ads',
    'Einmalig, für immer ohne Werbung': 'One-time purchase, ad-free forever',
    'Käufe wiederherstellen': 'Restore purchases',
    'Werbefrei bis {time}': 'Ad-free until {time}',
    'Danke! Die App ist jetzt werbefrei.': 'Thank you! The app is now ad-free.',
    'Kein Video verfügbar, bitte später erneut versuchen.': 'No video available, please try again later.',
    'Kauf nicht möglich.': 'Purchase not possible.',
    'Keine Käufe gefunden.': 'No purchases found.',
    // Rechner
    'Eingabe': 'Input',
    'Klicken zum Kopieren': 'Click to copy',
    'Ergebnis': 'Result',
    'Speicher': 'Memory',
    'Speicher löschen': 'Memory clear',
    'Speicher abrufen': 'Memory recall',
    'Zum Speicher addieren': 'Add to memory',
    'Vom Speicher abziehen': 'Subtract from memory',
    'Im Speicher ablegen': 'Memory store',
    'Wissenschaftliche Funktionen': 'Scientific functions',
    'Trennt Funktionsargumente, z. B. log(8;2)': 'Separates function arguments, e.g. log(8,2)',
    'Zehnerpotenz (z. B. 3E8)': 'Power of ten (e.g. 3E8)',
    'Ziffern und Grundrechenarten': 'Digits and basic operations',
    'Löschen': 'Delete',
    'Vorzeichen wechseln': 'Change sign',
    'Komma': 'Decimal point',
    'Speicher gelöscht': 'Memory cleared',
    'Kopiert': 'Copied',
    'Kopieren nicht möglich': 'Copying not possible',
    'Alles gelöscht': 'Everything cleared',
    'Ergebnis übernehmen (Umschalt+Klick: Rechnung übernehmen)': 'Use result (Shift+click: use calculation)',
    // Währung und Einheiten
    'Ausgangswährung wählen': 'Choose source currency',
    'Zielwährung wählen': 'Choose target currency',
    'Ausgangswährung': 'Source currency',
    'Zielwährung': 'Target currency',
    'Betrag': 'Amount',
    'Währungen tauschen': 'Swap currencies',
    'Tauschen': 'Swap',
    'Kurse werden geladen …': 'Loading rates …',
    'Aktualisiere …': 'Updating …',
    'Offline': 'Offline',
    'Favoriten': 'Favourites',
    'Alle Währungen': 'All currencies',
    'Favorit hinzufügen': 'Add favourite',
    '+ Währung hinzufügen': '+ Add currency',
    'Aus Favoriten entfernen': 'Remove from favourites',
    '{code} aus den Favoriten entfernen': 'Remove {code} from favourites',
    '{code} als Zielwährung wählen': 'Use {code} as target currency',
    '{code} entfernt': '{code} removed',
    'Betrag eingeben': 'Enter amount',
    'Letztes Rechner-Ergebnis übernehmen': 'Use last calculator result',
    'Ergebnis in den Rechner übernehmen': 'Send result to the calculator',
    '→ Rechner': '→ Calc',
    'Anzeige': 'Ad',
    'Geld ins Ausland senden – oft günstiger als die Bank': 'Send money abroad – often cheaper than your bank',
    'Kategorie': 'Category',
    'Ausgangseinheit wählen': 'Choose source unit',
    'Zieleinheit wählen': 'Choose target unit',
    'Wert': 'Value',
    'Einheiten tauschen': 'Swap units',
    'Weitere Einheiten': 'More units',
    'Wert eingeben': 'Enter value',
    '{name}: von': '{name}: from',
    '{name}: nach': '{name}: to',
    '{name} als Zieleinheit wählen': 'Use {name} as target unit',
    'bei': 'at',
    'Suchen …': 'Search …',
    'Nichts gefunden.': 'Nothing found.',
    // Graph
    'Funktionsplotter': 'Function plotter',
    'z. B. sin(x)': 'e.g. sin(x)',
    'z. B. x^2−1': 'e.g. x^2−1',
    'leer lassen oder eingeben': 'leave empty or enter',
    'Schnelleingabe': 'Quick input',
    'Winkel im Bogenmaß · ziehen zum Verschieben, zwei Finger oder Mausrad zum Zoomen, tippen für Werte':
      'Angles in radians · drag to pan, two fingers or mouse wheel to zoom, tap for values',
    'Graph der eingegebenen Funktionen': 'Graph of the entered functions',
    'Vergrößern': 'Zoom in',
    'Verkleinern': 'Zoom out',
    'Ansicht zurücksetzen': 'Reset view',
    // Programmierer
    'Wortbreite wechseln': 'Change word size',
    'Bits': 'Bits',
    'Zahlensystem': 'Number base',
    'Tastatur': 'Keypad',
    // Fehler aus den Rechenkernen
    'Mathefehler': 'Math error',
    'Syntaxfehler': 'Syntax error',
    'Überlauf': 'Overflow',
    'Division durch 0': 'Division by zero',
    'Keine Eingabe': 'No input',
    'Ungültige Ziffer': 'Invalid digit',
    'Negative Verschiebung': 'Negative shift',
    'Fehler': 'Error',
    // Teilen
    'berechnet mit Calcumeter': 'calculated with Calcumeter',
    'Kurs vom {date}': 'rate of {date}',
  };

  // Meldungen mit variablem Teil: deutsches Präfix → englisches Präfix
  const PREFIXES = [['Unbekannt: ', 'Unknown: '], ['Ungültiges Zeichen: ', 'Invalid character: ']];

  const LOCALES = {
    de: { lang: 'de', intl: 'de-DE', decimal: ',', group: '.', argSep: ';' },
    en: { lang: 'en', intl: 'en-GB', decimal: '.', group: ',', argSep: ',' },
  };

  let lang = 'de';
  const listeners = [];

  function detect() {
    const nav = typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language || 'de']) : ['de'];
    return String(nav[0] || 'de').toLowerCase().startsWith('de') ? 'de' : 'en';
  }

  function format(s, vars) {
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
  }

  // Deutscher Text → Text in der aktuellen Sprache
  function t(de, vars) {
    if (lang === 'de') return format(de, vars);
    if (de in EN) return format(EN[de], vars);
    for (const [p, q] of PREFIXES) if (de.startsWith(p)) return q + de.slice(p.length);
    return format(de, vars);
  }

  // Statische Texte der Seite übersetzen; das deutsche Original bleibt gemerkt
  const originals = new WeakMap();
  const ATTRS = ['aria-label', 'title', 'placeholder'];

  function apply(root) {
    if (typeof document === 'undefined') return;
    const top = root || document.body;
    document.documentElement.lang = lang;
    const walker = document.createTreeWalker(top, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const p = n.parentElement;
      if (!p || p.closest('script, style, [data-no-i18n]')) continue;
      if (!originals.has(n)) {
        if (!/[A-Za-zÄÖÜäöüß]{2}/.test(n.nodeValue)) continue;
        originals.set(n, n.nodeValue);
      }
      const orig = originals.get(n);
      const core = orig.trim();
      n.nodeValue = orig.replace(core, t(core));
    }
    for (const el of top.querySelectorAll('[aria-label], [title], [placeholder]')) {
      if (el.closest('[data-no-i18n]')) continue;
      let store = originals.get(el);
      if (!store) {
        store = {};
        for (const a of ATTRS) if (el.hasAttribute(a)) store[a] = el.getAttribute(a);
        originals.set(el, store);
      }
      for (const a of ATTRS) if (a in store) el.setAttribute(a, t(store[a]));
    }
  }

  function setLang(next) {
    lang = next === 'en' ? 'en' : next === 'de' ? 'de' : detect();
    apply();
    listeners.forEach((cb) => cb(lang));
  }

  return {
    EN,
    t,
    apply,
    setLang,
    detect,
    getLang: () => lang,
    locale: () => LOCALES[lang],
    onChange: (cb) => listeners.push(cb),
  };
});
