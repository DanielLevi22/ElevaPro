import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@main
struct RestActivityBundle: WidgetBundle {
  var body: some Widget {
    RestActivityWidget()
  }
}

/// O descanso fora do app: o cartão da tela bloqueada (desenho 6c) e a Dynamic
/// Island. O sistema conta o tempo e enche a barra sozinho; o app só manda o
/// começo e o fim.
struct RestActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RestActivityAttributes.self) { context in
      RestLockScreenView(state: context.state, isStale: context.isStale)
        .activityBackgroundTint(Color("surface"))
        .activitySystemActionForegroundColor(Color("label"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          BrandMark().padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          RestTimerText(state: context.state, isStale: context.isStale, size: 28)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 10) {
            RestTitles(state: context.state, isStale: context.isStale)
            RestProgress(state: context.state, isStale: context.isStale)
            RestButtons(state: context.state)
          }
        }
      } compactLeading: {
        Image(systemName: "dumbbell.fill").foregroundStyle(Color("primary"))
      } compactTrailing: {
        RestTimerText(state: context.state, isStale: context.isStale, size: 14)
      } minimal: {
        Image(systemName: "timer").foregroundStyle(Color("primary"))
      }
      .keylineTint(Color("primary"))
    }
  }
}

typealias RestState = RestActivityAttributes.ContentState

struct RestLockScreenView: View {
  let state: RestState
  let isStale: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 8) {
        BrandMark()
        Text("Eleva Pro")
          .font(.system(size: 11.5, weight: .bold))
          .tracking(0.5)
          .textCase(.uppercase)
          .foregroundStyle(Color("secondaryLabel"))
        Spacer()
      }
      HStack(alignment: .bottom) {
        RestTitles(state: state, isStale: isStale)
        Spacer(minLength: 8)
        RestTimerText(state: state, isStale: isStale, size: 34)
      }
      .padding(.top, 10)
      RestProgress(state: state, isStale: isStale).padding(.top, 12)
      RestButtons(state: state).padding(.top, 12)
    }
    .padding(14)
  }
}

/// O quadrado lime com o haltere, a marca do app no cabeçalho.
struct BrandMark: View {
  var body: some View {
    RoundedRectangle(cornerRadius: 6)
      .fill(Color("primary"))
      .frame(width: 22, height: 22)
      .overlay(
        Image(systemName: "dumbbell.fill")
          .font(.system(size: 11, weight: .bold))
          .foregroundStyle(Color("onPrimary"))
      )
  }
}

/// "Descanso · Remada curvada" e a próxima série. Vencido o tempo, o título
/// chama para a série.
private struct RestTitles: View {
  let state: RestState
  let isStale: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      Text(isStale ? state.doneTitle : state.title)
        .font(.system(size: 15, weight: .bold))
        .foregroundStyle(Color("label"))
        .lineLimit(1)
      Text(state.subtitle)
        .font(.system(size: 12.5))
        .foregroundStyle(Color("secondaryLabel"))
        .lineLimit(1)
    }
  }
}

/// O tempo que falta. Correndo, o próprio sistema conta; pausado, fica parado.
private struct RestTimerText: View {
  let state: RestState
  let isStale: Bool
  let size: CGFloat

  var body: some View {
    timer
      .font(.system(size: size, weight: .heavy, design: .rounded))
      .monospacedDigit()
      .foregroundStyle(Color("primaryText"))
      .multilineTextAlignment(.trailing)
      .frame(maxWidth: size * 3, alignment: .trailing)
  }

  @ViewBuilder private var timer: some View {
    if isStale {
      Text("0:00")
    } else if let paused = state.pausedRemaining {
      Text(String(format: "%d:%02d", paused / 60, paused % 60))
    } else {
      Text(timerInterval: state.startsAt...state.endsAt, countsDown: true)
    }
  }
}

/// A barra que enche enquanto o descanso passa.
private struct RestProgress: View {
  let state: RestState
  let isStale: Bool

  var body: some View {
    bar
      .progressViewStyle(.linear)
      .tint(Color("primary"))
  }

  @ViewBuilder private var bar: some View {
    let total = max(1, state.endsAt.timeIntervalSince(state.startsAt))
    if isStale {
      ProgressView(value: 1)
    } else if let paused = state.pausedRemaining {
      ProgressView(value: max(0, total - Double(paused)), total: total)
    } else {
      ProgressView(timerInterval: state.startsAt...state.endsAt, countsDown: false) {
        EmptyView()
      } currentValueLabel: {
        EmptyView()
      }
    }
  }
}

/// "+15 s" e "Pular". Os botões rodam no app (iOS 17+); antes disso o cartão
/// só mostra o tempo.
private struct RestButtons: View {
  let state: RestState

  var body: some View {
    if #available(iOS 17.0, *) {
      HStack(spacing: 8) {
        Button(intent: AddRestTimeIntent()) {
          RestPill(icon: "plus", text: state.addLabel, primary: false)
        }
        .buttonStyle(.plain)
        Button(intent: SkipRestIntent()) {
          RestPill(icon: "forward.end", text: state.skipLabel, primary: true)
        }
        .buttonStyle(.plain)
      }
    }
  }
}

private struct RestPill: View {
  let icon: String
  let text: String
  let primary: Bool

  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: icon).font(.system(size: 13, weight: .bold))
      Text(text)
        .font(.system(size: 11.5, weight: .heavy))
        .tracking(0.7)
        .textCase(.uppercase)
    }
    .foregroundStyle(primary ? Color("onPrimary") : Color("label"))
    .frame(maxWidth: .infinity)
    .frame(height: 40)
    .background(
      RoundedRectangle(cornerRadius: 13)
        .fill(primary ? Color("primary") : Color("secondaryButton"))
    )
    .overlay {
      if !primary {
        RoundedRectangle(cornerRadius: 13).stroke(Color("secondaryButtonBorder"), lineWidth: 1)
      }
    }
  }
}
