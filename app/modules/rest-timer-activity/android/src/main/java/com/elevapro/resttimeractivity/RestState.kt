package com.elevapro.resttimeractivity

import org.json.JSONObject

/** O descanso na notificação. Tempo de parede em milissegundos, como o JS manda. */
data class RestState(
  val title: String,
  val subtitle: String,
  val endsAt: Long,
  val totalSeconds: Long,
  val pausedRemaining: Long?,
  val doneTitle: String,
  val addLabel: String,
  val skipLabel: String,
) {
  /** Segundos que faltam agora; parado no valor da pausa. */
  fun remainingSeconds(now: Long): Long =
    pausedRemaining ?: maxOf(0L, (endsAt - now + 999) / 1000)

  fun isDone(now: Long): Boolean = pausedRemaining == null && now >= endsAt

  /**
   * A mesma conta de `ajustarDescanso` na sessão: soma ao que falta, e a
   * duração só cresce, para a barra não andar para trás.
   */
  fun adding(seconds: Long, now: Long): RestState {
    val remaining = remainingSeconds(now) + seconds
    return copy(
      endsAt = now + remaining * 1000,
      totalSeconds = maxOf(totalSeconds, remaining),
      pausedRemaining = pausedRemaining?.let { remaining },
    )
  }

  fun toJson(): String = JSONObject()
    .put("title", title)
    .put("subtitle", subtitle)
    .put("endsAt", endsAt)
    .put("totalSeconds", totalSeconds)
    .put("pausedRemaining", pausedRemaining ?: JSONObject.NULL)
    .put("doneTitle", doneTitle)
    .put("addLabel", addLabel)
    .put("skipLabel", skipLabel)
    .toString()

  companion object {
    fun fromJson(raw: String): RestState {
      val json = JSONObject(raw)
      return RestState(
        title = json.getString("title"),
        subtitle = json.getString("subtitle"),
        endsAt = json.getLong("endsAt"),
        totalSeconds = json.getLong("totalSeconds"),
        pausedRemaining = if (json.isNull("pausedRemaining")) null else json.getLong("pausedRemaining"),
        doneTitle = json.getString("doneTitle"),
        addLabel = json.getString("addLabel"),
        skipLabel = json.getString("skipLabel"),
      )
    }
  }
}
