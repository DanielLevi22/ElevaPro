/**
 * Como a foto foi enquadrada.
 *
 * Guardado com o escaneamento para o próximo reproduzir a mesma distância: é o
 * que torna dois escaneamentos comparáveis, e a comparação é onde está o valor
 * da feature (`ADR-0010`).
 */
export interface CaptureFraming {
  /** Fração da altura da tela onde ficava a marca do topo da cabeça. */
  markTop: number;
  /** Fração da altura da tela onde ficava a marca dos pés. */
  markBottom: number;
  /** Inclinação frente/trás no disparo, em graus. */
  pitch: number;
  /** Rotação lateral no disparo, em graus. */
  roll: number;
  /** Falso quando o aparelho não tem sensor — aí pitch e roll não valem nada. */
  levelSensor: boolean;
  /**
   * Qual lente. Frontal e traseira têm distância focal diferente: o corpo
   * ocupando a mesma fração do quadro não significa a mesma distância nas duas.
   * Sem este campo, comparar escaneamentos de lentes diferentes introduziria um
   * erro invisível.
   */
  camera: 'front' | 'back';
}

export interface BodyMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  inferenceUrl?: string; // For visual feedback
}

export interface BodyScanResult {
  id: string;
  date: string;
  metrics: {
    height: number;
    weight: number;
    bodyFat: number;
    muscleMass: number;
    bmi: number;
  };
  segments: {
    chest: number;
    waist: number;
    hips: number;
    arms: number;
    thighs: number;
    calves?: number;
    neck?: number;
    shoulders?: number;
  };
  imageUrl: string;
  /**
   * De onde vieram altura e peso — nunca do modelo (`ADR-0010`). A tela usa isto
   * para dizer se a régua é medida ou informada, o que muda a confiança nas
   * circunferências derivadas dela.
   */
  scaleSource?: 'assessment' | 'informed';
  postureAnalysis?: {
    scores: {
      symmetry: number;
      muscle: number;
      posture: number;
    };
    feedback: {
      front: Array<{ title: string; risk: string; text: string }>;
      back: Array<{ title: string; risk: string; text: string }>;
      side: Array<{ title: string; risk: string; text: string }>;
    };
    recommendations: string;
  };
}

export enum AssessmentStatus {
  IDLE = 'idle',
  SCANNING = 'scanning',
  ANALYZING = 'analyzing',
  COMPLETED = 'completed',
  ERROR = 'error',
  /** Falta consentir a coleta de dados de saúde. Um toque resolve — não é erro. */
  NEEDS_CONSENT = 'needs_consent',
}

export type QuestionType =
  | 'text'
  | 'number'
  | 'single_choice'
  | 'multiple_choice'
  | 'boolean'
  | 'date';

export interface AnamnesisQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // For single/multiple choice
  required?: boolean;
  placeholder?: string;
  condition?: {
    questionId: string;
    expectedValue: unknown;
  };
}

export interface AnamnesisSection {
  id: string;
  title: string;
  questions: AnamnesisQuestion[];
}

// `type` e não `interface` de propósito: a coluna `student_anamnesis.responses`
// é jsonb, e o tipo `Json` do schema gerado exige assinatura de índice. Uma
// interface não a recebe implicitamente, então gravar exigiria um cast — que é
// exatamente o que escondia o desalinhamento desta tabela antes.
export type AnamnesisResponse = {
  questionId: string;
  value: string | number | string[] | boolean;
};

export type StudentAnamnesis = {
  studentId: string;
  // Nulável: a anamnese é salva em rascunho antes de ser concluída.
  completedAt: string | null;
  responses: Record<string, AnamnesisResponse>; // Map questionId -> Response
};
