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

// ---------- Vollbildwerbung (seit 1.3) ----------

const { darfVollbild, extrasFreiAus, VOLLBILD } = Money;
const MIN = 60 * 1000;
const basis = { wechsel: 4, letzteMs: 0, gezeigtInSitzung: 0, startMs: 0, jetztMs: 10 * MIN, werbefrei: false };

test('Vollbild frühestens ab dem 4. Bereichswechsel', () => {
  assert.equal(darfVollbild({ ...basis, wechsel: 3 }), false);
  assert.equal(darfVollbild({ ...basis, wechsel: 4 }), true);
  assert.equal(VOLLBILD.abWechsel, 4);
});

test('Vollbild nie in der ersten Minute nach dem Start', () => {
  assert.equal(darfVollbild({ ...basis, startMs: 0, jetztMs: 59 * 1000 }), false);
  assert.equal(darfVollbild({ ...basis, startMs: 0, jetztMs: 60 * 1000 }), true);
});

test('Vollbild höchstens alle 4 Minuten (auch nach einem Belohnungsvideo)', () => {
  assert.equal(darfVollbild({ ...basis, letzteMs: 7 * MIN, jetztMs: 10 * MIN }), false);
  assert.equal(darfVollbild({ ...basis, letzteMs: 6 * MIN, jetztMs: 10 * MIN }), true);
});

test('Vollbild höchstens dreimal je Sitzung', () => {
  assert.equal(darfVollbild({ ...basis, gezeigtInSitzung: 2 }), true);
  assert.equal(darfVollbild({ ...basis, gezeigtInSitzung: 3 }), false);
});

test('werbefrei (Kauf oder 24-h-Video): nie Vollbild', () => {
  assert.equal(darfVollbild({ ...basis, werbefrei: true }), false);
});

test('Interstitial-Blöcke: echte IDs je Plattform, Test-IDs von Google', () => {
  // Echte Blöcke tragen Josefs Publisher-ID, nie Googles Beispiel-ID (sonst stumm keine Einnahmen).
  for (const id of Object.values(Money.ADMOB.interstitial)) assert.match(id, /^ca-app-pub-8860791993288062\/\d+$/);
  assert.equal(Money.ADMOB.testInterstitial.ios, 'ca-app-pub-3940256099942544/4411468910');
  assert.equal(Money.ADMOB.testInterstitial.android, 'ca-app-pub-3940256099942544/1033173712');
});

// ---------- Extras ----------

test('Extras: im Web frei, in der App mit Kauf oder 24 h nach dem Video', () => {
  const jetzt = 1000;
  assert.equal(extrasFreiAus({ werbungMoeglich: false, noAds: false, extrasUntil: 0, jetztMs: jetzt }), true);
  assert.equal(extrasFreiAus({ werbungMoeglich: true, noAds: false, extrasUntil: 0, jetztMs: jetzt }), false);
  assert.equal(extrasFreiAus({ werbungMoeglich: true, noAds: true, extrasUntil: 0, jetztMs: jetzt }), true);
  assert.equal(extrasFreiAus({ werbungMoeglich: true, noAds: false, extrasUntil: jetzt + 1, jetztMs: jetzt }), true);
  assert.equal(extrasFreiAus({ werbungMoeglich: true, noAds: false, extrasUntil: jetzt, jetztMs: jetzt }), false);
});

test('ohne Werbe-Plugin (Node/Web) sind die Extras frei', () => {
  assert.equal(Money.extrasFrei(), true);
});
