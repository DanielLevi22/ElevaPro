import ExpoModulesCore

/// O descanso como o JavaScript manda: tempo em milissegundos desde a época.
struct RestRecord: Record {
  @Field var title: String = ""
  @Field var subtitle: String = ""
  @Field var endsAt: Double = 0
  @Field var totalSeconds: Double = 0
  @Field var pausedRemaining: Double? = nil
  @Field var doneTitle: String = ""
  @Field var addLabel: String = ""
  @Field var skipLabel: String = ""

  @available(iOS 16.1, *)
  var contentState: RestActivityAttributes.ContentState {
    let end = Date(timeIntervalSince1970: endsAt / 1000)
    return RestActivityAttributes.ContentState(
      title: title,
      subtitle: subtitle,
      startsAt: end.addingTimeInterval(-totalSeconds),
      endsAt: end,
      pausedRemaining: pausedRemaining.map { Int($0) },
      doneTitle: doneTitle,
      addLabel: addLabel,
      skipLabel: skipLabel
    )
  }
}

/// Ponte do descanso na tela bloqueada. Abaixo do iOS 16.2 não há Live
/// Activity: as funções não fazem nada e o descanso fica só na tela do app.
public class RestTimerActivityModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("RestTimerActivity")

    Events("onAction")

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: RestActionBridge.notice, object: nil, queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onAction", [:])
      }
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
      }
      self.observer = nil
    }

    AsyncFunction("show") { (rest: RestRecord) async in
      guard #available(iOS 16.2, *) else { return }
      await RestLiveActivity.show(rest.contentState)
    }

    AsyncFunction("end") { () async in
      guard #available(iOS 16.2, *) else { return }
      await RestLiveActivity.end()
    }

    Function("takeActions") { () -> [[String: Any]] in
      RestActionBridge.take()
    }
  }
}
