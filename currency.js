/*
 * Calcumeter – Währungsrechner
 *
 * Tageskurse (Basis EUR) von ExchangeRate-API, ersatzweise von der EZB
 * über Frankfurter. Ohne Netz werden die zuletzt geladenen Kurse oder
 * die eingebauten EZB-Kurse verwendet.
 */
(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.Fx = api;
})(typeof self !== 'undefined' ? self : this, function () {
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

  // ---------- Reine Logik ----------

  function convert(amount, from, to, rates) {
    if (!(from in rates) || !(to in rates)) throw new Error('Unbekannte Währung');
    return (amount / rates[from]) * rates[to];
  }

  // Deutsche Schreibweise erlauben: "1.234,50" und "49,90*3"
  function normalizeAmount(text) {
    let t = String(text).replace(/\s/g, '');
    if (t.includes(',')) t = t.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(/,/g, '.');
    return t;
  }

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

  function init(hooks) {
    const $ = (id) => document.getElementById(id);
    const el = {
      amount: $('fx-amount'), from: $('fx-from'), to: $('fx-to'), result: $('fx-result'),
      rate: $('fx-rate'), list: $('fx-list'), status: $('fx-status-text'),
      swap: $('fx-swap'), refresh: $('fx-refresh'), fromCalc: $('fx-from-calc'), toCalc: $('fx-to-calc'),
    };
    const { evaluate } = window.Calc;

    let data = FALLBACK;
    let offline = false;
    let loading = null;
    let lastValue = null;
    let prefs = { from: 'EUR', to: 'USD', amount: '100' };

    try {
      const saved = JSON.parse(localStorage.getItem(RATES_KEY) || 'null');
      if (saved && saved.rates) data = saved;
      Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'));
    } catch (_) { /* ohne Speicher weiter */ }

    const savePrefs = () => {
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) { /* ignorieren */ }
    };

    let names;
    try { names = new Intl.DisplayNames(['de'], { type: 'currency' }); } catch (_) { names = null; }
    const nameOf = (code) => {
      try { return (names && names.of(code)) || code; } catch (_) { return code; }
    };

    const money = (value, code) => {
      try {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: code }).format(value);
      } catch (_) {
        return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(value)} ${code}`;
      }
    };
    const plain = (value, code) => {
      if (value !== 0 && Math.abs(value) < 0.01) {
        return new Intl.NumberFormat('de-DE', { maximumSignificantDigits: 4 }).format(value);
      }
      let frac = 2;
      try {
        frac = new Intl.NumberFormat('de-DE', { style: 'currency', currency: code })
          .resolvedOptions().maximumFractionDigits;
      } catch (_) { /* Standard: 2 Nachkommastellen */ }
      return new Intl.NumberFormat('de-DE', { minimumFractionDigits: frac, maximumFractionDigits: frac }).format(value);
    };
    const rateFmt = new Intl.NumberFormat('de-DE', { maximumSignificantDigits: 6 });

    function fillSelects() {
      const codes = Object.keys(data.rates).sort();
      const popular = POPULAR.filter((c) => c in data.rates);
      const others = codes.filter((c) => !popular.includes(c));
      for (const select of [el.from, el.to]) {
        const current = select === el.from ? prefs.from : prefs.to;
        select.replaceChildren();
        const group = (label, list) => {
          const g = document.createElement('optgroup');
          g.label = label;
          for (const c of list) g.append(new Option(`${c} – ${nameOf(c)}`, c));
          select.append(g);
        };
        group('Häufig', popular);
        group('Alle Währungen', others);
        select.value = current in data.rates ? current : (select === el.from ? 'EUR' : 'USD');
      }
      prefs.from = el.from.value;
      prefs.to = el.to.value;
    }

    function amountValue() {
      const text = el.amount.value.trim();
      if (text === '') return { value: 0 };
      try {
        return { value: evaluate(normalizeAmount(text)) };
      } catch (e) {
        return { error: e.message };
      }
    }

    function render() {
      const { from, to } = prefs;
      const { value, error } = amountValue();
      el.amount.setAttribute('aria-invalid', String(Boolean(error)));
      if (error) {
        el.result.textContent = '–';
        el.result.classList.add('error');
        lastValue = null;
      } else {
        const out = convert(value, from, to, data.rates);
        el.result.textContent = plain(out, to);
        el.result.classList.remove('error');
        lastValue = out;
      }
      $('fx-from-code').textContent = from;
      $('fx-to-code').textContent = to;
      $('fx-from-name').textContent = `in ${nameOf(from)}`;
      $('fx-to-name').textContent = `in ${nameOf(to)}`;
      el.rate.textContent = `1 ${from} = ${rateFmt.format(convert(1, from, to, data.rates))} ${to}`
        + `  ·  1 ${to} = ${rateFmt.format(convert(1, to, from, data.rates))} ${from}`;

      const base = error ? 0 : value;
      el.list.replaceChildren(...POPULAR
        .filter((c) => c in data.rates && c !== from && c !== to)
        .slice(0, 8)
        .map((c) => {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.code = c;
          btn.title = `${c} als Zielwährung wählen`;
          const left = document.createElement('span');
          left.className = 'fx-code';
          left.innerHTML = `<strong></strong><small></small>`;
          left.firstChild.textContent = c;
          left.lastChild.textContent = nameOf(c);
          const right = document.createElement('span');
          right.className = 'fx-val';
          right.textContent = money(convert(base, from, c, data.rates), c);
          btn.append(left, right);
          li.append(btn);
          return li;
        }));

      const when = new Date(data.date);
      const dateText = Number.isNaN(when.getTime()) ? data.date
        : when.toLocaleString('de-DE', data.date.length > 10
          ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
      el.status.textContent = loading ? 'Kurse werden aktualisiert …'
        : `${offline ? 'Offline – ' : ''}Kurse vom ${dateText} · Quelle: ${data.source}`;
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
          fillSelects();
        })
        .catch(() => { offline = true; })
        .finally(() => {
          loading = null;
          render();
        });
      render();
      return loading;
    }

    el.amount.value = prefs.amount;
    el.amount.addEventListener('input', () => {
      prefs.amount = el.amount.value;
      savePrefs();
      render();
    });
    el.from.addEventListener('change', () => { prefs.from = el.from.value; savePrefs(); render(); });
    el.to.addEventListener('change', () => { prefs.to = el.to.value; savePrefs(); render(); });
    el.swap.addEventListener('click', () => {
      [prefs.from, prefs.to] = [prefs.to, prefs.from];
      el.from.value = prefs.from;
      el.to.value = prefs.to;
      savePrefs();
      render();
    });
    el.list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-code]');
      if (!btn) return;
      prefs.to = btn.dataset.code;
      el.to.value = prefs.to;
      savePrefs();
      render();
    });
    el.refresh.addEventListener('click', () => refresh(true));
    el.fromCalc.addEventListener('click', () => {
      const n = hooks.getAns();
      el.amount.value = String(n).replace('.', ',');
      prefs.amount = el.amount.value;
      savePrefs();
      render();
    });
    el.toCalc.addEventListener('click', () => {
      if (lastValue === null) return;
      hooks.useInCalc(Math.abs(lastValue) >= 0.01 ? Math.round(lastValue * 100) / 100 : lastValue);
    });

    fillSelects();
    render();

    return {
      show() {
        refresh(false);
        render();
      },
    };
  }

  return { convert, normalizeAmount, fetchRates, init, FALLBACK };
});
