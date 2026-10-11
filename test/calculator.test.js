'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate, format } = require('../calculator.js');

const calc = (expr, ctx) => format(evaluate(expr, ctx));

test('Grundrechenarten und Rangfolge', () => {
  assert.equal(calc('1+2*3'), '7');
  assert.equal(calc('(1+2)*3'), '9');
  assert.equal(calc('10−4÷2'), '8');
  assert.equal(calc('7×6'), '42');
  assert.equal(calc('0.1+0.2'), '0.3');
  assert.equal(calc('-3+5'), '2');
  assert.equal(calc('2*-3'), '-6');
});

test('Potenzen', () => {
  assert.equal(calc('2^10'), '1024');
  assert.equal(calc('2^3^2'), '512');
  assert.equal(calc('-2^2'), '-4');
  assert.equal(calc('2^-1'), '0.5');
  assert.equal(calc('3²'), '9');
  assert.equal(calc('2³'), '8');
  assert.equal(calc('4⁻¹'), '0.25');
});

test('Implizite Multiplikation', () => {
  assert.equal(calc('2(3+4)'), '14');
  assert.equal(calc('(2)(3)'), '6');
  assert.equal(calc('2π'), format(2 * Math.PI));
  assert.equal(calc('3sin(90)'), '3');
  assert.throws(() => evaluate('1.2.3'));
});

test('Trigonometrie in Grad', () => {
  assert.equal(calc('sin(30)'), '0.5');
  assert.equal(calc('sin(180)'), '0');
  assert.equal(calc('cos(90)'), '0');
  assert.equal(calc('cos(60)'), '0.5');
  assert.equal(calc('tan(45)'), '1');
  assert.throws(() => evaluate('tan(90)'));
  assert.equal(calc('asin(1)'), '90');
  assert.equal(calc('acos(0.5)'), '60');
  assert.equal(calc('atan(1)'), '45');
});

test('Trigonometrie im Bogenmaß', () => {
  const rad = { angle: 'rad' };
  assert.equal(calc('sin(π)', rad), '0');
  assert.equal(calc('cos(π)', rad), '-1');
  assert.equal(calc('sin(π/2)', rad), '1');
  assert.throws(() => evaluate('tan(π/2)', rad));
  assert.equal(calc('asin(1)', rad), format(Math.PI / 2));
});

test('Hyperbelfunktionen', () => {
  assert.equal(calc('sinh(0)'), '0');
  assert.equal(calc('cosh(0)'), '1');
  assert.equal(calc('atanh(0)'), '0');
});

test('Wurzeln und Logarithmen', () => {
  assert.equal(calc('√(16)'), '4');
  assert.equal(calc('√9'), '3');
  assert.equal(calc('∛(27)'), '3');
  assert.equal(calc('root(-8,3)'), '-2');
  assert.equal(calc('log(1000)'), '3');
  assert.equal(calc('log(8,2)'), '3');
  assert.equal(calc('log2(1024)'), '10');
  assert.equal(calc('ln(e)'), '1');
  assert.equal(calc('exp(0)'), '1');
  assert.throws(() => evaluate('ln(0)'));
  assert.throws(() => evaluate('√(-1)'));
});

test('Fakultät und Kombinatorik', () => {
  assert.equal(calc('5!'), '120');
  assert.equal(calc('0!'), '1');
  assert.equal(calc('0.5!'), format(Math.sqrt(Math.PI) / 2));
  assert.equal(calc('5nCr2'), '10');
  assert.equal(calc('nCr(10,3)'), '120');
  assert.equal(calc('5nPr2'), '20');
  assert.throws(() => evaluate('(-1)!'));
});

test('Prozent und Modulo', () => {
  assert.equal(calc('50%'), '0.5');
  assert.equal(calc('200+10%'), '220');
  assert.equal(calc('200−10%'), '180');
  assert.equal(calc('200×10%'), '20');
  assert.equal(calc('17 mod 5'), '2');
  assert.equal(calc('-7 mod 3'), '2');
});

test('Sonstige Funktionen und Konstanten', () => {
  assert.equal(calc('abs(-5)'), '5');
  assert.equal(calc('floor(2.7)'), '2');
  assert.equal(calc('ceil(2.1)'), '3');
  assert.equal(calc('round(2.345,2)'), '2.35');
  assert.equal(calc('gcd(12,18)'), '6');
  assert.equal(calc('lcm(4,6)'), '12');
  assert.equal(calc('max(1,5,3)'), '5');
  assert.equal(calc('Ans*2', { ans: 21 }), '42');
  assert.equal(calc('pi'), format(Math.PI));
});

test('Automatisch geschlossene Klammern', () => {
  assert.equal(calc('2*(3+4'), '14');
  assert.equal(calc('sin(30'), '0.5');
});

test('Fehler', () => {
  assert.throws(() => evaluate('1/0'), /Division durch 0/);
  assert.throws(() => evaluate(''), /Keine Eingabe/);
  assert.throws(() => evaluate('2+'));
  assert.throws(() => evaluate('(1+2))'));
  assert.throws(() => evaluate('foo(2)'), /Unbekannt/);
  assert.throws(() => evaluate('10^400'), /Überlauf/);
});

test('Formatierung', () => {
  assert.equal(format(1e20), '1E20');
  assert.equal(format(1.5e-12), '1.5E-12');
  assert.equal(calc('1.5E-12*2'), '3E-12');
  assert.equal(calc('2E3'), '2000');
  assert.equal(format(-0), '0');
  assert.equal(format(1 / 3), '0.333333333333');
});

test('Kompilierte Ausdrücke mit x', () => {
  const { compile } = require('../calculator.js');
  assert.equal(compile('x^2')(3), 9);
  assert.equal(compile('2x+1')(4), 9);
  assert.equal(compile('sin(x)')(Math.PI / 2), 1);
  assert.ok(Number.isNaN(compile('ln(x)')(-1)));
  assert.ok(Number.isNaN(compile('1/x')(0)));
  assert.throws(() => evaluate('x+1'), /Unbekannt: x/);
  assert.equal(calc('exp(0)+max(1;2)'.replace(';', ',')), '3');
});
