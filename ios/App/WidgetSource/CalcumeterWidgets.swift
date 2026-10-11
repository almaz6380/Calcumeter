import WidgetKit
import SwiftUI

// Calcumeter-Widgets: Wechselkurs (klein/mittel) und Schnellstart (mittel).
// Die App legt Basiswährung, Favoriten und Kurse in die App-Gruppe; das Widget lädt die Kurse
// zusätzlich alle 2 Stunden selbst nach.

private let appGroup = "group.com.almaz6380.calcumeter"
private let ratesURL = URL(string: "https://open.er-api.com/v6/latest/EUR")!

private let ground = Color(red: 0.055, green: 0.059, blue: 0.067)
private let amber = Color(red: 1.0, green: 0.71, blue: 0.28)
private let textMain = Color(red: 0.957, green: 0.957, blue: 0.961)
private let textMuted = Color(red: 0.54, green: 0.545, blue: 0.58)

// MARK: - Texte in der Gerätesprache (erzeugt von tools/native-strings.py)

// L10N-BEGIN
enum L10n {
    static let table: [String: [String: String]] = [
        "de": ["widget_rate_name": "Wechselkurse", "widget_rate_desc": "Deine Lieblingswährungen, automatisch aktualisiert", "widget_quick_name": "Calcumeter Schnellstart", "widget_quick_desc": "Rechner, Währung, Einheiten oder Graph direkt öffnen", "widget_view_calc": "Rechner", "widget_view_fx": "Währung", "widget_view_units": "Einheiten", "widget_view_graph": "Graph"],
        "en": ["widget_rate_name": "Exchange rates", "widget_rate_desc": "Your favourite currencies, updated automatically", "widget_quick_name": "Calcumeter quick start", "widget_quick_desc": "Open calculator, currency, units or graph directly", "widget_view_calc": "Calc", "widget_view_fx": "Currency", "widget_view_units": "Units", "widget_view_graph": "Graph"],
        "es": ["widget_rate_name": "Tipos de cambio", "widget_rate_desc": "Tus divisas favoritas, actualizadas automáticamente", "widget_quick_name": "Acceso rápido a Calcumeter", "widget_quick_desc": "Abre directamente la calculadora, divisas, unidades o gráficas", "widget_view_calc": "Calc.", "widget_view_fx": "Divisas", "widget_view_units": "Unidades", "widget_view_graph": "Gráfica"],
        "fr": ["widget_rate_name": "Taux de change", "widget_rate_desc": "Vos devises favorites, mises à jour automatiquement", "widget_quick_name": "Accès rapide Calcumeter", "widget_quick_desc": "Ouvrez directement la calculatrice, les devises, les unités ou le graphique", "widget_view_calc": "Calcul", "widget_view_fx": "Devises", "widget_view_units": "Unités", "widget_view_graph": "Graphique"],
        "it": ["widget_rate_name": "Tassi di cambio", "widget_rate_desc": "Le tue valute preferite, aggiornate automaticamente", "widget_quick_name": "Avvio rapido Calcumeter", "widget_quick_desc": "Apri direttamente calcolatrice, valute, unità o grafico", "widget_view_calc": "Calcola", "widget_view_fx": "Valute", "widget_view_units": "Unità", "widget_view_graph": "Grafico"],
        "pt": ["widget_rate_name": "Câmbio", "widget_rate_desc": "Suas moedas favoritas, atualizadas automaticamente", "widget_quick_name": "Acesso rápido Calcumeter", "widget_quick_desc": "Abra direto a calculadora, moedas, unidades ou gráficos", "widget_view_calc": "Calc", "widget_view_fx": "Moedas", "widget_view_units": "Unidades", "widget_view_graph": "Gráfico"],
        "tr": ["widget_rate_name": "Döviz kurları", "widget_rate_desc": "Favori para birimleriniz, otomatik güncellenir", "widget_quick_name": "Calcumeter hızlı başlat", "widget_quick_desc": "Hesap makinesini, döviz, birim veya grafik bölümünü doğrudan açın", "widget_view_calc": "Hesap", "widget_view_fx": "Döviz", "widget_view_units": "Birim", "widget_view_graph": "Grafik"],
        "pl": ["widget_rate_name": "Kursy walut", "widget_rate_desc": "Twoje ulubione waluty, aktualizowane automatycznie", "widget_quick_name": "Calcumeter – szybki start", "widget_quick_desc": "Otwórz od razu kalkulator, waluty, jednostki lub wykres", "widget_view_calc": "Kalkulator", "widget_view_fx": "Waluty", "widget_view_units": "Jednostki", "widget_view_graph": "Wykres"],
        "nl": ["widget_rate_name": "Wisselkoersen", "widget_rate_desc": "Je favoriete valuta, automatisch bijgewerkt", "widget_quick_name": "Calcumeter snelstart", "widget_quick_desc": "Open direct rekenmachine, valuta, eenheden of grafiek", "widget_view_calc": "Rekenen", "widget_view_fx": "Valuta", "widget_view_units": "Eenheden", "widget_view_graph": "Grafiek"],
        "sv": ["widget_rate_name": "Växelkurser", "widget_rate_desc": "Dina favoritvalutor, uppdateras automatiskt", "widget_quick_name": "Calcumeter snabbstart", "widget_quick_desc": "Öppna räknare, valuta, enheter eller graf direkt", "widget_view_calc": "Räknare", "widget_view_fx": "Valuta", "widget_view_units": "Enheter", "widget_view_graph": "Graf"],
        "da": ["widget_rate_name": "Valutakurser", "widget_rate_desc": "Dine favoritvalutaer, opdateres automatisk", "widget_quick_name": "Calcumeter hurtigstart", "widget_quick_desc": "Åbn lommeregner, valuta, enheder eller graf direkte", "widget_view_calc": "Beregner", "widget_view_fx": "Valuta", "widget_view_units": "Enheder", "widget_view_graph": "Graf"],
        "ja": ["widget_rate_name": "為替レート", "widget_rate_desc": "お気に入りの通貨のレートを自動更新", "widget_quick_name": "Calcumeter クイック起動", "widget_quick_desc": "電卓・通貨・単位・グラフをすぐに開く", "widget_view_calc": "電卓", "widget_view_fx": "通貨", "widget_view_units": "単位", "widget_view_graph": "グラフ"],
        "ko": ["widget_rate_name": "환율", "widget_rate_desc": "즐겨찾는 통화, 자동 업데이트", "widget_quick_name": "Calcumeter 빠른 실행", "widget_quick_desc": "계산기, 환율, 단위, 그래프를 바로 열기", "widget_view_calc": "계산기", "widget_view_fx": "환율", "widget_view_units": "단위", "widget_view_graph": "그래프"],
        "zh-Hans": ["widget_rate_name": "汇率", "widget_rate_desc": "你收藏的货币，自动更新", "widget_quick_name": "Calcumeter 快速启动", "widget_quick_desc": "直接打开计算器、汇率、单位或绘图", "widget_view_calc": "计算器", "widget_view_fx": "汇率", "widget_view_units": "单位", "widget_view_graph": "绘图"],
        "zh-Hant": ["widget_rate_name": "匯率", "widget_rate_desc": "你最愛的貨幣，自動更新", "widget_quick_name": "Calcumeter 快速啟動", "widget_quick_desc": "直接開啟計算機、匯率、單位或繪圖", "widget_view_calc": "計算機", "widget_view_fx": "匯率", "widget_view_units": "單位", "widget_view_graph": "繪圖"],
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

// MARK: - Gemeinsame Daten

struct RateSnapshot {
    var from = "EUR"
    var favorites = ["USD", "GBP", "CHF", "JPY"]
    var rates: [String: Double] = [:]
    var updated: Date?
    var localeId = Locale.preferredLanguages.first ?? "en"

    static func load() -> RateSnapshot {
        var s = RateSnapshot()
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "widgetData"),
              let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return s }
        if let f = obj["from"] as? String { s.from = f }
        if let favs = obj["favorites"] as? [String], !favs.isEmpty { s.favorites = favs }
        if let r = obj["rates"] as? [String: Any] {
            s.rates = r.compactMapValues { ($0 as? NSNumber)?.doubleValue }
        }
        if let ms = obj["updated"] as? Double, ms > 0 { s.updated = Date(timeIntervalSince1970: ms / 1000) }
        if let id = obj["locale"] as? String { s.localeId = id }
        else if let lang = obj["lang"] as? String { s.localeId = lang.hasPrefix("de") ? "de_DE" : "en_GB" }
        return s
    }

