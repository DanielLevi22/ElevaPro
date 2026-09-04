package com.elevapro.techniquespike

import android.content.Context
import android.graphics.Bitmap
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.view.ViewGroup
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.File
import java.net.URL
import java.nio.ByteBuffer
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/**
 * Medidor de passe. Nenhum frame é gravado e nenhum frame sai do aparelho.
 *
 * A diferença que este spike existe para medir, contra o `body-scan-pose`:
 * máscara desligada, delegate de GPU, e **sem intervalo** — todo frame que a
 * câmera entrega é analisado, porque o que se quer saber é o teto.
 */
private const val MODELO_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

/** Mesmo nome de arquivo do `body-scan-pose`: reaproveita o cache, não rebaixa 5 MB. */
private const val MODELO_ARQUIVO = "pose_landmarker_lite.task"

/** De quanto em quanto tempo o resumo sobe para o JS. */
private const val JANELA_MS = 1_000L

/** Quantos passes entram no cálculo de percentil. ~10s de janela a 30fps. */
private const val AMOSTRAS = 300

private const val QUADRIL_ESQ = 23
private const val JOELHO_ESQ = 25
private const val TORNOZELO_ESQ = 27

/**
 * O resumo de uma janela.
 *
 * `comCorpo` é o campo que decide se o resto vale alguma coisa. O spike anterior
 * (`ADR-0022`) mediu latência bonita contra imagem vazia: o detector rejeitou o
 * frame, o estágio de landmark nunca rodou, e o número não respondia nada. Aqui
 * a fração de passes com 33 landmarks vem junto do percentil, de propósito —
 * `p95` com `comCorpo` em zero é medida do detector recusando, não do trabalho.
 */
class Medida : Record {
  @Field var passes: Int = 0
  @Field var comCorpo: Int = 0
  @Field var fps: Double = 0.0
  @Field var p50: Long = 0
  @Field var p95: Long = 0
  @Field var delegate: String = ""
  @Field var termico: String = ""

  /** Só para conferir a olho que o corpo certo está sendo lido. Não é a feature. */
  @Field var quadrilY: Double? = null
  @Field var joelhoY: Double? = null
  @Field var tornozeloY: Double? = null
}

/**
 * Um landmark do BlazePose, em coordenada normalizada de 0 a 1.
 *
 * O nome dos campos é o mesmo de `LandmarkNormalizado` em
 * `shared/src/technique/fatos.ts`, de propósito: assim o que sobe do nativo
 * entra no julgador sem tradução, e não há camada onde trocar x por y.
 */
class Ponto : Record {
  @Field var x: Double = 0.0
  @Field var y: Double = 0.0
  @Field var visibility: Double = 0.0
}

/**
 * Os 33 landmarks de um quadro.
 *
 * Sobe como lista de registros, e não como vetor achatado de 99 números, porque
 * é a forma que o julgador já consome. Achatar economizaria serialização e
 * criaria um passo de desempacotamento — exatamente o tipo de tradução que a
 * `gravacao.ts` argumenta que não deve existir. Se a ponte virar gargalo, a
 * mudança vem com o número medido junto, como manda o `ADR-0022`.
 *
 * `pontos` vazio é informação, não ausência de evento: significa que o passe
 * rodou e o modelo não achou ninguém. Sem isso, "não vejo você" e "o pipeline
 * parou" chegariam ao JS como a mesma coisa — o silêncio.
 */
class Pose : Record {
  @Field var pontos: List<Ponto> = emptyList()
  /** O mesmo carimbo do passe, para o JS descartar resultado fora de ordem. */
  @Field var carimbo: Long = 0
}

class TechniqueSpikeView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {

  private val onMedida by EventDispatcher<Medida>()
  private val onPose by EventDispatcher<Pose>()
  private val onEstado by EventDispatcher()

  private val previewView = PreviewView(context)
  private val principal = Handler(Looper.getMainLooper())
  private val trabalho = Executors.newSingleThreadExecutor()
  private val analise = Executors.newSingleThreadExecutor()

  private var landmarker: PoseLandmarker? = null
  private var delegateEmUso = "?"

  /** Início de cada passe, para descontar na chegada do resultado. */
  private val emVoo = ConcurrentHashMap<Long, Long>()

  private val duracoes = ArrayDeque<Long>()
  private val passesDaJanela = AtomicInteger(0)
  private val corposDaJanela = AtomicInteger(0)
  private var inicioDaJanela = 0L
  private var carimbo = 0L

