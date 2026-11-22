import UIKit
import Capacitor
import AppTrackingTransparency

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    /// Verhindert zwei Tracking-Dialoge bei zwei Vordergrund-Wechseln kurz hintereinander.
    private var trackingAbfrageLaeuft = false

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        // App über einen Shortcut gestartet
        if let item = connectionOptions.shortcutItem {
            CalcumeterShortcuts.open(view: item.type)
        }
    }

    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        CalcumeterShortcuts.open(view: shortcutItem.type)
        completionHandler(true)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        frageNachTracking()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    // MARK: - App Tracking Transparency
    //
    // Nativ statt ueber das AdMob-Plugin: Die Plugin-Bruecke ruft ATTrackingManager auf einer
    // Hintergrund-Warteschlange auf, oft bevor die App aktiv ist – iOS zeigt dann nichts.
    // Apple hat genau das bei Schwester-Apps abgelehnt (Richtlinie 2.1). Mit Scene-Manifest
    // kommt applicationDidBecomeActive im AppDelegate nie an, deshalb steht es hier.
    // money.js wartet auf die Antwort, bevor das Anzeigen-SDK startet.
    private func frageNachTracking() {
        guard #available(iOS 14, *) else { return }
        guard !trackingAbfrageLaeuft else { return }
        guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }
        trackingAbfrageLaeuft = true
        // Beim Kaltstart wird das Fenster noch aufgebaut – kurz warten
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard UIApplication.shared.applicationState == .active else {
                self?.trackingAbfrageLaeuft = false
                return
            }
            ATTrackingManager.requestTrackingAuthorization { _ in
                self?.trackingAbfrageLaeuft = false
            }
        }
    }
}
