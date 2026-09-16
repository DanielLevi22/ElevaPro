import type { BodyScanRecord, EtapaDaAnalise } from '@elevapro/shared';
import { achatarRespostas, createBodyScanService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { mensagemDeErroBff } from '@/shared/bff';
import type { MedidaDaFoto } from '../../../../modules/body-scan-pose';
import {
  AIBodyScanService,
  BodyScanAnalysisError,
  BodyScanConsentError,
  BodyScanScaleError,
} from '../services/aiBodyScan';
import { AnamnesisService } from '../services/anamnesisService';
import { discardPhotos, sweepLeftoverPhotos } from '../services/capturedPhotos';
import type { AvisoDeQualidade } from '../services/portao';
import {
  AnamnesisResponseValue,
  AssessmentStatus,
  type BodyScanResult,
  CaptureFraming,
} from '../types/assessment';

/** Quantas análises o histórico carrega. */
const HISTORY_LIMIT = 100;

const storage = createMMKV();

const clientStorage: StateStorage = {
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name, value) => {
    storage.set(name, value);
  },
  removeItem: (name) => {
    storage.remove(name);
  },
};

export interface QualidadeDaCaptura {
  backlit: boolean;
  lowLight: boolean;
  blownOut: boolean;
  framingConfirmed: boolean;
}

/** Nada de ressalva até alguma captura acontecer — e enquadramento presumido bom. */
const QUALIDADE_LIMPA: QualidadeDaCaptura = {
  backlit: false,
  lowLight: false,
  blownOut: false,
  framingConfirmed: true,
};

interface AssessmentState {
  status: AssessmentStatus;
  studentId: string | null;
  /**
   * A análise que acabou de sair, pelo id da linha em `body_scans`.
   *
   * O resultado não mora mais aqui: as telas leem a linha gravada, a mesma que o
   * histórico abre. Duas fontes para a mesma análise é como uma delas mente (#316).
   */
  lastScanId: string | null;
  capturedImages: {
    front?: string;
    back?: string;
    side?: string;
  };
  // Anamnesis State
  anamnesisResponses: Record<string, AnamnesisResponseValue>;
  currentSectionIndex: number;
  isAnamnesisSubmitted: boolean; // Flag to track completion

  setStudentId: (id: string) => void;
  startScan: () => Promise<void>;
  setCapturedImage: (type: 'front' | 'back' | 'side', uri: string) => void;
  /**
   * Apaga as fotos deste scan do aparelho e zera o que foi medido nelas.
   *
   * É o "Refazer" da grade e a saída do fluxo sem analisar: a foto só existe
   * enquanto serve para a análise (#316 §3).
   */
  discardCapture: () => Promise<void>;
  /**
   * O que o aparelho mediu em cada foto, em pixels e graus.
   *
   * Fora do `partialize` de propósito: é derivado de dado de saúde e vive só o
   * tempo do scan. O que persiste é o resultado, depois da análise.
   */
  medidas: Partial<Record<'front' | 'back' | 'side', MedidaDaFoto>>;
  setMedida: (type: 'front' | 'back' | 'side', medida: MedidaDaFoto) => void;
  /**
   * Quanto do quadro o corpo ocupou na primeira foto deste scan.
   *
   * A partir da segunda pose o portão exige voltar a esta distância. Sem isso a
   * frente pode sair a 0.70 de ocupação e a lateral a 0.88, e aí as duas
   * larguras descrevem pontos de vista diferentes em vez do mesmo corpo.
   */
  ocupacaoDeReferencia: number | null;
  setOcupacaoDeReferencia: (ocupacao: number) => void;
  /**
   * Os vereditos do portão, somados nas três poses.
   *
   * Somados e não por pose porque o scan é uma linha só: se a lateral saiu em
   * contraluz, é o scan inteiro que carrega a ressalva. `enquadramentoConfirmado`
   * é o inverso — basta uma pose pela saída manual para o conjunto deixar de
   * ser confiável.
   */
  qualidade: QualidadeDaCaptura;
  registrarQualidade: (avisos: AvisoDeQualidade[], enquadramentoConfirmado: boolean) => void;
  /** Parâmetros do enquadramento da última captura — base da comparação. */
  captureFraming: CaptureFraming | null;
  setCaptureFraming: (framing: CaptureFraming) => void;
  /**
   * A voz do portão de captura está muda?
   *
   * Mora aqui, e não no hook de voz, porque o `isMuted` do `useVoiceCoach` é
   * estado local por instância: o aluno mutava, saía da tela e a voz voltava na
   * pose seguinte. Persistido, a escolha vale para o scan inteiro (`ADR-0022`).
   */
  vozMuda: boolean;
  setVozMuda: (muda: boolean) => void;
  /**
   * A lente escolhida para o scan inteiro.
   *
   * Mora aqui e não na tela da câmera porque a tela remonta a cada pose: com o
   * estado lá, dava para fotografar a frente com uma lente e a lateral com
   * outra, dentro do mesmo scan. Frontal e traseira têm distância focal
   * diferente — o corpo ocupando a mesma fração do quadro não significa a mesma
   * distância —, e é por isso que `framing_camera` existe (`ADR-0010`).
   */
  lenteFrontal: boolean;
  setLenteFrontal: (frontal: boolean) => void;
  /**
   * Em que ponto a análise está, vindo do fluxo do BFF.
   *
   * Null fora de uma análise. Só avança quando o modelo emite a seção — etapa
   * parada significa geração parada, e é essa a informação que a tela precisa
   * dar em vez de um spinner que gira para sempre.
   */
  etapaDaAnalise: EtapaDaAnalise | null;
  submitScan: () => Promise<void>;

