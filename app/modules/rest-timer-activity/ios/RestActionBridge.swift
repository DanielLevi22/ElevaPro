import Foundation

enum RestAction: String {
  case addTime = "add_time"
  case skip
}

/// O caminho do toque na tela bloqueada até a sessão de treino.
///
/// O toque age na hora sobre a Live Activity, mesmo com o JavaScript suspenso,
/// e fica guardado até o app ler: a sessão é a fonte da verdade e reaplica o
/// toque com o instante em que ele aconteceu.
enum RestActionBridge {
  static let notice = Notification.Name("com.elevapro.rest.action")
  static let addSeconds: TimeInterval = 15
  private static let pendingKey = "com.elevapro.rest.pendingActions"
  private static let lock = NSLock()

  static func handle(_ action: RestAction) async {
    if #available(iOS 16.2, *) {
      await RestLiveActivity.apply(action)
    }
    record(action)
    NotificationCenter.default.post(name: notice, object: nil)
  }

  /// Devolve os toques guardados e esvazia a fila.
  static func take() -> [[String: Any]] {
    lock.lock()
    defer { lock.unlock() }
    let pending = UserDefaults.standard.array(forKey: pendingKey) as? [[String: Any]] ?? []
    UserDefaults.standard.removeObject(forKey: pendingKey)
    return pending
  }

  private static func record(_ action: RestAction) {
    lock.lock()
    defer { lock.unlock() }
    var pending = UserDefaults.standard.array(forKey: pendingKey) as? [[String: Any]] ?? []
    pending.append(["type": action.rawValue, "at": Date().timeIntervalSince1970 * 1000])
    UserDefaults.standard.set(pending, forKey: pendingKey)
  }
}
