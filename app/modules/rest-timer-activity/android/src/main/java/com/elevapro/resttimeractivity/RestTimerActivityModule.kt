package com.elevapro.resttimeractivity

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** O descanso como o JavaScript manda: tempo em milissegundos desde a época. */
class RestRecord : Record {
  @Field val title: String = ""
  @Field val subtitle: String = ""
  @Field val endsAt: Double = 0.0
  @Field val totalSeconds: Double = 0.0
  @Field val pausedRemaining: Double? = null
  @Field val doneTitle: String = ""
  @Field val addLabel: String = ""
  @Field val skipLabel: String = ""

  fun toState() = RestState(
    title = title,
    subtitle = subtitle,
    endsAt = endsAt.toLong(),
    totalSeconds = totalSeconds.toLong(),
    pausedRemaining = pausedRemaining?.toLong(),
    doneTitle = doneTitle,
    addLabel = addLabel,
    skipLabel = skipLabel,
  )
}

/** Ponte do descanso na tela bloqueada: a notificação fixa do Android. */
class RestTimerActivityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RestTimerActivity")

    Events("onAction")

    OnStartObserving {
      RestActionStore.listener = { sendEvent("onAction", emptyMap<String, Any>()) }
    }

    OnStopObserving {
      RestActionStore.listener = null
    }

    AsyncFunction("show") { rest: RestRecord ->
      RestTimerNotification.show(context(), rest.toState())
    }

    AsyncFunction("end") {
      RestTimerNotification.end(context())
    }

    Function("takeActions") {
      RestActionStore.take(context())
    }
  }

  private fun context(): Context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
}
