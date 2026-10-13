"""App-Store-Eintrag von Calcumeter über die App Store Connect API füllen (läuft in GitHub Actions).

    ASC_KEY_ID=… ASC_ISSUER_ID=… ASC_KEY_P8="$(cat AuthKey.p8)" python3 tools/asc_listing.py [--build 14] [--submit]

Füllt: Name/Untertitel/Datenschutz-URL, Kategorien, Altersfreigabe, Inhaltsrechte, Preis (kostenlos),
Verfügbarkeit (ohne China), Texte und Screenshots der Version in allen Sprachen, Build, Prüfangaben,
Prüf-Screenshot des In-App-Kaufs. Mit --submit wird die Version (mit dem Kauf) zur Prüfung eingereicht.
„App-Datenschutz“ (Datenerfassung) gibt es in der API nicht – das bleibt Handarbeit in App Store Connect.
Das Skript ist wiederholbar: Vorhandenes wird aktualisiert, Screenshots werden ersetzt.
"""
import argparse, hashlib, json, os, pathlib, sys, time

import jwt
import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = 'https://api.appstoreconnect.apple.com'
BUNDLE_ID = 'com.almaz6380.calcumeter'
SITE = 'https://almaz6380.github.io/Calcumeter/'
PRIVACY = SITE + 'privacy.html'
# Ordner in store/ → Sprache in App Store Connect
LOCALES = {
    'en': 'en-US', 'de': 'de-DE', 'es': 'es-ES', 'fr': 'fr-FR', 'it': 'it', 'pt': 'pt-BR', 'tr': 'tr', 'pl': 'pl',
    'nl': 'nl-NL', 'sv': 'sv', 'da': 'da', 'ja': 'ja', 'ko': 'ko', 'zh-Hans': 'zh-Hans', 'zh-Hant': 'zh-Hant',
}
SHOT_SETS = {'APP_IPHONE_67': 'ios', 'APP_IPAD_PRO_3GEN_129': 'ipad'}
REVIEW_NOTES = ('No login required. Ads appear only outside the calculator (Currency, Units, Graph, Programmer). '
                'The one-time purchase "Remove ads" and "Restore purchases" are in the menu '
                '(tap the section name at the top left).')


def log(*a):
    print(*a, flush=True)


class ASC:
    def __init__(self):
        self.key_id = os.environ['ASC_KEY_ID'].strip()
        self.issuer = os.environ['ASC_ISSUER_ID'].strip()
        self.key = os.environ['ASC_KEY_P8'].strip()
        self.token, self.exp = None, 0
        self.s = requests.Session()

    def _auth(self):
        if time.time() > self.exp - 60:
            self.exp = int(time.time()) + 1100
            self.token = jwt.encode({'iss': self.issuer, 'exp': self.exp, 'aud': 'appstoreconnect-v1'}, self.key,
                                    algorithm='ES256', headers={'kid': self.key_id, 'typ': 'JWT'})
        return {'Authorization': f'Bearer {self.token}'}

    def call(self, method, path, body=None, ok=(200, 201, 204), params=None):
        r = self.s.request(method, API + path, headers=self._auth(), json=body, params=params, timeout=60)
        if r.status_code not in ok:
            raise RuntimeError(f'{method} {path} → {r.status_code}: {r.text[:1500]}')
        return r.json() if r.content else {}

    get = lambda self, p, **k: self.call('GET', p, params=k or None)
    post = lambda self, p, b: self.call('POST', p, b)
    patch = lambda self, p, b: self.call('PATCH', p, b)
    delete = lambda self, p: self.call('DELETE', p)


def rel(type_, id_):
    return {'data': {'type': type_, 'id': id_}}


