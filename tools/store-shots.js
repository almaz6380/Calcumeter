/*
 * Store-Screenshots und Feature-Grafik mit Playwright erzeugen.
 *
 *   npm start                       # lokaler Server auf :8080 (zweites Terminal)
 *   node tools/store-shots.js       # schreibt store/screenshots/<sprache>/… und store/feature-graphic.png
 *
 * iOS 6,9": 1290 × 2796 (430 × 932 bei 3×), Android: 1080 × 1920 (360 × 640 bei 3×).
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const BASE = process.env.BASE || 'http://localhost:8080/';
const OUT = path.join(__dirname, '..', 'store');
const DEVICES = {
  ios: { width: 430, height: 932, deviceScaleFactor: 3 },
  android: { width: 360, height: 640, deviceScaleFactor: 3 },
};

// Beispieldaten, damit jede Ansicht etwas zeigt
const SEED = {
  de: {
    'calcumeter.fx.prefs': { from: 'EUR', to: 'USD', amount: '250', favorites: ['USD', 'GBP', 'CHF', 'JPY', 'TRY', 'PLN'] },
    'calcumeter.units': { cat: 'temperature', amount: '21', sel: { temperature: { from: 'C', to: 'F' } } },
  },
};
SEED.en = SEED.de;

async function shoot(browser, lang, kind) {
  const ctx = await browser.newContext({
    viewport: { width: DEVICES[kind].width, height: DEVICES[kind].height },
    deviceScaleFactor: DEVICES[kind].deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
    locale: lang === 'de' ? 'de-DE' : 'en-GB',
  });
  await ctx.addInitScript((seed) => {
    if (localStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
    localStorage.setItem('__seeded', '1');
  }, SEED[lang]);
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate(() => document.fonts.ready);
  const dir = path.join(OUT, 'screenshots', lang);
  fs.mkdirSync(dir, { recursive: true });
  const snap = async (n) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, `${kind}-${n}.png`) });
  };
  const go = async (view) => {
    await page.click('#view-switch');
    await page.click(`.view-item[data-view="${view}"]`);
    await page.waitForTimeout(300);
  };
  const dec = lang === 'de' ? ',' : '.';

  await page.keyboard.type(`1280*0${dec}19+45`);
  await page.keyboard.press('Enter');
  await snap(1);
  await page.click('[data-action="toggle-sci"]');
  await page.keyboard.press('Escape');
  await page.keyboard.type(`sin(30)+sqrt(2)^2`);
  await snap(2);
  await page.click('[data-action="toggle-sci"]');
  await go('fx');
  await snap(3);
  await go('units');
  await snap(4);
  await go('graph');
  await snap(5);
  await go('calc');
  await ctx.close();
}

async function featureGraphic(browser) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.goto(`${BASE}tools/feature-graphic.html`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'feature-graphic.png') });
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const lang of ['de', 'en']) {
    for (const kind of ['ios', 'android']) await shoot(browser, lang, kind);
  }
  await featureGraphic(browser);
  await browser.close();
  console.log('fertig: store/screenshots, store/feature-graphic.png');
})();
