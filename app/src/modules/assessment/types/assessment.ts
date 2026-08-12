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

export interface AnamnesisResponse {
  questionId: string;
  value: string | number | string[] | boolean;
}

export interface StudentAnamnesis {
  studentId: string;
  completedAt: string;
  responses: Record<string, AnamnesisResponse>; // Map questionId -> Response
}