def upload(asc, kind, rel_name, rel_type, rel_id, file):
    """Datei über die Reservierungs-Schnittstelle hochladen (Screenshots, Prüf-Screenshot)."""
    data = file.read_bytes()
    res = asc.post(f'/v1/{kind}', {'data': {
        'type': kind, 'attributes': {'fileName': file.name, 'fileSize': len(data)},
        'relationships': {rel_name: rel(rel_type, rel_id)}}})['data']
    for op in res['attributes']['uploadOperations']:
        chunk = data[op['offset']:op['offset'] + op['length']]
        headers = {h['name']: h['value'] for h in op.get('requestHeaders', [])}
        r = requests.request(op['method'], op['url'], data=chunk, headers=headers, timeout=120)
        r.raise_for_status()
    asc.patch(f'/v1/{kind}/{res["id"]}', {'data': {'type': kind, 'id': res['id'], 'attributes': {
        'uploaded': True, 'sourceFileChecksum': hashlib.md5(data).hexdigest()}}})
    return res['id']


def listing(code):
    return json.loads((ROOT / 'store' / 'listing' / f'{code}.json').read_text(encoding='utf-8'))


def step(name):
    def wrap(fn):
        def run(*a, **k):
            log(f'▶ {name}')
            try:
                out = fn(*a, **k)
                log(f'  ✓ {name}')
                return out
            except Exception as e:  # weiter mit dem nächsten Schritt, am Ende Fehler melden
                log(f'  ✗ {name}: {e}')
                FAILED.append(name)
        return run
    return wrap


FAILED = []


@step('App-Informationen: Kategorien')
def categories(asc, info_id):
    asc.patch(f'/v1/appInfos/{info_id}', {'data': {'type': 'appInfos', 'id': info_id, 'relationships': {
        'primaryCategory': rel('appCategories', 'UTILITIES'),
        'secondaryCategory': rel('appCategories', 'FINANCE')}}})


@step('App-Informationen: Name, Untertitel, Datenschutz-URL je Sprache')
def info_localizations(asc, info_id):
    have = {l['attributes']['locale']: l['id'] for l in
            asc.get(f'/v1/appInfos/{info_id}/appInfoLocalizations', limit=50)['data']}
    for code, loc in LOCALES.items():
        d = listing(code)
        attrs = {'name': d['name'], 'subtitle': d['subtitle'], 'privacyPolicyUrl': PRIVACY}
        if loc in have:
            asc.patch(f'/v1/appInfoLocalizations/{have[loc]}',
                      {'data': {'type': 'appInfoLocalizations', 'id': have[loc], 'attributes': attrs}})
        else:
            asc.post('/v1/appInfoLocalizations', {'data': {'type': 'appInfoLocalizations',
                     'attributes': {'locale': loc, **attrs}, 'relationships': {'appInfo': rel('appInfos', info_id)}}})
        log(f'    {loc}: {d["name"]}')


FREQUENCY = {'alcoholTobaccoOrDrugUseOrReferences', 'contests', 'gamblingSimulated', 'gunsOrOtherWeapons',
             'horrorOrFearThemes', 'matureOrSuggestiveThemes', 'medicalOrTreatmentInformation',
             'profanityOrCrudeHumor', 'sexualContentGraphicAndNudity', 'sexualContentOrNudity',
             'violenceCartoonOrFantasy', 'violenceRealistic', 'violenceRealisticProlongedGraphicOrSadistic'}
YES_NO = {'gambling', 'unrestrictedWebAccess', 'lootBox', 'messagingAndChat', 'parentalControls', 'advertising',
          'healthOrWellnessTopics', 'ageAssurance', 'userGeneratedContent', 'socialMedia'}


@step('Altersfreigabe (4+)')
def age_rating(asc, info_id):
    decl = asc.get(f'/v1/appInfos/{info_id}/ageRatingDeclaration')['data']
    attrs = {}
    log('    Felder: ' + ', '.join(sorted(decl['attributes'])))
    for k in decl['attributes']:
        if k in FREQUENCY:
            attrs[k] = 'NONE'
        elif k in YES_NO:
            attrs[k] = k == 'advertising'   # Werbung: ja, alles andere: nein
    asc.patch(f'/v1/ageRatingDeclarations/{decl["id"]}',
              {'data': {'type': 'ageRatingDeclarations', 'id': decl['id'], 'attributes': attrs}})


