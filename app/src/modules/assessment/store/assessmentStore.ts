import type { BodyScanDelta, BodyScanRecord } from '@elevapro/shared';
import { achatarRespostas, createBodyScanService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { mensagemDeErroBff } from '@/shared/bff';
import {
  AIBodyScanService,
  BodyScanAnalysisError,
  BodyScanConsentError,
  BodyScanScaleError,
} from '../services/aiBodyScan';
import { AnamnesisService } from '../services/anamnesisService';
import {
  AnamnesisResponseValue,
  AssessmentStatus,
  BodyScanResult,
  CaptureFraming,
} from '../types/assessment';

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

interface AssessmentState {
  status: AssessmentStatus;
  studentId: string | null;
  lastResult: BodyScanResult | null;
  history: BodyScanResult[];
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
  /** Parâmetros do enquadramento da última captura — base da comparação. */
  captureFraming: CaptureFraming | null;
  setCaptureFraming: (framing: CaptureFraming) => void;
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
  scanDeltas: BodyScanDelta[];
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
      lastResult: null,
      history: [],
      scanHistory: [],
      scanDeltas: [],
      errorMessage: null,
      capturedImages: {},
      captureFraming: null,
      anamnesisResponses: {},
      currentSectionIndex: 0,
      isAnamnesisSubmitted: false, // Default false

      setStudentId: (id: string) => set({ studentId: id }),

      startScan: async () => {
        set({ status: AssessmentStatus.SCANNING, capturedImages: {} }); // Keep studentId
      },

      setCapturedImage: (type: 'front' | 'back' | 'side', uri: string) => {
        console.log('[AssessmentStore] Setting captured image:', type, uri);
        set((state) => {
          const newImages = { ...state.capturedImages, [type]: uri };
          console.log('[AssessmentStore] Updated images:', newImages);
          return { capturedImages: newImages };
        });
      },

      setCaptureFraming: (framing: CaptureFraming) => set({ captureFraming: framing }),

      submitScan: async () => {
        // Limpa a falha anterior: tentar de novo com a mensagem antiga na tela
        // faz o retry parecer que falhou de novo antes mesmo de terminar.
        set({ status: AssessmentStatus.ANALYZING, errorMessage: null });
        try {
          const capturedImages = get().capturedImages;
          console.log('Starting AI Analysis with images:', Object.keys(capturedImages));

          const result = await AIBodyScanService.analyzeImages(
            capturedImages,
            undefined,
            get().captureFraming
          );

          set((state) => ({
            status: AssessmentStatus.COMPLETED,
            lastResult: result,
            history: [result, ...state.history],
          }));
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
        const service = createBodyScanService(supabase);
        const [scans, comparison] = await Promise.all([
          service.list(studentId),
          service.latestWithComparison(studentId),
        ]);
        set({ scanHistory: scans, scanDeltas: comparison.deltas });
      },

      deleteScan: async (scanId: string, studentId: string) => {
        const service = createBodyScanService(supabase);
        await service.deleteOwn(scanId);
        // Recarrega em vez de filtrar em memória: apagar a análise mais recente
        // muda a comparação, e um `scanDeltas` que sobreviva ao seu scan mostra
        // ao aluno uma variação contra uma medida que não existe mais.
        await get().loadHistory(studentId);
      },

      reset: () => {
        set({
          status: AssessmentStatus.IDLE,
          lastResult: null,
          capturedImages: {},
          captureFraming: null,
          studentId: null,
          anamnesisResponses: {},
          currentSectionIndex: 0,
          isAnamnesisSubmitted: false,
          scanHistory: [],
          scanDeltas: [],
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
      }),
    }
  )
);
