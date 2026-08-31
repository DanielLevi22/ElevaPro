package com.elevapro.bodyscanpose

import android.graphics.Bitmap
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import kotlin.math.abs
import kotlin.math.atan2

/**
 * O que a foto final contém, medido.
 *
 * Separado do `Fatos.kt` porque é outro trabalho: lá se julga um frame ao vivo
 * para abrir ou fechar o portão; aqui se mede a imagem que vai para a análise.
 *
 * **Tudo sai em pixels e graus, nunca em centímetro.** A conversão exige a
 * altura do aluno, e o aparelho não a conhece de propósito: o portão de
 * elegibilidade responde se ele pode escanear e de onde viria a Escala, nunca
 * quanto, porque a medida é dado de saúde e não deve atravessar a fronteira sem
 * finalidade (Art. 6º, III). Quem divide é o BFF (`ADR-0022`).
 */

/** Índices do BlazePose usados aqui. Os 33 estão documentados pela Google. */
private const val NARIZ = 0
private const val ORELHA_ESQ = 7
private const val OMBRO_ESQ = 11
private const val OMBRO_DIR = 12
private const val QUADRIL_ESQ = 23
private const val QUADRIL_DIR = 24
private const val JOELHO_ESQ = 25
private const val TORNOZELO_ESQ = 27
private const val TORNOZELO_DIR = 28

/** Onde cada largura é lida, em fração da altura do corpo a partir da coroa. */
private const val NIVEL_PESCOCO = 0.13f
private const val NIVEL_PEITO = 0.26f
private const val NIVEL_CINTURA = 0.44f
private const val NIVEL_QUADRIL = 0.53f
private const val NIVEL_COXA = 0.66f
private const val NIVEL_PANTURRILHA = 0.85f

/**
 * A medida de uma foto, em pixels e graus.
 *
 * Campo nulo significa "não deu para medir nesta vista" — na lateral metade do
 * corpo se auto-oclui, e devolver zero fingiria uma medida que não existe.
 */
data class MedidaDaFoto(
  /** Altura do corpo em pixels, da coroa ao contato com o chão. A régua. */
  @Field val alturaPx: Float = 0f,
  @Field val larguraPescocoPx: Float? = null,
  @Field val larguraPeitoPx: Float? = null,
  @Field val larguraCinturaPx: Float? = null,
  @Field val larguraQuadrilPx: Float? = null,
  @Field val larguraCoxaPx: Float? = null,
  @Field val larguraPanturrilhaPx: Float? = null,
  /** Distância entre os ombros pelos landmarks, não pela silhueta. */
  @Field val larguraOmbrosPx: Float? = null,
  /** Quanto um ombro está mais alto que o outro. Positivo: o direito do aluno. */
  @Field val desnivelOmbrosPx: Float? = null,
  @Field val desnivelQuadrilPx: Float? = null,
  /** Inclinação da linha dos ombros contra a horizontal, em graus. */
  @Field val inclinacaoOmbrosGraus: Float? = null,
  @Field val inclinacaoQuadrilGraus: Float? = null,
  /** Desvio do eixo nariz→tornozelos contra a vertical, em pixels. */
  @Field val desvioDoEixoPx: Float? = null,
  /**
   * Diferença de profundidade entre os ombros.
   *
   * Diz se a foto dita frontal era mesmo frontal. Sem isto, tronco rotacionado
   * entra na análise como assimetria corporal.
   */
  @Field val rotacaoDoTronco: Float? = null,
  /**
   * Ângulo craniovertebral: orelha e ombro contra a vertical, em graus.
   *
   * Quantifica anteriorização de cabeça, que hoje o modelo julga no olho. Só na
   * lateral — de frente os dois pontos se sobrepõem e o ângulo não significa nada.
   */
  @Field val anguloCraniovertebralGraus: Float? = null,
  /** Desvio de ombro, quadril e joelho contra a linha de prumo do tornozelo. */
  @Field val prumoOmbroPx: Float? = null,
  @Field val prumoQuadrilPx: Float? = null,
  @Field val prumoJoelhoPx: Float? = null,
) : Record

private fun NormalizedLandmark.visivel(): Float = visibility().orElse(0f)

/** Ângulo de um segmento contra a horizontal, em graus. */
private fun grausContraHorizontal(dx: Float, dy: Float): Float =
  Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()

/** Ângulo de um segmento contra a vertical, em graus. Sempre positivo. */
private fun grausContraVertical(dx: Float, dy: Float): Float =
  abs(Math.toDegrees(atan2(dx.toDouble(), dy.toDouble())).toFloat())

/**
 * Larguras da silhueta nos níveis anatômicos.
 *
 * Lidas por fração do CORPO e não do quadro: assim a cintura continua sendo a
 * cintura quando o aluno se aproxima ou se afasta.
 */
private fun largurasDaSilhueta(
  mascara: FloatArray,
  largura: Int,
  altura: Int,
  coroa: Int,
  chao: Int,
): Map<Float, Float> {
  val alturaCorpo = chao - coroa
  if (alturaCorpo <= 0) return emptyMap()

  val niveis =
    listOf(NIVEL_PESCOCO, NIVEL_PEITO, NIVEL_CINTURA, NIVEL_QUADRIL, NIVEL_COXA, NIVEL_PANTURRILHA)

  return niveis.associateWith { nivel ->
    val linha = (coroa + alturaCorpo * nivel).toInt().coerceIn(0, altura - 1)
    larguraNaLinhaEmPixels(mascara, largura, linha)
  }
}

