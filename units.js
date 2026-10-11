/*
 * Calcumeter – Einheitenrechner
 *
 * Jede Kategorie rechnet über eine Basiseinheit: Wert × Faktor = Basis.
 * Temperaturen brauchen eigene Umrechnungen (Nullpunkt verschoben).
 */
(function (global, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./keypad.js') : global.Keypad, node ? require('./i18n.js') : global.I18n);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.Units = api;
})(typeof self !== 'undefined' ? self : this, function (Keypad, I18nRef) {
  'use strict';

  const PREFS_KEY = 'calcumeter.units';

  // id: [Symbol, Name, Faktor zur Basiseinheit]
  const CATEGORIES = {
    length: {
      name: 'Länge', from: 'km', to: 'mi',
      units: {
        mm: ['mm', 'Millimeter', 1e-3], cm: ['cm', 'Zentimeter', 1e-2], m: ['m', 'Meter', 1],
        km: ['km', 'Kilometer', 1e3], um: ['µm', 'Mikrometer', 1e-6], in: ['in', 'Zoll', 0.0254],
        ft: ['ft', 'Fuß', 0.3048], yd: ['yd', 'Yard', 0.9144], mi: ['mi', 'Meile', 1609.344],
        nmi: ['sm', 'Seemeile', 1852],
      },
    },
    area: {
      name: 'Fläche', from: 'm2', to: 'ft2',
      units: {
        mm2: ['mm²', 'Quadratmillimeter', 1e-6], cm2: ['cm²', 'Quadratzentimeter', 1e-4],
        m2: ['m²', 'Quadratmeter', 1], a: ['a', 'Ar', 100], ha: ['ha', 'Hektar', 1e4],
        km2: ['km²', 'Quadratkilometer', 1e6], in2: ['in²', 'Quadratzoll', 0.00064516],
        ft2: ['ft²', 'Quadratfuß', 0.09290304], yd2: ['yd²', 'Quadratyard', 0.83612736],
        ac: ['ac', 'Acre', 4046.8564224], mi2: ['mi²', 'Quadratmeile', 2589988.110336],
      },
    },
    volume: {
      name: 'Volumen', from: 'l', to: 'usgal',
      units: {
        ml: ['ml', 'Milliliter', 1e-3], cl: ['cl', 'Zentiliter', 1e-2], dl: ['dl', 'Deziliter', 0.1],
        l: ['l', 'Liter', 1], m3: ['m³', 'Kubikmeter', 1e3], cm3: ['cm³', 'Kubikzentimeter', 1e-3],
        tsp: ['TL', 'Teelöffel', 0.005], tbsp: ['EL', 'Esslöffel', 0.015],
        cup: ['cup', 'Tasse (US)', 0.2365882365], floz: ['fl oz', 'Flüssigunze (US)', 0.0295735295625],
        pint: ['pt', 'Pint (US)', 0.473176473], usgal: ['gal', 'Gallone (US)', 3.785411784],
        ukgal: ['gal (UK)', 'Gallone (UK)', 4.54609],
      },
    },
    mass: {
      name: 'Gewicht', from: 'kg', to: 'lb',
      units: {
        mg: ['mg', 'Milligramm', 1e-6], g: ['g', 'Gramm', 1e-3], kg: ['kg', 'Kilogramm', 1],
        t: ['t', 'Tonne', 1e3], oz: ['oz', 'Unze', 0.028349523125], lb: ['lb', 'Pfund (US)', 0.45359237],
        st: ['st', 'Stone', 6.35029318], ct: ['ct', 'Karat', 2e-4],
      },
    },
    temperature: {
      name: 'Temperatur', from: 'C', to: 'F',
      units: {
        C: ['°C', 'Grad Celsius', { to: (v) => v, from: (c) => c }],
        F: ['°F', 'Grad Fahrenheit', { to: (v) => ((v - 32) * 5) / 9, from: (c) => (c * 9) / 5 + 32 }],
        K: ['K', 'Kelvin', { to: (v) => v - 273.15, from: (c) => c + 273.15 }],
      },
    },
    speed: {
      name: 'Geschwindigkeit', from: 'kmh', to: 'mph',
      units: {
        ms: ['m/s', 'Meter pro Sekunde', 1], kmh: ['km/h', 'Kilometer pro Stunde', 1 / 3.6],
        mph: ['mph', 'Meilen pro Stunde', 0.44704], kn: ['kn', 'Knoten', 1852 / 3600],
        fts: ['ft/s', 'Fuß pro Sekunde', 0.3048], mach: ['Mach', 'Mach (Meereshöhe)', 340.3],
      },
    },
    time: {
      name: 'Zeit', from: 'h', to: 'min',
      units: {
        ms: ['ms', 'Millisekunde', 1e-3], s: ['s', 'Sekunde', 1], min: ['min', 'Minute', 60],
        h: ['h', 'Stunde', 3600], d: ['d', 'Tag', 86400], wk: ['Wo.', 'Woche', 604800],
        mo: ['Mon.', 'Monat (Ø)', 2629746], yr: ['J.', 'Jahr (Ø)', 31556952],
      },
    },
    data: {
      name: 'Daten', from: 'GB', to: 'MB',
      units: {
        bit: ['bit', 'Bit', 0.125], B: ['B', 'Byte', 1], kB: ['kB', 'Kilobyte', 1e3], MB: ['MB', 'Megabyte', 1e6],
        GB: ['GB', 'Gigabyte', 1e9], TB: ['TB', 'Terabyte', 1e12], KiB: ['KiB', 'Kibibyte', 1024],
        MiB: ['MiB', 'Mebibyte', 1048576], GiB: ['GiB', 'Gibibyte', 1073741824], TiB: ['TiB', 'Tebibyte', 1099511627776],
      },
    },
    energy: {
      name: 'Energie', from: 'kcal', to: 'kJ',
      units: {
        J: ['J', 'Joule', 1], kJ: ['kJ', 'Kilojoule', 1e3], cal: ['cal', 'Kalorie', 4.184],
        kcal: ['kcal', 'Kilokalorie', 4184], Wh: ['Wh', 'Wattstunde', 3600], kWh: ['kWh', 'Kilowattstunde', 3.6e6],
        eV: ['eV', 'Elektronenvolt', 1.602176634e-19], BTU: ['BTU', 'British Thermal Unit', 1055.05585262],
      },
    },
    pressure: {
      name: 'Druck', from: 'bar', to: 'psi',
      units: {
        Pa: ['Pa', 'Pascal', 1], hPa: ['hPa', 'Hektopascal', 100], kPa: ['kPa', 'Kilopascal', 1e3],
        bar: ['bar', 'Bar', 1e5], mbar: ['mbar', 'Millibar', 100], atm: ['atm', 'Atmosphäre', 101325],
        psi: ['psi', 'Pfund pro Quadratzoll', 6894.757293168], mmHg: ['mmHg', 'Millimeter Quecksilber', 133.322387415],
      },
    },
  };

  // Englische Namen (Kategorie, dann Einheiten)
  const EN = {
    length: ['Length', { mm: 'Millimetre', cm: 'Centimetre', m: 'Metre', km: 'Kilometre', um: 'Micrometre', in: 'Inch', ft: 'Foot', yd: 'Yard', mi: 'Mile', nmi: 'Nautical mile' }],
    area: ['Area', { mm2: 'Square millimetre', cm2: 'Square centimetre', m2: 'Square metre', a: 'Are', ha: 'Hectare', km2: 'Square kilometre', in2: 'Square inch', ft2: 'Square foot', yd2: 'Square yard', ac: 'Acre', mi2: 'Square mile' }],
    volume: ['Volume', { ml: 'Millilitre', cl: 'Centilitre', dl: 'Decilitre', l: 'Litre', m3: 'Cubic metre', cm3: 'Cubic centimetre', tsp: 'Teaspoon', tbsp: 'Tablespoon', cup: 'Cup (US)', floz: 'Fluid ounce (US)', pint: 'Pint (US)', usgal: 'Gallon (US)', ukgal: 'Gallon (UK)' }],
    mass: ['Weight', { mg: 'Milligram', g: 'Gram', kg: 'Kilogram', t: 'Tonne', oz: 'Ounce', lb: 'Pound', st: 'Stone', ct: 'Carat' }],
    temperature: ['Temperature', { C: 'Degree Celsius', F: 'Degree Fahrenheit', K: 'Kelvin' }],
    speed: ['Speed', { ms: 'Metres per second', kmh: 'Kilometres per hour', mph: 'Miles per hour', kn: 'Knot', fts: 'Feet per second', mach: 'Mach (sea level)' }],
    time: ['Time', { ms: 'Millisecond', s: 'Second', min: 'Minute', h: 'Hour', d: 'Day', wk: 'Week', mo: 'Month (avg.)', yr: 'Year (avg.)' }],
    data: ['Data', { bit: 'Bit', B: 'Byte', kB: 'Kilobyte', MB: 'Megabyte', GB: 'Gigabyte', TB: 'Terabyte', KiB: 'Kibibyte', MiB: 'Mebibyte', GiB: 'Gibibyte', TiB: 'Tebibyte' }],
    energy: ['Energy', { J: 'Joule', kJ: 'Kilojoule', cal: 'Calorie', kcal: 'Kilocalorie', Wh: 'Watt-hour', kWh: 'Kilowatt-hour', eV: 'Electronvolt', BTU: 'British thermal unit' }],
    pressure: ['Pressure', { Pa: 'Pascal', hPa: 'Hectopascal', kPa: 'Kilopascal', bar: 'Bar', mbar: 'Millibar', atm: 'Atmosphere', psi: 'Pound per square inch', mmHg: 'Millimetre of mercury' }],
  };
  // englische Kurzzeichen, wo sie sich unterscheiden
  const EN_SYM = { volume: { tsp: 'tsp', tbsp: 'tbsp' }, length: { nmi: 'nmi' }, time: { wk: 'wk', mo: 'mo', yr: 'yr' } };

  // Namen: Deutsch aus CATEGORIES, weitere Sprachen über lang/<code>.js (Schlüssel = deutscher Name), sonst Englisch
  const lang = () => I18nRef.getLang();
  const catName = (cat) => I18nRef.has(CATEGORIES[cat].name) || EN[cat][0];
  const unitName = (cat, id) => I18nRef.has(CATEGORIES[cat].units[id][1]) || EN[cat][1][id];
  const unitSym = (cat, id) => (lang() !== 'de' && EN_SYM[cat] && EN_SYM[cat][id]) || CATEGORIES[cat].units[id][0];

  // ---------- Reine Logik ----------

  function convertUnit(value, from, to, category) {
    const cat = CATEGORIES[category];
    if (!cat || !cat.units[from] || !cat.units[to]) throw new Error('Unbekannte Einheit');
    const f = cat.units[from][2];
    const t = cat.units[to][2];
    const base = typeof f === 'object' ? f.to(value) : value * f;
    return typeof t === 'object' ? t.from(base) : base / t;
  }

  // Zahl in der Schreibweise der Sprache, sehr große/kleine Werte als Zehnerpotenz
  function formatValue(v) {
    if (!Number.isFinite(v)) return '–';
    if (v === 0) return '0';
    const L = I18nRef.locale();
    const abs = Math.abs(v);
    if (abs >= 1e15 || abs < 1e-6) {
      const [m, e] = v.toExponential(6).split('e');
      return `${m.replace(/\.?0+$/, '').replace('.', L.decimal).replace('-', '−')}E${parseInt(e, 10)}`;
    }
    return new Intl.NumberFormat(L.intl, { maximumSignificantDigits: 10 }).format(v).replace('-', '−');
  }

  // ---------- Oberfläche ----------

  function init(hub) {
    const $ = (id) => document.getElementById(id);
    const el = {
      view: $('view-units'), cats: $('unit-cats'),
      amount: $('unit-amount'), result: $('unit-result'),
      fromSym: $('unit-from-sym'), toSym: $('unit-to-sym'),
      fromName: $('unit-from-name'), toName: $('unit-to-name'),
      rate: $('unit-rate'), list: $('unit-list'), swap: $('unit-swap'),
    };
    const { evaluate } = window.Calc;
    const t = (str, vars) => I18nRef.t(str, vars);

    const prefs = { cat: 'length', amount: '1', sel: {} };
    try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch (_) { /* ohne Speicher */ }
    if (!CATEGORIES[prefs.cat]) prefs.cat = 'length';
    // Betrag intern mit Punkt; frühere Versionen speicherten deutsch ("12,5")
    prefs.amount = Keypad.normalizeAmount(String(prefs.amount));
    let lastValue = null;

    const save = () => {
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) { /* ignorieren */ }
    };

    // gewählte Von/Nach-Einheit je Kategorie merken
    function sel() {
      const cat = CATEGORIES[prefs.cat];
      const s = prefs.sel[prefs.cat] || {};
      if (!cat.units[s.from]) s.from = cat.from;
      if (!cat.units[s.to]) s.to = cat.to;
      prefs.sel[prefs.cat] = s;
      return s;
    }

    function amountValue() {
      const text = prefs.amount.trim();
      if (text === '' || text === '-') return { value: 0 };
      try {
        return { value: evaluate(Keypad.normalizeAmount(text)) };
      } catch (e) {
        return { error: e.message };
      }
    }

    // Kategorie-Chips einmal aufbauen; die Namen setzt render() je nach Sprache
    el.cats.replaceChildren(...Object.keys(CATEGORIES).map((id) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cat-chip';
      b.dataset.cat = id;
      return b;
    }));

    function render() {
      const cat = CATEGORIES[prefs.cat];
      const { from, to } = sel();
      const { value, error } = amountValue();
      el.amount.textContent = Keypad.groupTyped(prefs.amount);
      el.amount.classList.toggle('invalid', Boolean(error));
      if (error) {
        el.result.textContent = '–';
        lastValue = null;
      } else {
        lastValue = convertUnit(value, from, to, prefs.cat);
        el.result.textContent = formatValue(lastValue);
      }
      const c = prefs.cat;
      el.fromSym.textContent = unitSym(c, from);
      el.toSym.textContent = unitSym(c, to);
      el.fromName.textContent = unitName(c, from);
      el.toName.textContent = unitName(c, to);
      el.rate.textContent = c === 'temperature'
        ? `${formatValue(convertUnit(0, from, to, c))} ${unitSym(c, to)} ${t('bei')} 0 ${unitSym(c, from)}`
        : `1 ${unitSym(c, from)} = ${formatValue(convertUnit(1, from, to, c))} ${unitSym(c, to)}`;

      el.cats.querySelectorAll('[data-cat]').forEach((b) => {
        b.textContent = catName(b.dataset.cat);
        b.setAttribute('aria-pressed', String(b.dataset.cat === prefs.cat));
      });

      const base = error ? 0 : value;
      el.list.replaceChildren(...Object.entries(cat.units)
        .filter(([id]) => id !== from && id !== to)
        .map(([id]) => {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'fx-li';
          btn.dataset.unit = id;
          btn.title = t('{name} als Zieleinheit wählen', { name: unitName(c, id) });
          const left = document.createElement('span');
          const sym = document.createElement('strong');
          sym.className = 'fx-li-code';
          sym.textContent = unitSym(c, id);
          const name = document.createElement('span');
          name.className = 'fx-li-name';
          name.textContent = unitName(c, id);
          left.append(sym, name);
          const right = document.createElement('span');
          right.className = 'fx-li-val';
          right.textContent = `${formatValue(convertUnit(base, from, id, c))} ${unitSym(c, id)}`;
          btn.append(left, right);
          li.append(btn);
          return li;
        }));

      if (!el.view.hidden) {
        hub.fitText(el.amount, 18);
        hub.fitText(el.result, 18);
      }
    }

    async function choose(which) {
      const cat = CATEGORIES[prefs.cat];
      const s = sel();
      const name = catName(prefs.cat);
      const value = await hub.pick({
        title: which === 'from' ? t('{name}: von', { name }) : t('{name}: nach', { name }),
        items: Object.keys(cat.units).map((id) => ({ value: id, label: unitName(prefs.cat, id), sub: unitSym(prefs.cat, id), group: name })),
        current: s[which],
        searchable: false,
      });
      if (!value) return;
      s[which] = value;
      save();
      render();
    }

    function setAmount(text) {
      prefs.amount = text;
      save();
      render();
    }

    function press(key) {
      if (key === 'ans') {
        setAmount(String(hub.getAns()));
      } else if (key === 'equals') {
        const { value, error } = amountValue();
        if (!error) setAmount(String(Math.round(value * 1e9) / 1e9));
      } else if (key === 'to-calc') {
        if (lastValue !== null) hub.useInCalc(Number(lastValue.toPrecision(12)));
      } else {
        setAmount(Keypad.editAmount(prefs.amount, key));
      }
    }

    el.view.addEventListener('click', (e) => {
      const key = e.target.closest('[data-unitkey]');
      if (key) return press(key.dataset.unitkey);
      const chip = e.target.closest('[data-cat]');
      if (chip) {
        prefs.cat = chip.dataset.cat;
        save();
        render();
        chip.scrollIntoView({ inline: 'nearest', block: 'nearest' });
        return;
      }
      const pickBtn = e.target.closest('[data-unitpick]');
      if (pickBtn) return choose(pickBtn.dataset.unitpick);
      const row = e.target.closest('[data-unit]');
      if (row) {
        sel().to = row.dataset.unit;
        save();
        render();
      }
    });

    el.swap.addEventListener('click', () => {
      const s = sel();
      [s.from, s.to] = [s.to, s.from];
      save();
      render();
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
    window.addEventListener('resize', () => { if (!el.view.hidden) render(); });

    render();
    return {
      show: render,
      shareText() {
        if (lastValue === null) return null;
        const { from, to } = sel();
        return `${el.amount.textContent} ${unitSym(prefs.cat, from)} = ${el.result.textContent} ${unitSym(prefs.cat, to)}`;
      },
    };
  }

  return { CATEGORIES, EN, convertUnit, formatValue, init };
});
