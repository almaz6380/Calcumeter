'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { convert, normalizeAmount, FALLBACK } = require('../currency.js');
const { evaluate } = require('../calculator.js');

const rates = { EUR: 1, USD: 1.25, JPY: 160 };

test('Umrechnung über die Basis EUR', () => {
  assert.equal(convert(100, 'EUR', 'USD', rates), 125);
  assert.equal(convert(125, 'USD', 'EUR', rates), 100);
  assert.equal(convert(1.25, 'USD', 'JPY', rates), 160);
  assert.throws(() => convert(1, 'EUR', 'XXX', rates));
});

test('Deutsche Schreibweise und Rechnungen im Betrag', () => {
  assert.equal(normalizeAmount('1.234,50'), '1234.50');
  assert.equal(normalizeAmount('49,90 * 3'), '49.90*3');
  assert.equal(normalizeAmount('12.5'), '12.5');
  assert.equal(evaluate(normalizeAmount('49,90*3')).toFixed(2), '149.70');
});

test('Eingebaute Kurse sind vollständig', () => {
  assert.equal(FALLBACK.rates.EUR, 1);
  for (const v of Object.values(FALLBACK.rates)) assert.ok(v > 0);
});
