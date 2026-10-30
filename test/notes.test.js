'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const I18n = require('../i18n.js');
const { evaluateSheet, normalizeNumbers } = require('../notes.js');

const RATES = { EUR: 1, USD: 1.1, GBP: 0.85, JPY: 170, KRW: 1500, CNY: 7.5, TWD: 35 };
const sheet = (text, decimal = ',') => evaluateSheet(text, { decimal, rates: RATES });
const value = (r) => (r.kind === 'value' ? Math.round(r.q.v * 1e6) / 1e6 : r.kind);
const unit = (r) => r.q && r.q.u && r.q.u.id;

test('Zeilen, Beschriftungen und Summen', () => {
  const r = sheet('# Einkauf\nBrot: 3,20 €\nKäse: 6,90 €\nsumme\n\nMiete 850\nHallo Welt');
  assert.deepEqual(r.map(value), ['heading', 3.2, 6.9, 10.1, 'blank', 850, 'text']);
  assert.equal(unit(r[3]), 'EUR');
  assert.equal(r[3].total, true);
});

test('Variablen, auch mit Einheiten', () => {
  const r = sheet('strecke = 42 km\nstrecke in mi\nstrecke × 0,30 €\na = 10 USD\nb = 5 EUR\na + b');
  assert.equal(value(r[1]), 26.09759);
  assert.equal(unit(r[1]), 'mi');
  assert.equal(value(r[2]), 12.6);
  assert.equal(unit(r[2]), 'EUR');
  assert.equal(value(r[5]), 15.5);
  assert.equal(unit(r[5]), 'USD');
});

test('Umrechnen und Prozent', () => {
  assert.equal(value(sheet('100 € in USD')[0]), 110);
  assert.equal(value(sheet('20 m/s in km/h')[0]), 72);
  assert.equal(value(sheet('100 °F in °C')[0]), 37.777778);
  assert.equal(value(sheet('15 % von 80')[0]), 12);
  assert.equal(value(sheet('15% of 80', '.')[0]), 12);
  assert.equal(value(sheet('2 GB → MB', '.')[0]), 2000);
});

test('Durchschnitt, ans und Zahlenformat', () => {
  assert.deepEqual(sheet('2\n4\n6\nschnitt').map(value), [2, 4, 6, 4]);
  assert.deepEqual(sheet('sqrt(16)\nans × 2').map(value), [4, 8]);
  assert.equal(normalizeNumbers('1.500 + 2,5', ','), '1500 + 2.5');
  assert.equal(normalizeNumbers('1,234.5', '.'), '1234.5');
});

test('Unverträgliche Einheiten ergeben keine Summe', () => {
  const r = sheet('5 km\n3 €\nsumme');
  assert.equal(r[2].kind, 'text');
});

test('Das Beispiel jeder Sprache rechnet jede Zeile', () => {
  for (const l of I18n.LANGS) if (l !== 'de' && l !== 'en') require(`../lang/${l}.js`);
  const de = Object.keys(I18n.EN).find((k) => k.startsWith('# Einkauf'));
  for (const l of I18n.LANGS) {
    I18n.setLang(l);
    const text = I18n.t(de);
    const rows = sheet(text, I18n.locale().decimal);
    const bad = rows.filter((r, i) => r.kind === 'text').map((r) => text.split('\n')[rows.indexOf(r)]);
    assert.deepEqual(bad, [], l);
  }
  I18n.setLang('de');
});
