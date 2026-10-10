package com.elevapro.resttimeractivity

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews

/**
 * A notificação fixa do descanso (desenho 6c): exercício, tempo regressivo,
 * próxima série, barra e os botões "+15 s" e "Pular".
 *
 * O número conta sozinho (`Chronometer`); a barra não tem modo de tempo, então
 * um tique de um segundo a redesenha enquanto o descanso corre. No fim, o
 * título chama para a próxima série.
 */
object RestTimerNotification {
  private const val CHANNEL_ID = "rest-timer"
  private const val NOTIFICATION_ID = 4815
  private const val PROGRESS_MAX = 1000
  private const val TICK_MS = 1000L

  private val handler = Handler(Looper.getMainLooper())
  private var ticking: Runnable? = null

  fun show(context: Context, state: RestState) {
    val app = context.applicationContext
    RestActionStore.saveState(app, state)
    notify(app, state)
    scheduleTick(app, state)
  }

  fun end(context: Context) {
    val app = context.applicationContext
    stopTick()
    RestActionStore.saveState(app, null)
    manager(app).cancel(NOTIFICATION_ID)
  }

  private fun notify(context: Context, state: RestState) {
    ensureChannel(context)
    val now = System.currentTimeMillis()
    val notification = Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.rest_timer_icon)
      .setStyle(Notification.DecoratedCustomViewStyle())
      .setCustomContentView(views(context, state, now, R.layout.rest_timer_collapsed))
      .setCustomBigContentView(views(context, state, now, R.layout.rest_timer_expanded))
      .setContentIntent(openApp(context))
      .setCategory(Notification.CATEGORY_PROGRESS)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .build()
    manager(context).notify(NOTIFICATION_ID, notification)
  }

  private fun views(context: Context, state: RestState, now: Long, layout: Int): RemoteViews {
    val views = RemoteViews(context.packageName, layout)
    val done = state.isDone(now)
    val remaining = state.remainingSeconds(now)
    views.setTextViewText(R.id.rest_title, if (done) state.doneTitle else state.title)
    views.setTextViewText(R.id.rest_subtitle, state.subtitle)
    views.setChronometer(
      R.id.rest_timer,
      SystemClock.elapsedRealtime() + remaining * 1000,
      null,
      state.pausedRemaining == null && !done,
    )
    views.setChronometerCountDown(R.id.rest_timer, true)
    views.setViewVisibility(R.id.rest_timer, if (done) View.GONE else View.VISIBLE)
    val elapsed = (state.totalSeconds - remaining).coerceAtLeast(0)
    val progress = if (done) PROGRESS_MAX else (elapsed * PROGRESS_MAX / maxOf(1, state.totalSeconds)).toInt()
    views.setProgressBar(R.id.rest_progress, PROGRESS_MAX, progress, false)
    if (layout == R.layout.rest_timer_expanded) {
      views.setTextViewText(R.id.rest_add, state.addLabel)
      views.setTextViewText(R.id.rest_skip, state.skipLabel)
      views.setOnClickPendingIntent(R.id.rest_add, action(context, RestActionStore.ADD_TIME))
      views.setOnClickPendingIntent(R.id.rest_skip, action(context, RestActionStore.SKIP))
    }
    return views
  }

  /** Redesenha a barra a cada segundo enquanto o descanso corre, e uma vez no fim. */
  private fun scheduleTick(context: Context, state: RestState) {
    stopTick()
    if (state.pausedRemaining != null) return
    val tick = object : Runnable {
      override fun run() {
        val current = RestActionStore.loadState(context) ?: return
        notify(context, current)
        if (!current.isDone(System.currentTimeMillis())) handler.postDelayed(this, TICK_MS)
      }
    }
    ticking = tick
    handler.postDelayed(tick, TICK_MS)
  }

  private fun stopTick() {
    ticking?.let(handler::removeCallbacks)
    ticking = null
  }

  private fun action(context: Context, type: String): PendingIntent {
    val intent = Intent(context, RestActionReceiver::class.java).setAction(type)
    return PendingIntent.getBroadcast(
      context,
      type.hashCode(),
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  private fun openApp(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    launch.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    return PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_IMMUTABLE)
  }

  /** Importância baixa: a notificação muda a cada segundo e não pode tocar a cada vez. */
  private fun ensureChannel(context: Context) {
    val channel = NotificationChannel(
      CHANNEL_ID,
      context.getString(R.string.rest_timer_channel),
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setShowBadge(false)
    }
    manager(context).createNotificationChannel(channel)
  }

  private fun manager(context: Context) =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
}
