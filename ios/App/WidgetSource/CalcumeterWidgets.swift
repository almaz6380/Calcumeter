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

// MARK: - Gemeinsame Daten

struct RateSnapshot {
    var from = "EUR"
    var favorites = ["USD", "GBP", "CHF", "JPY"]
    var rates: [String: Double] = [:]
    var updated: Date?
    var german = (Locale.preferredLanguages.first ?? "en").hasPrefix("de")

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
        if let lang = obj["lang"] as? String { s.german = lang.hasPrefix("de") }
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
        f.locale = Locale(identifier: german ? "de_DE" : "en_GB")
        let digits = v >= 100 ? 2 : v >= 1 ? 4 : 6
        f.minimumFractionDigits = min(2, digits)
        f.maximumFractionDigits = digits
        return f.string(from: NSNumber(value: v)) ?? "–"
    }

    var dateText: String {
        guard let d = updated else { return "" }
        let f = DateFormatter()
        f.locale = Locale(identifier: german ? "de_DE" : "en_GB")
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
        .configurationDisplayName(RateSnapshot().german ? "Wechselkurse" : "Exchange rates")
        .description(RateSnapshot().german ? "Deine Lieblingswährungen, automatisch aktualisiert." : "Your favourite currencies, updated automatically.")
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
    let german = (Locale.preferredLanguages.first ?? "en").hasPrefix("de")

    var body: some View {
        let items: [(String, String, String)] = [
            ("calc", german ? "Rechner" : "Calc", "plus.forwardslash.minus"),
            ("fx", german ? "Währung" : "Currency", "eurosign.circle"),
            ("units", german ? "Einheiten" : "Units", "ruler"),
            ("graph", "Graph", "function"),
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
        .configurationDisplayName("Calcumeter")
        .description((Locale.preferredLanguages.first ?? "en").hasPrefix("de")
            ? "Rechner, Währung, Einheiten oder Graph direkt öffnen." : "Open calculator, currency, units or graph directly.")
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