private fun larguraNaLinhaEmPixels(mascara: FloatArray, largura: Int, linha: Int): Float {
  val base = linha * largura
  var corpo = 0

  for (coluna in 0 until largura) {
    if (mascara[base + coluna] > LIMIAR_MASCARA) corpo++
  }

  return corpo.toFloat()
}

/**
 * Mede a foto.
 *
 * @param resultado saída do Pose Landmarker em modo imagem, com máscara.
 * @param bitmap a foto capturada, já na orientação final.
 * @param dePerfil a pose pedida era lateral? Decide quais medidas fazem sentido.
 *
 * @example
 * val medida = medirFoto(resultado, bitmap, dePerfil = false)
 */
fun medirFoto(
  resultado: PoseLandmarkerResult,
  bitmap: Bitmap,
  dePerfil: Boolean,
): MedidaDaFoto? {
  val marcos = resultado.landmarks().firstOrNull().orEmpty()
  if (marcos.size <= TORNOZELO_DIR) return null

  val mpMascara = resultado.segmentationMasks().orElse(null)?.firstOrNull() ?: return null
  val mascara = lerMascara(mpMascara) ?: return null
  val larguraM = mpMascara.width
  val alturaM = mpMascara.height

  // Mesma varredura que o portão usa ao vivo: uma função, dois consumidores.
  val silhueta = lerSilhueta(mascara, larguraM, alturaM) ?: return null
  val coroa = silhueta.coroaLinha
  val chao = silhueta.chaoLinha

  // A régua sai na escala do BITMAP, não da máscara: é o bitmap que vai para a
  // análise, e misturar as duas resoluções deslocaria toda a conversão.
  val proporcao = bitmap.height.toFloat() / alturaM
  val alturaPx = (chao - coroa) * proporcao

  val larguras = largurasDaSilhueta(mascara, larguraM, alturaM, coroa, chao)
  val emPixels = { nivel: Float -> larguras[nivel]?.times(bitmap.width.toFloat() / larguraM) }

  val ombroEsq = marcos[OMBRO_ESQ]
  val ombroDir = marcos[OMBRO_DIR]
  val quadrilEsq = marcos[QUADRIL_ESQ]
  val quadrilDir = marcos[QUADRIL_DIR]

  val frontal = !dePerfil && minOf(ombroEsq.visivel(), ombroDir.visivel()) > 0.5f

  return MedidaDaFoto(
    alturaPx = alturaPx,
    larguraPescocoPx = emPixels(NIVEL_PESCOCO),
    larguraPeitoPx = emPixels(NIVEL_PEITO),
    larguraCinturaPx = emPixels(NIVEL_CINTURA),
    larguraQuadrilPx = emPixels(NIVEL_QUADRIL),
    larguraCoxaPx = emPixels(NIVEL_COXA),
    larguraPanturrilhaPx = emPixels(NIVEL_PANTURRILHA),
    larguraOmbrosPx =
      if (frontal) abs(ombroEsq.x() - ombroDir.x()) * bitmap.width else null,
    desnivelOmbrosPx = if (frontal) (ombroDir.y() - ombroEsq.y()) * bitmap.height else null,
    desnivelQuadrilPx = if (frontal) (quadrilDir.y() - quadrilEsq.y()) * bitmap.height else null,
    inclinacaoOmbrosGraus =
      if (frontal) {
        grausContraHorizontal(ombroDir.x() - ombroEsq.x(), ombroDir.y() - ombroEsq.y())
      } else {
        null
      },
    inclinacaoQuadrilGraus =
      if (frontal) {
        grausContraHorizontal(quadrilDir.x() - quadrilEsq.x(), quadrilDir.y() - quadrilEsq.y())
      } else {
        null
      },
    desvioDoEixoPx = if (frontal) desvioDoEixo(marcos, bitmap) else null,
    rotacaoDoTronco = if (frontal) ombroEsq.z() - ombroDir.z() else null,
    anguloCraniovertebralGraus = if (dePerfil) craniovertebral(marcos) else null,
    prumoOmbroPx = if (dePerfil) prumo(marcos, OMBRO_ESQ, bitmap) else null,
    prumoQuadrilPx = if (dePerfil) prumo(marcos, QUADRIL_ESQ, bitmap) else null,
    prumoJoelhoPx = if (dePerfil) prumo(marcos, JOELHO_ESQ, bitmap) else null,
  )
}

/** Quanto o nariz sai do eixo vertical que passa entre os tornozelos. */
private fun desvioDoEixo(marcos: List<NormalizedLandmark>, bitmap: Bitmap): Float {
  val meioDosTornozelos = (marcos[TORNOZELO_ESQ].x() + marcos[TORNOZELO_DIR].x()) / 2f

  return (marcos[NARIZ].x() - meioDosTornozelos) * bitmap.width
}

/** Orelha e ombro contra a vertical. Cresce com a cabeça anteriorizada. */
private fun craniovertebral(marcos: List<NormalizedLandmark>): Float? {
  val orelha = marcos[ORELHA_ESQ]
  val ombro = marcos[OMBRO_ESQ]
  if (minOf(orelha.visivel(), ombro.visivel()) < 0.4f) return null

  return grausContraVertical(orelha.x() - ombro.x(), orelha.y() - ombro.y())
}

/** Distância horizontal de um ponto até a vertical que sobe do tornozelo. */
private fun prumo(marcos: List<NormalizedLandmark>, indice: Int, bitmap: Bitmap): Float? {
  val ponto = marcos[indice]
  val tornozelo = marcos[TORNOZELO_ESQ]
  if (minOf(ponto.visivel(), tornozelo.visivel()) < 0.4f) return null

  return (ponto.x() - tornozelo.x()) * bitmap.width
}