  // Anamnesis Actions
  setAnamnesisResponse: (questionId: string, value: AnamnesisResponseValue) => void;
  setSectionIndex: (index: number) => void;
  submitAnamnesis: () => Promise<void>;
  syncAnamnesis: (studentId: string) => Promise<void>;

  /** Histórico e comparação vindos do banco — antes só existiam em memória. */
  loadHistory: (studentId: string) => Promise<void>;
  scanHistory: BodyScanRecord[];
  /**
   * Apaga uma análise do próprio aluno — Art. 18, VI.
   *
   * Aqui não há "corrigir": `body_scans` é medida derivada por IA, e o remédio
   * para uma medida inexata é medir de novo. O botão de nova análise já existe
   * ao lado; o que faltava era o direito de eliminar.
   */
  deleteScan: (scanId: string, studentId: string) => Promise<void>;
  /** Texto pronto para a tela. Null quando não houve falha. */
  errorMessage: string | null;
  reset: () => void;
}

/**
 * O que o aluno lê quando a análise não sai.
 *
 * Antes, quatro causas diferentes viravam a mesma frase: o store só reconhecia
 * consentimento e falha de análise, e substituía todo o resto pela genérica —
 * inclusive a falta de altura, que o serviço já sabia nomear. O aluno via
 * "tente de novo" num caminho que nunca podia funcionar.
 *
 * As outras cinco superfícies de IA do produto já passam pelo tradutor
 * compartilhado desde 2026-08-28. Esta ficou de fora, e é a que este bloco
 * finalmente liga.
 */
/** A análise saiu, mas a linha não foi gravada: sem ela não há resultado para abrir. */
const MENSAGEM_SEM_GRAVACAO =
  'A análise terminou, mas não consegui salvar o resultado. Tente de novo — suas fotos foram mantidas.';

/**
 * O id da análise gravada.
 *
 * O BFF anterior à #316 grava e responde `persisted: true` sem o id. Com ele, a
 * análise gravada é a mais recente da lista — só `persisted: false` diz que ela
 * não existe, e aí a mais recente seria a anterior, com cara de nova.
 */
async function savedScanId(result: BodyScanResult, studentId: string | null) {
  if (result.scanId) return result.scanId;
  if (result.persisted !== true || !studentId) return null;
  const [latest] = await createBodyScanService(supabase).list(studentId, 1);
  return latest?.id ?? null;
}

