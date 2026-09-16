import type { MedidasGeometricas, VereditosDaCaptura } from '@elevapro/shared';
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
  /**
   * A linha gravada em `body_scans`. Ausente quando a análise saiu e a gravação
   * falhou: aí não há resultado para abrir, e a tela trata como falha (#316).
   */
  scanId?: string;
  /** Falso quando a análise saiu e a gravação falhou. */
  persisted?: boolean;
  metrics: {
    height: number;
    weight: number;
    bodyFat: number;
    /** Massa magra: `peso × (1 − gordura)`. Inclui osso, órgão e água. */
    leanMass: number | null;
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
  /**
   * De onde vieram altura e peso — nunca do modelo (`ADR-0010`). A tela usa isto
   * para dizer se a Escala foi medida ou informada, o que muda a confiança nas
   * circunferências derivadas dela.
   */
  scaleSource?: 'assessment' | 'informed';
  /**
   * O que o aparelho mediu, já em centímetro e grau.
   *
   * Volta para a tela porque medida que só o especialista lê é tratamento sem
   * livre acesso (Art. 18, II). Opcional: análise feita quando a máscara não
   * mediu nada chega sem isto, e a tela omite a seção em vez de mostrar traços.
   */
  measured?: MedidasGeometricas;
  /** O que o portão concluiu sobre a captura. Alimenta o selo de confiança. */
  quality?: VereditosDaCaptura;
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

// A forma da pergunta vive junto com as perguntas, em `@elevapro/shared`. Havia
// uma cópia deste tipo aqui e outra dentro do arquivo de dados do web — e tipo
// duplicado é o que deixa duas definições divergirem sem o compilador acusar.

// `type` e não `interface` de propósito: a coluna `student_anamnesis.responses`
// é jsonb, e o tipo `Json` do schema gerado exige assinatura de índice. Uma
// interface não a recebe implicitamente, então gravar exigiria um cast — que é
// exatamente o que escondia o desalinhamento desta tabela antes.
/**
 * O valor de uma resposta, como ele é gravado.
 *
 * Plano, sem embrulho. O `{ questionId, value }` que esta tela usava repetia a
 * chave do próprio objeto e existia só aqui — o web e a tela adaptativa sempre
 * gravaram o valor direto, e todos os leitores esperam isso.
 */
export type AnamnesisResponseValue = string | number | string[] | boolean;

/** @deprecated Forma embrulhada, só para ler linha antiga. Não gravar. */
export type AnamnesisResponse = {
  questionId: string;
  value: AnamnesisResponseValue;
};

export type StudentAnamnesis = {
  studentId: string;
  // Nulável: a anamnese é salva em rascunho antes de ser concluída.
  completedAt: string | null;
  responses: Record<string, AnamnesisResponse>; // Map questionId -> Response
};
