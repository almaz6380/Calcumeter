/*
 * Calcumeter – Bitte um eine Store-Bewertung (seit 1.2 / iOS 1.2)
 *
 * Ohne Gegenleistung: Apple (5.6.1) und Google verbieten, eine Bewertung an eine
 * Belohnung zu koppeln oder das Ergebnis abzufragen. Ob der Dialog erscheint,
 * entscheidet das System (iOS höchstens dreimal im Jahr), es meldet nichts zurück.
 *
 * Wann gefragt wird:
 *  - erst nach 10 Rechnungen UND an mindestens 3 verschiedenen Tagen – wer so
 *    oft wiederkommt, nutzt die App wirklich;
 *  - danach höchstens alle 90 Tage (eigene Bremse);
 *  - nur in der Store-App, im Browser gibt es keinen Store.
 *  - nie direkt nach einer Vollbildwerbung oder einem Belohnungsvideo (seit 1.3, Money.vollbildGerade).
 */
(function (global) {
  'use strict';

  const AB_RECHNUNGEN = 10;
  const AB_TAGEN = 3;
  const ABSTAND_MS = 90 * 24 * 60 * 60 * 1000;
  const KEY = 'calcumeter.review';

  function darfFragen(stand, jetzt) {
    if (stand.rechnungen < AB_RECHNUNGEN) return false;
    if (stand.tage.length < AB_TAGEN) return false;
    if (stand.zuletzt > 0 && jetzt - stand.zuletzt < ABSTAND_MS) return false;
    return true;
  }

  function tag(d) {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function lade() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || '{}');
      return {
        rechnungen: Number.isFinite(o.rechnungen) ? o.rechnungen : 0,
        tage: Array.isArray(o.tage) ? o.tage.slice(-AB_TAGEN) : [],
        zuletzt: Number.isFinite(o.zuletzt) ? o.zuletzt : 0,
      };
    } catch (_) {
      return { rechnungen: 0, tage: [], zuletzt: 0 };
    }
  }

  // Nach jeder ausgerechneten Rechnung aufrufen.
  function gerechnet() {
    const cap = global.Capacitor;
    const nativ = Boolean(cap && cap.isNativePlatform && cap.isNativePlatform());
    const plugin = nativ && cap.Plugins ? cap.Plugins.InAppReview : null;
    const stand = lade();
    const jetzt = Date.now();
    stand.rechnungen += 1;
    const heute = tag(new Date(jetzt));
    if (!stand.tage.includes(heute)) stand.tage = stand.tage.concat(heute).slice(-AB_TAGEN);
    const kurzNachWerbung = Boolean(global.Money && global.Money.vollbildGerade && global.Money.vollbildGerade());
    const fragen = Boolean(plugin) && !kurzNachWerbung && darfFragen(stand, jetzt);
    if (fragen) stand.zuletzt = jetzt;
    try { localStorage.setItem(KEY, JSON.stringify(stand)); } catch (_) { /* dann nie */ }
    if (!fragen) return;
    // Erst wenn das Ergebnis dasteht, nicht mitten in die Eingabe.
    setTimeout(() => { plugin.requestReview().catch(() => {}); }, 1200);
  }

  global.Review = { gerechnet, darfFragen, AB_RECHNUNGEN, AB_TAGEN, ABSTAND_MS };
})(typeof self !== 'undefined' ? self : this);
