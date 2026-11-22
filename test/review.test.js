const test = require('node:test');
const assert = require('node:assert');

const { Review } = require('../review.js');
const { darfFragen, AB_RECHNUNGEN, ABSTAND_MS } = Review;
const T = 1_800_000_000_000;
const tage = ['a', 'b', 'c'];

test('Bewertungsbitte erst nach 10 Rechnungen an 3 Tagen', () => {
  assert.equal(darfFragen({ rechnungen: AB_RECHNUNGEN - 1, tage, zuletzt: 0 }, T), false);
  assert.equal(darfFragen({ rechnungen: AB_RECHNUNGEN, tage: ['a', 'b'], zuletzt: 0 }, T), false);
  assert.equal(darfFragen({ rechnungen: AB_RECHNUNGEN, tage, zuletzt: 0 }, T), true);
});

test('Höchstens alle 90 Tage', () => {
  assert.equal(darfFragen({ rechnungen: 50, tage, zuletzt: T - ABSTAND_MS + 1 }, T), false);
  assert.equal(darfFragen({ rechnungen: 50, tage, zuletzt: T - ABSTAND_MS }, T), true);
});
