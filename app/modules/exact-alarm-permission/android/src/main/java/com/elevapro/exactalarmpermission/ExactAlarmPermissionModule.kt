package com.elevapro.exactalarmpermission

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * A permissão especial que falta ao `expo-notifications`.
 *
 * Em Android 12+ (API 31), `AlarmManagerCompat.setExactAndAllowWhileIdle` só
 * dispara na hora certa se o app tiver "Alarmes e lembretes" concedido em
 * runtime — não basta declarar `SCHEDULE_EXACT_ALARM` no manifest. Sem ela, o
 * `expo-notifications` recua para `setAndAllowWhileIdle` (ver
 * `ExpoSchedulingDelegate.kt` da própria lib) e o Doze atrasa a entrega — o
 * bug relatado na #336. O `expo-notifications` não expõe checagem nem pedido
 * dessa permissão para o JS; este módulo existe só para isso.
 */
class ExactAlarmPermissionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExactAlarmPermission")

    Function("isGranted") {
      isGranted()
    }

    Function("openSettings") {
      openSettings()
    }
  }

  private fun isGranted(): Boolean {
    // Antes da API 31 o alarme exato não pede permissão nenhuma.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true

    val context = appContext.reactContext ?: return true
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarmManager.canScheduleExactAlarms()
  }

  private fun openSettings() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val context = appContext.reactContext ?: return

    val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
      data = Uri.fromParts("package", context.packageName, null)
      // Sem Activity de origem (pode ser chamado fora de uma tela em foco).
      flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }
    context.startActivity(intent)
  }
}
