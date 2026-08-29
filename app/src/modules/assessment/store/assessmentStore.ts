import type { BodyScanDelta, BodyScanRecord } from '@elevapro/shared';
import { createBodyScanService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import {
  AIBodyScanService,
  BodyScanAnalysisError,
  BodyScanConsentError,
} from '../services/aiBodyScan';
import { AnamnesisService } from '../services/anamnesisService';
import {
  AnamnesisResponse,
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
  anamnesisResponses: Record<string, AnamnesisResponse>;
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
  setAnamnesisResponse: (questionId: string, value: string | number | string[] | boolean) => void;
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
          set({
            status: AssessmentStatus.ERROR,
            errorMessage:
              error instanceof BodyScanAnalysisError
                ? error.message
                : 'Não consegui completar a análise. Tente de novo.',
          });
          console.error('Body scan failed', error);
        }
      },

      setAnamnesisResponse: (questionId, value) => {
        set((state) => ({
          anamnesisResponses: {
            ...state.anamnesisResponses,
            [questionId]: { questionId, value },
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
            anamnesisResponses: data.responses,
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
       * e o delta é onde está o valor da feature (ADR-010).
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
