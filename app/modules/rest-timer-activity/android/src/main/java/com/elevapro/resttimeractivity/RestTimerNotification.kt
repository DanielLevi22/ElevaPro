package com.elevapro.resttimeractivity

import android.app.ActivityManager
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
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
  /**
   * O canal do tempo correndo. Era `rest-timer`, de importância baixa: o
   * sistema o põe em "Silenciosas", que o Android 13+ esconde da tela
   * bloqueada por padrão — o cartão sumia justamente de onde ele existe. A
   * importância de um canal criado não muda, por isso o id novo.
   */
  private const val CHANNEL_ID = "rest-timer-running"
  private const val OLD_CHANNEL_ID = "rest-timer"
  /** O fim do descanso alerta: som e vibração, e o mesmo cartão sobe na tela. */
  private const val DONE_CHANNEL_ID = "rest-timer-done"
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
    scheduleDone(app, state)
  }

  fun end(context: Context) {
    val app = context.applicationContext
    stopTick()
    cancelDone(app)
    RestActionStore.saveState(app, null)
    manager(app).cancel(NOTIFICATION_ID)
  }

  /**
   * O fim do descanso: o cartão vira "Hora da série N". Com o app fora da
   * tela, o mesmo cartão alerta, com som e vibração; com o app aberto, a
   * sessão já avisa, e alertar de novo seria duplicar.
   */
  fun finish(context: Context, state: RestState) {
    val app = context.applicationContext
    if (!state.isDone(System.currentTimeMillis())) return
    if (!RestActionStore.claimAlert(app, state.endsAt)) return
    notify(app, state, alert = !appInForeground())
  }

  private fun notify(context: Context, state: RestState, alert: Boolean = false) {
    ensureChannels(context)
    val now = System.currentTimeMillis()
    val notification = Notification.Builder(context, if (alert) DONE_CHANNEL_ID else CHANNEL_ID)
      .setSmallIcon(R.drawable.rest_timer_icon)
      .setStyle(Notification.DecoratedCustomViewStyle())
      .setCustomContentView(views(context, state, now, R.layout.rest_timer_collapsed))
      .setCustomBigContentView(views(context, state, now, R.layout.rest_timer_expanded))
      .setContentIntent(openApp(context))
      .setCategory(Notification.CATEGORY_PROGRESS)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setOnlyAlertOnce(!alert)
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
      views.setTextViewText(R.id.rest_add_label, state.addLabel)
      views.setTextViewText(R.id.rest_skip_label, state.skipLabel)
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
        if (current.isDone(System.currentTimeMillis())) return finish(context, current)
        notify(context, current)
        handler.postDelayed(this, TICK_MS)
      }
    }
    ticking = tick
    handler.postDelayed(tick, TICK_MS)
  }

  private fun stopTick() {
    ticking?.let(handler::removeCallbacks)
    ticking = null
  }

  /**
   * O alarme do fim, para quando o processo está congelado e o tique não roda.
   * Sem "Alarmes e lembretes" concedido, o alarme é inexato e pode atrasar; o
   * tique ainda alerta na hora enquanto o processo vive.
   */
  private fun scheduleDone(context: Context, state: RestState) {
    cancelDone(context)
    if (state.pausedRemaining != null) return
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val done = action(context, RestActionStore.DONE)
    val exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()
    if (exact) {
      alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, state.endsAt, done)
    } else {
      alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, state.endsAt, done)
    }
  }

  private fun cancelDone(context: Context) {
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarms.cancel(action(context, RestActionStore.DONE))
  }

  private fun appInForeground(): Boolean {
    val info = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(info)
    return info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
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

  /**
   * Dois canais: o do tempo correndo, sem som, porque muda a cada segundo e não
   * pode tocar a cada vez; e o do fim, alto, que toca e sobe na tela.
   */
  private fun ensureChannels(context: Context) {
    // Importância normal para aparecer na tela bloqueada, mas sem som nem
    // vibração: o tempo muda a cada segundo e não pode tocar a cada vez.
    val running = NotificationChannel(
      CHANNEL_ID,
      context.getString(R.string.rest_timer_channel),
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
    }
    manager(context).deleteNotificationChannel(OLD_CHANNEL_ID)
    val done = NotificationChannel(
      DONE_CHANNEL_ID,
      context.getString(R.string.rest_timer_done_channel),
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      enableVibration(true)
      setShowBadge(false)
    }
    manager(context).createNotificationChannels(listOf(running, done))
  }

  private fun manager(context: Context) =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
}
