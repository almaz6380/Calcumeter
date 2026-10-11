"""Widget- und Shortcut-Texte für Android und iOS aus tools/native-strings.json erzeugen.

    python3 tools/native-strings.py

Android: android/app/src/main/res/values[-xx]/widget_strings.xml
iOS: L10n-Tabelle zwischen // L10N-BEGIN und // L10N-END in den Swift-Dateien, CFBundleLocalizations in Info.plist
"""
import json, pathlib, re
from xml.sax.saxutils import escape

root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / 'tools' / 'native-strings.json').read_text(encoding='utf-8'))
KEYS = ['widget_rate_name', 'widget_rate_desc', 'widget_quick_name', 'widget_quick_desc',
        'widget_view_calc', 'widget_view_fx', 'widget_view_units', 'widget_view_graph']
for code, texts in data.items():
    missing = [k for k in KEYS if not texts.get(k)]
    assert not missing, f'{code}: {missing}'

# Android: Sprache → Ressourcenordner (Englisch ist der Standard in values/)
ANDROID = {'en': ['values'], 'zh-Hans': ['values-zh', 'values-zh-rCN'], 'zh-Hant': ['values-zh-rTW', 'values-zh-rHK']}
res = root / 'android' / 'app' / 'src' / 'main' / 'res'
for code, texts in data.items():
    for folder in ANDROID.get(code, [f'values-{code}']):
        lines = ['<?xml version="1.0" encoding="utf-8"?>', '<resources>']
        for k in KEYS:
            v = escape(texts[k]).replace("'", "\\'")
            lines.append(f'    <string name="{k}">{v}</string>')
        lines.append('</resources>')
        (res / folder).mkdir(exist_ok=True)
        (res / folder / 'widget_strings.xml').write_text('\n'.join(lines) + '\n', encoding='utf-8')


def swift_table(keys):
    q = lambda s: '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'
    rows = []
    for code, texts in data.items():
        pairs = ', '.join(f'{q(k)}: {q(texts[k])}' for k in keys)
        rows.append(f'        {q(code)}: [{pairs}],')
    return '\n'.join([
        '// L10N-BEGIN',
        'enum L10n {',
        '    static let table: [String: [String: String]] = [',
        *rows,
        '    ]',
        '',
        '    /// Erste unterstützte Gerätesprache, sonst Englisch',
        '    static var lang: String {',
        '        for tag in Locale.preferredLanguages {',
        '            let t = tag.lowercased()',
        '            if t.hasPrefix("zh") {',
        '                return t.contains("hant") || t.contains("-tw") || t.contains("-hk") || t.contains("-mo") ? "zh-Hant" : "zh-Hans"',
        '            }',
        '            if t.hasPrefix("nb") || t.hasPrefix("nn") || t.hasPrefix("no") { return "da" }',
        '            let base = String(t.split(separator: "-").first ?? "")',
        '            if table[base] != nil { return base }',
        '        }',
        '        return "en"',
        '    }',
        '',
        '    static func text(_ key: String) -> String { table[lang]?[key] ?? table["en"]?[key] ?? key }',
        '}',
        '// L10N-END',
    ])


SWIFT = {
    root / 'ios' / 'App' / 'WidgetSource' / 'CalcumeterWidgets.swift': KEYS,
    root / 'ios' / 'App' / 'App' / 'CalcumeterBridge.swift': ['widget_view_fx', 'widget_view_units', 'widget_view_graph'],
}
for path, keys in SWIFT.items():
    s = path.read_text(encoding='utf-8')
    s, n = re.subn(r'// L10N-BEGIN.*?// L10N-END', lambda m: swift_table(keys), s, flags=re.S)
    assert n == 1, path
    path.write_text(s, encoding='utf-8')

plist = root / 'ios' / 'App' / 'App' / 'Info.plist'
s = plist.read_text(encoding='utf-8')
items = ''.join(f'\t\t<string>{c}</string>\n' for c in data)
s, n = re.subn(r'(<key>CFBundleLocalizations</key>\s*<array>\n).*?(\t</array>)', lambda m: m.group(1) + items + m.group(2), s, flags=re.S)
assert n == 1
plist.write_text(s, encoding='utf-8')
print('Sprachen:', ', '.join(data))