@step('Inhaltsrechte')
def content_rights(asc, app_id):
    asc.patch(f'/v1/apps/{app_id}', {'data': {'type': 'apps', 'id': app_id,
              'attributes': {'contentRightsDeclaration': 'DOES_NOT_USE_THIRD_PARTY_CONTENT'}}})


@step('Preis: kostenlos')
def price(asc, app_id):
    points = asc.get(f'/v1/apps/{app_id}/appPricePoints', **{'filter[territory]': 'AUT', 'limit': 200})['data']
    free = next(p for p in points if float(p['attributes']['customerPrice']) == 0)
    asc.post('/v1/appPriceSchedules', {
        'data': {'type': 'appPriceSchedules', 'relationships': {
            'app': rel('apps', app_id), 'baseTerritory': rel('territories', 'AUT'),
            'manualPrices': {'data': [{'type': 'appPrices', 'id': '${free}'}]}}},
        'included': [{'type': 'appPrices', 'id': '${free}', 'attributes': {'startDate': None},
                      'relationships': {'appPricePoint': rel('appPricePoints', free['id'])}}]})


@step('Verfügbarkeit: alle Länder außer China (Festland)')
def availability(asc, app_id):
    territories = [t['id'] for t in asc.get('/v1/territories', limit=200)['data']]
    try:
        existing = asc.get(f'/v1/apps/{app_id}/appAvailabilityV2')['data']
    except RuntimeError:
        existing = None
    if existing:
        tas = asc.get(f'/v2/appAvailabilities/{existing["id"]}/territoryAvailabilities', limit=200)['data']
        for ta in tas:
            terr = ta['relationships']['territory']['data']['id'] if 'relationships' in ta else None
            want = terr != 'CHN'
            if terr and ta['attributes'].get('available') != want:
                asc.patch(f'/v1/territoryAvailabilities/{ta["id"]}', {'data': {
                    'type': 'territoryAvailabilities', 'id': ta['id'], 'attributes': {'available': want}}})
        return
    included, refs = [], []
    for t in territories:
        tid = '${' + t + '}'
        refs.append({'type': 'territoryAvailabilities', 'id': tid})
        included.append({'type': 'territoryAvailabilities', 'id': tid,
                         'attributes': {'available': t != 'CHN', 'releaseDate': None, 'preOrderEnabled': False},
                         'relationships': {'territory': rel('territories', t)}})
    asc.post('/v2/appAvailabilities', {
        'data': {'type': 'appAvailabilities', 'attributes': {'availableInNewTerritories': True},
                 'relationships': {'app': rel('apps', app_id), 'territoryAvailabilities': {'data': refs}}},
        'included': included})


@step('Version: Texte je Sprache')
def version_localizations(asc, version_id):
    have = {l['attributes']['locale']: l['id'] for l in
            asc.get(f'/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations', limit=50)['data']}
    for code, loc in LOCALES.items():
        d = listing(code)
        attrs = {'description': d['description'], 'keywords': d['keywords'], 'promotionalText': d['promotionalText'],
                 'supportUrl': SITE, 'marketingUrl': SITE}
        if loc in have:
            asc.patch(f'/v1/appStoreVersionLocalizations/{have[loc]}',
                      {'data': {'type': 'appStoreVersionLocalizations', 'id': have[loc], 'attributes': attrs}})
        else:
            have[loc] = asc.post('/v1/appStoreVersionLocalizations', {'data': {
                'type': 'appStoreVersionLocalizations', 'attributes': {'locale': loc, **attrs},
                'relationships': {'appStoreVersion': rel('appStoreVersions', version_id)}}})['data']['id']
        log(f'    {loc}')
    return have


