package com.elevapro.techniquespike

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Spike descartável da issue #194. **Não é a feature.**
 *
 * Responde uma pergunta só: quanto custa um passe do PoseLandmarker sem máscara
 * de segmentação e com delegate de GPU, sustentado por minutos, num Android
 * real. Não tem regra, não tem contagem de repetição, não tem voz, não tem
 * consentimento — nada que se pareça com Análise de Técnica.
 *
 * Apagar depois de medir, como o `pose-spike` do `ADR-0022` foi apagado.
 */
class TechniqueSpikeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TechniqueSpike")

    View(TechniqueSpikeView::class) { Events("onMedida", "onPose", "onEstado") }
  }
}
