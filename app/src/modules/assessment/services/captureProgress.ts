import type { EtapaDaAnalise } from '@elevapro/shared';
import type { QualidadeDaCaptura } from '../store/assessmentStore';
import type { CaptureFraming } from '../types/assessment';
import { type IdDaInstrucao, levelWithinTolerance, type Portao } from './portao';

/**
 * O que a grade, a câmera e o processamento mostram sobre o andamento do scan
 * (#316, telas 3, 4 e 5). Puro: sem tela, sem câmera e sem rede.
 */

export type CheckTone = 'ok' | 'attention';

export interface CaptureCheck {
  key: 'level' | 'framing' | 'light';
  title: string;
  detail: string;
  tone: CheckTone;
}

interface CaptureChecksInput {
  photos: number;
  /** O enquadramento da última foto: pitch, roll e se havia sensor. */
  framing: CaptureFraming | null;
  /** Os vereditos somados nas poses já feitas. */
  quality: QualidadeDaCaptura;
}

/**
 * A "Checagem automática" da grade. Vazia antes da primeira foto: sem captura
 * não há o que conferir, e três linhas verdes afirmariam o contrário.
 *
 * O texto não diz qual foto teve o problema. Os vereditos são somados nas
 * três poses de propósito — o scan é uma linha só no banco.
 *
 * @example captureChecks({ photos: 0, framing: null, quality }) // []
 */
export function captureChecks({ photos, framing, quality }: CaptureChecksInput): CaptureCheck[] {
  if (photos === 0) return [];
  return [levelCheck(framing), framingCheck(quality), lightCheck(quality)];
}

function levelCheck(framing: CaptureFraming | null): CaptureCheck {
  const title = 'Nível do aparelho';
  if (!framing?.levelSensor) {
    return { key: 'level', title, detail: 'Sem sensor para conferir o nível', tone: 'attention' };
  }
  return levelWithinTolerance(framing.pitch, framing.roll)
    ? { key: 'level', title, detail: 'Dentro da tolerância', tone: 'ok' }
    : { key: 'level', title, detail: 'O celular estava inclinado', tone: 'attention' };
}

function framingCheck(quality: QualidadeDaCaptura): CaptureCheck {
  return quality.framingConfirmed
    ? { key: 'framing', title: 'Enquadramento', detail: 'Corpo inteiro visível', tone: 'ok' }
    : {
        key: 'framing',
        title: 'Enquadramento',
        detail: 'Uma foto saiu sem o enquadramento confirmado',
        tone: 'attention',
      };
}

function lightCheck(quality: QualidadeDaCaptura): CaptureCheck {
  const problem = quality.backlit
    ? 'Contraluz numa das fotos'
    : quality.lowLight
      ? 'Cômodo escuro numa das fotos'
      : quality.blownOut
        ? 'Luz estourada numa das fotos'
        : null;
  return problem
    ? { key: 'light', title: 'Iluminação', detail: problem, tone: 'attention' }
    : { key: 'light', title: 'Iluminação', detail: 'Luz boa nas fotos', tone: 'ok' };
}

export interface CameraChip {
  label: string;
  ok: boolean;
}

interface DeviceLevelReading {
  pitch: number;
  roll: number;
  disponivel: boolean;
}

/** Instruções que o aluno resolve andando para a frente ou para trás. */
const DISTANCE: ReadonlySet<IdDaInstrucao> = new Set([
  'aproxime',
  'aproxime-muito',
  'afaste',
  'passo-a-frente',
  'passo-atras',
]);

/** Instruções que dizem que parte do corpo está fora do quadro. */
const OUT_OF_FRAME: ReadonlySet<IdDaInstrucao> = new Set([
  'sem-corpo',
  'cabeca-cortada',
  'pes-cortados',
  'suba-o-celular',
  'baixe-o-celular',
]);

/**
 * Os três chips da câmera: nível, distância e corpo inteiro.
 *
 * O portão devolve só a instrução de maior prioridade, e os chips leem essa
 * mesma instrução: o chip apagado é o que o aluno precisa resolver agora.
 *
 * @example cameraChips(null, { pitch: 0, roll: 0, disponivel: false })[0].ok // false
 */
export function cameraChips(gate: Portao | null, level: DeviceLevelReading): CameraChip[] {
  const instruction = gate?.instrucao?.id ?? null;
  return [
    levelChip(level),
    {
      label: 'Distância ok',
      ok: gate !== null && (instruction === null || !DISTANCE.has(instruction)),
    },
    {
      label: 'Corpo inteiro',
      ok: gate !== null && (instruction === null || !OUT_OF_FRAME.has(instruction)),
    },
  ];
}

/** Sem sensor o chip não afirma nível nenhum: o número seria inventado. */
function levelChip({ pitch, roll, disponivel }: DeviceLevelReading): CameraChip {
  if (!disponivel) return { label: 'Nível sem sensor', ok: false };
  return {
    label: `Nível ${Math.round(Math.abs(roll))}°`,
    ok: levelWithinTolerance(pitch, roll),
  };
}

export type StepState = 'done' | 'doing' | 'pending';

const STEPS: readonly { stage: EtapaDaAnalise; label: string }[] = [
  { stage: 'lendo', label: 'Lendo as três fotos' },
  { stage: 'proporcoes', label: 'Estimando proporções e simetria' },
  { stage: 'postura', label: 'Gerando notas de postura' },
  { stage: 'recomendacoes', label: 'Escrevendo as recomendações' },
];

/**
 * O checklist do processamento. A etapa vem do fluxo do BFF e só avança quando
 * o modelo escreve: etapa parada é geração parada, e o checklist diz isso.
 *
 * @example analysisSteps('postura').map((s) => s.state) // ['done','done','doing','pending']
 */
export function analysisSteps(stage: EtapaDaAnalise | null) {
  const current = Math.max(
    0,
    STEPS.findIndex((step) => step.stage === stage)
  );
  return STEPS.map((step, index) => ({
    label: step.label,
    state: (index < current ? 'done' : index === current ? 'doing' : 'pending') as StepState,
  }));
}
