/*
 * Calcumeter – Währungsrechner
 *
 * Tageskurse (Basis EUR) von ExchangeRate-API, ersatzweise von der EZB
 * über Frankfurter. Ohne Netz werden die zuletzt geladenen Kurse oder
 * die eingebauten EZB-Kurse verwendet.
 */
(function (global, factory) {
  const keypad = typeof module === 'object' && module.exports ? require('./keypad.js') : global.Keypad;
  const api = factory(keypad);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.Fx = api;
})(typeof self !== 'undefined' ? self : this, function (Keypad) {
  'use strict';

  const RATES_KEY = 'calcumeter.fx.rates';
  const PREFS_KEY = 'calcumeter.fx.prefs';
  const MAX_AGE = 6 * 60 * 60 * 1000;

  // EZB-Referenzkurse vom 09.10.2026 als Rückfall ohne Netz
  const FALLBACK = {
    base: 'EUR',
    date: '2026-10-09',
    source: 'EZB (eingebaut)',
    rates: {
      EUR: 1, AUD: 1.6052, BRL: 5.6086, CAD: 1.5942, CHF: 0.9313, CNY: 7.4992,
      CZK: 24.369, DKK: 7.4751, GBP: 0.84763, HKD: 8.794, HUF: 365.08,
      IDR: 20036.94, ILS: 3.426, INR: 108.3965, ISK: 136.8, JPY: 177.34,
      KRW: 1503.27, MXN: 20.395, MYR: 4.5777, NOK: 10.7155, NZD: 1.9961,
      PHP: 70.397, PLN: 4.3835, RON: 5.3406, SEK: 11.1675, SGD: 1.4348,
      THB: 37.574, TRY: 55.1033, USD: 1.1206, ZAR: 18.527,
    },
  };

  const POPULAR = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'TRY', 'PLN', 'CNY', 'CAD', 'AUD', 'SEK', 'CZK'];
  const DEFAULT_FAVORITES = ['USD', 'GBP', 'CHF', 'JPY', 'TRY', 'PLN', 'CNY', 'CAD'];

  // Empfehlungslink unter der Favoritenliste (als Anzeige gekennzeichnet).
  // Solange url leer ist, erscheint nichts.
  const REFERRAL = { url: '', text: 'Geld ins Ausland senden – oft günstiger als die Bank' };

  // ---------- Reine Logik ----------

  function convert(amount, from, to, rates) {
    if (!(from in rates) || !(to in rates)) throw new Error('Unbekannte Währung');
    return (amount / rates[from]) * rates[to];
  }

  // Deutsche Schreibweise erlauben: "1.234,50" und "49,90*3"
  const { normalizeAmount } = Keypad;

  // ---------- Kurse laden ----------

  async function getJSON(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchRates() {
    try {
      const d = await getJSON('https://open.er-api.com/v6/latest/EUR');
      if (d.result !== 'success' || !d.rates) throw new Error('Ungültige Antwort');
      return {
        base: 'EUR',
        date: new Date(d.time_last_update_unix * 1000).toISOString(),
        source: 'ExchangeRate-API',
        rates: d.rates,
      };
    } catch (_) {
      const d = await getJSON('https://api.frankfurter.dev/v1/latest?base=EUR');
      return { base: 'EUR', date: d.date, source: 'EZB', rates: { EUR: 1, ...d.rates } };
    }
  }

  // ---------- Oberfläche ----------

  const BADGE_COLORS = ['#8FB8FF', '#8BE3A6', '#FFB547', '#FF9C8A', '#C9AEFF', '#7FDCE0', '#F2D16B'];

  function badgeColor(code) {
    let h = 0;
    for (const c of code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return BADGE_COLORS[h % BADGE_COLORS.length];
  }

  function init(hub) {
    const $ = (id) => document.getElementById(id);
    const el = {
      view: $('view-fx'),
      amount: $('fx-amount'), result: $('fx-result'),
      fromCode: $('fx-from-code'), toCode: $('fx-to-code'),
      fromName: $('fx-from-name'), toName: $('fx-to-name'),
      fromBadge: $('fx-from-badge'), toBadge: $('fx-to-badge'),
      rate: $('fx-rate'), list: $('fx-list'), status: $('fx-status-text'),
      swap: $('fx-swap'), refresh: $('fx-refresh'),
    };
    const { evaluate } = window.Calc;
    const t = (str, vars) => window.I18n.t(str, vars);
    const intl = () => window.I18n.locale().intl;

    let data = FALLBACK;
    let offline = false;
    let loading = null;
    let lastValue = null;
    const prefs = { from: 'EUR', to: 'USD', amount: '100', favorites: DEFAULT_FAVORITES.slice() };

    try {
      const saved = JSON.parse(localStorage.getItem(RATES_KEY) || 'null');
      if (saved && saved.rates) data = saved;
      Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'));
    } catch (_) { /* ohne Speicher weiter */ }
    // Betrag intern mit Punkt; frühere Versionen speicherten deutsch ("12,5")
    prefs.amount = normalizeAmount(String(prefs.amount));
    if (!Array.isArray(prefs.favorites)) prefs.favorites = DEFAULT_FAVORITES.slice();

    const savePrefs = () => {
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) { /* ignorieren */ }
    };

    const nameCache = {};
    const nameOf = (code) => {
      const lang = window.I18n.getLang();
      try {
        if (!nameCache[lang]) nameCache[lang] = new Intl.DisplayNames([lang], { type: 'currency' });
        return nameCache[lang].of(code) || code;
      } catch (_) { return code; }
    };

    const symbolOf = (code) => {
      try {
        const part = new Intl.NumberFormat(intl(), { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' })
          .formatToParts(0).find((p) => p.type === 'currency');
        return part ? part.value : code;
      } catch (_) { return code; }
    };

    const money = (value, code) => {
      try {
        return new Intl.NumberFormat(intl(), { style: 'currency', currency: code }).format(value);
      } catch (_) {
        return `${new Intl.NumberFormat(intl(), { maximumFractionDigits: 2 }).format(value)} ${code}`;
      }
    };
    const plain = (value, code) => {
      if (value !== 0 && Math.abs(value) < 0.01) {
        return new Intl.NumberFormat(intl(), { maximumSignificantDigits: 4 }).format(value);
      }
      let frac = 2;
      try {
        frac = new Intl.NumberFormat(intl(), { style: 'currency', currency: code })
          .resolvedOptions().maximumFractionDigits;
      } catch (_) { /* Standard: 2 Nachkommastellen */ }
      return new Intl.NumberFormat(intl(), { minimumFractionDigits: frac, maximumFractionDigits: frac }).format(value);
    };
    const rateFmt = { format: (v) => new Intl.NumberFormat(intl(), { maximumSignificantDigits: 5 }).format(v) };

    function ensureKnown() {
      if (!(prefs.from in data.rates)) prefs.from = 'EUR';
      if (!(prefs.to in data.rates)) prefs.to = 'USD';
    }

    function amountValue() {
      const text = prefs.amount.trim();
      if (text === '' || text === '-') return { value: 0 };
      try {
        return { value: evaluate(normalizeAmount(text)) };
      } catch (e) {
        return { error: e.message };
      }
    }

    function setBadge(node, code) {
      const sym = symbolOf(code);
      node.textContent = sym.length > 2 ? code : sym;
      node.classList.toggle('long', sym.length > 2);
      node.style.background = badgeColor(code);
    }

    function listRow(c, base, from) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fx-li';
      btn.dataset.code = c;
      btn.title = t('{code} als Zielwährung wählen', { code: c });
      const left = document.createElement('span');
      const code = document.createElement('strong');
      code.className = 'fx-li-code';
      code.textContent = c;
      const name = document.createElement('span');
      name.className = 'fx-li-name';
      name.textContent = nameOf(c);
      left.append(code, name);
      const right = document.createElement('span');
      right.className = 'fx-li-val';
      right.textContent = money(convert(base, from, c, data.rates), c);
      btn.append(left, right);
      const star = document.createElement('button');
      star.type = 'button';
      star.className = 'fx-star';
      star.dataset.unfav = c;
      star.setAttribute('aria-label', t('{code} aus den Favoriten entfernen', { code: c }));
      star.title = t('Aus Favoriten entfernen');
      star.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>';
      li.append(btn, star);
      return li;
    }

    function render() {
      ensureKnown();
      const { from, to } = prefs;
      const { value, error } = amountValue();
      el.amount.textContent = Keypad.groupTyped(prefs.amount);
      el.amount.classList.toggle('invalid', Boolean(error));
      if (error) {
        el.result.textContent = '–';
        lastValue = null;
      } else {
        const out = convert(value, from, to, data.rates);
        el.result.textContent = plain(out, to);
        lastValue = out;
      }
      el.fromCode.textContent = from;
      el.toCode.textContent = to;
      el.fromName.textContent = nameOf(from);
      el.toName.textContent = nameOf(to);
      setBadge(el.fromBadge, from);
      setBadge(el.toBadge, to);
      el.rate.textContent = `1 ${from} = ${rateFmt.format(convert(1, from, to, data.rates))} ${to}`;

      const base = error ? 0 : value;
      const rows = prefs.favorites
        .filter((c) => c in data.rates && c !== from && c !== to)
        .map((c) => listRow(c, base, from));
      const addLi = document.createElement('li');
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'fx-add';
      add.textContent = t('+ Währung hinzufügen');
      addLi.append(add);
      const extra = [addLi];
      if (REFERRAL.url) {
        const refLi = document.createElement('li');
        refLi.className = 'fx-ref';
        const a = document.createElement('a');
        a.href = REFERRAL.url;
        a.target = '_blank';
        a.rel = 'sponsored noopener noreferrer';
        const tag = document.createElement('span');
        tag.className = 'ad-tag';
        tag.textContent = t('Anzeige');
        const txt = document.createElement('span');
        txt.textContent = `${t(REFERRAL.text)} →`;
        a.append(tag, txt);
        refLi.append(a);
        extra.push(refLi);
      }
      el.list.replaceChildren(...rows, ...extra);

      const when = new Date(data.date);
      const dateText = Number.isNaN(when.getTime()) ? data.date
        : when.toLocaleDateString(intl(), { day: '2-digit', month: '2-digit', year: 'numeric' });
      el.status.textContent = loading ? t('Aktualisiere …')
        : `${offline ? `${t('Offline')} · ` : ''}${data.source.replace(' (eingebaut)', '')} · ${dateText}`;

      if (!el.view.hidden) {
        hub.fitText(el.amount, 18);
        hub.fitText(el.result, 18);
      }
    }

    async function refresh(force) {
      if (loading) return loading;
      const age = Date.now() - (data.fetchedAt || 0);
      if (!force && data !== FALLBACK && age < MAX_AGE) return null;
      loading = fetchRates()
        .then((fresh) => {
          data = { ...fresh, fetchedAt: Date.now() };
          offline = false;
          try { localStorage.setItem(RATES_KEY, JSON.stringify(data)); } catch (_) { /* ignorieren */ }
        })
        .catch(() => { offline = true; })
        .finally(() => {
          loading = null;
          render();
        });
      render();
      return loading;
    }

    function currencyItems(includeFavorites = true) {
      const codes = Object.keys(data.rates).sort();
      return codes.map((c) => ({
        value: c,
        label: `${c} – ${nameOf(c)}`,
        group: includeFavorites && (prefs.favorites.includes(c) || c === 'EUR') ? t('Favoriten') : t('Alle Währungen'),
      }));
    }

    async function choose(which) {
      const value = await hub.pick({
        title: which === 'from' ? t('Ausgangswährung') : t('Zielwährung'),
        items: currencyItems(),
        groups: [t('Favoriten'), t('Alle Währungen')],
        current: prefs[which],
        searchable: true,
      });
      if (!value) return;
      prefs[which] = value;
      savePrefs();
      render();
    }

    async function addFavorite() {
      const value = await hub.pick({
        title: t('Favorit hinzufügen'),
        items: currencyItems(false).filter((it) => !prefs.favorites.includes(it.value)),
        groups: [t('Alle Währungen')],
        searchable: true,
      });
      if (!value) return;
      prefs.favorites.push(value);
      savePrefs();
      render();
    }

    function setAmount(text) {
      prefs.amount = text;
      savePrefs();
      render();
    }

    function press(key) {
      if (key === 'ans') {
        setAmount(String(hub.getAns()));
      } else if (key === 'equals') {
        const { value, error } = amountValue();
        if (!error) setAmount(String(Math.round(value * 1e6) / 1e6));
      } else if (key === 'to-calc') {
        if (lastValue === null) return;
        hub.useInCalc(Math.abs(lastValue) >= 0.01 ? Math.round(lastValue * 100) / 100 : lastValue);
      } else {
        setAmount(Keypad.editAmount(prefs.amount, key));
      }
    }

    el.view.addEventListener('click', (e) => {
      const key = e.target.closest('[data-fxkey]');
      if (key) return press(key.dataset.fxkey);
      const pickBtn = e.target.closest('[data-pick]');
      if (pickBtn) return choose(pickBtn.dataset.pick);
      const unfav = e.target.closest('[data-unfav]');
      if (unfav) {
        prefs.favorites = prefs.favorites.filter((c) => c !== unfav.dataset.unfav);
        savePrefs();
        render();
        hub.toast(t('{code} entfernt', { code: unfav.dataset.unfav }));
        return;
      }
      if (e.target.closest('.fx-add')) return addFavorite();
      const row = e.target.closest('[data-code]');
      if (row) {
        prefs.to = row.dataset.code;
        savePrefs();
        render();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (el.view.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest('input, textarea, dialog')) return;
      const key = Keypad.amountKeyFromEvent(e);
      if (key === null) return;
      e.preventDefault();
      press(key);
    });

    Keypad.onSwipe(el.amount.closest('.fx-pair'), () => press('back'));
    el.swap.addEventListener('click', () => {
      [prefs.from, prefs.to] = [prefs.to, prefs.from];
      savePrefs();
      render();
    });
    el.refresh.addEventListener('click', () => refresh(true));
    window.addEventListener('resize', () => { if (!el.view.hidden) render(); });

    render();

    return {
      show() {
        refresh(false);
        render();
      },
      shareText() {
        if (lastValue === null) return null;
        const when = new Date(data.date);
        const date = Number.isNaN(when.getTime()) ? data.date : when.toLocaleDateString(intl());
        return `${el.amount.textContent} ${prefs.from} = ${el.result.textContent} ${prefs.to} (${t('Kurs vom {date}', { date })})`;
      },
    };
  }

  return { convert, normalizeAmount, fetchRates, init, FALLBACK };
});
