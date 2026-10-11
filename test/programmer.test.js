'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateInt, formatInt, formatRaw, displayExpr } = require('../programmer.js');

const ev = (expr, base = 10, bits = 64) => evaluateInt(expr, { base, bits });

test('Grundrechenarten und Rangfolge', () => {
  assert.equal(ev('2+3*4'), 14n);
  assert.equal(ev('(2+3)*4'), 20n);
  assert.equal(ev('7/2'), 3n);
  assert.equal(ev('-7/2'), -3n);
  assert.equal(ev('17%5'), 2n);
  assert.equal(ev('2*(3+4'), 14n);
});

test('Basen', () => {
  assert.equal(ev('FF', 16), 255n);
  assert.equal(ev('1010', 2), 10n);
  assert.equal(ev('777', 8), 511n);
  assert.throws(() => ev('2', 2), /Ungültige Ziffer/);
  assert.throws(() => ev('A', 10), /Ungültige Ziffer/);
});

test('Bitoperationen', () => {
  assert.equal(ev('F0&3C', 16), 0x30n);
  assert.equal(ev('F0|0F', 16), 0xFFn);
  assert.equal(ev('FF^0F', 16), 0xF0n);
  assert.equal(ev('~0'), -1n);
  assert.equal(ev('1<<10'), 1024n);
  assert.equal(ev('-16>>2'), -4n);
  assert.equal(ev('1|2&3'), 3n); // & bindet stärker als |
  assert.equal(ev('1<<2+1'), 8n); // + bindet stärker als <<
});

test('Wortbreite und Zweierkomplement', () => {
  assert.equal(ev('127+1', 10, 8), -128n);
  assert.equal(ev('FF', 16, 8), -1n);
  assert.equal(ev('1<<31', 10, 32), -2147483648n);
  assert.equal(ev('~0', 10, 16), -1n);
  assert.equal(formatRaw(-1n, 16, 8), 'FF');
  assert.equal(formatRaw(-1n, 16, 32), 'FFFFFFFF');
  assert.equal(formatRaw(-1n, 2, 8), '11111111');
  assert.equal(formatRaw(-5n, 10, 8), '-5');
  assert.equal(ev('1<<70', 10, 64), 0n);
});

test('Fehler', () => {
  assert.throws(() => ev('1/0'), /Division durch 0/);
  assert.throws(() => ev(''), /Keine Eingabe/);
  assert.throws(() => ev('1+'), /Syntaxfehler/);
  assert.throws(() => ev('(1))'), /Syntaxfehler/);
});

test('Anzeige', () => {
  assert.equal(formatInt(1234567n, 10, 64), '1.234.567');
  assert.equal(formatInt(-42n, 10, 64), '−42');
  assert.equal(formatInt(0xDEADBEEFn, 16, 64), 'DEAD BEEF');
  assert.equal(formatInt(0b10110n, 2, 64), '1 0110');
  assert.equal(formatInt(511n, 8, 64), '777');
  assert.equal(displayExpr('FF&0F|1<<2'), 'FF AND 0F OR 1 << 2');
  assert.equal(displayExpr('~5*2-1'), 'NOT 5×2−1');
});
