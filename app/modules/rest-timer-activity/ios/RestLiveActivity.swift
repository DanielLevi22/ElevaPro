import ActivityKit
import Foundation

/// Abre, atualiza e encerra a Live Activity do descanso. Só existe uma por vez.
@available(iOS 16.2, *)
enum RestLiveActivity {
  typealias State = RestActivityAttributes.ContentState

  static func show(_ state: State) async {
    let content = ActivityContent(state: state, staleDate: staleDate(of: state))
    if let current = Activity<RestActivityAttributes>.activities.first {
      await current.update(content)
      return
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
    _ = try? Activity.request(attributes: RestActivityAttributes(), content: content, pushType: nil)
  }

  static func end() async {
    for activity in Activity<RestActivityAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }

  static func apply(_ action: RestAction) async {
    guard let current = Activity<RestActivityAttributes>.activities.first else { return }
    switch action {
    case .skip:
      await current.end(nil, dismissalPolicy: .immediate)
    case .addTime:
      let state = adding(RestActionBridge.addSeconds, to: current.content.state, now: Date())
      await current.update(ActivityContent(state: state, staleDate: staleDate(of: state)))
    }
  }

  /// A mesma conta de `ajustarDescanso` na sessão: soma ao que falta, e a
  /// duração só cresce, para a barra não andar para trás.
  static func adding(_ seconds: TimeInterval, to state: State, now: Date) -> State {
    let running = max(0, state.endsAt.timeIntervalSince(now))
    let remaining = (state.pausedRemaining.map(TimeInterval.init) ?? running) + seconds
    let total = max(state.endsAt.timeIntervalSince(state.startsAt), remaining)
    var next = state
    next.endsAt = now.addingTimeInterval(remaining)
    next.startsAt = next.endsAt.addingTimeInterval(-total)
    if state.pausedRemaining != nil { next.pausedRemaining = Int(remaining) }
    return next
  }

  /// Correndo, a atividade "vence" no fim do descanso e a tela troca para a
  /// próxima série; pausada, não vence.
  private static func staleDate(of state: State) -> Date? {
    state.pausedRemaining == nil ? state.endsAt : nil
  }
}