@step('Version: Screenshots (iPhone 6,9" und iPad 13") je Sprache')
def screenshots(asc, loc_ids):
    for code, loc in LOCALES.items():
        lid = loc_ids[loc]
        sets = {s['attributes']['screenshotDisplayType']: s['id'] for s in
                asc.get(f'/v1/appStoreVersionLocalizations/{lid}/appScreenshotSets', limit=50)['data']}
        for display, prefix in SHOT_SETS.items():
            sid = sets.get(display) or asc.post('/v1/appScreenshotSets', {'data': {
                'type': 'appScreenshotSets', 'attributes': {'screenshotDisplayType': display},
                'relationships': {'appStoreVersionLocalization': rel('appStoreVersionLocalizations', lid)}}})['data']['id']
            for old in asc.get(f'/v1/appScreenshotSets/{sid}/appScreenshots', limit=50)['data']:
                asc.delete(f'/v1/appScreenshots/{old["id"]}')
            files = sorted((ROOT / 'store' / 'screenshots' / code).glob(f'{prefix}-*.png'))
            for f in files:
                upload(asc, 'appScreenshots', 'appScreenshotSet', 'appScreenshotSets', sid, f)
            log(f'    {loc} {display}: {len(files)}')


@step('Build zuordnen')
def attach_build(asc, app_id, version_id, number):
    for _ in range(40):
        builds = asc.get('/v1/builds', **{'filter[app]': app_id, 'filter[version]': str(number), 'limit': 5})['data']
        if builds and builds[0]['attributes']['processingState'] == 'VALID':
            break
        log(f'    Build {number}: {builds[0]["attributes"]["processingState"] if builds else "noch nicht da"} – warte')
        time.sleep(30)
    else:
        raise RuntimeError(f'Build {number} ist nicht verarbeitet')
    asc.patch(f'/v1/appStoreVersions/{version_id}/relationships/build', rel('builds', builds[0]['id']))


@step('Prüfangaben (Kontakt, Notiz)')
def review_details(asc, version_id, phone, email):
    attrs = {'contactFirstName': 'Josef', 'contactLastName': 'Gallab', 'contactPhone': phone, 'contactEmail': email,
             'demoAccountRequired': False, 'notes': REVIEW_NOTES}
    try:
        cur = asc.get(f'/v1/appStoreVersions/{version_id}/appStoreReviewDetail')['data']
    except RuntimeError:
        cur = None
    if cur:
        asc.patch(f'/v1/appStoreReviewDetails/{cur["id"]}',
                  {'data': {'type': 'appStoreReviewDetails', 'id': cur['id'], 'attributes': attrs}})
    else:
        asc.post('/v1/appStoreReviewDetails', {'data': {'type': 'appStoreReviewDetails', 'attributes': attrs,
                 'relationships': {'appStoreVersion': rel('appStoreVersions', version_id)}}})


@step('Veröffentlichung nach Freigabe automatisch')
def release_type(asc, version_id):
    asc.patch(f'/v1/appStoreVersions/{version_id}', {'data': {'type': 'appStoreVersions', 'id': version_id,
              'attributes': {'releaseType': 'AFTER_APPROVAL'}}})


@step('In-App-Kauf: Prüf-Screenshot und Notiz')
def iap(asc, app_id):
    items = asc.get(f'/v1/apps/{app_id}/inAppPurchasesV2', **{'filter[productId]': 'no_ads'})['data']
    if not items:
        raise RuntimeError('In-App-Kauf no_ads nicht gefunden')
    iap_id = items[0]['id']
    asc.patch(f'/v2/inAppPurchases/{iap_id}', {'data': {'type': 'inAppPurchases', 'id': iap_id,
              'attributes': {'reviewNote': REVIEW_NOTES}}})
    try:
        old = asc.get(f'/v2/inAppPurchases/{iap_id}/appStoreReviewScreenshot')['data']
    except RuntimeError:
        old = None
    if old:
        asc.delete(f'/v1/inAppPurchaseAppStoreReviewScreenshots/{old["id"]}')
    upload(asc, 'inAppPurchaseAppStoreReviewScreenshots', 'inAppPurchaseV2', 'inAppPurchases', iap_id,
           ROOT / 'store' / 'iap-review.png')
    return iap_id


