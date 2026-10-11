import UIKit
import Capacitor
import WidgetKit

/// Startet die WebView und meldet das eigene Widget-Plugin an.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}

/// Nimmt aus der Web-App Kurse, Basiswährung und Favoriten für das Wechselkurs-Widget entgegen
/// und legt sie in die App-Gruppe, die auch die Widget-Erweiterung liest.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setData", returnType: CAPPluginReturnPromise)
    ]

    static let appGroup = "group.com.almaz6380.calcumeter"

    @objc func setData(_ call: CAPPluginCall) {
        let json = call.getString("json") ?? "{}"
        UserDefaults(suiteName: WidgetBridgePlugin.appGroup)?.set(json, forKey: "widgetData")
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}

// Texte in der Gerätesprache (erzeugt von tools/native-strings.py)
// L10N-BEGIN
enum L10n {
    static let table: [String: [String: String]] = [
        "de": ["widget_view_fx": "Währung", "widget_view_units": "Einheiten", "widget_view_graph": "Graph"],
        "en": ["widget_view_fx": "Currency", "widget_view_units": "Units", "widget_view_graph": "Graph"],
        "es": ["widget_view_fx": "Divisas", "widget_view_units": "Unidades", "widget_view_graph": "Gráfica"],
        "fr": ["widget_view_fx": "Devises", "widget_view_units": "Unités", "widget_view_graph": "Graphique"],
        "it": ["widget_view_fx": "Valute", "widget_view_units": "Unità", "widget_view_graph": "Grafico"],
        "pt": ["widget_view_fx": "Moedas", "widget_view_units": "Unidades", "widget_view_graph": "Gráfico"],
        "tr": ["widget_view_fx": "Döviz", "widget_view_units": "Birim", "widget_view_graph": "Grafik"],
        "pl": ["widget_view_fx": "Waluty", "widget_view_units": "Jednostki", "widget_view_graph": "Wykres"],
        "nl": ["widget_view_fx": "Valuta", "widget_view_units": "Eenheden", "widget_view_graph": "Grafiek"],
        "sv": ["widget_view_fx": "Valuta", "widget_view_units": "Enheter", "widget_view_graph": "Graf"],
        "da": ["widget_view_fx": "Valuta", "widget_view_units": "Enheder", "widget_view_graph": "Graf"],
        "ja": ["widget_view_fx": "通貨", "widget_view_units": "単位", "widget_view_graph": "グラフ"],
        "ko": ["widget_view_fx": "환율", "widget_view_units": "단위", "widget_view_graph": "그래프"],
        "zh-Hans": ["widget_view_fx": "汇率", "widget_view_units": "单位", "widget_view_graph": "绘图"],
        "zh-Hant": ["widget_view_fx": "匯率", "widget_view_units": "單位", "widget_view_graph": "繪圖"],
    ]

    /// Erste unterstützte Gerätesprache, sonst Englisch
    static var lang: String {
        for tag in Locale.preferredLanguages {
            let t = tag.lowercased()
            if t.hasPrefix("zh") {
                return t.contains("hant") || t.contains("-tw") || t.contains("-hk") || t.contains("-mo") ? "zh-Hant" : "zh-Hans"
            }
            if t.hasPrefix("nb") || t.hasPrefix("nn") || t.hasPrefix("no") { return "da" }
            let base = String(t.split(separator: "-").first ?? "")
            if table[base] != nil { return base }
        }
        return "en"
    }

    static func text(_ key: String) -> String { table[lang]?[key] ?? table["en"]?[key] ?? key }
}
// L10N-END

/// App-Shortcuts (langes Drücken auf das App-Symbol) und Bereich-Links calcumeter://view/<bereich>
enum CalcumeterShortcuts {
    static func install() {
        let items: [(String, String, String)] = [
            ("fx", L10n.text("widget_view_fx"), "eurosign.circle"),
            ("units", L10n.text("widget_view_units"), "ruler"),
            ("graph", L10n.text("widget_view_graph"), "function"),
        ]
        UIApplication.shared.shortcutItems = items.map { item in
            UIApplicationShortcutItem(type: item.0, localizedTitle: item.1, localizedSubtitle: nil,
                                      icon: UIApplicationShortcutIcon(systemImageName: item.2), userInfo: nil)
        }
    }

    static func open(view: String) {
        guard let url = URL(string: "calcumeter://view/\(view)") else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }
}
