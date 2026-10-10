package com.elevapro.resttimeractivity

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * O descanso em exibição e os toques que a sessão ainda não leu.
 *
 * Fica em `SharedPreferences`, e não só em memória: o botão da notificação pode
 * chegar com o processo recriado, e precisa saber quanto faltava.
 */
object RestActionStore {
  const val ADD_TIME = "add_time"
  const val SKIP = "skip"

  private const val PREFS = "elevapro_rest_timer"
  private const val STATE = "state"
  private const val PENDING = "pending"

  /** Avisa o módulo que há toque novo; nulo quando o JS não está ouvindo. */
  @Volatile var listener: (() -> Unit)? = null

  fun saveState(context: Context, state: RestState?) {
    prefs(context).edit().apply {
      if (state == null) remove(STATE) else putString(STATE, state.toJson())
    }.apply()
  }

  fun loadState(context: Context): RestState? =
    prefs(context).getString(STATE, null)?.let(RestState::fromJson)

  @Synchronized
  fun record(context: Context, type: String, at: Long) {
    val pending = JSONArray(prefs(context).getString(PENDING, "[]"))
    pending.put(JSONObject().put("type", type).put("at", at))
    prefs(context).edit().putString(PENDING, pending.toString()).apply()
    listener?.invoke()
  }

  /** Devolve os toques guardados e esvazia a fila. */
  @Synchronized
  fun take(context: Context): List<Map<String, Any>> {
    val pending = JSONArray(prefs(context).getString(PENDING, "[]"))
    prefs(context).edit().remove(PENDING).apply()
    return (0 until pending.length()).map { index ->
      val action = pending.getJSONObject(index)
      mapOf("type" to action.getString("type"), "at" to action.getLong("at").toDouble())
    }
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
