package com.elevapro.resttimeractivity

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * O toque em "+15 s" ou "Pular". Age na notificação na hora, mesmo com o JS
 * parado, e guarda o toque para a sessão reaplicar com o instante dele.
 */
class RestActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val type = intent.action ?: return
    val now = System.currentTimeMillis()
    val state = RestActionStore.loadState(context) ?: return
    if (type == RestActionStore.DONE) return RestTimerNotification.finish(context, state)

    when (type) {
      RestActionStore.ADD_TIME -> RestTimerNotification.show(
        context,
        state.adding(ADD_SECONDS, now),
      )
      RestActionStore.SKIP -> RestTimerNotification.end(context)
      else -> return
    }
    RestActionStore.record(context, type, now)
  }

  companion object {
    const val ADD_SECONDS = 15L
  }
}