  private var ultimoQuadril: Double? = null
  private var ultimoJoelho: Double? = null
  private var ultimoTornozelo: Double? = null

  init {
    previewView.layoutParams =
      ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    // Mesma razão do `body-scan-pose`: SurfaceView não compõe com a hierarquia
    // do React Native e derruba preview e análise juntos.
    previewView.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    addView(previewView)
    estado("preparando")
    trabalho.execute { prepararModelo() }
  }

  private fun estado(texto: String) {
    principal.post { onEstado(mapOf("estado" to texto)) }
  }

  /**
   * Cria o landmarker, preferindo GPU e caindo para CPU sem falhar.
   *
   * Qual delegate rodou vai junto de toda medida: o número sozinho não
   * significa nada se ninguém souber se a GPU aceitou o modelo.
   */
  private fun prepararModelo() {
    try {
      val arquivo = File(context.cacheDir, MODELO_ARQUIVO)
      if (!arquivo.exists() || arquivo.length() < 1_000_000) {
        URL(MODELO_URL).openStream().use { entrada ->
          arquivo.outputStream().use { saida -> entrada.copyTo(saida) }
        }
      }

      val bytes = arquivo.readBytes()

      landmarker = criar(bytes, Delegate.GPU) ?: criar(bytes, Delegate.CPU)

      if (landmarker == null) {
        estado("falhou: nem GPU nem CPU aceitaram o modelo")
        return
      }

      principal.post { abrirCamera() }
    } catch (e: Exception) {
      estado("falhou: ${e.message}")
    }
  }

  private fun criar(bytes: ByteArray, delegate: Delegate): PoseLandmarker? =
    try {
      val buffer = ByteBuffer.allocateDirect(bytes.size).put(bytes)
      buffer.rewind()

      val criado =
        PoseLandmarker.createFromOptions(
          context,
          PoseLandmarker.PoseLandmarkerOptions.builder()
            .setBaseOptions(
              BaseOptions.builder().setModelAssetBuffer(buffer).setDelegate(delegate).build()
            )
            .setRunningMode(RunningMode.LIVE_STREAM)
            // A máscara fica DESLIGADA. É a diferença que este spike mede: o
            // `ADR-0022` registra que ela é metade do custo do passe, e aqui
            // ela não compra nada — não precisamos da coroa da cabeça.
            .setNumPoses(1)
            .setResultListener { resultado, _ -> aoResultado(resultado) }
            .setErrorListener { erro -> estado("erro: ${erro.message}") }
            .build(),
        )

      delegateEmUso = delegate.name
      criado
    } catch (e: Exception) {
      // GPU indisponível não é falha: é resposta. Cai para CPU e reporta qual foi.
      null
    }

  private fun abrirCamera() {
    val dono = appContext.currentActivity as? LifecycleOwner
    if (dono == null) {
      estado("falhou: activity sem ciclo de vida")
      return
    }

    val futuro = ProcessCameraProvider.getInstance(context)
    futuro.addListener({ vincular(futuro.get(), dono) }, ContextCompat.getMainExecutor(context))
  }

