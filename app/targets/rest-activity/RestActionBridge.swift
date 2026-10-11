import Foundation

enum RestAction: String {
  case addTime = "add_time"
  case skip
}

/// A metade da ponte que a extensão enxerga. O sistema roda o `perform` dos
/// botões no processo do app (`modules/rest-timer-activity/ios`), e não aqui:
/// esta versão só deixa os intents compilarem na extensão.
enum RestActionBridge {
  static func handle(_ action: RestAction) async {}
}
