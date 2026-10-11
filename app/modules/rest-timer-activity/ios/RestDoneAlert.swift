import Foundation
import UserNotifications

/// O alerta do fim do descanso, com o texto do cartão: "Hora da série 3" e a
/// próxima série.
///
/// A Live Activity não consegue tocar sozinha no fim: atualizar com alerta
/// pede o app acordado nesse instante, e no bolso ele está suspenso. O alerta é
/// uma notificação local agendada para o fim, que o sistema entrega mesmo com o
/// app parado; o cartão, vencido, troca para "Hora da série" junto.
///
/// Só fica agendado com o app fora da tela: aberto, a sessão já avisa, e
/// alertar de novo seria duplicar.
@available(iOS 16.1, *)
enum RestDoneAlert {
  private static let identifier = "com.elevapro.rest.done"

  static func schedule(_ state: RestActivityAttributes.ContentState) {
    cancel()
    guard state.pausedRemaining == nil else { return }
    let interval = state.endsAt.timeIntervalSinceNow
    guard interval > 0 else { return }

    let content = UNMutableNotificationContent()
    content.title = state.doneTitle
    content.body = state.subtitle
    content.sound = .default
    let request = UNNotificationRequest(
      identifier: identifier,
      content: content,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
    )
    UNUserNotificationCenter.current().add(request)
  }

  static func cancel() {
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: [identifier])
    center.removeDeliveredNotifications(withIdentifiers: [identifier])
  }
}
