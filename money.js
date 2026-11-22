/*
 * Calcumeter – Werbung (AdMob) und Kauf „Werbefrei“ (RevenueCat), nur in der Store-App
 *
 * Web-App: beide Plugins fehlen, alles hier bleibt ohne Wirkung und der Menübereich versteckt.
 * Banner unten in allen Bereichen, auch im Rechner – dort aber nicht im Handy-Querformat,
 * weil es zu viel Höhe kostete. Der Platz wird über --ad-h reserviert, Tasten verdeckt es nie.
 * Seit 22.11.2026 (1.3) zusätzlich SELTENE Vollbildwerbung, nur beim Bereichswechsel, gebremst
 * durch darfVollbild() (frühestens 4. Wechsel, höchstens alle 4 Min., max. 3 je Sitzung, nie in
 * der ersten Minute). Ohne eingetragenen Interstitial-Block (ADMOB.interstitial leer) bleibt sie aus.
 * Ein freiwilliges Belohnungsvideo schaltet 24 Stunden werbefrei.
 * Ein zweites (selber Anzeigenblock) schaltet 24 Stunden die Extras frei: Graph als Bild teilen,
 * Verlauf exportieren, die Farbthemen Ozean und Abendrot. Mit dem Kauf und im Web sind sie immer frei.
 *
 * Veröffentlichung: echte IDs hier und in android/app/src/main/res/values/strings.xml bzw.
 * ios/App/App/Info.plist eintragen und adsTesting auf false setzen (docs/store-veroeffentlichen.md).
 */