  private fun vincular(provedor: ProcessCameraProvider, dono: LifecycleOwner) {
    try {
      val preview =
        Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }

      val analisador =
        ImageAnalysis.Builder()
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
          .build()

      analisador.setAnalyzer(analise, ::analisar)

      provedor.unbindAll()
      provedor.bindToLifecycle(dono, CameraSelector.DEFAULT_BACK_CAMERA, preview, analisador)
      inicioDaJanela = System.currentTimeMillis()
      estado("medindo (delegate: $delegateEmUso)")
    } catch (e: Exception) {
      estado("falhou: ${e.message}")
    }
  }

  /**
   * Todo frame, sem intervalo.
   *
   * O `body-scan-pose` descarta o que não vai medir porque a voz é o gargalo
   * dele. Aqui o gargalo é o que se quer descobrir, então nada é descartado — o
   * `KEEP_ONLY_LATEST` já garante que a fila não cresça.
   */
  private fun analisar(proxy: androidx.camera.core.ImageProxy) {
    try {
      val comeco = System.currentTimeMillis()
      carimbo += 1

      // Cópia densa antes do MediaPipe: com RGBA_8888 o bitmap do CameraX pode
      // vir com padding de linha, e o MediaPipe lê assumindo empacotamento
      // justo — estoura em `nativeCreateRgbaImage`, crash nativo sem exceção.
      val bitmap = proxy.toBitmap().copy(Bitmap.Config.ARGB_8888, false) ?: return

      emVoo[carimbo] = comeco
      landmarker?.detectAsync(BitmapImageBuilder(bitmap).build(), carimbo)
    } catch (e: Exception) {
      estado("falhou: ${e.message}")
    } finally {
      proxy.close()
    }
  }

  private fun aoResultado(resultado: PoseLandmarkerResult) {
    val comeco = emVoo.remove(resultado.timestampMs()) ?: return
    val agora = System.currentTimeMillis()

    registrar(agora - comeco)
    passesDaJanela.incrementAndGet()

    val pose = resultado.landmarks().firstOrNull()
    if (pose != null && pose.size == 33) {
      corposDaJanela.incrementAndGet()
      ultimoQuadril = pose[QUADRIL_ESQ].y().toDouble()
      ultimoJoelho = pose[JOELHO_ESQ].y().toDouble()
      ultimoTornozelo = pose[TORNOZELO_ESQ].y().toDouble()
    }

    emitirPose(pose, resultado.timestampMs())

    if (agora - inicioDaJanela >= JANELA_MS) fecharJanela(agora)
  }

  /**
   * Manda os landmarks do quadro para o JS, onde o julgador mora.
   *
   * A regra fica em `shared/` e não aqui porque o painel de calibração roda
   * exatamente o mesmo código no browser: duas implementações da mesma regra
   * divergem em silêncio, e o limiar calibrado contra uma passaria a valer para
   * a outra sem nunca ter sido testado nela.
   *
   * Nada é gravado. O que atravessa é o boneco de palito — sem imagem, sem
   * rosto — e ele morre no quadro seguinte.
   */
  private fun emitirPose(
    landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>?,
    carimboDoPasse: Long,
  ) {
    val pose = Pose()
    pose.carimbo = carimboDoPasse
    pose.pontos =
      landmarks?.map { landmark ->
        Ponto().apply {
          x = landmark.x().toDouble()
          y = landmark.y().toDouble()
          // `visibility` é Optional no AAR: ausente vira 1.0 pela mesma razão
          // que `fatos.ts` trata ausência como visível — fonte que não reporta
          // não é fonte sem corpo.
          visibility = landmark.visibility().orElse(1.0f).toDouble()
        }
      } ?: emptyList()

    principal.post { onPose(pose) }
  }

  @Synchronized
  private fun registrar(duracao: Long) {
    duracoes.addLast(duracao)
    while (duracoes.size > AMOSTRAS) duracoes.removeFirst()
  }

  @Synchronized
  private fun percentil(fracao: Double): Long {
    if (duracoes.isEmpty()) return 0
    val ordenado = duracoes.sorted()
    val indice = ((ordenado.size - 1) * fracao).toInt()
    return ordenado[indice]
  }

  private fun fecharJanela(agora: Long) {
    val decorrido = agora - inicioDaJanela
    val total = passesDaJanela.getAndSet(0)
    val corpos = corposDaJanela.getAndSet(0)
    val estadoTermico = termico()
    inicioDaJanela = agora

    val medida = Medida()
    medida.passes = total
    medida.comCorpo = corpos
    medida.fps = if (decorrido > 0) total * 1000.0 / decorrido else 0.0
    medida.p50 = percentil(0.50)
    medida.p95 = percentil(0.95)
    medida.delegate = delegateEmUso
    medida.termico = estadoTermico
    medida.quadrilY = ultimoQuadril
    medida.joelhoY = ultimoJoelho
    medida.tornozeloY = ultimoTornozelo

    principal.post { onMedida(medida) }
  }

  /**
   * Estado térmico do aparelho.
   *
   * Vai junto porque a sessão de exercício dura minutos, e a pergunta não é só
   * "qual a taxa" — é "qual a taxa depois de cinco minutos com o aparelho
   * quente". Taxa que só se sustenta frio não sustenta uma série.
   */
  private fun termico(): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return "indisponivel"

    val gerente = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      ?: return "indisponivel"

    return when (gerente.currentThermalStatus) {
      PowerManager.THERMAL_STATUS_NONE -> "none"
      PowerManager.THERMAL_STATUS_LIGHT -> "light"
      PowerManager.THERMAL_STATUS_MODERATE -> "moderate"
      PowerManager.THERMAL_STATUS_SEVERE -> "severe"
      PowerManager.THERMAL_STATUS_CRITICAL -> "critical"
      else -> "emergency+"
    }
  }
}