function mensagemDaFalha(error: unknown): string {
  // Falta de escala não é falha de análise: é dado que falta, e o remédio é
  // preencher a anamnese. "Tente de novo" aqui é um botão que não funciona.
  if (error instanceof BodyScanScaleError) {
    return 'Preciso da sua altura e do seu peso para calcular. Responda a anamnese e tente de novo.';
  }

  if (error instanceof BodyScanAnalysisError) return error.message;

  // O tradutor compartilhado: frase curta na tela, diagnóstico no log. O
  // detalhe do `client.ts` nomeia host e variável de ambiente — indispensável
  // para quem conserta, e o que menos o aluno pode ver.
  return mensagemDeErroBff(error);
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      status: AssessmentStatus.IDLE,
      studentId: null,
      lastScanId: null,
      scanHistory: [],
      errorMessage: null,
      capturedImages: {},
      captureFraming: null,
      anamnesisResponses: {},
      currentSectionIndex: 0,
      isAnamnesisSubmitted: false, // Default false

      setStudentId: (id: string) => set({ studentId: id }),

      startScan: async () => {
        // Antes de a primeira foto nova existir: o que sobrou de um scan
        // interrompido não tem mais caminho no store, só o nome no cache.
        await sweepLeftoverPhotos();
        // Zera medidas, escala de referência e ressalvas: sem isto o scan novo
        // herdaria o contraluz do anterior e mediria contra uma distância que
        // o aluno não repetiu.
        set({
          status: AssessmentStatus.SCANNING,
          capturedImages: {},
          medidas: {},
          ocupacaoDeReferencia: null,
          qualidade: QUALIDADE_LIMPA,
        }); // Keep studentId
      },

      setCapturedImage: (type: 'front' | 'back' | 'side', uri: string) => {
        // Refazer uma pose troca a foto: a anterior sai do disco na hora. Sem
        // log do caminho — o nome do arquivo marca quando a pessoa se fotografou.
        const replaced = get().capturedImages[type];
        if (replaced && replaced !== uri) void discardPhotos([replaced]);
        set((state) => ({ capturedImages: { ...state.capturedImages, [type]: uri } }));
      },

      discardCapture: async () => {
        const photos = Object.values(get().capturedImages);
        set({
          capturedImages: {},
          medidas: {},
          ocupacaoDeReferencia: null,
          qualidade: QUALIDADE_LIMPA,
          captureFraming: null,
        });
        await discardPhotos(photos);
      },

      setCaptureFraming: (framing: CaptureFraming) => set({ captureFraming: framing }),

      qualidade: QUALIDADE_LIMPA,
      registrarQualidade: (avisos, enquadramentoConfirmado) =>
        set((state) => ({
          qualidade: {
            backlit: state.qualidade.backlit || avisos.includes('contraluz'),
            lowLight: state.qualidade.lowLight || avisos.includes('luz-fraca'),
            blownOut: state.qualidade.blownOut || avisos.includes('luz-estourada'),
            framingConfirmed: state.qualidade.framingConfirmed && enquadramentoConfirmado,
          },
        })),

      medidas: {},
      setMedida: (type, medida) =>
        set((state) => ({ medidas: { ...state.medidas, [type]: medida } })),

      ocupacaoDeReferencia: null,
      setOcupacaoDeReferencia: (ocupacao) => set({ ocupacaoDeReferencia: ocupacao }),

      etapaDaAnalise: null,

      vozMuda: false,
      setVozMuda: (muda: boolean) => set({ vozMuda: muda }),

      lenteFrontal: false,
      setLenteFrontal: (frontal: boolean) => set({ lenteFrontal: frontal }),

      submitScan: async () => {
        // Limpa a falha anterior: tentar de novo com a mensagem antiga na tela
        // faz o retry parecer que falhou de novo antes mesmo de terminar.
        set({ status: AssessmentStatus.ANALYZING, errorMessage: null, etapaDaAnalise: null });
        try {
          const result = await AIBodyScanService.analyzeImages(
            get().capturedImages,
            get().captureFraming,
            get().medidas,
            get().qualidade,
            (etapa) => set({ etapaDaAnalise: etapa })
          );

          // Sem a linha gravada não há o que abrir: as telas leem do banco. As
          // fotos ficam para o "Tentar de novo", como a tela de falha promete.
          const scanId = await savedScanId(result, get().studentId);
          if (!scanId) {
            set({ status: AssessmentStatus.ERROR, errorMessage: MENSAGEM_SEM_GRAVACAO });
            return;
          }
          const photos = Object.values(get().capturedImages);
          set({ status: AssessmentStatus.COMPLETED, lastScanId: scanId, capturedImages: {} });
          await discardPhotos(photos);
        } catch (error) {
          // Falta de consentimento não é falha: leva a uma tela que resolve,
          // não à mesma mensagem de erro genérica.
          if (error instanceof BodyScanConsentError) {
            set({ status: AssessmentStatus.NEEDS_CONSENT });
            return;
          }
          set({ status: AssessmentStatus.ERROR, errorMessage: mensagemDaFalha(error) });
        }
      },

      setAnamnesisResponse: (questionId, value) => {
        set((state) => ({
          anamnesisResponses: {
            ...state.anamnesisResponses,
            // Valor direto. O embrulho `{ questionId, value }` repetia a chave
            // do próprio objeto e era produzido só por esta tela — a do aluno
            // que tem especialista, justamente quem tem alguém lendo o contexto
            // dele pela IA. Todos os leitores esperam a forma plana.
            [questionId]: value,
          },
        }));
      },

      setSectionIndex: (index) => set({ currentSectionIndex: index }),

      syncAnamnesis: async (studentId: string) => {
        if (!studentId) return;

        console.log('Syncing anamnesis for:', studentId);
        const data = await AnamnesisService.getAnamnesis(studentId);

        if (data?.responses) {
          console.log('Found existing anamnesis data, populating store...');
          set({
            // Achata o que veio do banco: linha gravada antes desta correção
            // traz o embrulho, e a tela leria `undefined` em todo campo.
            anamnesisResponses: achatarRespostas(data.responses) as Record<
              string,
              AnamnesisResponseValue
            >,
            isAnamnesisSubmitted: !!data.completedAt,
            studentId: studentId,
          });
        }
      },

      submitAnamnesis: async () => {
        const state = get();
        const { studentId, anamnesisResponses } = state;

        if (!studentId) {
          console.error('Cannot submit anamnesis: No student ID found in store.');
          return;
        }

        console.log('Submitting Anamnesis for student:', studentId);

        set({ status: AssessmentStatus.ANALYZING }); // Reuse ANALYZING status or add a new SAVING status

        const result = await AnamnesisService.saveAnamnesis(studentId, anamnesisResponses, true);

        if (result.success) {
          console.log('Anamnesis submitted successfully to Supabase');
          set({ isAnamnesisSubmitted: true, status: AssessmentStatus.COMPLETED });
        } else {
          console.error('Failed to submit anamnesis:', result.error);
          set({ status: AssessmentStatus.ERROR });
        }
      },

      /**
       * Lê o histórico do banco.
       *
       * Antes o resultado vivia só no Zustand e o `partialize` guardava apenas
       * a anamnese — fechar o app apagava tudo. Sem histórico não existe delta,
       * e o delta é onde está o valor da feature (ADR-0010).
       */
      loadHistory: async (studentId: string) => {
        // Cem, e não os dez do padrão: a lista é o caminho para apagar (Art. 18, VI),
        // e análise fora dela ficaria sem lixeira.
        const scans = await createBodyScanService(supabase).list(studentId, HISTORY_LIMIT);
        set({ scanHistory: scans });
      },

      deleteScan: async (scanId: string, studentId: string) => {
        const service = createBodyScanService(supabase);
        await service.deleteOwn(scanId);
        // Recarrega em vez de filtrar em memória: apagar uma análise muda a
        // comparação da seguinte, e a lista velha mostraria uma variação contra
        // uma medida que não existe mais.
        await get().loadHistory(studentId);
      },

      reset: () => {
        void discardPhotos(Object.values(get().capturedImages));
        set({
          status: AssessmentStatus.IDLE,
          lastScanId: null,
          capturedImages: {},
          captureFraming: null,
          studentId: null,
          anamnesisResponses: {},
          currentSectionIndex: 0,
          isAnamnesisSubmitted: false,
          scanHistory: [],
          errorMessage: null,
        });
      },
    }),
    {
      name: 'assessment-storage',
      storage: createJSONStorage(() => clientStorage),
      partialize: (state) => ({
        anamnesisResponses: state.anamnesisResponses,
        currentSectionIndex: state.currentSectionIndex,
        isAnamnesisSubmitted: state.isAnamnesisSubmitted,
        vozMuda: state.vozMuda,
        lenteFrontal: state.lenteFrontal,
      }),
    }
  )
);
