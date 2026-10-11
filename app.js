/* Calcumeter – Bedienoberfläche */
(function () {
  'use strict';

  const { evaluate, format } = window.Calc;

  const STORAGE_KEY = 'calcumeter.state';
  const SETTINGS_KEY = 'calcumeter.settings';
  const VIEWS = { calc: 'Rechner', fx: 'Währung', units: 'Einheiten', graph: 'Graph', prog: 'Programmierer' };
  const HISTORY_LIMIT = 100;

  const state = {
    expr: '',
    justEvaluated: false,
    error: null,
    angle: 'deg',
    second: false,
    hyp: false,
    memory: null,
    ans: 0,
    history: [],
    view: 'calc',
    sciOverride: null, // null = automatisch (Querformat), sonst vom Nutzer gewählt
  };

  // Im Querformat auf Handy/Tablet werden die wissenschaftlichen Tasten automatisch eingeblendet.
  const landscape = window.matchMedia('(orientation: landscape) and (max-height: 600px)');

  const $ = (sel) => document.querySelector(sel);
  const els = {
    expression: $('#expression'),
    result: $('#result'),
    indMode: $('#ind-mode'),
    ind2nd: $('#ind-2nd'),
    indHyp: $('#ind-hyp'),
    indMem: $('#ind-mem'),
    history: $('#history'),
    historyList: $('#history-list'),
    historyEmpty: $('#history-empty'),
    historyToggle: $('#history-toggle'),
    fxActions: $('#fx-actions'),
    viewSwitch: $('#view-switch'),
    viewSwitchLabel: $('#view-switch-label'),
    menu: $('#menu-sheet'),
    vibrate: $('#set-vibrate'),
    lang: $('#set-lang'),
    themeColor: document.querySelector('meta[name="theme-color"]'),
    toast: $('#toast'),
    calculator: $('.calculator'),
    sciToggle: $('[data-action="toggle-sci"]'),
    calcActions: $('#calc-actions'),
    viewCalc: $('#view-calc'),
    viewFx: $('#view-fx'),
  };

  // ---------- Persistenz (optional, schlägt still fehl) ----------

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return;
      if (saved.angle === 'rad') state.angle = 'rad';
      if (typeof saved.memory === 'number') state.memory = saved.memory;
      if (typeof saved.ans === 'number') state.ans = saved.ans;
      if (Array.isArray(saved.history)) state.history = saved.history.slice(0, HISTORY_LIMIT);
      if (saved.view in VIEWS) state.view = saved.view;
    } catch (_) { /* ohne Speicher weiterarbeiten */ }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        angle: state.angle, memory: state.memory, ans: state.ans, history: state.history, view: state.view,
      }));
    } catch (_) { /* ignorieren */ }
  }

  // ---------- Hilfsfunktionen ----------

  const ctx = () => ({ angle: state.angle, ans: state.ans });

  // Die Eingabe steht in der Schreibweise der Sprache:
  // deutsch "1,5" und "log(8;2)", englisch "1.5" und "log(8,2)".
  const I18n = window.I18n;
  const t = (str, vars) => I18n.t(str, vars);
  const L = () => I18n.locale();
  const toCalc = (expr) => (L().decimal === ',' ? expr.replace(/,/g, '.') : expr);

  // Rechnung von einer Schreibweise in die andere umschreiben (Dezimalkomma ↔ Dezimalpunkt)
  function convertExpr(expr, from, to) {
    const dec = (l) => (I18n.LOCALES[l] || I18n.LOCALES.de).decimal;
    if (dec(from) === dec(to)) return expr;
    return dec(from) === ','
      ? expr.replace(/,/g, '\u0001').replace(/;/g, ',').replace(/\u0001/g, '.')
      : expr.replace(/,/g, ';').replace(/\./g, ',');
  }

  // Zahl für die Eingabezeile, z. B. "−1234,5"
  const show = (value) => format(value).replace('.', L().decimal).replace(/^-/, '−');

  // Zahl für die große Anzeige, mit Tausendertrennung: "−1.234,5" bzw. "−1,234.5"
  function pretty(value) {
    const s = show(value);
    const m = /^(−?)(\d+)(.*)$/.exec(s);
    if (!m || m[3].includes('E')) return s;
    return m[1] + m[2].replace(/\B(?=(\d{3})+(?!\d))/g, L().group) + m[3];
  }

  // In die Eingabe einfügen, negative Zahlen geklammert
  const asOperand = (value) => show(value).replace(/^−(.*)$/, '(−$1)');

  // Schrift verkleinern, bis der Text in seine Zeile passt
  function fitText(el, minPx) {
    el.style.removeProperty('--result-size');
    el.style.removeProperty('--fit-size');
    let size = parseFloat(getComputedStyle(el).fontSize);
    const prop = el.id === 'result' ? '--result-size' : '--fit-size';
    while (el.scrollWidth > el.clientWidth + 1 && size > minPx) {
      size = Math.max(minPx, size * 0.9);
      el.style.setProperty(prop, `${size}px`);
    }
  }

  function tryEvaluate(expr) {
    try {
      return { value: evaluate(toCalc(expr), ctx()) };
    } catch (e) {
      return { error: e.name === 'CalcError' ? e.message : 'Fehler' };   // deutsch; übersetzt in render()
    }
  }

  function openParens(expr) {
    let n = 0;
    for (const c of expr) {
      if (c === '(') n++;
      else if (c === ')' && n > 0) n--;
    }
    return n;
  }

  let toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1400);
  }

  // Eingaben, die an ein Ergebnis anschließen statt es zu ersetzen
  const CONTINUES = /^(?:[+\-−×÷*/^!%²³)]|⁻¹| mod |nCr|nPr)/;

  // ---------- Aktionen ----------

  function insert(text) {
    if (state.justEvaluated || state.error) {
      if (!CONTINUES.test(text) || state.error) state.expr = '';
      state.justEvaluated = false;
      state.error = null;
    }
    // Zwei Operatoren hintereinander: den alten ersetzen (außer Minus als Vorzeichen)
    if (/^[+×÷^]$/.test(text) && /[+\−×÷^]$/.test(state.expr)) {
      state.expr = state.expr.slice(0, -1);
    }
    if (state.expr === '' && /^[+×÷^²³!%]$|^⁻¹$/.test(text)) state.expr = 'Ans';
    const dec = L().decimal;
    if (text === dec) {
      // nur ein Dezimalzeichen pro Zahl; "0," statt "," am Zahlanfang
      if (new RegExp(`\\${dec}\\d*$`).test(state.expr)) return render();
      if (!/\d$/.test(state.expr)) text = `0${dec}`;
    }
    state.expr += text;
    if (state.second || state.hyp) {
      // 2nd/hyp gelten nur für eine Eingabe
      if (/^a?(sin|cos|tan)h?\($/.test(text)) {
        state.second = false;
        state.hyp = false;
      }
    }
    render();
  }

  function insertTrig(base) {
    insert(`${state.second ? 'a' : ''}${base}${state.hyp ? 'h' : ''}(`);
  }

  function backspace() {
    if (state.error) {
      state.error = null;
      render();
      return;
    }
    state.justEvaluated = false;
    const m = /(?:[A-Za-z][A-Za-z0-9]*\(| mod |⁻¹|[A-Za-z]{2,})$/.exec(state.expr);
    if (m) state.expr = state.expr.slice(0, -m[0].length);
    else state.expr = Array.from(state.expr).slice(0, -1).join('');
    render();
  }

  function clearAll() {
    state.expr = '';
    state.error = null;
    state.justEvaluated = false;
    state.second = false;
    state.hyp = false;
    render();
  }

  function toggleSign() {
    if (state.error) state.error = null;
    state.justEvaluated = false;
    const expr = state.expr;
    if (expr === '') {
      state.expr = '−';
    } else if (/^[−-]?[\d,]+(?:E[−-]?\d+)?$/.test(expr)) {
      // ganze Eingabe ist eine Zahl
      state.expr = /^[−-]/.test(expr) ? expr.slice(1) : `−${expr}`;
    } else {
      const m = /(\(−)?([\d,]+(?:E[−-]?\d+)?|π|e|Ans)$/.exec(expr);
      if (m && m[1]) state.expr = expr.slice(0, m.index) + m[2];
      else if (m) state.expr = `${expr.slice(0, m.index)}(−${m[2]}`;
      else state.expr += '(−';
    }
    render();
  }

  function equals() {
    if (state.expr.trim() === '' || state.justEvaluated) return;
    const { value, error } = tryEvaluate(state.expr);
    if (error) {
      state.error = error;
      render();
      return;
    }
    const closed = state.expr + ')'.repeat(openParens(state.expr));
    state.history.unshift({ expr: closed, result: format(value), value, lang: I18n.getLang() });
    state.history.length = Math.min(state.history.length, HISTORY_LIMIT);
    state.ans = value;
    state.expr = show(value);
    state.justEvaluated = true;
    state.lastExpr = closed;
    save();
    render();
    renderHistory();
  }

  function currentValue() {
    if (state.expr.trim() === '') return 0;
    const { value, error } = tryEvaluate(state.expr);
    if (error) {
      toast(error);
      return null;
    }
    return value;
  }

  function memory(action) {
    switch (action) {
      case 'mc':
        state.memory = null;
        toast(t('Speicher gelöscht'));
        break;
      case 'mr':
        if (state.memory === null) return;
        insert(asOperand(state.memory));
        return;
      case 'ms':
      case 'm+':
      case 'm-': {
        const v = currentValue();
        if (v === null) return;
        const base = state.memory || 0;
        state.memory = action === 'ms' ? v : action === 'm+' ? base + v : base - v;
        toast(`M = ${pretty(state.memory)}`);
        break;
      }
    }
    save();
    render();
  }

  function setAngle(angle) {
    state.angle = angle;
    save();
    render();
  }

  const sciVisible = () => (state.sciOverride === null ? landscape.matches : state.sciOverride);

  function toggleSci() {
    state.sciOverride = !sciVisible();
    if (!state.sciOverride) {
      state.second = false;
      state.hyp = false;
    }
    render();
  }

  function setView(view) {
    if (!(view in VIEWS)) view = 'calc';
    state.view = view;
    for (const v of Object.keys(VIEWS)) $(`#view-${v}`).hidden = v !== view;
    els.calcActions.hidden = view !== 'calc';
    $('#share-btn').hidden = !['calc', 'fx', 'units'].includes(view);
    els.fxActions.hidden = view !== 'fx';
    els.viewSwitchLabel.textContent = t(VIEWS[view]);
    els.calculator.dataset.view = view;
    if (view !== 'calc') toggleHistory(false);
    document.querySelectorAll('.view-item[data-view]').forEach((b) => {
      if (b.dataset.view === view) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    if (modules[view]) modules[view].show();
    window.Money.setView(view);
    save();
    if (view === 'calc') render();
  }

  // ---------- Einstellungen ----------

  const settings = { theme: 'auto', vibrate: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (_) { /* Standard */ }
  if (settings.lang !== 'auto' && !I18n.LANGS.includes(settings.lang)) settings.lang = 'auto';
  I18n.setLang(settings.lang === 'auto' ? null : settings.lang);

  // Nach einem Sprachwechsel: Eingabe umschreiben und alle Texte neu setzen
  function refreshTexts(prevLang) {
    const now = I18n.getLang();
    if (prevLang && prevLang !== now) {
      state.expr = convertExpr(state.expr, prevLang, now);
      if (state.lastExpr) state.lastExpr = convertExpr(state.lastExpr, prevLang, now);
    }
    els.viewSwitchLabel.textContent = t(VIEWS[state.view]);
    document.querySelectorAll('[data-fxkey="dec"], [data-unitkey="dec"]').forEach((b) => { b.textContent = L().decimal; });
    render();
    renderHistory();
    if (modules[state.view]) modules[state.view].show();
  }

  function applySettings() {
    const root = document.documentElement;
    if (settings.theme === 'light' || settings.theme === 'dark') root.dataset.theme = settings.theme;
    else delete root.dataset.theme;
    document.querySelectorAll('[data-theme-choice]').forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.themeChoice === settings.theme));
    });
    els.lang.value = settings.lang;
    els.vibrate.setAttribute('aria-checked', String(settings.vibrate));
    window.Keypad.setHaptics(settings.vibrate);
    els.themeColor.setAttribute('content', getComputedStyle(root).getPropertyValue('--ground').trim() || '#0E0F11');
    if (modules.graph) modules.graph.redraw();
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) { /* ignorieren */ }
  }

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applySettings());

  // Sprachauswahl: Auto + jede Sprache in ihrem eigenen Namen
  for (const code of I18n.LANGS) {
    const o = document.createElement('option');
    o.value = code;
    o.lang = code;
    o.textContent = I18n.LOCALES[code].name;
    els.lang.appendChild(o);
  }
  els.lang.addEventListener('change', () => {
    const prev = I18n.getLang();
    settings.lang = els.lang.value;
    I18n.setLang(settings.lang === 'auto' ? null : settings.lang);
    applySettings();
    refreshTexts(prev);
  });

  function openMenu() {
    window.Money.renderMenu();
    els.menu.showModal();
    const current = els.menu.querySelector('[aria-current="page"]');
    if (current) current.focus();
  }

  els.viewSwitch.addEventListener('click', openMenu);
  els.menu.addEventListener('click', (e) => {
    if (e.target === els.menu || e.target.closest('[data-close]')) return els.menu.close();
    const item = e.target.closest('.view-item[data-view]');
    if (item) {
      e.stopPropagation();
      els.menu.close();
      setView(item.dataset.view);
      return;
    }
    const legal = e.target.closest('a[data-legal]');
    if (legal) legal.href = `${legal.getAttribute('href').split('?')[0]}?lang=${I18n.getLang()}`;
    const theme = e.target.closest('[data-theme-choice]');
    if (theme) {
      settings.theme = theme.dataset.themeChoice;
      applySettings();
    }
    if (e.target.closest('#set-vibrate')) {
      settings.vibrate = !settings.vibrate;
      applySettings();
      window.Keypad.haptic();
    }
  });

  function toggleHistory(force) {
    const show = typeof force === 'boolean' ? force : els.history.hidden;
    els.history.hidden = !show;
    els.historyToggle.setAttribute('aria-expanded', String(show));
  }

  async function copyResult() {
    if (state.error) return;
    const value = state.justEvaluated ? state.ans : tryEvaluate(state.expr).value;
    if (value === undefined || state.expr.trim() === '') return;
    try {
      await navigator.clipboard.writeText(show(value).replace('−', '-'));
      toast(t('Kopiert'));
    } catch (_) {
      toast(t('Kopieren nicht möglich'));
    }
  }

  // ---------- Darstellung ----------

  function render() {
    // Eingabezeile mit "Geister"-Klammern, die automatisch geschlossen werden
    const shown = state.justEvaluated ? `${state.lastExpr} =` : state.expr;   // lastExpr folgt der Sprache (siehe setLanguage)
    els.expression.textContent = shown;
    if (!state.justEvaluated) {
      const missing = openParens(state.expr);
      if (missing) {
        const ghost = document.createElement('span');
        ghost.className = 'ghost';
        ghost.textContent = ')'.repeat(missing);
        els.expression.append(ghost);
      }
      const caret = document.createElement('span');
      caret.className = 'caret';
      els.expression.append(caret);
    }
    els.expression.scrollLeft = els.expression.scrollWidth;

    // Ergebnis bzw. Live-Vorschau
    const r = els.result;
    r.classList.remove('preview', 'error');
    if (state.error) {
      r.textContent = t(state.error);
      r.classList.add('error');
    } else if (state.justEvaluated) {
      r.textContent = pretty(state.ans);
    } else if (state.expr.trim() === '') {
      r.textContent = '0';
      r.classList.add('preview');
    } else {
      const { value } = tryEvaluate(state.expr);
      r.textContent = value === undefined ? '' : pretty(value);
      r.classList.add('preview');
    }
    if (!els.viewCalc.hidden) fitText(r, 22);

    // Anzeigen und Umschalter
    const sci = sciVisible();
    els.calculator.classList.toggle('sci-on', sci);
    els.sciToggle.setAttribute('aria-pressed', String(sci));
    els.sciToggle.setAttribute('aria-label', t(sci ? 'Wissenschaftliche Funktionen ausblenden' : 'Wissenschaftliche Funktionen einblenden'));
    document.querySelectorAll('[data-action="decimal"]').forEach((b) => { b.textContent = L().decimal; });
    document.querySelectorAll('[data-action="argsep"]').forEach((b) => { b.textContent = L().argSep; });
    els.indMode.textContent = state.angle.toUpperCase();
    els.ind2nd.hidden = !state.second;
    els.indHyp.hidden = !state.hyp;
    els.indMem.hidden = state.memory === null;
    document.querySelectorAll('[data-angle]').forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.angle === state.angle));
    });
    document.querySelector('[data-action="2nd"]').setAttribute('aria-pressed', String(state.second));
    document.querySelector('[data-action="hyp"]').setAttribute('aria-pressed', String(state.hyp));
    document.querySelectorAll('[data-trig]').forEach((b) => {
      b.textContent = `${b.dataset.trig}${state.hyp ? 'h' : ''}${state.second ? '⁻¹' : ''}`;
    });
    document.querySelectorAll('[data-action="mc"], [data-action="mr"]').forEach((b) => {
      b.disabled = state.memory === null;
    });
  }

  function renderHistory() {
    els.historyList.replaceChildren(...state.history.map((h, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.historyIndex = String(i);
      btn.title = t('Ergebnis übernehmen (Umschalt+Klick: Rechnung übernehmen)');
      const ex = document.createElement('span');
      ex.className = 'h-expr';
      ex.textContent = `${convertExpr(h.expr, h.lang || 'de', I18n.getLang())} =`;
      const res = document.createElement('span');
      res.className = 'h-res';
      res.textContent = typeof h.value === 'number' ? pretty(h.value) : h.result.replace('.', L().decimal).replace(/^-/, '−');
      btn.append(ex, res);
      li.append(btn);
      return li;
    }));
    els.historyEmpty.hidden = state.history.length > 0;
  }

  function useHistory(index, takeExpression) {
    const h = state.history[index];
    if (!h) return;
    state.error = null;
    if (takeExpression) {
      state.expr = convertExpr(h.expr, h.lang || 'de', I18n.getLang());
      state.justEvaluated = false;
    } else {
      insert(typeof h.value === 'number' ? asOperand(h.value) : h.result.replace('.', L().decimal).replace(/^-(.*)$/, '(−$1)'));
      return;
    }
    render();
  }

  // ---------- Ereignisse ----------

  function handleAction(action) {
    switch (action) {
      case 'clear': clearAll(); break;
      case 'backspace': backspace(); break;
      case 'equals': equals(); break;
      case 'sign': toggleSign(); break;
      case '2nd': state.second = !state.second; render(); break;
      case 'hyp': state.hyp = !state.hyp; render(); break;
      case 'toggle-history': toggleHistory(); break;
      case 'toggle-sci': toggleSci(); break;
      case 'toggle-angle': setAngle(state.angle === 'deg' ? 'rad' : 'deg'); break;
      case 'decimal': insert(L().decimal); break;
      case 'argsep': insert(L().argSep); break;
      case 'clear-history':
        state.history = [];
        save();
        renderHistory();
        break;
      case 'mc': case 'mr': case 'ms': case 'm+': case 'm-':
        memory(action);
        break;
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.insert !== undefined) insert(btn.dataset.insert);
    else if (btn.dataset.trig) insertTrig(btn.dataset.trig);
    else if (btn.dataset.angle) setAngle(btn.dataset.angle);
    else if (btn.dataset.view) setView(btn.dataset.view);
    else if (btn.dataset.action) handleAction(btn.dataset.action);
    else if (btn.dataset.historyIndex !== undefined) useHistory(Number(btn.dataset.historyIndex), e.shiftKey);
    else if (btn === els.result) copyResult();
  });

  const KEY_BASE = {
    '*': '×', '/': '÷', '-': '−', '+': '+', '^': '^', '(': '(', ')': ')', '%': '%', '!': '!', 'π': 'π',
  };
  // Deutsch: Punkt und Komma tippen beide ein Komma, ";" trennt Argumente. Englisch: "." und ",".
  const keyMap = () => (L().decimal === ','
    ? { ...KEY_BASE, '.': ',', ',': ',', ';': ';' }
    : { ...KEY_BASE, '.': '.', ',': ',', ';': ',' });

  function flash(selector) {
    const btn = document.querySelector(selector);
    if (!btn) return;
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 110);
  }

  document.addEventListener('keydown', (e) => {
    if (state.view !== 'calc' || e.target.closest('input, select, textarea, dialog')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !window.getSelection().toString()) copyResult();
      return;
    }
    const k = e.key;
    if (/^[0-9]$/.test(k)) {
      insert(k);
      flash(`[data-insert="${k}"]`);
    } else if (keyMap()[k]) {
      insert(keyMap()[k]);
      flash(`[data-insert="${CSS.escape(keyMap()[k])}"]`);
    } else if (k === 'Enter' || k === '=') {
      equals();
      flash('[data-action="equals"]');
    } else if (k === 'Backspace') {
      backspace();
      flash('[data-action="backspace"]');
    } else if (k === 'Escape' || k === 'Delete') {
      clearAll();
      flash('[data-action="clear"]');
    } else if (k === 'H' && e.shiftKey) {
      toggleHistory();
    } else if (k === 'S' && e.shiftKey) {
      toggleSci();
    } else if (/^[a-zA-Z]$/.test(k)) {
      // Funktionsnamen direkt tippen, z. B. "sqrt(2)"
      insert(k);
    } else {
      return;
    }
    e.preventDefault();
  });

  // ---------- Start ----------

  landscape.addEventListener('change', () => {
    state.sciOverride = null;
    render();
  });

  // ---------- Teilen ----------

  const WEB_URL = 'https://almaz6380.github.io/Calcumeter/';

  function calcShareText() {
    if (state.error || state.expr.trim() === '') return null;
    if (state.justEvaluated) return `${state.lastExpr} = ${pretty(state.ans)}`;
    const { value } = tryEvaluate(state.expr);
    if (value === undefined) return null;
    return `${state.expr}${')'.repeat(openParens(state.expr))} = ${pretty(value)}`;
  }

  async function shareCurrent() {
    const text = state.view === 'calc' ? calcShareText() : modules[state.view] && modules[state.view].shareText && modules[state.view].shareText();
    if (!text) return;
    const res = await window.Native.share({ text: `${text}\n– ${t('berechnet mit Calcumeter')}`, url: WEB_URL });
    if (res === 'copied') toast(t('Kopiert'));
    else if (res === 'failed') toast(t('Kopieren nicht möglich'));
  }

  $('#share-btn').addEventListener('click', shareCurrent);

  // Gemeinsame Schnittstelle für die Bereiche
  const hub = {
    getAns: () => state.ans,
    fitText,
    toast,
    pick: (opts) => window.Keypad.pick(opts),
    useInCalc: (value) => {
      setView('calc');
      insert(asOperand(value));
    },
  };

  const modules = {};
  const mods = { fx: window.Fx, units: window.Units, prog: window.Prog, graph: window.Graph };
  for (const [name, mod] of Object.entries(mods)) {
    if (!mod) continue;
    try {
      modules[name] = mod.init(hub);
    } catch (e) {
      console.error(`Bereich ${name} konnte nicht starten`, e);
    }
  }

  // Vibration bei jeder Taste
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.key, .chip, .bit, .prog-base, .cat-chip')) window.Keypad.haptic();
  });

  // Gesten im Rechner: Wischen über die Anzeige löscht, AC lange drücken löscht alles
  window.Keypad.onSwipe($('#view-calc .display'), backspace);
  if (window.Native.isApp) window.Keypad.setNativeHaptic(window.Native.haptic);
  window.Keypad.onLongPress($('[data-action="clear"]'), () => {
    clearAll();
    state.memory = null;
    save();
    render();
    toast(t('Alles gelöscht'));
  });

  load();
  applySettings();
  refreshTexts();
  window.Money.wire();
  window.Money.init({ toast });
  render();
  renderHistory();
  setView(state.view);
  window.Native.onOpenView((view) => setView(view));
  if (state.view === 'calc' && window.matchMedia('(min-width: 1100px)').matches) toggleHistory(true);
  window.addEventListener('resize', () => { if (state.view === 'calc') render(); });
  if (document.fonts) document.fonts.ready.then(() => render());

  const isApp = Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (!isApp && 'serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
