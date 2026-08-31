package com.elevapro.bodyscanpose

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * A preview de captura do Body scan.
 *
 * Superfície pequena de propósito: uma view, dois eventos, uma prop e uma
 * função. Todo o comportamento — pose, máscara, medida, cadência — fica atrás
 * dela, e nenhum frame de amostragem cruza a ponte para o JavaScript
 * (`ADR-0022`).
 */
class BodyScanPoseModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BodyScanPose")

    View(BodyScanPoseView::class) {
      Events("onFatos", "onEstado")

      Prop("lenteFrontal") { view: BodyScanPoseView, valor: Boolean ->
        view.lenteFrontal = valor
      }

      AsyncFunction("capturar") { view: BodyScanPoseView, promessa: Promise ->
        view.capturar(promessa)
      }
    }
  }
}
