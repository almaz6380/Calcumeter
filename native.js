/*
 * Calcumeter – Brücke zur Store-App (Capacitor)
 *
 * Im Browser greifen überall Ersatzwege: Teilen über navigator.share oder
 * die Zwischenablage, Bereich-Sprünge über #fx, #units …
 * In der App: Haptics, Share, App (Deep Links) und das eigene Widget-Plugin.
 */
(function (global) {
  'use strict';

  const cap = global.Capacitor;
  const isApp = Boolean(cap && cap.isNativePlatform && cap.isNativePlatform());
  const P = isApp ? cap.Plugins : {};
  const platform = cap && cap.getPlatform ? cap.getPlatform() : 'web';
  const VIEWS = ['calc', 'fx', 'units', 'graph', 'prog'];

  // Teilen; liefert 'shared', 'copied', 'cancelled' oder 'failed'
  async function share({ text, url }) {
    try {
      if (isApp && P.Share) {
        await P.Share.share({ text, url });
        return 'shared';
      }
      if (navigator.share) {
        await navigator.share({ text, url });
        return 'shared';
      }
    } catch (e) {
      const msg = String((e && (e.name || e.message)) || '');
      if (/abort|cancel/i.test(msg)) return 'cancelled';
    }
    try {
      await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
      return 'copied';
    } catch (_) {
      return 'failed';
    }
  }

  function haptic() {
    if (P.Haptics) P.Haptics.impact({ style: 'LIGHT' }).catch(() => {});
  }

  // Bereich aus "calcumeter://view/fx", ".../#fx" oder "fx" lesen
  function viewFromUrl(url) {
    const m = /(?:view\/|#)(\w+)/.exec(String(url || ''));
    return m && VIEWS.includes(m[1]) ? m[1] : null;
  }

  // Ruft cb(bereich) beim Start und bei jedem späteren Öffnen über Link/Widget/Shortcut
  function onOpenView(cb) {
    const start = viewFromUrl(location.hash);
    if (start) cb(start);
    addEventListener('hashchange', () => {
      const v = viewFromUrl(location.hash);
      if (v) cb(v);
    });
    if (isApp && P.App) {
      P.App.getLaunchUrl().then((r) => { const v = r && viewFromUrl(r.url); if (v) cb(v); }).catch(() => {});
      P.App.addListener('appUrlOpen', ({ url }) => { const v = viewFromUrl(url); if (v) cb(v); });
    }
  }

  // Daten für die Homescreen-Widgets (Kurse, Favoriten); im Browser ohne Wirkung
  function widgetData(data) {
    if (isApp && P.WidgetBridge) P.WidgetBridge.setData({ json: JSON.stringify(data) }).catch(() => {});
  }

  global.Native = { isApp, platform, plugins: P, share, haptic, onOpenView, widgetData, viewFromUrl };
})(typeof self !== 'undefined' ? self : this);