    /// Neue Kurse laden und in die App-Gruppe zurückschreiben
    static func refresh() async {
        guard let (data, _) = try? await URLSession.shared.data(from: ratesURL),
              let res = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              res["result"] as? String == "success",
              let rates = res["rates"] as? [String: Any] else { return }
        let defaults = UserDefaults(suiteName: appGroup)
        var obj: [String: Any] = [:]
        if let json = defaults?.string(forKey: "widgetData"), let d = json.data(using: .utf8),
           let old = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { obj = old }
        obj["rates"] = rates
        obj["updated"] = ((res["time_last_update_unix"] as? Double) ?? Date().timeIntervalSince1970) * 1000
        if let out = try? JSONSerialization.data(withJSONObject: obj), let str = String(data: out, encoding: .utf8) {
            defaults?.set(str, forKey: "widgetData")
        }
    }

    func rate(_ to: String) -> Double? {
        guard let a = rates[from], let b = rates[to], a > 0 else { return nil }
        return b / a
    }

    var targets: [String] { favorites.filter { $0 != from } }

    func format(_ v: Double?) -> String {
        guard let v = v else { return "–" }
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: localeId)
        let digits = v >= 100 ? 2 : v >= 1 ? 4 : 6
        f.minimumFractionDigits = min(2, digits)
        f.maximumFractionDigits = digits
        return f.string(from: NSNumber(value: v)) ?? "–"
    }

    var dateText: String {
        guard let d = updated else { return "" }
        let f = DateFormatter()
        f.locale = Locale(identifier: localeId)
        f.dateStyle = .short
        return f.string(from: d)
    }
}

