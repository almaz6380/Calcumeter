'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, convertUnit, formatValue } = require('../units.js');

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test('Länge, Gewicht, Volumen', () => {
  near(convertUnit(1, 'km', 'm', 'length'), 1000);
  near(convertUnit(1, 'mi', 'km', 'length'), 1.609344);
  near(convertUnit(12, 'in', 'ft', 'length'), 1);
  near(convertUnit(1, 'lb', 'g', 'mass'), 453.59237);
  near(convertUnit(1, 'usgal', 'l', 'volume'), 3.785411784);
});

test('Temperatur', () => {
  near(convertUnit(100, 'C', 'F', 'temperature'), 212);
  near(convertUnit(32, 'F', 'C', 'temperature'), 0);
  near(convertUnit(0, 'K', 'C', 'temperature'), -273.15);
  near(convertUnit(-40, 'F', 'C', 'temperature'), -40);
});

test('Weitere Kategorien', () => {
  near(convertUnit(100, 'kmh', 'ms', 'speed'), 27.7777777778, 1e-9);
  near(convertUnit(1, 'GiB', 'MiB', 'data'), 1024);
  near(convertUnit(1, 'kWh', 'kJ', 'energy'), 3600);
  near(convertUnit(1, 'atm', 'hPa', 'pressure'), 1013.25);
  near(convertUnit(2, 'h', 'min', 'time'), 120);
});

test('Hin und zurück ergibt den Ausgangswert', () => {
  for (const [cat, c] of Object.entries(CATEGORIES)) {
    const ids = Object.keys(c.units);
    for (const a of ids) for (const b of ids) {
      near(convertUnit(convertUnit(123.456, a, b, cat), b, a, cat), 123.456, 1e-9);
    }
  }
});

test('Formatierung', () => {
  assert.equal(formatValue(1234.5), '1.234,5');
  assert.equal(formatValue(-40), '−40');
  assert.equal(formatValue(1.602176634e-19), '1,602177E-19');
  assert.equal(formatValue(0), '0');
  assert.throws(() => convertUnit(1, 'km', 'kg', 'length'));
});
