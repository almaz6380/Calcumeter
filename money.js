/*
 * Calcumeter – Werbung (AdMob) und Kauf „Werbefrei“ (RevenueCat), nur in der Store-App
 *
 * Web-App: beide Plugins fehlen, alles hier bleibt ohne Wirkung und der Menübereich versteckt.
 * Banner unten in allen Bereichen, auch im Rechner – dort aber nicht im Handy-Querformat,
 * weil es zu viel Höhe kostete. Der Platz wird über --ad-h reserviert, Tasten verdeckt es nie.
 * Keine Vollbildwerbung.
 * Ein freiwilliges Belohnungsvideo schaltet 24 Stunden werbefrei.
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
  const BANNER_VIEWS = ['calc', 'fx', 'units', 'graph', 'notes', 'prog'];
  // Handy quer: Im Rechner füllen die Tasten die ganze Höhe – dort kein Banner.
  const LANDSCAPE = global.matchMedia ? global.matchMedia('(orientation: landscape) and (max-height: 600px)') : null;
  const KEY = 'calcumeter.money';

  const N = global.Native || { isApp: false, plugins: {}, platform: 'web' };
  const ADS = N.isApp && N.plugins.AdMob ? N.plugins.AdMob : null;
  const IAP = N.isApp && N.plugins.Purchases && MONEY.revenueCatKey[N.platform] ? N.plugins.Purchases : null;
  const t = (s, v) => global.I18n.t(s, v);
  const $ = (id) => document.getElementById(id);

  const state = { noAds: false, adFreeUntil: 0 };
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

  const adFree = () => state.noAds || Date.now() < state.adFreeUntil;
  const unit = () => MONEY.adUnits[N.platform] || MONEY.adUnits.android;

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
    // abgelaufene 24 Stunden bemerken
    setInterval(() => { if (bannerState !== 'shown') updateBanner(); }, 60 * 1000);
    updateBanner();
    renderMenu();
  }

  function setView(v) {
    view = v;
    updateBanner();
  }

  async function watchReward() {
    if (!adsReady || busy) return;
    busy = true;
    try {
      await ADS.prepareRewardVideoAd({ adId: unit().rewarded, isTesting: MONEY.adsTesting });
      const reward = await ADS.showRewardVideoAd();
      if (reward) {
        state.adFreeUntil = Date.now() + MONEY.rewardHours * 3600 * 1000;
        save();
        await updateBanner();
      }
    } catch (_) {
      toast(t('Kein Video verfügbar, bitte später erneut versuchen.'));
    } finally {
      busy = false;
      renderMenu();
    }
  }

  async function buy() {
    if (!IAP || !product) return;
    try {
      await IAP.purchaseStoreProduct({ product });
      state.noAds = true;
      save();
      await updateBanner();
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
  }

  function wire() {
    if (!$('ads-section')) return;
    $('ad-reward').addEventListener('click', watchReward);
    $('ad-buy').addEventListener('click', buy);
    $('ad-restore').addEventListener('click', restore);
    $('ad-privacy').addEventListener('click', () => { if (ADS) ADS.showPrivacyOptionsForm().catch(() => {}); });
  }

  global.Money = { MONEY, init, setView, renderMenu, wire, wantsBanner, active: Boolean(ADS || IAP) };
})(typeof self !== 'undefined' ? self : this);
