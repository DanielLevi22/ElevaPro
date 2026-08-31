package com.elevapro.bodyscanpose

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.File
import java.net.URL
import java.nio.ByteBuffer
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * Dono da preview e da amostragem.
 *
 * **Nenhum frame é gravado e nenhum frame sai do aparelho.** O `ImageAnalysis`
 * entrega o buffer em memória, a pose e a máscara rodam localmente, e o que sobe
 * para o JavaScript é um punhado de números. O único arquivo tocado é o `.task`
 * do modelo, uma vez, em cache (`ADR-0022`, parecer de LGPD de 2026-08-30).
 */
private const val MODELO_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

/**
 * Intervalo entre amostras.
 *
 * Casado com a duração de uma instrução falada: "dê um passo para trás" leva uns
 * dois segundos para ser dita, e medir mais rápido que isso joga fora leitura
 * que ninguém vai usar — a voz é o gargalo, não o modelo.
 */
private const val INTERVALO_MS = 2_000L

class BodyScanPoseView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {

  // Tipado: sem o parâmetro, o overload de `Map<String, Any>` vence, e ele não
  // aceita nulo — que é metade dos campos aqui.
  private val onFatos by EventDispatcher<FatosDeVisao>()
  private val onEstado by EventDispatcher()

  private val previewView = PreviewView(context)
  private val principal = Handler(Looper.getMainLooper())
  private val trabalho = Executors.newSingleThreadExecutor()
  private val analise = Executors.newSingleThreadExecutor()

  private var landmarker: PoseLandmarker? = null
  private var captura: ImageCapture? = null
  private var ultimaAmostra = 0L

  /** O frame de cada passe, guardado até o resultado chegar para medir a luz. */
  private val emVoo = ConcurrentHashMap<Long, Bitmap>()

  var lenteFrontal: Boolean = false

  init {
    previewView.layoutParams =
      ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    // COMPATIBLE usa TextureView em vez de SurfaceView. A SurfaceView tem
    // janela própria e não compõe com a hierarquia do React Native: o
    // `Preview` fica sem superfície, a sessão não configura e o
    // `ImageAnalysis` para junto — tela preta E nenhuma medida.
    previewView.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    addView(previewView)
    estado("preparando")
    trabalho.execute { prepararModelo() }
  }

  private fun estado(texto: String) {
    principal.post { onEstado(mapOf("estado" to texto)) }
  }

  /**
   * Garante o `.task` em cache e cria o landmarker.
   *
   * O modelo é baixado sob demanda em vez de empacotado: são ~5 MB que só fazem
   * falta a quem escaneia, e a instalação não deve pagar por eles.
   */
  private fun prepararModelo() {
    try {
      val arquivo = File(context.cacheDir, "pose_landmarker_lite.task")
      if (!arquivo.exists() || arquivo.length() < 1_000_000) {
        URL(MODELO_URL).openStream().use { entrada ->
          arquivo.outputStream().use { saida -> entrada.copyTo(saida) }
        }
      }

      val bytes = arquivo.readBytes()
      val buffer = ByteBuffer.allocateDirect(bytes.size).put(bytes)
      buffer.rewind()

      val opcoes =
        PoseLandmarker.PoseLandmarkerOptions.builder()
          .setBaseOptions(BaseOptions.builder().setModelAssetBuffer(buffer).build())
          .setRunningMode(RunningMode.LIVE_STREAM)
          // Sem a máscara não há coroa da cabeça: os 33 landmarks param nos
          // olhos e orelhas, e é do topo da silhueta que sai a conversão px/cm.
          .setOutputSegmentationMasks(true)
          .setNumPoses(1)
          .setResultListener { resultado, _ -> aoResultado(resultado) }
          .setErrorListener { erro -> estado("erro: ${erro.message}") }
          .build()

      landmarker = PoseLandmarker.createFromOptions(context, opcoes)
      principal.post { abrirCamera() }
    } catch (e: Exception) {
      estado("falhou: ${e.message}")
    }
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
      val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }

      val analisador =
        ImageAnalysis.Builder()
          // KEEP_ONLY_LATEST: interessa o frame de agora, não a fila do que passou.
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
          .build()

      analisador.setAnalyzer(analise, ::analisar)

      // A foto final é caso à parte e é o ÚNICO frame que vira arquivo. Os
      // frames de amostragem morrem em memória; estes três o aluno escolheu
      // tirar, e precisam de qualidade para a análise (`ADR-0022`).
      val fotografo = ImageCapture.Builder()
        .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
        .build()
      captura = fotografo

      val lente =
        if (lenteFrontal) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA

