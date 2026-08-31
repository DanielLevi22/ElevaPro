package com.elevapro.bodyscanpose

import android.graphics.Bitmap
import com.google.mediapipe.framework.image.ByteBufferExtractor
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Extrai do resultado do MediaPipe os fatos que o portão julga.
 *
 * Separado da view de propósito: aqui não há câmera, ciclo de vida nem evento —
 * só um resultado e um bitmap entrando, e números saindo. É a parte que se lê
 * para entender o que a feature mede (`ADR-0022`).
 */

/** Índices do BlazePose que este arquivo usa. Os 33 estão documentados pela Google. */
private const val NARIZ = 0
private const val OLHO_ESQ = 2
private const val OLHO_DIR = 5
private const val OMBRO_ESQ = 11
private const val OMBRO_DIR = 12
private const val QUADRIL_ESQ = 23
private const val QUADRIL_DIR = 24

/**
 * Abaixo desta razão ombro-a-ombro / tronco, o corpo está de perfil.
 *
 * De frente a distância entre ombros é a largura real; de lado ela colapsa na
 * projeção. O limiar precisa de calibração em aparelho — este é o ponto de
 * partida, não um número medido.
 */
private const val RAZAO_PERFIL = 0.45f

/** Visibilidade do nariz que separa frente de costas. Ver `detectarVista`. */
private const val NARIZ_VISIVEL = 0.8f
private const val NARIZ_OCULTO = 0.5f

/** Confiança a partir da qual um pixel da máscara conta como corpo. */
private const val LIMIAR_MASCARA = 0.5f

/** Passo da amostragem de luminância. Ler um pixel em cada 8 basta para média. */
private const val PASSO_LUMA = 8

/**
 * O que a visão mede num frame. Nível e vista pedida não moram aqui — não são visão.
 *
 * `Record` e não `Map`: o `EventDispatcher` recusa `Map<String, Any?>`, e metade
 * destes campos é anulável por natureza. Trocar `null` por ausência faria o JS
 * receber `undefined`, e o portão compara com `null` — a checagem passaria calada
 * e a altura viraria `NaN`.
 */
data class FatosDeVisao(
  @Field val visibilidadeMinima: Float = 0f,
  @Field val coroaY: Float? = null,
  @Field val chaoY: Float? = null,
  @Field val vistaDetectada: String? = null,
  @Field val lumaMedia: Float = 0f,
  @Field val contrasteCorpoFundo: Float? = null,
) : Record

private fun NormalizedLandmark.visivel(): Float = visibility().orElse(0f)

/**
 * Frente, costas, lateral — ou `null` quando não dá para decidir.
 *
 * `null` é resposta legítima e não erro: o portão trata "não sei" como "não
 * reprovo", porque reprovar por incerteza manda o aluno girar sem motivo.
 *
 * **Frente e costas são o caso frágil.** O landmarker devolve os mesmos 33
 * pontos nas duas, e o que separa é a visibilidade da face: de costas a Google
 * ainda estima a posição do nariz, só com confiança baixa. Na dúvida devolve
 * `null` em vez de chutar.
 */
private fun detectarVista(marcos: List<NormalizedLandmark>): String? {
  if (marcos.size <= QUADRIL_DIR) return null

  val larguraOmbros = kotlin.math.abs(marcos[OMBRO_ESQ].x() - marcos[OMBRO_DIR].x())
  val meioOmbros = (marcos[OMBRO_ESQ].y() + marcos[OMBRO_DIR].y()) / 2f
  val meioQuadris = (marcos[QUADRIL_ESQ].y() + marcos[QUADRIL_DIR].y()) / 2f
  val tronco = kotlin.math.abs(meioQuadris - meioOmbros)

  if (tronco <= 0f) return null
  if (larguraOmbros / tronco < RAZAO_PERFIL) return "side"

  val face = minOf(marcos[NARIZ].visivel(), marcos[OLHO_ESQ].visivel(), marcos[OLHO_DIR].visivel())
  if (face >= NARIZ_VISIVEL) return "front"
  if (face <= NARIZ_OCULTO) return "back"

  return null
}

/** A máscara como float por pixel, ou `null` quando o formato não é o esperado. */
private fun lerMascara(mascara: MPImage): FloatArray? {
  val buffer: ByteBuffer = ByteBufferExtractor.extract(mascara).order(ByteOrder.nativeOrder())
  val pixels = mascara.width * mascara.height
  if (pixels <= 0) return null

  return when (buffer.capacity() / pixels) {
    // VEC32F1: confiança já em float.
    4 -> FloatArray(pixels) { buffer.asFloatBuffer().get(it) }
    // ALPHA/uint8: confiança de 0 a 255.
    1 -> FloatArray(pixels) { (buffer.get(it).toInt() and 0xFF) / 255f }
    else -> null
  }
}

