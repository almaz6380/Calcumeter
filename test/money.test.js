const test = require('node:test');
const assert = require('node:assert');

const { Money } = require('../money.js');
const { wantsBanner } = Money;

test('Banner in allen Bereichen, auch im Rechner', () => {
  for (const v of ['calc', 'fx', 'units', 'graph', 'notes', 'prog']) assert.equal(wantsBanner(v, false), true, v);
});

test('Handy quer: im Rechner kein Banner, in den anderen Bereichen schon', () => {
  assert.equal(wantsBanner('calc', true), false);
  assert.equal(wantsBanner('fx', true), true);
});

test('unbekannter Bereich: kein Banner', () => {
  assert.equal(wantsBanner('menu', false), false);
});
