'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I18n = require('../i18n.js');
const Keypad = require('../keypad.js');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// Texte, die in beiden Sprachen gleich bleiben (Fachbegriffe, Tastenbeschriftungen)
const SAME = new Set([
  'Calcumeter', 'DEG', 'RAD', '2nd', 'HYP', 'hyp', 'MC', 'MR', 'MS', 'sin', 'cos', 'tan', 'ln', 'log', 'log₂',
  'nCr', 'nPr', 'mod', 'EXP', 'Ans', 'Rand', 'rnd', 'AC', 'HEX', 'DEC', 'OCT', 'BIN', 'AND', 'OR', 'XOR', 'NOT',
  '64 Bit', 'Deutsch', 'English',
]);

function staticTexts(html) {
  const out = new Set();
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  for (const m of body.matchAll(/(?:aria-label|title|placeholder)="([^"]*)"/g)) out.add(m[1]);
  for (const m of body.matchAll(/>([^<>]+)</g)) out.add(m[1].trim());
  return [...out].map((s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')).filter((s) => /[A-Za-zÄÖÜäöüß]{2}/.test(s));
}

test('Jeder Text der Seite hat eine englische Übersetzung', () => {
  const missing = staticTexts(read('index.html')).filter((s) => !SAME.has(s) && !(s in I18n.EN));
  assert.deepEqual(missing, []);
});

test('Jeder t()-Text in den Skripten hat eine englische Übersetzung', () => {
  const missing = [];
  for (const f of ['app.js', 'currency.js', 'units.js', 'programmer.js', 'graph.js', 'keypad.js']) {
    for (const m of read(f).matchAll(/\bt\('((?:[^'\\]|\\.)+)'/g)) {
      if (!(m[1] in I18n.EN)) missing.push(`${f}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('Fehlermeldungen der Rechenkerne sind übersetzt', () => {
  for (const f of ['calculator.js', 'programmer.js']) {
    for (const m of read(f).matchAll(/new (?:CalcError|IntError)\('([^']+)'\)/g)) {
      assert.ok(m[1] in I18n.EN, `${f}: ${m[1]}`);
    }
  }
  I18n.setLang('en');
  assert.equal(I18n.t('Unbekannt: foo'), 'Unknown: foo');
  assert.equal(I18n.t('{code} entfernt', { code: 'GBP' }), 'GBP removed');
  I18n.setLang('de');
});

test('Zahlenformat folgt der Sprache', () => {
  I18n.setLang('de');
  assert.equal(Keypad.groupTyped('-12345.6'), '−12.345,6');
  assert.equal(Keypad.groupTyped('49.9*3'), '49,9×3');
  I18n.setLang('en');
  assert.equal(Keypad.groupTyped('-12345.6'), '−12,345.6');
  assert.equal(Keypad.groupTyped('49.9*3'), '49.9×3');
  I18n.setLang('de');
});

test('Betragseingabe', () => {
  assert.equal(Keypad.editAmount('12', 'dec'), '12.');
  assert.equal(Keypad.editAmount('1.5', 'dec'), '1.5');
  assert.equal(Keypad.editAmount('', 'dec'), '0.');
  assert.equal(Keypad.editAmount('0', '00'), '0');
  assert.equal(Keypad.editAmount('5', 'sign'), '-5');
  assert.equal(Keypad.editAmount('-5', 'sign'), '5');
  assert.equal(Keypad.normalizeAmount('1.234,50'), '1234.50');
  assert.equal(Keypad.normalizeAmount('12.5'), '12.5');
});
