/*
 * Calcumeter – gemeinsame Bausteine
 *
 * Betragseingabe für Währung und Einheiten, Auswahlblatt mit Suche,
 * Gesten (Wischen, langes Drücken) und Vibration.
 */
(function (global, factory) {
  const i18n = typeof module === 'object' && module.exports ? require('./i18n.js') : global.I18n;
  const api = factory(i18n);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.Keypad = api;
})(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  const t = (s, vars) => I18n.t(s, vars);

  // ---------- Betragseingabe ----------
  // Beträge werden intern immer mit Punkt als Dezimalzeichen gespeichert ("1234.5");
  // angezeigt werden sie in der Schreibweise der gewählten Sprache.

  // Beim Tippen mit Tausendertrennung zeigen: "-12345.6" → "−12.345,6" (de) bzw. "−12,345.6" (en)
  function groupTyped(text) {
    const L = I18n.locale();
    const m = /^(-?)(\d*)(\.\d*)?$/.exec(text);
    if (!m) {
      return text.replace(/\./g, L.decimal).replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
    }
    return (m[1] ? '−' : '') + (m[2] || '0').replace(/\B(?=(\d{3})+(?!\d))/g, L.group)
      + (m[3] ? L.decimal + m[3].slice(1) : '');
  }

  // Eine Taste auf den Betragstext anwenden und den neuen Text liefern
  function editAmount(text, key, max = 18) {
    const a = text === '0' ? '' : text;
    let out;
    if (/^\d+$/.test(key)) out = a === '' && key === '00' ? '0' : a + key;
    else if (key === 'dec') {
      if (/\.\d*$/.test(a)) return text;
      out = `${/\d$/.test(a) ? a : `${a}0`}.`;
    } else if (/^[+\-*/()]$/.test(key)) out = (a || '0') + key;
    else if (key === 'back') out = a.slice(0, -1);
    else if (key === 'clear') out = '';
    else if (key === 'sign') out = a.startsWith('-') ? a.slice(1) : `-${a}`;
    else return text;
    return out.slice(0, max);
  }

  // Deutsche Schreibweise (frühere Versionen) für den Rechenkern: "1.234,50" → "1234.50"
  function normalizeAmount(text) {
    let t = String(text).replace(/\s/g, '');
    if (t.includes(',')) t = t.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(/,/g, '.');
    return t;
  }

  // Tastaturtaste → Betragstaste (oder null)
  function amountKeyFromEvent(e) {
    const k = e.key;
    if (/^[0-9]$/.test(k) || /^[+\-*/()]$/.test(k)) return k;
    if (k === ',' || k === '.') return 'dec';
    if (k === 'Backspace') return 'back';
    if (k === 'Escape' || k === 'Delete') return 'clear';
    if (k === 'Enter' || k === '=') return 'equals';
    return null;
  }

  // ---------- Vibration ----------

  let hapticsOn = true;
  const setHaptics = (on) => { hapticsOn = Boolean(on); };
  function haptic() {
    if (!hapticsOn) return;
    if (nativeHaptic) { nativeHaptic(); return; }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(8); } catch (_) { /* nicht unterstützt */ }
    }
  }

  // ---------- Gesten ----------

  // Waagrechtes Wischen über ein Element; der folgende Klick wird geschluckt
  function onSwipe(el, cb) {
    let start = null;
    let swallow = false;
    el.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 40 && Math.abs(dy) < 30) {
        swallow = true;
        haptic();
        cb();
      }
    });
    el.addEventListener('pointercancel', () => { start = null; });
    el.addEventListener('click', (e) => {
      if (!swallow) return;
      swallow = false;
      e.stopPropagation();
      e.preventDefault();
    }, true);
  }

  // Langes Drücken; der normale Klick danach entfällt
  function onLongPress(el, cb, ms = 550) {
    let timer = null;
    let fired = false;
    const cancel = () => { clearTimeout(timer); timer = null; };
    el.addEventListener('pointerdown', () => {
      fired = false;
      cancel();
      timer = setTimeout(() => {
        fired = true;
        haptic();
        cb();
      }, ms);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => el.addEventListener(t, cancel));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('click', (e) => {
      if (!fired) return;
      fired = false;
      e.stopImmediatePropagation();
      e.preventDefault();
    }, true);
  }

  // ---------- Auswahlblatt mit Suche ----------

  let picker = null;

  function buildPicker() {
    const dialog = document.createElement('dialog');
    dialog.className = 'sheet picker';
    dialog.setAttribute('aria-labelledby', 'picker-title');
    dialog.innerHTML = `
      <div class="sheet-inner">
        <div class="sheet-head">
          <h2 id="picker-title"></h2>
          <button type="button" class="icon-btn" data-close>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <input type="search" class="picker-search" autocomplete="off" spellcheck="false">
        <div class="picker-list" role="listbox"></div>
      </div>`;
    document.body.append(dialog);
    const p = {
      dialog,
      title: dialog.querySelector('#picker-title'),
      search: dialog.querySelector('.picker-search'),
      list: dialog.querySelector('.picker-list'),
      resolve: null,
      items: [],
      groups: [],
      current: null,
    };
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
      const item = e.target.closest('[data-value]');
      if (item) {
        p.chosen = item.dataset.value;
        dialog.close();
      }
    });
    dialog.addEventListener('close', () => {
      const r = p.resolve;
      p.resolve = null;
      if (r) r(p.chosen ?? null);
    });
    p.search.addEventListener('input', () => renderPicker(p));
    p.search.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = p.list.querySelector('[data-value]');
        if (first) first.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const first = p.list.querySelector('[data-value]');
        if (first) first.click();
      }
    });
    p.list.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const all = [...p.list.querySelectorAll('[data-value]')];
      const i = all.indexOf(document.activeElement);
      const next = all[e.key === 'ArrowDown' ? Math.min(all.length - 1, i + 1) : Math.max(0, i - 1)];
      if (i === 0 && e.key === 'ArrowUp' && !p.search.hidden) p.search.focus();
      else if (next) next.focus();
    });
    return p;
  }

  function renderPicker(p) {
    const q = p.search.value.trim().toLowerCase();
    const match = (it) => !q || `${it.value} ${it.label} ${it.sub || ''}`.toLowerCase().includes(q);
    const frag = document.createDocumentFragment();
    let count = 0;
    for (const g of p.groups) {
      const items = p.items.filter((it) => it.group === g && match(it));
      if (!items.length) continue;
      if (p.groups.length > 1) {
        const h = document.createElement('div');
        h.className = 'picker-group';
        h.textContent = g;
        frag.append(h);
      }
      for (const it of items) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'picker-item';
        b.setAttribute('role', 'option');
        b.dataset.value = it.value;
        b.setAttribute('aria-selected', String(it.value === p.current));
        const main = document.createElement('span');
        main.className = 'pi-main';
        main.textContent = it.label;
        b.append(main);
        if (it.sub) {
          const sub = document.createElement('span');
          sub.className = 'pi-sub';
          sub.textContent = it.sub;
          b.append(sub);
        }
        frag.append(b);
        count++;
      }
    }
    if (!count) {
      const empty = document.createElement('p');
      empty.className = 'picker-empty';
      empty.textContent = t('Nichts gefunden.');
      frag.append(empty);
    }
    p.list.replaceChildren(frag);
  }

  // items: [{ value, label, sub, group }], groups: Reihenfolge der Gruppen
  function pick({ title, items, groups, current, searchable = items.length > 12 }) {
    if (!picker) picker = buildPicker();
    const p = picker;
    p.title.textContent = title;
    p.dialog.querySelector('[data-close]').setAttribute('aria-label', t('Schließen'));
    p.search.placeholder = t('Suchen …');
    p.search.setAttribute('aria-label', t('Suchen …'));
    p.items = items;
    p.groups = groups || [...new Set(items.map((it) => it.group))];
    p.current = current;
    p.chosen = null;
    p.search.value = '';
    p.search.hidden = !searchable;
    renderPicker(p);
    return new Promise((resolve) => {
      p.resolve = resolve;
      p.dialog.showModal();
      const fine = window.matchMedia('(pointer: fine)').matches;
      if (searchable && fine) p.search.focus();
      else {
        const sel = p.list.querySelector('[aria-selected="true"]');
        if (sel) {
          sel.focus({ preventScroll: true });
          sel.scrollIntoView({ block: 'center' });
        }
      }
    });
  }

  // Vibration: in der Store-App über das native Plugin (iPhones kennen navigator.vibrate nicht)
  let nativeHaptic = null;
  const setNativeHaptic = (fn) => { nativeHaptic = fn; };

  return { setNativeHaptic, groupTyped, editAmount, normalizeAmount, amountKeyFromEvent, haptic, setHaptics, onSwipe, onLongPress, pick };
});
