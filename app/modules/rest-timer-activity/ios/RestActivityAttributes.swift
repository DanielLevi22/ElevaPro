import ActivityKit
import Foundation

/// O descanso na Live Activity.
///
/// Este arquivo existe igual no módulo do app e na extensão do widget
/// (`targets/rest-activity`): o ActivityKit casa os dois lados pelo nome do
/// tipo. Um teste do app confere que as duas cópias não divergem.
@available(iOS 16.1, *)
struct RestActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var title: String
    var subtitle: String
    /// Começo e fim do descanso: o sistema conta o tempo e enche a barra sozinho.
    var startsAt: Date
    var endsAt: Date
    /// Segundos que faltavam ao pausar; nulo enquanto corre.
    var pausedRemaining: Int?
    var doneTitle: String
    var addLabel: String
    var skipLabel: String
  }
}
