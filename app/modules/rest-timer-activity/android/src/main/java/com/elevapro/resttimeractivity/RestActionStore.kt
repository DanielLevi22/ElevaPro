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
  /** O alarme do fim do descanso; não é toque da pessoa e não vai para a sessão. */
  const val DONE = "done"

  private const val PREFS = "elevapro_rest_timer"
  private const val STATE = "state"
  private const val PENDING = "pending"
  private const val ALERTED_FOR = "alerted_for"

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

  /**
   * Marca que o fim deste descanso já alertou. O tique e o alarme chegam os
   * dois ao fim: sem a marca, o aparelho tocaria duas vezes.
   *
   * @return `true` só na primeira vez para este fim.
   */
  @Synchronized
  fun claimAlert(context: Context, endsAt: Long): Boolean {
    if (prefs(context).getLong(ALERTED_FOR, 0L) == endsAt) return false
    prefs(context).edit().putLong(ALERTED_FOR, endsAt).apply()
    return true
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
