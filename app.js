/* Calcumeter – Bedienoberfläche */
(function () {
  'use strict';

  const { evaluate, format } = window.Calc;

  const STORAGE_KEY = 'calcumeter.state';
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
    historyToggle: $('[data-action="toggle-history"]'),
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
      if (saved.view === 'fx') state.view = 'fx';
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

  function tryEvaluate(expr) {
    try {
      return { value: evaluate(expr, ctx()) };
    } catch (e) {
      return { error: e.name === 'CalcError' ? e.message : 'Fehler' };
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
    } else if (/^[−-]?[\d.]+(?:E[−-]?\d+)?$/.test(expr)) {
      // ganze Eingabe ist eine Zahl
      state.expr = /^[−-]/.test(expr) ? expr.slice(1) : `−${expr}`;
    } else {
      const m = /(\(−)?([\d.]+(?:E[−-]?\d+)?|π|e|Ans)$/.exec(expr);
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
    const formatted = format(value);
    state.history.unshift({ expr: closed, result: formatted, value });
    state.history.length = Math.min(state.history.length, HISTORY_LIMIT);
    state.ans = value;
    state.expr = formatted.replace(/^-/, '−');
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
        toast('Speicher gelöscht');
        break;
      case 'mr':
        if (state.memory === null) return;
        insert(format(state.memory).replace(/^-(.*)$/, '(−$1)'));
        return;
      case 'ms':
      case 'm+':
      case 'm-': {
        const v = currentValue();
        if (v === null) return;
        const base = state.memory || 0;
        state.memory = action === 'ms' ? v : action === 'm+' ? base + v : base - v;
        toast(`M = ${format(state.memory)}`);
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
    state.view = view;
    const fx = view === 'fx';
    els.viewCalc.hidden = fx;
    els.viewFx.hidden = !fx;
    els.calcActions.hidden = fx;
    if (fx) toggleHistory(false);
    document.querySelectorAll('[data-view]').forEach((b) => {
      b.setAttribute('aria-selected', String(b.dataset.view === view));
    });
    if (fx && fxView) fxView.show();
    save();
  }

  function toggleHistory(force) {
    const show = typeof force === 'boolean' ? force : els.history.hidden;
    els.history.hidden = !show;
    els.historyToggle.setAttribute('aria-expanded', String(show));
  }

  async function copyResult() {
    const text = els.result.textContent.replace(/^=\s*/, '');
    if (!text || state.error) return;
    try {
      await navigator.clipboard.writeText(text.replace('−', '-'));
      toast('Kopiert');
    } catch (_) {
      toast('Kopieren nicht möglich');
    }
  }

  // ---------- Darstellung ----------

  function render() {
    // Eingabezeile mit "Geister"-Klammern, die automatisch geschlossen werden
    const shown = state.justEvaluated ? `${state.lastExpr} =` : state.expr;
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
      r.textContent = state.error;
      r.classList.add('error');
    } else if (state.justEvaluated) {
      r.textContent = state.expr;
    } else if (state.expr.trim() === '') {
      r.textContent = '0';
      r.classList.add('preview');
    } else {
      const { value } = tryEvaluate(state.expr);
      r.textContent = value === undefined ? '' : `= ${format(value).replace(/^-/, '−')}`;
      r.classList.add('preview');
    }
    r.scrollLeft = r.scrollWidth;

    // Anzeigen und Umschalter
    const sci = sciVisible();
    els.calculator.classList.toggle('sci-on', sci);
    els.sciToggle.setAttribute('aria-pressed', String(sci));
    els.sciToggle.setAttribute('aria-label', sci ? 'Wissenschaftliche Funktionen ausblenden' : 'Wissenschaftliche Funktionen einblenden');
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
      btn.title = 'Ergebnis übernehmen (Umschalt+Klick: Rechnung übernehmen)';
      const ex = document.createElement('span');
      ex.className = 'h-expr';
      ex.textContent = `${h.expr} =`;
      const res = document.createElement('span');
      res.className = 'h-res';
      res.textContent = h.result.replace(/^-/, '−');
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
      state.expr = h.expr;
      state.justEvaluated = false;
    } else {
      insert(h.result.replace(/^-(.*)$/, '(−$1)'));
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

  const KEY_MAP = {
    '*': '×', '/': '÷', '-': '−', '+': '+', '^': '^', '(': '(', ')': ')',
    '%': '%', '!': '!', '.': '.', ',': '.', 'π': 'π',
  };

  function flash(selector) {
    const btn = document.querySelector(selector);
    if (!btn) return;
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 110);
  }

  document.addEventListener('keydown', (e) => {
    if (state.view !== 'calc' || e.target.closest('input, select, textarea')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !window.getSelection().toString()) copyResult();
      return;
    }
    const k = e.key;
    if (/^[0-9]$/.test(k)) {
      insert(k);
      flash(`[data-insert="${k}"]`);
    } else if (KEY_MAP[k]) {
      insert(KEY_MAP[k]);
      flash(`[data-insert="${CSS.escape(KEY_MAP[k])}"]`);
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

  let fxView = null;
  if (window.Fx) {
    fxView = window.Fx.init({
      getAns: () => state.ans,
      useInCalc: (value) => {
        setView('calc');
        insert(format(value).replace(/^-(.*)$/, '(−$1)'));
      },
    });
  }

  load();
  render();
  renderHistory();
  setView(state.view);
  if (state.view === 'calc' && window.matchMedia('(min-width: 981px)').matches && state.history.length) toggleHistory(true);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
