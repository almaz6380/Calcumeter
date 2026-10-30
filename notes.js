/*
 * Calcumeter – Rechenblatt
 *
 * Rechnen wie auf einem Notizzettel: Jede Zeile wird für sich ausgewertet, das Ergebnis steht rechts daneben.
 *   Brot: 3,20 €          Beschriftung vor ":" wird ignoriert
 *   preis = 20 €          Variablen
 *   preis × 3             … und mit ihnen rechnen (Währungen/Einheiten werden angeglichen)
 *   summe                 addiert die Zeilen darüber (bis zur letzten Leer- oder Überschriftzeile)
 *   100 € in USD          Währungen mit den Kursen aus dem Währungsbereich
 *   5 km in mi            Einheiten aus dem Einheitenbereich
 *   15 % von 80           Prozentanteil
 *   # Überschrift         beginnt einen neuen Block
 * Die Logik (evaluateSheet) läuft auch in Node, die Oberfläche (init) nur im Browser.
 */
(function (global, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./calculator.js') : global.Calc, node ? require('./units.js') : global.Units);
  if (node) module.exports = api;
  else global.Notes = api;
})(typeof self !== 'undefined' ? self : this, function (Calc, Units) {
  'use strict';

  const STORE_KEY = 'calcumeter.notes';
  // Beispiel im leeren Blatt (Schlüssel für die Übersetzungen)
  const EXAMPLE = '# Einkauf\nBrot: 3,20 €\nKäse: 6,90 €\nsumme\n\nstrecke = 42 km\nstrecke in mi\nstrecke × 0,30 €\n100 € in USD\n15 % von 80';
  const RATES_KEY = 'calcumeter.fx.rates';

  // Schlüsselwörter aller Sprachen gelten immer, so funktioniert ein Blatt auch nach einem Sprachwechsel
  const SUM_WORDS = ['sum', 'total', 'summe', 'gesamt', 'suma', 'total', 'somme', 'somma', 'soma', 'toplam', 'som', 'totaal',
    'summa', 'i alt', '合計', '合计', '总计', '總計', '합계'];
  const AVG_WORDS = ['avg', 'average', 'mean', 'schnitt', 'durchschnitt', 'mittel', 'promedio', 'media', 'moyenne', 'média',
    'ortalama', 'średnia', 'gemiddelde', 'medel', 'medelvärde', 'gennemsnit', '平均', '평균'];
  const INTO_WORDS = ['in', 'to', 'as', 'into', 'nach', 'en', 'a', 'em', 'para', 'na', 'w', 'naar', 'i', 'till', 'til', 'olarak'];
  const OF_WORDS = ['of', 'von', 'vom', 'de', 'del', 'di', 'du', 'des', 'van', 'av', 'af', 'z', 'ze', 'od', 'da', 'の', '의', '的'];

  const CURRENCY_SIGNS = { '€': 'EUR', '$': 'USD', 'US$': 'USD', '£': 'GBP', '¥': 'JPY', '₩': 'KRW', '₺': 'TRY', '₹': 'INR', 'zł': 'PLN', 'Fr.': 'CHF', 'CHF': 'CHF' };
  const UNIT_WORDS = { celsius: ['temperature', 'C'], fahrenheit: ['temperature', 'F'], kelvin: ['temperature', 'K'], kmh: ['speed', 'kmh'], 'km/h': ['speed', 'kmh'], kph: ['speed', 'kmh'], sec: ['time', 's'], hr: ['time', 'h'], hrs: ['time', 'h'], liter: ['volume', 'l'], litre: ['volume', 'l'], L: ['volume', 'l'] };

  const CONSTS = new Set(['pi', 'e', 'phi', 'tau', 'ans', 'x']);
  const RESERVED = new Set([...Calc.FUNCTIONS, ...CONSTS, 'mod', 'ncr', 'npr']);
  const lower = (s) => s.toLocaleLowerCase();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // ---------- Einheiten finden ----------

  let unitIndex = null;
  function buildUnitIndex() {
    const exact = new Map();
    const loose = new Map();
    const add = (key, val) => {
      if (!exact.has(key)) exact.set(key, val);
      const k = lower(key);
      if (!loose.has(k)) loose.set(k, val);
    };
    if (Units) {
      // erst die Kurzzeichen (m/s vor dem Kürzel "ms" der Geschwindigkeit), dann die internen Kennungen
      for (const [cat, c] of Object.entries(Units.CATEGORIES)) {
        for (const [id, u] of Object.entries(c.units)) add(u[0], { kind: cat, id });
      }
      for (const [cat, c] of Object.entries(Units.CATEGORIES)) {
        if (cat === 'temperature') continue;
        for (const id of Object.keys(c.units)) add(id, { kind: cat, id });
      }
      for (const [w, [cat, id]] of Object.entries(UNIT_WORDS)) add(w, { kind: cat, id });
      add('tsp', { kind: 'volume', id: 'tsp' });
      add('tbsp', { kind: 'volume', id: 'tbsp' });
      add('nmi', { kind: 'length', id: 'nmi' });
    }
    return { exact, loose };
  }

  // Zeichen → { kind: 'fx' | Kategorie, id } oder null
  function findUnit(token, env) {
    if (!token) return null;
    const tok = token.trim();
    if (CURRENCY_SIGNS[tok]) return { kind: 'fx', id: CURRENCY_SIGNS[tok] };
    if (!unitIndex) unitIndex = buildUnitIndex();
    if (/^[A-Za-z]{3}$/.test(tok) && env.rates && tok.toUpperCase() in env.rates && (tok === tok.toUpperCase() || !unitIndex.exact.has(tok))) {
      return { kind: 'fx', id: tok.toUpperCase() };
    }
    return unitIndex.exact.get(tok) || unitIndex.loose.get(lower(tok)) || null;
  }

  function sameUnit(a, b) {
    return Boolean(a && b && a.kind === b.kind && a.id === b.id);
  }

  // Wert von einer Einheit in eine andere derselben Art; null, wenn das nicht geht
  function convertQ(v, from, to, env) {
    if (!from || !to || from.kind !== to.kind) return null;
    if (from.id === to.id) return v;
    if (from.kind === 'fx') {
      const r = env.rates;
      if (!r || !(from.id in r) || !(to.id in r)) return null;
      return (v / r[from.id]) * r[to.id];
    }
    try {
      return Units.convertUnit(v, from.id, to.id, from.kind);
    } catch (_) {
      return null;
    }
  }

  // ---------- Zahlen in der Schreibweise der Sprache ----------

  // "1.234,5" (Komma-Sprachen) bzw. "1,234.5" in die Schreibweise des Rechenkerns bringen
  function normalizeNumbers(s, decimal) {
    if (decimal === ',') {
      return s
        .replace(/(\d)[.   ](?=\d{3}(?!\d))/g, '$1')
        .replace(/(\d),(?=\d)/g, '$1.')
        .replace(/;/g, ',');
    }
    return s.replace(/(\d),(?=\d{3}(?!\d))/g, '$1');
  }

  // ---------- Eine Zeile auswerten ----------

  const IDENT = /[\p{L}_][\p{L}\p{N}_]*/gu;

  // Ausdruck mit Variablen und höchstens einer Einheit am Anfang (€5) oder Ende (5 km) → { v, u }
  function quantity(src, env, vars) {
    let s = src.trim();
    if (s === '') throw new Error('leer');
    let unit = null;

    // Währungszeichen vorne: "€ 12", "$5"
    const pre = /^(US\$|[€$£¥₩₺₹])\s*(.+)$/u.exec(s);
    if (pre) {
      unit = findUnit(pre[1], env);
      s = pre[2];
    }
    // Einheit hinten: "12 €", "5 km", "20 m/s", "100 EUR"
    if (!unit) {
      const post = /^(.*?(?:[\d)²³.]|\s))\s*(US\$|[€$£¥₩₺₹]|zł|Fr\.|°[CF]|[\p{L}µ][\p{L}µ/²³]*)$/u.exec(s);
      if (post && !(post[2] in vars) && !CONSTS.has(post[2])) {
        const u = findUnit(post[2], env);
        const head = post[1].trim();
        if (u && head !== '' && !/[+\-−*×·/÷^(]$/.test(head)) {
          unit = u;
          s = head;
        }
      }
    }

    // Variablen einsetzen; Werte mit Einheit vorher auf eine gemeinsame Einheit bringen
    let target = unit;
    const used = [];
    s.replace(IDENT, (name) => {
      if (name in vars) used.push(vars[name]);
      return name;
    });
    if (!target) {
      const withUnit = used.filter((q) => q.u);
      if (withUnit.length && withUnit.every((q) => q.u.kind === withUnit[0].u.kind)) target = withUnit[0].u;
    }
    const expr = s.replace(IDENT, (name) => {
      if (!(name in vars)) return name;
      const q = vars[name];
      let v = q.v;
      if (q.u && target && q.u.kind === target.kind && !sameUnit(q.u, target)) {
        const c = convertQ(v, q.u, target, env);
        if (c === null) throw new Error('Einheiten passen nicht');
        v = c;
      }
      return `(${v})`;
    });

    const v = Calc.evaluate(normalizeNumbers(expr, env.decimal), { angle: env.angle, ans: env.ans });
    return { v, u: target };
  }

  // Wörter vor der ersten Zahl abschneiden ("Miete 850 €"), solange es keine Variablen oder Funktionen sind
  function stripWords(s, vars) {
    const m = /^([\p{L}][\p{L}\s'’.&-]*?)\s+(?=[-−+\d(√€$£¥₩₺₹.])/u.exec(s);
    if (!m) return s;
    const words = m[1].match(IDENT) || [];
    if (words.some((w) => w in vars || RESERVED.has(lower(w)) || findUnit(w, {}))) return s;
    return s.slice(m[0].length);
  }

  function aggregate(block, mode, env) {
    const items = block.filter((q) => q);
    if (!items.length) return { v: 0, u: null };
    const u = (items.find((q) => q.u) || {}).u || null;
    let total = 0;
    for (const q of items) {
      let v = q.v;
      if (q.u && u && !sameUnit(q.u, u)) {
        v = convertQ(v, q.u, u, env);
        if (v === null) return null;
      }
      total += v;
    }
    return { v: mode === 'avg' ? total / items.length : total, u };
  }

  const wordSet = (list) => new Set(list.map(lower));
  const SUMS = wordSet(SUM_WORDS);
  const AVGS = wordSet(AVG_WORDS);
  const INTO_RE = new RegExp(`^(.*\\S)\\s*(?:\\s(?:${INTO_WORDS.map(esc).join('|')})\\s|→|->|=>)\\s*(\\S+)$`, 'iu');
  const OF_RE = new RegExp(`^(.+?)\\s*%\\s*(?:${OF_WORDS.map(esc).join('|')})\\s+(.+)$`, 'iu');

  /*
   * Blatt auswerten.
   * env: { decimal: ',' | '.', rates: { EUR: 1, USD: … } | null, angle: 'deg' | 'rad' }
   * Liefert je Zeile { kind: 'blank' | 'heading' | 'text' | 'value', label?, q?: { v, u }, name? }.
   */
  function evaluateSheet(text, env = {}) {
    const ctx = { decimal: env.decimal || '.', rates: env.rates || null, angle: env.angle || 'deg', ans: 0 };
    const vars = Object.create(null);
    const out = [];
    let block = [];

    for (const raw of String(text).split('\n')) {
      let s = raw.trim();
      if (s === '') {
        out.push({ kind: 'blank' });
        block = [];
        continue;
      }
      if (/^(#|\/\/)/.test(s)) {
        out.push({ kind: 'heading' });
        block = [];
        continue;
      }

      let label = null;
      const lab = /^([^:=]*\p{L}[^:=]*):\s+(.*)$/u.exec(s);
      if (lab && !(lab[1].trim() in vars)) {
        label = lab[1].trim();
        s = lab[2].trim();
      }

      let name = null;
      const asg = /^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(.+)$/u.exec(s);
      if (asg && !RESERVED.has(asg[1]) && !SUMS.has(lower(asg[1])) && !AVGS.has(lower(asg[1]))) {
        name = asg[1];
        s = asg[2].trim();
      }

      let q = null;
      let isTotal = false;
      try {
        const word = lower(s);
        if (SUMS.has(word) || AVGS.has(word)) {
          q = aggregate(block, AVGS.has(word) ? 'avg' : 'sum', ctx);
          isTotal = true;
        } else {
          const into = INTO_RE.exec(s);
          const toUnit = into && findUnit(into[2], ctx);
          if (toUnit) {
            const left = lower(into[1].trim());
            const src = SUMS.has(left) || AVGS.has(left)
              ? aggregate(block, AVGS.has(left) ? 'avg' : 'sum', ctx)
              : quantity(stripWords(into[1], vars), ctx, vars);
            if (src && src.u) {
              const v = convertQ(src.v, src.u, toUnit, ctx);
              q = v === null ? null : { v, u: toUnit };
            }
            isTotal = SUMS.has(left) || AVGS.has(left);
          } else {
            const of = OF_RE.exec(s);
            if (of) {
              const p = quantity(of[1], ctx, vars);
              const base = quantity(stripWords(of[2], vars), ctx, vars);
              q = { v: (p.v / 100) * base.v, u: base.u };
            } else {
              q = quantity(stripWords(s, vars), ctx, vars);
            }
          }
        }
      } catch (_) {
        q = null;
      }

      if (q && Number.isFinite(q.v)) {
        if (name) vars[name] = q;
        if (!isTotal) block.push(q);
        ctx.ans = q.v;
        out.push({ kind: 'value', label, name, q, total: isTotal });
      } else {
        out.push({ kind: 'text' });
      }
    }
    return out;
  }

  // ---------- Oberfläche ----------

  function init(hub) {
    const t = (str, vars) => window.I18n.t(str, vars);
    const L = () => window.I18n.locale();
    const $ = (id) => document.getElementById(id);
    const el = {
      view: $('view-notes'), input: $('notes-input'), results: $('notes-results'),
      scroller: $('notes-scroll'), bar: $('notes-bar'), clear: $('notes-clear'),
    };
    let lines = [];
    let armed = 0;

    try { el.input.value = localStorage.getItem(STORE_KEY) || ''; } catch (_) { /* ohne Speicher */ }

    function rates() {
      try {
        const saved = JSON.parse(localStorage.getItem(RATES_KEY) || 'null');
        if (saved && saved.rates) return saved.rates;
      } catch (_) { /* Rückfall */ }
      return window.Fx ? window.Fx.FALLBACK.rates : null;
    }

    function fmt(q) {
      const intl = L().intl;
      if (q.u && q.u.kind === 'fx') {
        let digits = 2;
        try { digits = new Intl.NumberFormat('en', { style: 'currency', currency: q.u.id }).resolvedOptions().maximumFractionDigits; } catch (_) { /* 2 */ }
        const n = new Intl.NumberFormat(intl, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(q.v).replace('-', '−');
        return `${n} ${q.u.id}`;
      }
      // Einheiten: höchstens 4 Nachkommastellen, sehr große/kleine Werte als Zehnerpotenz
      const abs = Math.abs(q.v);
      const n = abs !== 0 && (abs < 1e-4 || abs >= 1e15)
        ? Units.formatValue(q.v)
        : new Intl.NumberFormat(intl, { maximumFractionDigits: q.u ? 4 : 10 }).format(q.v).replace('-', '−');
      return q.u ? `${n} ${Units.unitSym(q.u.kind, q.u.id)}` : n;
    }

    // Für "Teilen" und "In den Rechner": Zahl ohne Gruppierung
    const plain = (q) => String(parseFloat(q.v.toPrecision(12)));

    function render() {
      const text = el.input.value;
      lines = evaluateSheet(text, { decimal: L().decimal, rates: rates() });
      const frag = document.createDocumentFragment();
      lines.forEach((r, i) => {
        const row = document.createElement(r.kind === 'value' ? 'button' : 'div');
        row.className = 'notes-res';
        if (r.kind === 'value') {
          row.type = 'button';
          row.dataset.line = i;
          row.textContent = fmt(r.q);
          if (r.total) row.classList.add('total');
          row.title = t('Antippen zum Kopieren');
        }
        frag.append(row);
      });
      el.results.replaceChildren(frag);
      el.input.style.height = 'auto';
      el.input.style.height = `${el.input.scrollHeight}px`;
    }

    function save() {
      try { localStorage.setItem(STORE_KEY, el.input.value); } catch (_) { /* ignorieren */ }
    }

    function placeholder() {
      el.input.placeholder = t(EXAMPLE);
    }

    function insert(text) {
      const { selectionStart: a, selectionEnd: b, value } = el.input;
      const before = value.slice(0, a);
      const pad = /[\p{L}\d)]$/u.test(before) && /^[\p{L}]/u.test(text) ? ' ' : '';
      const ins = pad + text;
      el.input.setRangeText(ins, a, b, 'end');
      el.input.focus();
      render();
      save();
    }

    el.input.addEventListener('input', () => {
      render();
      save();
    });

    el.results.addEventListener('click', async (e) => {
      const row = e.target.closest('[data-line]');
      if (!row) return;
      const r = lines[row.dataset.line];
      try {
        await navigator.clipboard.writeText(row.textContent);
        hub.toast(t('Kopiert'));
      } catch (_) {
        hub.useInCalc(Number(plain(r.q)));
      }
    });

    el.bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-nins]');
      if (!b) return;
      const key = b.dataset.nins;
      if (key === 'sum') insert(`\n${t('summe')}`);
      else if (key === 'into') insert(` ${t('in')} `);
      else if (key === 'of') insert(` % ${t('von')} `);
      else insert(key);
    });
    // Tasten behalten den Fokus nicht, damit die Bildschirmtastatur offen bleibt
    el.bar.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) e.preventDefault(); });

    el.clear.addEventListener('click', () => {
      if (el.input.value.trim() === '') return;
      if (Date.now() - armed > 3000) {
        armed = Date.now();
        hub.toast(t('Zum Leeren nochmal tippen'));
        return;
      }
      armed = 0;
      el.input.value = '';
      save();
      render();
    });

    function labels() {
      el.bar.querySelector('[data-nins="sum"]').textContent = t('summe');
      el.bar.querySelector('[data-nins="into"]').textContent = t('in');
    }

    placeholder();
    labels();
    render();

    return {
      show() {
        placeholder();
        labels();
        render();
      },
      shareText() {
        const rows = el.input.value.split('\n');
        const text = rows.map((line, i) => {
          const r = lines[i];
          return r && r.kind === 'value' ? `${line.trim()}  → ${fmt(r.q)}` : line;
        }).join('\n').trim();
        return text || null;
      },
    };
  }

  return { evaluateSheet, findUnit, normalizeNumbers, init };
});
