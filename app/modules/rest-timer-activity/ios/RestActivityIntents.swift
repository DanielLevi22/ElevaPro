import AppIntents
import Foundation

/// Os botões da Live Activity.
///
/// Este arquivo existe igual no módulo do app e na extensão do widget. O
/// sistema roda o `perform` no processo do app, onde a sessão de treino está;
/// a cópia da extensão só existe para o botão poder apontar para o tipo.
@available(iOS 17.0, *)
struct AddRestTimeIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Mais 15 segundos de descanso"

  func perform() async throws -> some IntentResult {
    await RestActionBridge.handle(.addTime)
    return .result()
  }
}

@available(iOS 17.0, *)
struct SkipRestIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Pular o descanso"

  func perform() async throws -> some IntentResult {
    await RestActionBridge.handle(.skip)
    return .result()
  }
}