      provedor.unbindAll()
      provedor.bindToLifecycle(dono, lente, preview, analisador, fotografo)
      estado("medindo")
    } catch (e: Exception) {
      estado("falhou: ${e.message}")
    }
  }

  /**
   * Um frame por vez, a cada `INTERVALO_MS`.
   *
   * O descarte acontece antes de qualquer cópia: frame que não vai ser medido
   * não vira bitmap nem ocupa memória.
   */
  private fun analisar(proxy: androidx.camera.core.ImageProxy) {
    try {
      val agora = System.currentTimeMillis()
      if (agora - ultimaAmostra < INTERVALO_MS) return

      ultimaAmostra = agora

      // Cópia densa antes de entregar ao MediaPipe.
      //
      // Com OUTPUT_IMAGE_FORMAT_RGBA_8888 o bitmap do CameraX pode vir com
      // padding de linha — `rowStride` maior que largura × 4. O MediaPipe lê
      // assumindo empacotamento justo e estoura em `nativeCreateRgbaImage`,
      // com crash nativo e sem exceção Java. `copy` garante ARGB_8888 sem
      // padding, e de quebra desacopla o tempo de vida do buffer da câmera.
      val bitmap =
        girar(proxy.toBitmap(), proxy.imageInfo.rotationDegrees)
          .copy(Bitmap.Config.ARGB_8888, false) ?: return

      emVoo[agora] = bitmap
      landmarker?.detectAsync(BitmapImageBuilder(bitmap).build(), agora)
    } catch (e: Exception) {
      estado("falhou: ${e.message}")
    } finally {
      proxy.close()
    }
  }

  /**
   * Tira a foto de verdade e devolve o caminho dela.
   *
   * Vai para o cache do app, de onde o envio lê e o sistema recolhe. É o único
   * ponto deste arquivo que escreve imagem.
   */
  fun capturar(promessa: Promise) {
    val fotografo = captura
    if (fotografo == null) {
      promessa.reject("SEM_CAMERA", "A câmera ainda não está pronta", null)
      return
    }

    val arquivo = File(context.cacheDir, "body-scan-${System.currentTimeMillis()}.jpg")

    // NUNCA espelhar, e dito explicitamente em vez de confiar no padrão.
    //
    // Espelhar troca esquerda com direita, e o laudo reporta lado — "ombro
    // direito elevado". Numa foto espelhada ele apontaria o ombro errado e
    // pareceria correto, que é o pior tipo de defeito. A lente frontal é onde
    // isso morde, porque espelhar a própria imagem é convenção dela.
    //
    // Vai nos metadados e não no builder: `ImageCapture.Builder.setMirrorMode`
    // lança `UnsupportedOperationException` — só `VideoCapture` aceita lá.
    val metadados = ImageCapture.Metadata().apply { isReversedHorizontal = false }
    val destino = ImageCapture.OutputFileOptions.Builder(arquivo).setMetadata(metadados).build()

    fotografo.takePicture(
      destino,
      ContextCompat.getMainExecutor(context),
      object : ImageCapture.OnImageSavedCallback {
        override fun onImageSaved(resultado: ImageCapture.OutputFileResults) {
          promessa.resolve("file://${arquivo.absolutePath}")
        }

        override fun onError(erro: ImageCaptureException) {
          promessa.reject("FALHA_CAPTURA", erro.message ?: "Não consegui tirar a foto", erro)
        }
      },
    )
  }

  /**
   * Posiciona a preview à mão.
   *
   * O React Native faz o próprio passe de layout pelo Yoga e **não mede filhos
   * nativos anexados por código** — sem isto o `PreviewView` fica com tamanho
   * zero e a tela sai preta, mesmo com a câmera aberta e medindo.
   */
  override fun onLayout(mudou: Boolean, esq: Int, topo: Int, dir: Int, base: Int) {
    super.onLayout(mudou, esq, topo, dir, base)
    val largura = dir - esq
    val altura = base - topo

    previewView.measure(
      MeasureSpec.makeMeasureSpec(largura, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(altura, MeasureSpec.EXACTLY),
    )
    previewView.layout(0, 0, largura, altura)
  }

  /**
   * Repassa o pedido de layout que o React Native engole.
   *
   * `requestLayout` vindo de um filho nativo morre aqui dentro: o RN faz o
   * próprio passe pelo Yoga e não reage. Sem este empurrão, o `PreviewView`
   * fica no tamanho que tinha na primeira medida — geralmente zero.
   */
  override fun requestLayout() {
    super.requestLayout()
    post {
      measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
      )
      layout(left, top, right, bottom)
    }
  }

  private fun girar(bitmap: Bitmap, graus: Int): Bitmap {
    if (graus == 0) return bitmap
    val m = Matrix().apply { postRotate(graus.toFloat()) }

    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, m, true)
  }

  private fun aoResultado(resultado: PoseLandmarkerResult) {
    val bitmap = emVoo.remove(resultado.timestampMs()) ?: return
    val fatos = extrairFatos(resultado, bitmap)

    principal.post { onFatos(fatos) }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    landmarker?.close()
    landmarker = null
    captura = null
    emVoo.clear()
    trabalho.shutdown()
    analise.shutdown()
  }
}
