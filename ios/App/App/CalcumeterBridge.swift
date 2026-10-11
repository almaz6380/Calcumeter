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

/// App-Shortcuts (langes Drücken auf das App-Symbol) und Bereich-Links calcumeter://view/<bereich>
enum CalcumeterShortcuts {
    static func install() {
        let de = (Locale.preferredLanguages.first ?? "en").hasPrefix("de")
        let items: [(String, String, String)] = [
            ("fx", de ? "Währung" : "Currency", "eurosign.circle"),
            ("units", de ? "Einheiten" : "Units", "ruler"),
            ("graph", "Graph", "function"),
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