/** Primeira e última linha da máscara com corpo, em fração da altura. */
private fun coroaEChao(mascara: FloatArray, largura: Int, altura: Int): Pair<Float, Float>? {
  var primeira = -1
  var ultima = -1

  for (linha in 0 until altura) {
    val base = linha * largura
    var temCorpo = false
    for (coluna in 0 until largura) {
      if (mascara[base + coluna] > LIMIAR_MASCARA) {
        temCorpo = true
        break
      }
    }
    if (!temCorpo) continue
    if (primeira < 0) primeira = linha
    ultima = linha
  }

  if (primeira < 0) return null

  return Pair(primeira.toFloat() / altura, (ultima + 1).toFloat() / altura)
}

private fun luma(pixel: Int): Float {
  val r = (pixel shr 16) and 0xFF
  val g = (pixel shr 8) and 0xFF
  val b = pixel and 0xFF

  return (0.299f * r + 0.587f * g + 0.114f * b) / 255f
}

/**
 * Luminância média do frame e a razão entre o corpo e o fundo.
 *
 * A razão é o sinal que importa: contraluz não é frame escuro, é frame com o
 * corpo mais escuro que o fundo. Abaixo de 1 o corpo está mais escuro, e é aí
 * que a silhueta perde largura medível.
 */
private fun medirLuz(
  bitmap: Bitmap,
  mascara: FloatArray?,
  larguraMascara: Int,
  alturaMascara: Int,
): Pair<Float, Float?> {
  var somaTudo = 0f
  var contaTudo = 0
  var somaCorpo = 0f
  var contaCorpo = 0
  var somaFundo = 0f
  var contaFundo = 0

  for (y in 0 until bitmap.height step PASSO_LUMA) {
    for (x in 0 until bitmap.width step PASSO_LUMA) {
      val l = luma(bitmap.getPixel(x, y))
      somaTudo += l
      contaTudo++

      if (mascara == null) continue

      // Mapeado por fração: máscara e bitmap cobrem o mesmo campo, em resoluções
      // diferentes.
      val mx = (x.toFloat() / bitmap.width * larguraMascara).toInt().coerceIn(0, larguraMascara - 1)
      val my = (y.toFloat() / bitmap.height * alturaMascara).toInt().coerceIn(0, alturaMascara - 1)

      if (mascara[my * larguraMascara + mx] > LIMIAR_MASCARA) {
        somaCorpo += l
        contaCorpo++
      } else {
        somaFundo += l
        contaFundo++
      }
    }
  }

  val media = if (contaTudo > 0) somaTudo / contaTudo else 0f
  if (contaCorpo == 0 || contaFundo == 0) return Pair(media, null)

  val fundo = somaFundo / contaFundo
  if (fundo <= 0f) return Pair(media, null)

  return Pair(media, (somaCorpo / contaCorpo) / fundo)
}

/**
 * Os fatos de um frame.
 *
 * @param resultado saída do Pose Landmarker, com a máscara ligada.
 * @param bitmap o mesmo frame já rotacionado para cima, de onde sai a luz.
 *
 * @example
 * val fatos = extrairFatos(resultado, bitmap)
 * onFatos(fatos)
 */
fun extrairFatos(resultado: PoseLandmarkerResult, bitmap: Bitmap): FatosDeVisao {
  val marcos = resultado.landmarks().firstOrNull().orEmpty()
  val visibilidade = marcos.minOfOrNull { it.visivel() } ?: 0f

  val mpMascara = resultado.segmentationMasks().orElse(null)?.firstOrNull()
  val mascara = mpMascara?.let { lerMascara(it) }
  val larguraM = mpMascara?.width ?: 0
  val alturaM = mpMascara?.height ?: 0

  val extremos =
    if (mascara != null && larguraM > 0 && alturaM > 0) {
      coroaEChao(mascara, larguraM, alturaM)
    } else {
      null
    }

  val (lumaMedia, contraste) = medirLuz(bitmap, mascara, larguraM, alturaM)

  return FatosDeVisao(
    visibilidadeMinima = visibilidade,
    coroaY = extremos?.first,
    chaoY = extremos?.second,
    vistaDetectada = if (marcos.isEmpty()) null else detectarVista(marcos),
    lumaMedia = lumaMedia,
    contrasteCorpoFundo = contraste,
  )
}
