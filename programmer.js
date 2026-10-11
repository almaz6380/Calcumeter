/*
 * Calcumeter – Programmierer-Rechner
 *
 * Ganzzahlen als BigInt in fester Wortbreite (8/16/32/64 Bit, Zweierkomplement).
 * Intern stehen Operatoren als Symbole: & | ^ ~ % << >> * / + -
 * Rangfolge wie in C: unär > * / % > + - > << >> > & > ^ > |
 */
(function (global, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./keypad.js') : global.Keypad, node ? require('./i18n.js') : global.I18n);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.Prog = api;
})(typeof self !== 'undefined' ? self : this, function (Keypad, I18n) {
  'use strict';

  const PREFS_KEY = 'calcumeter.prog';
  const DIGITS = { 2: /[01]/, 8: /[0-7]/, 10: /[0-9]/, 16: /[0-9A-F]/ };
  const PREFIX = { 2: '0b', 8: '0o', 10: '', 16: '0x' };

  class IntError extends Error {}

  // ---------- Reine Logik ----------

  function tokenize(src, base) {
    const tokens = [];
    const s = src.toUpperCase();
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9A-F]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9A-F]/.test(s[j])) j++;
        const digits = s.slice(i, j);
        if (![...digits].every((d) => DIGITS[base].test(d))) throw new IntError('Ungültige Ziffer');
        tokens.push({ t: 'num', v: base === 10 ? BigInt(digits) : BigInt(PREFIX[base] + digits) });
        i = j;
        continue;
      }
      if (s.startsWith('<<', i) || s.startsWith('>>', i)) {
        tokens.push({ t: 'op', v: s.slice(i, i + 2) });
        i += 2;
        continue;
      }
      if ('&|^~%*/+-()'.includes(c)) {
        tokens.push({ t: c === '(' || c === ')' ? c : 'op', v: c });
        i++;
        continue;
      }
      throw new IntError(`Ungültiges Zeichen: ${c}`);
    }
    return tokens;
  }

  function evaluateInt(expr, { base = 10, bits = 64 } = {}) {
    const wrap = (v) => BigInt.asIntN(bits, v);
    const tokens = tokenize(String(expr), base);
    if (!tokens.length) throw new IntError('Keine Eingabe');
    let pos = 0;
    const peek = () => tokens[pos];
    const isOp = (...ops) => peek() && peek().t === 'op' && ops.includes(peek().v);

    const binary = (next, ops, apply) => () => {
      let a = next();
      while (isOp(...ops)) {
        const op = tokens[pos++].v;
        a = wrap(apply(op, a, next()));
      }
      return a;
    };

    function unary() {
      if (isOp('-')) { pos++; return wrap(-unary()); }
      if (isOp('~')) { pos++; return wrap(~unary()); }
      if (isOp('+')) { pos++; return unary(); }
      const t = tokens[pos++];
      if (!t) throw new IntError('Syntaxfehler');
      if (t.t === 'num') return wrap(t.v);
      if (t.t === '(') {
        const v = or();
        if (pos < tokens.length) {
          if (peek().t !== ')') throw new IntError('Syntaxfehler');
          pos++;
        }
        return v;
      }
      throw new IntError('Syntaxfehler');
    }

    const mul = binary(unary, ['*', '/', '%'], (op, a, b) => {
      if (op === '*') return a * b;
      if (b === 0n) throw new IntError('Division durch 0');
      return op === '/' ? a / b : a % b;
    });
    const add = binary(mul, ['+', '-'], (op, a, b) => (op === '+' ? a + b : a - b));
    const shift = binary(add, ['<<', '>>'], (op, a, b) => {
      if (b < 0n) throw new IntError('Negative Verschiebung');
      const n = b >= BigInt(bits) ? BigInt(bits) : b;
      return op === '<<' ? a << n : a >> n;
    });
    const and = binary(shift, ['&'], (op, a, b) => a & b);
    const xor = binary(and, ['^'], (op, a, b) => a ^ b);
    const or = binary(xor, ['|'], (op, a, b) => a | b);

    const value = or();
    if (pos < tokens.length) throw new IntError('Syntaxfehler');
    return value;
  }

  // Ohne Gruppierung, zum Weiterrechnen; negative Werte außer in DEC als Zweierkomplement
  function formatRaw(v, base, bits) {
    if (base === 10) return v.toString();
    return BigInt.asUintN(bits, v).toString(base).toUpperCase();
  }

  // Lesbar gruppiert für die Anzeige
  function formatInt(v, base, bits) {
    const raw = formatRaw(v, base, bits);
    if (base === 10) {
      const neg = raw.startsWith('-');
      const digits = neg ? raw.slice(1) : raw;
      return (neg ? '−' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, I18n.locale().group);
    }
    const size = base === 8 ? 3 : 4;
    return raw.replace(new RegExp(`\\B(?=(.{${size}})+(?!.))`, 'g'), ' ');
  }

  // Interne Schreibweise → Anzeige
  function displayExpr(expr) {
    return expr
      .replace(/<</g, ' << ').replace(/>>/g, ' >> ')
      .replace(/&/g, ' AND ').replace(/\|/g, ' OR ').replace(/\^/g, ' XOR ')
      .replace(/~/g, 'NOT ').replace(/%/g, ' mod ')
      .replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−')
      .replace(/ {2,}/g, ' ').trim();
  }

  // ---------- Oberfläche ----------

  function init(hub) {
    const $ = (id) => document.getElementById(id);
    const el = {
      view: $('view-prog'), expr: $('prog-expr'), display: $('prog-display'),
      bases: $('prog-bases'), bitsGrid: $('prog-bits'),
      width: $('prog-width'), bitview: $('prog-bitview'), pad: $('prog-pad'),
    };

    const state = { expr: '', base: 10, bits: 64, bitView: false, justEvaluated: false, error: null, value: 0n };
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if ([2, 8, 10, 16].includes(saved.base)) state.base = saved.base;
      if ([8, 16, 32, 64].includes(saved.bits)) state.bits = saved.bits;
      state.bitView = Boolean(saved.bitView);
    } catch (_) { /* ohne Speicher */ }
    const save = () => {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ base: state.base, bits: state.bits, bitView: state.bitView }));
      } catch (_) { /* ignorieren */ }
    };

    function current() {
      if (state.expr.trim() === '') return { value: 0n };
      try {
        return { value: evaluateInt(state.expr, state) };
      } catch (e) {
        return { error: e.message };
      }
    }

    function setValue(v, evaluated = true) {
      state.expr = formatRaw(v, state.base, state.bits);
      state.justEvaluated = evaluated;
      state.error = null;
    }

    function renderBits(v) {
      const u = BigInt.asUintN(state.bits, v);
      const rows = [];
      for (let start = state.bits - 1; start >= 0; start -= 16) {
        const row = document.createElement('div');
        row.className = 'bit-row';
        const label = document.createElement('span');
        label.className = 'bit-label';
        label.textContent = String(start);
        row.append(label);
        const end = Math.max(0, start - 15);
        for (let i = start; i >= end; i--) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'bit';
          b.dataset.bit = String(i);
          const on = (u >> BigInt(i)) & 1n;
          b.textContent = on ? '1' : '0';
          b.setAttribute('aria-pressed', String(Boolean(on)));
          b.setAttribute('aria-label', `Bit ${i}`);
          if (i % 4 === 0 && i !== end) b.classList.add('nibble-end');
          row.append(b);
        }
        rows.push(row);
      }
      el.bitsGrid.replaceChildren(...rows);
    }

    function render() {
      const { value, error } = current();
      const shown = state.error || error;
      el.expr.textContent = displayExpr(state.expr) || '0';
      el.expr.classList.toggle('invalid', Boolean(state.error));
      const v = error ? state.value : value;
      if (!error) state.value = value;
      el.bases.querySelectorAll('[data-base]').forEach((b) => {
        const base = Number(b.dataset.base);
        b.setAttribute('aria-pressed', String(base === state.base));
        b.querySelector('.pb-val').textContent = formatInt(v, base, state.bits);
      });
      el.bases.classList.toggle('stale', Boolean(shown));
      el.width.textContent = `${state.bits} Bit`;
      el.bitview.setAttribute('aria-pressed', String(state.bitView));
      el.bitsGrid.hidden = !state.bitView;
      el.bases.hidden = state.bitView;
      if (state.bitView) renderBits(v);
      el.pad.querySelectorAll('[data-pkey]').forEach((b) => {
        const k = b.dataset.pkey;
        if (/^[0-9A-F]$/.test(k)) b.disabled = !DIGITS[state.base].test(k);
      });
      if (!el.view.hidden) hub.fitText(el.expr, 16);
    }

    function insert(text) {
      const isDigit = /^[0-9A-F]+$/.test(text);
      if (state.justEvaluated && (isDigit || text === '(' || text === '~')) state.expr = '';
      state.justEvaluated = false;
      state.error = null;
      if (isDigit && !DIGITS[state.base].test(text)) return;
      if (state.expr === '' && /^(?:[&|^%*/+]|<<|>>)$/.test(text)) state.expr = formatRaw(state.value, state.base, state.bits);
      state.expr += text;
      render();
    }

    function press(key) {
      switch (key) {
        case 'clear':
          state.expr = '';
          state.error = null;
          state.justEvaluated = false;
          break;
        case 'back':
          state.justEvaluated = false;
          state.error = null;
          state.expr = state.expr.replace(/(<<|>>|.)$/, '');
          break;
        case 'equals': {
          const { value, error } = current();
          if (error) state.error = error;
          else setValue(value);
          if (error) hub.toast(I18n.t(error));
          break;
        }
        case 'neg':
          if (/^[0-9A-F]+$/.test(state.expr)) state.expr = `-${state.expr}`;
          else if (/^-[0-9A-F]+$/.test(state.expr)) state.expr = state.expr.slice(1);
          else if (state.expr) state.expr = `-(${state.expr})`;
          state.justEvaluated = false;
          break;
        default:
          insert(key);
          return;
      }
      render();
    }

    function setBase(base) {
      const { value, error } = current();
      state.base = base;
      if (!error && state.expr.trim() !== '') setValue(value, state.justEvaluated);
      else if (error) state.expr = '';
      save();
      render();
    }

    el.view.addEventListener('click', (e) => {
      const k = e.target.closest('[data-pkey]');
      if (k) return press(k.dataset.pkey);
      const b = e.target.closest('[data-base]');
      if (b) return setBase(Number(b.dataset.base));
      const bit = e.target.closest('[data-bit]');
      if (bit) {
        const v = BigInt.asIntN(state.bits, state.value ^ (1n << BigInt(bit.dataset.bit)));
        setValue(v);
        state.value = v;
        render();
      }
    });

    el.width.addEventListener('click', () => {
      const sizes = [8, 16, 32, 64];
      const { value, error } = current();
      state.bits = sizes[(sizes.indexOf(state.bits) + 1) % sizes.length];
      if (!error && state.expr.trim() !== '') setValue(BigInt.asIntN(state.bits, value), state.justEvaluated);
      save();
      render();
    });

    el.bitview.addEventListener('click', () => {
      state.bitView = !state.bitView;
      save();
      render();
    });

    document.addEventListener('keydown', (e) => {
      if (el.view.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest('input, textarea, dialog')) return;
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      let key = null;
      if (/^[0-9A-F]$/.test(k)) key = k;
      else if ('&|^~%*/+-()'.includes(k) && k.length === 1) key = k;
      else if (k === '<') key = '<<';
      else if (k === '>') key = '>>';
      else if (k === 'Enter' || k === '=') key = 'equals';
      else if (k === 'Backspace') key = 'back';
      else if (k === 'Escape' || k === 'Delete') key = 'clear';
      if (key === null) return;
      e.preventDefault();
      press(key);
    });

    Keypad.onSwipe(el.display, () => press('back'));
    window.addEventListener('resize', () => { if (!el.view.hidden) render(); });

    render();
    return { show: render };
  }

  return { evaluateInt, formatInt, formatRaw, displayExpr, init };
});
