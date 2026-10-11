/*
 * Calcumeter – Funktionsplotter
 *
 * Bis zu drei Funktionen von x, gezeichnet auf einem Canvas.
 * Ziehen verschiebt, Mausrad/zwei Finger zoomen, Tippen zeigt den Punkt.
 */
(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.Graph = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PREFS_KEY = 'calcumeter.graph';
  const DEFAULT_VIEW = { cx: 0, cy: 0, scale: 40 };
  const DEFAULT_FNS = ['sin(x)', 'x^2/4−1', ''];

  // Gitterabstand auf 1, 2 oder 5 × 10ⁿ runden
  function niceStep(raw) {
    const p = 10 ** Math.floor(Math.log10(raw));
    const n = raw / p;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
  }

  const locale = () => (typeof I18n !== 'undefined' ? I18n.locale() : { intl: 'de-DE', decimal: ',' });

  function fmt(v) {
    if (Math.abs(v) < 1e-12) return '0';
    const L = locale();
    const abs = Math.abs(v);
    if (abs >= 1e6 || abs < 1e-4) return v.toExponential(2).replace('.', L.decimal).replace('e', 'E').replace('+', '').replace('-', '−');
    return new Intl.NumberFormat(L.intl, { maximumSignificantDigits: 6 }).format(v).replace('-', '−');
  }

  // Eingabe in der Schreibweise der Sprache für den Rechenkern (deutsch: Komma → Punkt)
  const toCalc = (text) => (locale().decimal === ',' ? text.replace(/,/g, '.') : text);

  function init(hub) {
    const $ = (id) => document.getElementById(id);
    const el = {
      view: $('view-graph'), wrap: $('graph-wrap'), canvas: $('graph-canvas'), tip: $('graph-tip'),
      inputs: [...document.querySelectorAll('.graph-input')], bar: $('graph-bar'),
    };
    const ctx = el.canvas.getContext('2d');
    const { compile } = window.Calc;

    const state = { fns: DEFAULT_FNS.slice(), view: { ...DEFAULT_VIEW }, tip: null };
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (Array.isArray(saved.fns)) state.fns = [0, 1, 2].map((i) => String(saved.fns[i] || ''));
      if (saved.view && saved.view.scale > 0) state.view = saved.view;
    } catch (_) { /* ohne Speicher */ }
    const save = () => {
      try { localStorage.setItem(PREFS_KEY, JSON.stringify({ fns: state.fns, view: state.view })); } catch (_) { /* ignorieren */ }
    };

    let compiled = [];
    function compileAll() {
      compiled = state.fns.map((text, i) => {
        const input = el.inputs[i];
        input.classList.remove('invalid');
        input.removeAttribute('aria-invalid');
        input.title = '';
        if (!text.trim()) return null;
        try {
          const f = compile(toCalc(text), { angle: 'rad', ans: hub.getAns() });
          f(0.5);
          return f;
        } catch (e) {
          input.classList.add('invalid');
          input.setAttribute('aria-invalid', 'true');
          input.title = typeof I18n !== 'undefined' ? I18n.t(e.message) : e.message;
          return null;
        }
      });
    }

    let size = { w: 0, h: 0 };
    function resize() {
      const r = el.wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      size = { w: r.width, h: r.height };
      el.canvas.width = Math.max(1, Math.round(r.width * dpr));
      el.canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    const toX = (x) => size.w / 2 + (x - state.view.cx) * state.view.scale;
    const toY = (y) => size.h / 2 - (y - state.view.cy) * state.view.scale;
    const fromX = (px) => state.view.cx + (px - size.w / 2) / state.view.scale;
    const fromY = (py) => state.view.cy - (py - size.h / 2) / state.view.scale;

    function draw() {
      const { w, h } = size;
      if (!w || !h) return;
      const css = getComputedStyle(document.documentElement);
      const color = (name) => css.getPropertyValue(name).trim();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color('--panel');
      ctx.fillRect(0, 0, w, h);

      const step = niceStep(72 / state.view.scale);
      const x0 = Math.floor(fromX(0) / step) * step;
      const y0 = Math.floor(fromY(h) / step) * step;
      const axisX = Math.min(Math.max(toY(0), 0), h);   // Lage der x-Achse (geklemmt)
      const axisY = Math.min(Math.max(toX(0), 0), w);   // Lage der y-Achse (geklemmt)

      // Gitter
      ctx.lineWidth = 1;
      ctx.strokeStyle = color('--line');
      ctx.beginPath();
      for (let x = x0; x <= fromX(w); x += step) { const px = Math.round(toX(x)) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, h); }
      for (let y = y0; y <= fromY(0); y += step) { const py = Math.round(toY(y)) + 0.5; ctx.moveTo(0, py); ctx.lineTo(w, py); }
      ctx.stroke();

      // Achsen
      ctx.strokeStyle = color('--muted');
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(axisX) + 0.5); ctx.lineTo(w, Math.round(axisX) + 0.5);
      ctx.moveTo(Math.round(axisY) + 0.5, 0); ctx.lineTo(Math.round(axisY) + 0.5, h);
      ctx.stroke();

      // Beschriftung
      ctx.fillStyle = color('--muted');
      ctx.font = '11px "Geist Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const ly = axisX > h - 18 ? axisX - 16 : axisX + 4;
      for (let x = x0; x <= fromX(w); x += step) {
        if (Math.abs(x) < step / 2) continue;
        ctx.fillText(fmt(x), toX(x), ly);
      }
      ctx.textAlign = axisY > w - 40 ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      const lx = axisY > w - 40 ? axisY - 5 : axisY + 5;
      for (let y = y0; y <= fromY(0); y += step) {
        if (Math.abs(y) < step / 2) continue;
        ctx.fillText(fmt(y), lx, toY(y));
      }

      // Kurven
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      compiled.forEach((f, i) => {
        if (!f) return;
        ctx.strokeStyle = color(`--plot-${i + 1}`);
        ctx.beginPath();
        let prev = null;
        for (let px = 0; px <= w; px += 1) {
          const y = f(fromX(px));
          if (!Number.isFinite(y)) { prev = null; continue; }
          const py = Math.max(-h, Math.min(2 * h, toY(y)));
          if (prev === null || Math.abs(py - prev) > h) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          prev = py;
        }
        ctx.stroke();
      });

      // Markierter Punkt
      const t = state.tip;
      if (t && compiled[t.i]) {
        const y = compiled[t.i](t.x);
        if (Number.isFinite(y)) {
          const px = toX(t.x);
          const py = toY(y);
          ctx.fillStyle = color(`--plot-${t.i + 1}`);
          ctx.beginPath();
          ctx.arc(px, py, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = color('--panel');
          ctx.stroke();
          el.tip.hidden = false;
          el.tip.textContent = `f${'₁₂₃'[t.i]}: x = ${fmt(t.x)} · y = ${fmt(y)}`;
          el.tip.style.left = `${Math.min(Math.max(px, 90), w - 90)}px`;
          el.tip.style.top = `${py < 60 ? py + 18 : py - 44}px`;
        } else {
          el.tip.hidden = true;
        }
      } else {
        el.tip.hidden = true;
      }
    }

    let frame = 0;
    const redraw = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; draw(); });
    };

    function zoomAt(px, py, factor) {
      const x = fromX(px);
      const y = fromY(py);
      state.view.scale = Math.min(1e6, Math.max(1e-4, state.view.scale * factor));
      state.view.cx = x - (px - size.w / 2) / state.view.scale;
      state.view.cy = y + (py - size.h / 2) / state.view.scale;
      redraw();
    }

    function trace(px, py) {
      const x = fromX(px);
      let best = null;
      compiled.forEach((f, i) => {
        if (!f) return;
        const y = f(x);
        if (!Number.isFinite(y)) return;
        const d = Math.abs(toY(y) - py);
        if (d < 32 && (!best || d < best.d)) best = { i, d };
      });
      state.tip = best ? { i: best.i, x } : null;
      redraw();
    }

    // Zeiger: ein Finger verschiebt, zwei zoomen
    const pointers = new Map();
    let moved = 0;
    let pinch = null;
    const local = (e) => {
      const r = el.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    el.canvas.addEventListener('pointerdown', (e) => {
      el.canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, local(e));
      moved = 0;
      pinch = null;
    });
    el.canvas.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, p);
      if (pointers.size === 1) {
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        moved += Math.abs(dx) + Math.abs(dy);
        state.view.cx -= dx / state.view.scale;
        state.view.cy += dy / state.view.scale;
        if (state.tip && moved > 6) state.tip = null;
        redraw();
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (pinch) zoomAt(mid.x, mid.y, dist / pinch);
        pinch = dist;
        moved += 10;
      }
    });
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return;
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) {
        if (moved < 6) trace(p.x, p.y);
        save();
      }
    };
    el.canvas.addEventListener('pointerup', up);
    el.canvas.addEventListener('pointercancel', up);
    el.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = local(e);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
      clearTimeout(el.canvas._saveTimer);
      el.canvas._saveTimer = setTimeout(save, 300);
    }, { passive: false });
    el.canvas.addEventListener('dblclick', () => resetView());

    function resetView() {
      state.view = { ...DEFAULT_VIEW };
      state.tip = null;
      save();
      redraw();
    }

    el.view.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gzoom]');
      if (!b) return;
      if (b.dataset.gzoom === 'reset') resetView();
      else zoomAt(size.w / 2, size.h / 2, b.dataset.gzoom === 'in' ? 1.5 : 1 / 1.5);
      save();
    });

    // Eingabefelder
    let lastInput = el.inputs[0];
    el.inputs.forEach((input, i) => {
      input.value = state.fns[i];
      input.addEventListener('focus', () => { lastInput = input; });
      input.addEventListener('input', () => {
        state.fns[i] = input.value;
        compileAll();
        save();
        redraw();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
      });
    });

    // Schnelltasten fügen am Cursor ein, ohne die Tastatur zu schließen
    el.bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-gins]')) e.preventDefault();
    });
    el.bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gins]');
      if (!b) return;
      const input = lastInput;
      const text = b.dataset.gins;
      const s = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? s;
      input.value = input.value.slice(0, s) + text + input.value.slice(end);
      const caret = s + text.length;
      input.setSelectionRange(caret, caret);
      input.dispatchEvent(new Event('input'));
      if (window.matchMedia('(pointer: fine)').matches) input.focus();
    });

    new ResizeObserver(() => { if (!el.view.hidden) resize(); }).observe(el.wrap);
    compileAll();

    return {
      show() {
        compileAll();
        resize();
      },
      redraw: () => { if (!el.view.hidden) redraw(); },
    };
  }

  return { niceStep, init };
});
