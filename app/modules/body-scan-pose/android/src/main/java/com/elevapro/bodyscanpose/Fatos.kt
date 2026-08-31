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

/** Confiança a partir da qual um pixel da máscara conta como corpo. */
internal const val LIMIAR_MASCARA = 0.5f

/**
 * Fração mínima da largura que uma linha precisa ter de corpo para contar.
 *
 * Um pixel solto não é cabeça. Com a regra de "qualquer pixel", ruído no topo e
 * na base do quadro definia coroa e chão — e a conversão px/cm passava a
 * depender de artefato. Uma linha de verdade tem uma faixa contínua.
 */
private const val COBERTURA_MINIMA_DA_LINHA = 0.02f

/**
 * Landmarks que dizem se o corpo inteiro está no quadro.
 *
 * O mínimo entre os 33 é severo demais: uma orelha ocluída zera a medida. Estes
 * são os extremos do corpo — se todos aparecem, o corpo aparece.
 */
private val EXTREMOS = intArrayOf(0, 11, 12, 23, 24, 27, 28)

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
  /**
   * Fração da máscara que é corpo.
   *
   * Nasceu como diagnóstico — para saber se a máscara vinha saturada — e virou
   * estrutural: é ela que separa "não tem ninguém" de "tem alguém mal
   * enquadrado". Perto demais, a visibilidade dos landmarks despenca porque
   * cabeça e pés saem do quadro, e sem este número o portão dizia "não estou te
   * vendo" para quem ocupava dois terços da tela.
   */
  @Field val cobertura: Float = 0f,
  /** Centro horizontal do corpo, em fração da largura; `null` sem silhueta. */
  @Field val centroX: Float? = null,
  /** Largura na altura dos ombros, em fração da largura do quadro. */
  @Field val larguraOmbros: Float? = null,
  /** Largura na altura do quadril, mesma escala. */
  @Field val larguraQuadril: Float? = null,
  /**
   * O aluno está virado para a direita da imagem? `null` quando não dá para
   * dizer.
   *
   * Só faz sentido de perfil, e é o que permite traduzir "ande para a direita
   * da imagem" em "dê um passo à frente" ou "para trás" — de lado, o eixo
   * horizontal do quadro é o eixo frente-costas do corpo.
   */
  @Field val viradoParaDireita: Boolean? = null,
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
 * **Frente e costas saem da ORDEM dos ombros, não da face.** A MediaPipe
 * rotula ombro esquerdo e direito anatomicamente: de frente para a câmera, o
 * ombro esquerdo do aluno aparece à direita da imagem; de costas, à esquerda. A
 * inversão é geométrica e não depende de o rosto estar visível — que era a
 * fragilidade da versão anterior, baseada na visibilidade do nariz.
 */
private fun detectarVista(marcos: List<NormalizedLandmark>): String? {
  if (marcos.size <= QUADRIL_DIR) return null

  val larguraOmbros = kotlin.math.abs(marcos[OMBRO_ESQ].x() - marcos[OMBRO_DIR].x())
  val meioOmbros = (marcos[OMBRO_ESQ].y() + marcos[OMBRO_DIR].y()) / 2f
  val meioQuadris = (marcos[QUADRIL_ESQ].y() + marcos[QUADRIL_DIR].y()) / 2f
  val tronco = kotlin.math.abs(meioQuadris - meioOmbros)

  if (tronco <= 0f) return null
  if (larguraOmbros / tronco < RAZAO_PERFIL) return "side"

  return if (marcos[OMBRO_ESQ].x() > marcos[OMBRO_DIR].x()) "front" else "back"
}

/**
 * Para que lado da imagem o aluno olha, pelo nariz em relação aos ombros.
 *
 * De frente ou de costas o nariz fica sobre o meio dos ombros e a resposta não
 * significa nada — por isso só é consultado no perfil.
 */
private fun viradoParaDireita(marcos: List<NormalizedLandmark>): Boolean? {
  if (marcos.size <= OMBRO_DIR) return null

  val meioDosOmbros = (marcos[OMBRO_ESQ].x() + marcos[OMBRO_DIR].x()) / 2f
  val desvioDoNariz = marcos[NARIZ].x() - meioDosOmbros

  if (kotlin.math.abs(desvioDoNariz) < 0.02f) return null

  return desvioDoNariz > 0
}