@step('Zur Prüfung einreichen')
def submit(asc, app_id, version_id, iap_id):
    if iap_id:
        try:
            asc.post('/v1/inAppPurchaseSubmissions', {'data': {'type': 'inAppPurchaseSubmissions',
                     'relationships': {'inAppPurchaseV2': rel('inAppPurchases', iap_id)}}})
            log('    In-App-Kauf für die Prüfung vorgemerkt')
        except RuntimeError as e:
            log(f'    Hinweis In-App-Kauf: {e}')
    sub = asc.post('/v1/reviewSubmissions', {'data': {'type': 'reviewSubmissions', 'attributes': {'platform': 'IOS'},
                   'relationships': {'app': rel('apps', app_id)}}})['data']
    asc.post('/v1/reviewSubmissionItems', {'data': {'type': 'reviewSubmissionItems', 'relationships': {
        'reviewSubmission': rel('reviewSubmissions', sub['id']), 'appStoreVersion': rel('appStoreVersions', version_id)}}})
    asc.patch(f'/v1/reviewSubmissions/{sub["id"]}', {'data': {'type': 'reviewSubmissions', 'id': sub['id'],
              'attributes': {'submitted': True}}})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--build', type=int, default=0, help='Build-Nummer, die der Version zugeordnet wird')
    ap.add_argument('--phone', default=os.environ.get('REVIEW_PHONE', ''))
    ap.add_argument('--email', default=os.environ.get('REVIEW_EMAIL', 'kontakt@wellbooked.at'))
    ap.add_argument('--submit', action='store_true')
    ap.add_argument('--skip-shots', action='store_true')
    a = ap.parse_args()

    asc = ASC()
    app = asc.get('/v1/apps', **{'filter[bundleId]': BUNDLE_ID})['data'][0]
    app_id = app['id']
    log(f'App {app["attributes"]["name"]} ({app_id})')
    infos = asc.get(f'/v1/apps/{app_id}/appInfos')['data']
    info = next((i for i in infos if i['attributes'].get('appStoreState') not in ('READY_FOR_SALE', 'REPLACED_WITH_NEW_INFO')
                 and i['attributes'].get('state') not in ('READY_FOR_DISTRIBUTION',)), infos[0])
    versions = asc.get(f'/v1/apps/{app_id}/appStoreVersions', **{'filter[platform]': 'IOS', 'limit': 10})['data']
    version = next(v for v in versions if v['attributes']['appStoreState'] in
                   ('PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'))
    version_id = version['id']
    log(f'Version {version["attributes"]["versionString"]} ({version["attributes"]["appStoreState"]})')

    categories(asc, info['id'])
    info_localizations(asc, info['id'])
    age_rating(asc, info['id'])
    content_rights(asc, app_id)
    price(asc, app_id)
    availability(asc, app_id)
    loc_ids = version_localizations(asc, version_id)
    if loc_ids and not a.skip_shots:
        screenshots(asc, loc_ids)
    if a.build:
        attach_build(asc, app_id, version_id, a.build)
    if a.phone:
        review_details(asc, version_id, a.phone, a.email)
    else:
        log('▶ Prüfangaben übersprungen (keine Telefonnummer)')
    release_type(asc, version_id)
    iap_id = iap(asc, app_id)
    if a.submit and not FAILED:
        submit(asc, app_id, version_id, iap_id)

    if FAILED:
        log('\nFehlgeschlagen: ' + ', '.join(FAILED))
        sys.exit(1)
    log('\nFertig.')


if __name__ == '__main__':
    main()