// MARK: - Wechselkurs-Widget

struct RateEntry: TimelineEntry {
    let date: Date
    let snap: RateSnapshot
}

struct RateProvider: TimelineProvider {
    func placeholder(in context: Context) -> RateEntry {
        var s = RateSnapshot()
        s.rates = ["EUR": 1, "USD": 1.12, "GBP": 0.85, "CHF": 0.93, "JPY": 177.3]
        return RateEntry(date: Date(), snap: s)
    }

    func getSnapshot(in context: Context, completion: @escaping (RateEntry) -> Void) {
        let s = RateSnapshot.load()
        completion(s.rates.isEmpty ? placeholder(in: context) : RateEntry(date: Date(), snap: s))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RateEntry>) -> Void) {
        Task {
            await RateSnapshot.refresh()
            let entry = RateEntry(date: Date(), snap: RateSnapshot.load())
            completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(2 * 3600))))
        }
    }
}

struct RateWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: RateEntry

    var body: some View {
        let s = entry.snap
        Group {
            if family == .systemSmall {
                let to = s.targets.first ?? "USD"
                VStack(alignment: .leading, spacing: 4) {
                    Text("1 \(s.from) =").font(.caption).foregroundColor(amber)
                    Spacer(minLength: 0)
                    Text(s.format(s.rate(to)))
                        .font(.system(size: 30, weight: .light)).foregroundColor(textMain)
                        .minimumScaleFactor(0.5).lineLimit(1)
                    HStack {
                        Text(to).font(.subheadline.weight(.semibold)).foregroundColor(textMain)
                        Spacer()
                        Text(s.dateText).font(.caption2).foregroundColor(textMuted)
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("1 \(s.from)").font(.caption.weight(.semibold)).foregroundColor(amber)
                        Spacer()
                        Text(s.dateText).font(.caption2).foregroundColor(textMuted)
                    }
                    ForEach(Array(s.targets.prefix(4)), id: \.self) { code in
                        HStack {
                            Text(code).font(.subheadline.weight(.semibold)).foregroundColor(textMuted)
                            Spacer()
                            Text(s.format(s.rate(code))).font(.system(size: 17)).foregroundColor(textMain)
                        }
                    }
                    Spacer(minLength: 0)
                }
            }
        }
        .widgetURL(URL(string: "calcumeter://view/fx"))
        .widgetBackground(ground)
    }
}

struct RateWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CalcumeterRates", provider: RateProvider()) { entry in
            RateWidgetView(entry: entry)
        }
        .configurationDisplayName(L10n.text("widget_rate_name"))
        .description(L10n.text("widget_rate_desc"))
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Schnellstart-Widget

struct QuickEntry: TimelineEntry {
    let date: Date
}

struct QuickProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickEntry { QuickEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (QuickEntry) -> Void) { completion(QuickEntry(date: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickEntry>) -> Void) {
        completion(Timeline(entries: [QuickEntry(date: Date())], policy: .never))
    }
}

struct QuickWidgetView: View {
    var body: some View {
        let items: [(String, String, String)] = [
            ("calc", L10n.text("widget_view_calc"), "plus.forwardslash.minus"),
            ("fx", L10n.text("widget_view_fx"), "eurosign.circle"),
            ("units", L10n.text("widget_view_units"), "ruler"),
            ("graph", L10n.text("widget_view_graph"), "function"),
        ]
        HStack(spacing: 8) {
            ForEach(items, id: \.0) { item in
                Link(destination: URL(string: "calcumeter://view/\(item.0)")!) {
                    VStack(spacing: 6) {
                        Image(systemName: item.2).font(.system(size: 22, weight: .medium))
                        Text(item.1).font(.caption2.weight(.medium)).lineLimit(1).minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .foregroundColor(item.0 == "calc" ? Color(red: 0.11, green: 0.08, blue: 0.03) : textMain)
                    .background(item.0 == "calc" ? amber : Color(red: 0.12, green: 0.125, blue: 0.145))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }
        }
        .widgetBackground(ground)
    }
}

struct QuickWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CalcumeterQuick", provider: QuickProvider()) { _ in
            QuickWidgetView()
        }
        .configurationDisplayName(L10n.text("widget_quick_name"))
        .description(L10n.text("widget_quick_desc"))
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Hintergrund (iOS 17 verlangt containerBackground)

extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget) { color }
        } else {
            self.padding().background(color)
        }
    }
}

@main
struct CalcumeterWidgetBundle: WidgetBundle {
    var body: some Widget {
        RateWidget()
        QuickWidget()
    }
}