/** A máscara como float por pixel, ou `null` quando o formato não é o esperado. */
internal fun lerMascara(mascara: MPImage): FloatArray? {
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

/** O que uma única varredura da máscara devolve. */
internal data class Silhueta(
  /** Primeira e última linha com corpo, em índice. A medida da foto precisa delas. */
  val coroaLinha: Int,
  val chaoLinha: Int,
  val coroaY: Float,
  val chaoY: Float,
  val centroX: Float,
  val cobertura: Float,
  /** Largura do corpo na altura dos ombros, em fração da largura do quadro. */
  val larguraOmbros: Float,
  /** Largura na altura do quadril, mesma escala. */
  val larguraQuadril: Float,
)

/**
 * Coroa, chão, centro e cobertura — numa passada só.
 *
 * Eram três varreduras separadas, e a máscara é o objeto mais caro de percorrer
 * no passe: separá-las triplicava o custo sem separar responsabilidade nenhuma,
 * porque as quatro respostas saem do mesmo laço.
 *
 * Uma linha só conta como corpo se tiver uma faixa mínima: um pixel solto não é
 * cabeça, e com a regra de "qualquer pixel" o ruído definia coroa e chão.
 */
internal fun lerSilhueta(mascara: FloatArray, largura: Int, altura: Int): Silhueta? {
  val minimoPorLinha = maxOf(1, (largura * COBERTURA_MINIMA_DA_LINHA).toInt())
  var primeira = -1
  var ultima = -1
  var somaColunas = 0L
  var total = 0

  for (linha in 0 until altura) {
    val base = linha * largura
    var corpoNaLinha = 0
    var somaNaLinha = 0L

    for (coluna in 0 until largura) {
      if (mascara[base + coluna] > LIMIAR_MASCARA) {
        corpoNaLinha++
        somaNaLinha += coluna
      }
    }

    if (corpoNaLinha < minimoPorLinha) continue

    if (primeira < 0) primeira = linha
    ultima = linha
    somaColunas += somaNaLinha
    total += corpoNaLinha
  }

  if (primeira < 0 || total == 0) return null

  // Frações do corpo, não do quadro: ombro fica a ~20% da cabeça para baixo,
  // quadril a ~55%. Medir por fração do corpo faz a largura continuar certa
  // quando a pessoa se aproxima ou se afasta.
  val alturaCorpo = ultima - primeira
  val linhaOmbros = primeira + (alturaCorpo * 0.20f).toInt()
  val linhaQuadril = primeira + (alturaCorpo * 0.55f).toInt()

  return Silhueta(
    coroaLinha = primeira,
    chaoLinha = ultima,
    coroaY = primeira.toFloat() / altura,
    chaoY = (ultima + 1).toFloat() / altura,
    centroX = (somaColunas.toFloat() / total) / largura,
    cobertura = total.toFloat() / mascara.size,
    larguraOmbros = larguraNaLinha(mascara, largura, linhaOmbros),
    larguraQuadril = larguraNaLinha(mascara, largura, linhaQuadril),
  )
}

/** Quantos pixels de corpo numa linha, em fração da largura do quadro. */
private fun larguraNaLinha(mascara: FloatArray, largura: Int, linha: Int): Float {
  val base = linha * largura
  var corpo = 0

  for (coluna in 0 until largura) {
    if (mascara[base + coluna] > LIMIAR_MASCARA) corpo++
  }

  return corpo.toFloat() / largura
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

  // Leitura em bloco: `getPixel` um a um dominava o custo do passe.
  val linha = IntArray(bitmap.width)

  for (y in 0 until bitmap.height step PASSO_LUMA) {
    bitmap.getPixels(linha, 0, bitmap.width, 0, y, bitmap.width, 1)
    for (x in 0 until bitmap.width step PASSO_LUMA) {
      val l = luma(linha[x])
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
  val visibilidade =
    if (marcos.size > EXTREMOS.max()) EXTREMOS.minOf { marcos[it].visivel() } else 0f

  val mpMascara = resultado.segmentationMasks().orElse(null)?.firstOrNull()
  val mascara = mpMascara?.let { lerMascara(it) }
  val larguraM = mpMascara?.width ?: 0
  val alturaM = mpMascara?.height ?: 0

  val silhueta =
    if (mascara != null && larguraM > 0 && alturaM > 0) {
      lerSilhueta(mascara, larguraM, alturaM)
    } else {
      null
    }

  val (lumaMedia, contraste) = medirLuz(bitmap, mascara, larguraM, alturaM)

  return FatosDeVisao(
    visibilidadeMinima = visibilidade,
    cobertura = silhueta?.cobertura ?: 0f,
    centroX = silhueta?.centroX,
    larguraOmbros = silhueta?.larguraOmbros,
    larguraQuadril = silhueta?.larguraQuadril,
    viradoParaDireita = if (marcos.isEmpty()) null else viradoParaDireita(marcos),
    coroaY = silhueta?.coroaY,
    chaoY = silhueta?.chaoY,
    vistaDetectada = if (marcos.isEmpty()) null else detectarVista(marcos),
    lumaMedia = lumaMedia,
    contrasteCorpoFundo = contraste,
  )
}
