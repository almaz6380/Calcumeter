#!/usr/bin/env python3
"""
Android-Release über die Google Play Android Publisher API v3.

  PLAY_SERVICE_ACCOUNT_JSON='{…}' python3 tools/play_release.py android/app/build/outputs/bundle/release/app-release.aab

Lädt das Bundle hoch, setzt es im Track "production" (100 %) mit den Versionshinweisen aus
store/listing/<sprache>.json (whatsNew) und aktualisiert Beschreibung und Kurzbeschreibung
der vorhandenen Store-Einträge. --dry-run prüft alles und verwirft die Änderung.
"""
import json
import os
import sys
import time
from pathlib import Path

import jwt
import requests

PACKAGE = 'com.almaz6380.calcumeter'
ROOT = Path(__file__).resolve().parent.parent
API = f'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PACKAGE}'
UPLOAD = f'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/{PACKAGE}'

# Play-Sprachcode → Datei in store/listing
LANGS = {
    'de-DE': 'de', 'en-US': 'en', 'en-GB': 'en', 'es-ES': 'es', 'fr-FR': 'fr', 'it-IT': 'it', 'pt-BR': 'pt',
    'pt-PT': 'pt', 'tr-TR': 'tr', 'pl-PL': 'pl', 'nl-NL': 'nl', 'sv-SE': 'sv', 'da-DK': 'da', 'ja-JP': 'ja',
    'ko-KR': 'ko', 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', 'zh-HK': 'zh-Hant',
}


def token():
    sa = json.loads(os.environ['PLAY_SERVICE_ACCOUNT_JSON'])
    now = int(time.time())
    assertion = jwt.encode({
        'iss': sa['client_email'], 'scope': 'https://www.googleapis.com/auth/androidpublisher',
        'aud': sa['token_uri'], 'iat': now, 'exp': now + 3600,
    }, sa['private_key'], algorithm='RS256')
    r = requests.post(sa['token_uri'], data={'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion': assertion})
    r.raise_for_status()
    return r.json()['access_token']


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry-run' in sys.argv
    aab = Path(args[0])
    s = requests.Session()
    s.headers['Authorization'] = f'Bearer {token()}'

    def call(method, url, **kw):
        r = s.request(method, url, **kw)
        if not r.ok:
            raise SystemExit(f'{method} {url} → {r.status_code}: {r.text[:800]}')
        return r.json() if r.text else {}

    edit = call('POST', f'{API}/edits', json={})['id']
    print('Edit', edit)
    try:
        with aab.open('rb') as f:
            bundle = call('POST', f'{UPLOAD}/edits/{edit}/bundles?uploadType=media',
                          data=f, headers={'Content-Type': 'application/octet-stream'}, timeout=600)
        code = bundle['versionCode']
        print('Bundle hochgeladen, versionCode', code)

        listings = call('GET', f'{API}/edits/{edit}/listings').get('listings', [])
        notes = []
        for l in listings:
            lang = l['language']
            src = LANGS.get(lang)
            if not src:
                print('  ohne Text:', lang)
                continue
            j = json.loads((ROOT / 'store' / 'listing' / f'{src}.json').read_text())
            call('PATCH', f'{API}/edits/{edit}/listings/{lang}', json={
                'language': lang, 'title': l['title'], 'shortDescription': j['shortDescription'], 'fullDescription': j['description'],
            })
            notes.append({'language': lang, 'text': j['whatsNew'][:500]})
            print('  Eintrag', lang)

        call('PUT', f'{API}/edits/{edit}/tracks/production', json={
            'track': 'production',
            'releases': [{'versionCodes': [str(code)], 'status': 'completed', 'releaseNotes': notes}],
        })
        print('Produktion: versionCode', code, 'mit', len(notes), 'Versionshinweisen')
        if dry:
            call('POST', f'{API}/edits/{edit}:validate')
            s.delete(f'{API}/edits/{edit}')
            print('Probelauf: gültig, verworfen')
        else:
            call('POST', f'{API}/edits/{edit}:commit')
            print('Eingereicht')
    except BaseException:
        s.delete(f'{API}/edits/{edit}')
        raise


if __name__ == '__main__':
    main()
