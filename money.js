/*
 * Calcumeter – Werbung (AdMob) und Kauf „Werbefrei“ (RevenueCat), nur in der Store-App
 *
 * Web-App: beide Plugins fehlen, alles hier bleibt ohne Wirkung und der Menübereich versteckt.
 * Banner unten nur in Währung, Einheiten, Graph und Programmierer – im Rechner nie.
 * Ein freiwilliges Belohnungsvideo schaltet 24 Stunden werbefrei.
 *
 * Veröffentlichung: echte IDs hier und in android/app/src/main/res/values/strings.xml bzw.
 * ios/App/App/Info.plist eintragen und adsTesting auf false setzen (docs/store-veroeffentlichen.md).
 */
(function (global) {
  'use strict';

  const MONEY = {
    adsTesting: true,
    // Solange adsTesting true ist, liefert AdMob nur Testanzeigen – auch mit echten IDs.
    adUnits: {
      // Android: echte IDs aus AdMob
      android: { banner: 'ca-app-pub-8860791993288062/7534440237', rewarded: 'ca-app-pub-8860791993288062/2282113550' },
      // iOS: noch Googles Test-IDs (TODO echte IDs)
      ios: { banner: 'ca-app-pub-3940256099942544/2435281174', rewarded: 'ca-app-pub-3940256099942544/1712485313' },
    },
    revenueCatKey: { android: '', ios: '' },   // öffentliche SDK-Keys von app.revenuecat.com (goog_… / appl_…)
    noAdsProduct: 'no_ads',
    rewardHours: 24,
  };
  const BANNER_VIEWS = ['fx', 'units', 'graph', 'prog'];
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
  let busy = false;
  let toast = () => {};

  const adFree = () => state.noAds || Date.now() < state.adFreeUntil;
  const unit = () => MONEY.adUnits[N.platform] || MONEY.adUnits.android;

  function setAdHeight(px) {
    document.documentElement.style.setProperty('--ad-h', `${px}px`);
    global.dispatchEvent(new Event('resize'));
  }

  async function updateBanner() {
    if (!adsReady) return;
    const want = BANNER_VIEWS.includes(view) && !adFree();
    try {
      if (want && bannerState === 'none') {
        await ADS.showBanner({
          adId: unit().banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: MONEY.adsTesting,
        });
        bannerState = 'shown';
      } else if (want && bannerState === 'hidden') {
        await ADS.resumeBanner();
        bannerState = 'shown';
      } else if (!want && bannerState === 'shown') {
        await ADS.hideBanner();
        bannerState = 'hidden';
        setAdHeight(0);
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
          const tr = await ADS.trackingAuthorizationStatus();
          if (tr.status === 'notDetermined') await ADS.requestTrackingAuthorization();
        }
        await ADS.initialize({ initializeForTesting: MONEY.adsTesting });
        ADS.addListener('bannerAdSizeChanged', (size) => {
          setAdHeight(bannerState === 'shown' && size && size.height ? size.height : 0);
        });
        adsReady = true;
      } catch (_) { /* ohne Werbung weiter */ }
    }
    if (IAP) {
      try {
        await IAP.configure({ apiKey: MONEY.revenueCatKey[N.platform] });
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

  // Apple verlangt einen Knopf zum Wiederherstellen von Käufen
  async function restore() {
    if (!IAP) return;
    try {
      const { customerInfo } = await IAP.restorePurchases();
      const ids = new Set((customerInfo.nonSubscriptionTransactions || []).map((x) => x.productIdentifier));
      if (ids.has(MONEY.noAdsProduct)) {
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

  global.Money = { MONEY, init, setView, renderMenu, wire, active: Boolean(ADS || IAP) };
})(typeof self !== 'undefined' ? self : this);