(function (global) {
  'use strict';

  const MONEY = {
    adsTesting: false,
    // Solange adsTesting true ist, liefert AdMob nur Testanzeigen – auch mit echten IDs.
    adUnits: {
      // Android: echte IDs aus AdMob
      android: { banner: 'ca-app-pub-8860791993288062/7534440237', rewarded: 'ca-app-pub-8860791993288062/2282113550' },
      // iOS: echte IDs aus AdMob
      ios: { banner: 'ca-app-pub-8860791993288062/9282636174', rewarded: 'ca-app-pub-8860791993288062/7294856375' },
    },
    revenueCatKey: { android: 'goog_VjFGcPNAjDUHlIJjHzcelStBVft', ios: 'appl_SPbNAZMgYLGETvdjDqTphLPTTsu' },   // öffentliche SDK-Keys von app.revenuecat.com (goog_… / appl_…)
    noAdsProduct: 'no_ads',
    rewardHours: 24,
  };
  // Vollbild (Interstitial). Leer = aus. Echte IDs liefert AdMob (eigene Blöcke je Plattform).
  const ADMOB = {
    interstitial: { ios: '', android: '' },
    // Googles Beispiel-Blöcke, nur solange adsTesting true ist
    testInterstitial: { ios: 'ca-app-pub-3940256099942544/4411468910', android: 'ca-app-pub-3940256099942544/1033173712' },
  };
  const VOLLBILD = { abWechsel: 4, abstandMs: 4 * 60 * 1000, maxSitzung: 3, nichtVorMs: 60 * 1000 };

  // Darf beim Bereichswechsel eine Vollbildwerbung kommen? Reine Funktion, siehe test/money.test.js.
  // wechsel = wievielter Bereichswechsel dieser Sitzung, letzteMs = letzte Vollbildwerbung ODER letztes
  // Belohnungsvideo (0 = keins), werbefrei = Kauf oder 24-h-Video.
  function darfVollbild({ wechsel, letzteMs, gezeigtInSitzung, startMs, jetztMs, werbefrei }) {
    if (werbefrei) return false;
    if (wechsel < VOLLBILD.abWechsel) return false;
    if (gezeigtInSitzung >= VOLLBILD.maxSitzung) return false;
    if (jetztMs - startMs < VOLLBILD.nichtVorMs) return false;
    if (letzteMs > 0 && jetztMs - letzteMs < VOLLBILD.abstandMs) return false;
    return true;
  }

  // Extras frei? Im Web und ohne Werbe-Plugin immer, sonst mit Kauf oder 24 h nach einem Extras-Video.
  function extrasFreiAus({ werbungMoeglich, noAds, extrasUntil, jetztMs }) {
    return !werbungMoeglich || Boolean(noAds) || jetztMs < (extrasUntil || 0);
  }

  const BANNER_VIEWS = ['calc', 'fx', 'units', 'graph', 'notes', 'prog'];
  // Handy quer: Im Rechner füllen die Tasten die ganze Höhe – dort kein Banner.
  const LANDSCAPE = global.matchMedia ? global.matchMedia('(orientation: landscape) and (max-height: 600px)') : null;
  const KEY = 'calcumeter.money';

  const N = global.Native || { isApp: false, plugins: {}, platform: 'web' };
  const ADS = N.isApp && N.plugins.AdMob ? N.plugins.AdMob : null;
  const IAP = N.isApp && N.plugins.Purchases && MONEY.revenueCatKey[N.platform] ? N.plugins.Purchases : null;
  const t = (s, v) => global.I18n.t(s, v);
  const $ = (id) => document.getElementById(id);

  const state = { noAds: false, adFreeUntil: 0, extrasUntil: 0 };
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) { /* Standard */ }
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* ignorieren */ }
  };

  let adsReady = false;
  let privacyRequired = false;
  let product = null;
  let view = 'calc';
  let bannerState = 'none';   // none | shown | hidden
  let bannerHeight = 0;       // zuletzt gemeldete Höhe, für resumeBanner
  let busy = false;
  let toast = () => {};
  let onExtrasChange = () => {};
  // Vollbild
  const startMs = Date.now();
  let wechsel = 0;
  let ersterBereich = true;
  let letzteVollbildMs = 0;   // auch nach einem Belohnungsvideo gesetzt: dann 4 Min. Ruhe
  let gezeigtInSitzung = 0;
  let vollbildGeladen = false;
  let vollbildLaedt = false;

  const adFree = () => state.noAds || Date.now() < state.adFreeUntil;
  const unit = () => MONEY.adUnits[N.platform] || MONEY.adUnits.android;
  const interstitialId = () => {
    const src = MONEY.adsTesting ? ADMOB.testInterstitial : ADMOB.interstitial;
    return src[N.platform] || '';
  };
  const extrasFrei = () => extrasFreiAus({ werbungMoeglich: Boolean(ADS), noAds: state.noAds, extrasUntil: state.extrasUntil, jetztMs: Date.now() });

  async function ladeVollbild() {
    if (!adsReady || vollbildGeladen || vollbildLaedt || adFree() || !interstitialId()) return;
    vollbildLaedt = true;
    try {
      await ADS.prepareInterstitial({ adId: interstitialId(), isTesting: MONEY.adsTesting });
      vollbildGeladen = true;
    } catch (_) {
      vollbildGeladen = false;
    } finally {
      vollbildLaedt = false;
    }
  }

  async function vielleichtVollbild() {
    if (!adsReady || !interstitialId()) return;
    const ok = darfVollbild({ wechsel, letzteMs: letzteVollbildMs, gezeigtInSitzung, startMs, jetztMs: Date.now(), werbefrei: adFree() });
    if (!ok) return;
    // Nicht vorgeladen: nichts zeigen, nicht zählen, nur nachladen
    if (!vollbildGeladen) { ladeVollbild(); return; }
    vollbildGeladen = false;
    try {
      await ADS.showInterstitial();
      gezeigtInSitzung += 1;
      letzteVollbildMs = Date.now();
    } catch (_) {
      ladeVollbild();
    }
  }

  function setAdHeight(px) {
    document.documentElement.style.setProperty('--ad-h', `${px}px`);
    document.documentElement.classList.toggle('has-banner', px > 0);
    global.dispatchEvent(new Event('resize'));
  }

  function wantsBanner(v, landscapePhone) {
    return BANNER_VIEWS.includes(v) && !(v === 'calc' && landscapePhone);
  }

  // Apples Tracking-Frage stellt die App nativ (SceneDelegate.swift), sobald sie aktiv ist:
  // Über die Plugin-Brücke erscheint der Dialog nicht zuverlässig. Hier nur auf die Antwort warten.
  async function waitForTracking(maxMs) {
    const end = Date.now() + maxMs;
    for (;;) {
      const tr = await ADS.trackingAuthorizationStatus();
      if (tr.status !== 'notDetermined') return true;
      if (Date.now() >= end) return false;
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  async function updateBanner() {
    if (!adsReady) return;
    const want = wantsBanner(view, Boolean(LANDSCAPE && LANDSCAPE.matches)) && !adFree();
    try {
      if (want && bannerState === 'none') {
        await ADS.showBanner({
          adId: unit().banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: MONEY.adsTesting,
        });
        bannerState = 'shown';
      } else if (want && bannerState === 'hidden') {
        await ADS.resumeBanner();
        bannerState = 'shown';
        // resumeBanner meldet die Größe nicht erneut – ohne das läge das Banner über dem Inhalt
        setAdHeight(bannerHeight);
      } else if (!want && bannerState === 'shown') {
        setAdHeight(0);
        await ADS.hideBanner();
        bannerState = 'hidden';
      }
    } catch (_) {
      setAdHeight(0);
    }
  }

  async function init(opts) {
    toast = opts.toast || toast;
    onExtrasChange = opts.onExtrasChange || onExtrasChange;
    if (ADS) {
      try {
        // erst die Einwilligung (Googles UMP-Dialog, wo gesetzlich nötig), dann Apples Tracking-Frage
        const info = await ADS.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') await ADS.showConsentForm();
        privacyRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
        if (N.platform === 'ios') {
          // Rückfall über das Plugin, falls der native Dialog (noch) nicht kam
          if (!(await waitForTracking(6000))) await ADS.requestTrackingAuthorization();
        }
        await ADS.initialize({ initializeForTesting: MONEY.adsTesting });
        ADS.addListener('bannerAdSizeChanged', (size) => {
          bannerHeight = size && size.height ? size.height : 0;
          setAdHeight(bannerState === 'shown' ? bannerHeight : 0);
        });
        ADS.addListener('bannerAdFailedToLoad', () => { bannerHeight = 0; setAdHeight(0); });
        // nach jedem Schließen gleich das nächste Vollbild vorladen
        ADS.addListener('interstitialAdDismissed', () => { vollbildGeladen = false; ladeVollbild(); });
        ADS.addListener('interstitialAdFailedToShow', () => { vollbildGeladen = false; ladeVollbild(); });
        if (LANDSCAPE) LANDSCAPE.addEventListener('change', updateBanner);
        adsReady = true;
      } catch (_) { /* ohne Werbung weiter */ }
    }
    if (IAP) {
      try {
        await IAP.configure({ apiKey: MONEY.revenueCatKey[N.platform] });
        // schon gekauft (z. B. nach Neuinstallation)? Dann gleich werbefrei
        const { customerInfo } = await IAP.getCustomerInfo();
        if (owns(customerInfo)) { state.noAds = true; save(); }
        const res = await IAP.getProducts({ productIdentifiers: [MONEY.noAdsProduct], type: 'NON_SUBSCRIPTION' });
        product = (res.products || [])[0] || null;
      } catch (_) { /* ohne Kauf weiter */ }
    }
    // abgelaufene 24 Stunden bemerken (Banner und Extras)
    let warFrei = extrasFrei();
    setInterval(() => {
      if (bannerState !== 'shown') updateBanner();
      if (warFrei !== extrasFrei()) { warFrei = extrasFrei(); onExtrasChange(); renderMenu(); }
    }, 60 * 1000);
    updateBanner();
    ladeVollbild();
    renderMenu();
    onExtrasChange();
  }

  function setView(v) {
    // Nur echte Wechsel zählen; der erste Aufruf beim Start ist keiner.
    const echt = !ersterBereich && v !== view;
    ersterBereich = false;
    view = v;
    updateBanner();
    if (echt) {
      wechsel += 1;
      vielleichtVollbild();
    }
  }

  // showRewardVideoAd löst nur bei verdienter Belohnung auf; bricht jemand ab, kommt nichts zurück.
  // Deshalb zusätzlich auf „geschlossen“ und „Fehler“ hören. Ergebnis: true = Belohnung verdient.
  function zeigeVideo() {
    return new Promise((resolve, reject) => {
      let fertig = false;
      const handles = [];
      const ende = (fn, v) => {
        if (fertig) return;
        fertig = true;
        handles.forEach((h) => Promise.resolve(h).then((x) => x && x.remove && x.remove()).catch(() => {}));
        fn(v);
      };
      handles.push(ADS.addListener('onRewardedVideoAdReward', () => ende(resolve, true)));
      // „geschlossen“ kommt bei verdienter Belohnung kurz nach der Belohnung – kurz warten
      handles.push(ADS.addListener('onRewardedVideoAdDismissed', () => setTimeout(() => ende(resolve, false), 800)));
      handles.push(ADS.addListener('onRewardedVideoAdFailedToShow', () => ende(reject, new Error('show'))));
      ADS.showRewardVideoAd().then((r) => ende(resolve, Boolean(r))).catch((e) => ende(reject, e));
    });
  }

  // kind: 'adfree' (24 h werbefrei) oder 'extras' (24 h Extras). Liefert true bei verdienter Belohnung.
  async function watchReward(kind = 'adfree') {
    if (busy) return false;
    if (!adsReady) {
      toast(t('Kein Video verfügbar, bitte später erneut versuchen.'));
      return false;
    }
    busy = true;
    let ok = false;
    try {
      await ADS.prepareRewardVideoAd({ adId: unit().rewarded, isTesting: MONEY.adsTesting });
      ok = await zeigeVideo();
      // nach einem Video 4 Min. keine Vollbildwerbung
      letzteVollbildMs = Date.now();
      if (ok) {
        const bis = Date.now() + MONEY.rewardHours * 3600 * 1000;
        if (kind === 'extras') state.extrasUntil = bis;
        else state.adFreeUntil = bis;
        save();
        if (kind === 'extras') {
          toast(t('Extras 24 Stunden freigeschaltet'));
          onExtrasChange();
        } else {
          await updateBanner();
        }
      }
    } catch (_) {
      toast(t('Kein Video verfügbar, bitte später erneut versuchen.'));
    } finally {
      busy = false;
      renderMenu();
    }
    return ok;
  }

  // Extra ausführen: frei → sofort, sonst erst nach dem Video
  async function mitExtras(fn) {
    if (extrasFrei()) return fn();
    if (await watchReward('extras')) return fn();
    return undefined;
  }

  async function buy() {
    if (!IAP || !product) return;
    try {
      await IAP.purchaseStoreProduct({ product });
      state.noAds = true;
      save();
      await updateBanner();
      onExtrasChange();
      toast(t('Danke! Die App ist jetzt werbefrei.'));
    } catch (e) {
      if (!(e && (e.userCancelled || e.code === '1' || e.code === 1))) toast(t('Kauf nicht möglich.'));
    }
    renderMenu();
  }

  // Kauf „Werbefrei“ vorhanden? Entitlement no_ads oder der Einmalkauf selbst
  function owns(info) {
    if (!info) return false;
    if (info.entitlements && info.entitlements.active && info.entitlements.active[MONEY.noAdsProduct]) return true;
    return (info.nonSubscriptionTransactions || []).some((x) => String(x.productIdentifier).split(':')[0] === MONEY.noAdsProduct);
  }

  // Apple verlangt einen Knopf zum Wiederherstellen von Käufen
  async function restore() {
    if (!IAP) return;
    try {
      const { customerInfo } = await IAP.restorePurchases();
      if (owns(customerInfo)) {
        state.noAds = true;
        save();
        await updateBanner();
        onExtrasChange();
        toast(t('Danke! Die App ist jetzt werbefrei.'));
      } else {
        toast(t('Keine Käufe gefunden.'));
      }
    } catch (_) {
      toast(t('Kauf nicht möglich.'));
    }
    renderMenu();
  }

  // Bereich „Werbung“ im Menü
  function renderMenu() {
    const section = $('ads-section');
    if (!section) return;
    section.hidden = !(adsReady || IAP);
    if (section.hidden) return;
    $('ad-reward').hidden = !adsReady || state.noAds;
    $('ad-extras').hidden = !adsReady || state.noAds || Date.now() < state.extrasUntil;
    $('ad-buy').hidden = !IAP || !product || state.noAds;
    $('ad-buy-price').textContent = product ? product.priceString : '';
    $('ad-restore').hidden = !IAP;
    $('ad-privacy').hidden = !(adsReady && privacyRequired);
    const status = $('ad-status');
    if (state.noAds) {
      status.hidden = false;
      status.textContent = t('Danke! Die App ist jetzt werbefrei.');
    } else if (Date.now() < state.adFreeUntil) {
      status.hidden = false;
      const time = new Date(state.adFreeUntil).toLocaleString(global.I18n.locale().intl, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      status.textContent = t('Werbefrei bis {time}', { time });
    } else {
      status.hidden = true;
    }
    const ex = $('ad-extras-status');
    if (!state.noAds && Date.now() < state.extrasUntil) {
      ex.hidden = false;
      const time = new Date(state.extrasUntil).toLocaleString(global.I18n.locale().intl, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      ex.textContent = t('Extras frei bis {time}', { time });
    } else {
      ex.hidden = true;
    }
  }

  function wire() {
    if (!$('ads-section')) return;
    $('ad-reward').addEventListener('click', () => watchReward('adfree'));
    $('ad-extras').addEventListener('click', () => watchReward('extras'));
    $('ad-buy').addEventListener('click', buy);
    $('ad-restore').addEventListener('click', restore);
    $('ad-privacy').addEventListener('click', () => { if (ADS) ADS.showPrivacyOptionsForm().catch(() => {}); });
  }

  // Vollbild gerade gelaufen? (Bewertungsbitte nicht direkt danach)
  const vollbildGerade = (ms = 60 * 1000) => letzteVollbildMs > 0 && Date.now() - letzteVollbildMs < ms;

  global.Money = {
    MONEY, ADMOB, VOLLBILD, init, setView, renderMenu, wire, wantsBanner, darfVollbild, extrasFreiAus,
    extrasFrei, mitExtras, vollbildGerade, active: Boolean(ADS || IAP),
  };
})(typeof self !== 'undefined' ? self : this);
