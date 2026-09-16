import {
  type BodyScanRecord,
  type ComparableField,
  compareScans,
  formatarDecimal,
  localDateOf,
  type PostureFinding,
  shortMonthOf,
} from '@elevapro/shared';
import { avaliarConfianca, type ConfiancaDoScan, type NivelDeConfianca } from './confiancaDoScan';

/**
 * O que as telas 6, 7 e 8 do body scan mostram de uma linha de `body_scans`
 * (#316). Puro: as telas só desenham.
 *
 * A leitura sai sempre da linha gravada, a mesma para a análise que acabou de
 * sair e para a que o histórico abre. Duas fontes para a mesma análise é como
 * uma delas passa a mentir.
 */

export type Tone = 'ok' | 'attention' | 'bad' | 'neutral';

/**
 * A data do scan no dia de quem lê: "12 ago 2026", ou "12 ago" sem o ano.
 *
 * `scanned_at` é instante de verdade; fatiado em UTC, a análise feita à noite
 * no Brasil apareceria no dia seguinte.
 *
 * @example scanDate('2026-08-12T13:00:00Z') // "12 ago 2026"
 */
export function scanDate(instant: string, withYear = true): string {
  const day = localDateOf(new Date(instant));
  const short = `${Number(day.slice(8, 10))} ${shortMonthOf(day)}`;
  return withYear ? `${short} ${day.slice(0, 4)}` : short;
}

/** O rótulo e o tom de cada nível do selo de confiança. */
export const CONFIDENCE_TAG: Record<NivelDeConfianca, { label: string; tone: Tone }> = {
  alta: { label: 'Captura confiável', tone: 'ok' },
  media: { label: 'Confiança parcial', tone: 'attention' },
  baixa: { label: 'Melhor repetir', tone: 'bad' },
};

/**
 * A confiança de uma análise gravada. `self` e `anamnese` são altura declarada,
 * e é essa a ressalva que o selo conhece como `informed` (ADR-0030).
 *
 * @example scanConfidence(scan).nivel // "media"
 */
export function scanConfidence(scan: BodyScanRecord): ConfiancaDoScan {
  return avaliarConfianca({
    vereditos: {
      quality_backlit: scan.quality_backlit,
      quality_low_light: scan.quality_low_light,
      quality_blown_out: scan.quality_blown_out,
      framing_confirmed: scan.framing_confirmed,
    },
    troncoRotacionado: scan.trunk_rotated,
    escala:
      scan.scale_source === null
        ? null
        : scan.scale_source === 'assessment'
          ? 'assessment'
          : 'informed',
  });
}

/**
 * A etiqueta do achado. O rótulo vem do modelo e pode sair da lista; nesse
 * caso aparece como veio, em tom neutro, em vez de o achado sumir.
 *
 * @example riskTag('MODERADO') // { label: 'Atenção', tone: 'attention' }
 */
export function riskTag(risk: string): { label: string; tone: Tone } {
  switch (risk.trim().toUpperCase()) {
    case 'ÓTIMO':
    case 'BOM':
    case 'NORMAL':
      return { label: 'Tudo certo', tone: 'ok' };
    case 'MODERADO':
      return { label: 'Atenção', tone: 'attention' };
    case 'ALTO':
    case 'ALTO RISCO':
      return { label: 'Atenção alta', tone: 'bad' };
    default:
      return { label: risk, tone: 'neutral' };
  }
}

export interface ScanReading {
  title: string;
  subtitle: string;
  confidence: ConfiancaDoScan;
  scores: { label: string; value: number }[];
  findings: (PostureFinding & { tag: { label: string; tone: Tone } })[];
  recommendation: string | null;
}

const SCALE_TEXT: Record<NonNullable<BodyScanRecord['scale_source']>, string> = {
  assessment: 'escala pela altura medida',
  self: 'escala pela altura declarada',
  anamnese: 'escala pela altura declarada',
};

const VIEWS = ['front', 'back', 'side'] as const;

/**
 * A tela 6: o selo, as notas e os achados das três vistas numa lista só.
 *
 * @example scanReading(scan).subtitle // "12 ago 2026 · 3 fotos · escala pela altura medida"
 */
export function scanReading(scan: BodyScanRecord): ScanReading {
  const parts = [scanDate(scan.scanned_at), '3 fotos'];
  if (scan.scale_source) parts.push(SCALE_TEXT[scan.scale_source]);
  const scores = [
    { label: 'Simetria', value: scan.posture_symmetry_score },
    { label: 'Muscular', value: scan.posture_muscle_score },
    { label: 'Postura', value: scan.posture_overall_score },
  ].filter((score): score is { label: string; value: number } => score.value != null);

  return {
    title: 'Leitura das fotos',
    subtitle: parts.join(' · '),
    confidence: scanConfidence(scan),
    scores: scores.map((score) => ({ ...score, value: clampScore(score.value) })),
    findings: VIEWS.flatMap((view) => scan.posture_feedback?.[view] ?? []).map((finding) => ({
      ...finding,
      tag: riskTag(finding.risk),
    })),
    recommendation: scan.recommendations?.trim() || null,
  };
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export interface MeasureRow {
  label: string;
  value: string;
  unit: string;
  /** A diferença para a análise anterior, ou `null` sem comparação. */
  delta: number | null;
}

export interface ScanMeasures {
  /** "12 mai", a data da análise comparada, ou `null` sem comparação. */
  comparedWith: string | null;
  composition: MeasureRow[];
  circumferences: MeasureRow[];
}

type Field = ComparableField & keyof BodyScanRecord;

const COMPOSITION: { field: Field; label: string; unit: string }[] = [
  { field: 'weight_kg', label: 'Peso', unit: 'kg' },
  { field: 'body_fat_pct', label: 'Gordura', unit: '%' },
  { field: 'lean_mass_kg', label: 'Massa magra', unit: 'kg' },
  { field: 'bmi', label: 'IMC', unit: '' },
];

/** A ordem do kit, e depois as duas que o kit não desenha e o scan mede. */
const CIRCUMFERENCES: { field: Field; label: string }[] = [
  { field: 'circ_shoulders', label: 'Ombro' },
  { field: 'circ_chest', label: 'Peito' },
  { field: 'circ_waist', label: 'Cintura' },
  { field: 'circ_hips', label: 'Quadril' },
  { field: 'circ_arms', label: 'Braço' },
  { field: 'circ_thighs', label: 'Coxa' },
  { field: 'circ_calves', label: 'Panturrilha' },
  { field: 'circ_neck', label: 'Pescoço' },
];

/**
 * A tela 7: composição e circunferências, contra a análise anterior.
 *
 * A comparação passa pelo `compareScans`, que recusa lentes diferentes: sem
 * delta nenhum, a tela não diz "vs." de uma análise que não se compara.
 *
 * @example scanMeasures(scans[0], scans[1]).circumferences[0] // { label: 'Ombro', value: '121', unit: 'cm', delta: 1.6 }
 */
export function scanMeasures(scan: BodyScanRecord, previous: BodyScanRecord | null): ScanMeasures {
  const deltas = previous ? compareScans(scan, previous) : [];
  const deltaOf = (field: Field) => deltas.find((delta) => delta.field === field)?.change ?? null;
  const row = (field: Field, label: string, unit: string): MeasureRow | null => {
    const value = scan[field];
    if (value == null) return null;
    return { label, value: formatarDecimal(value), unit, delta: deltaOf(field) };
  };

  return {
    comparedWith: previous && deltas.length > 0 ? scanDate(previous.scanned_at, false) : null,
    composition: COMPOSITION.map(
      (item) => row(item.field, item.label, item.unit) ?? { ...item, value: '—', delta: null }
    ),
    circumferences: CIRCUMFERENCES.map((item) => row(item.field, item.label, 'cm')).filter(
      (item): item is MeasureRow => item !== null
    ),
  };
}

/**
 * A análise anterior a uma dada, na lista do mais recente para o mais antigo.
 *
 * @example previousScan(scans, scans[0].id) === scans[1]
 */
export function previousScan(scans: readonly BodyScanRecord[], id: string): BodyScanRecord | null {
  const index = scans.findIndex((scan) => scan.id === id);
  return index < 0 ? null : (scans[index + 1] ?? null);
}

/** Quantas análises o gráfico do histórico mostra. */
export const CHART_LIMIT = 6;

export interface HistoryRow {
  id: string;
  date: string;
  summary: string;
  tag: { label: string; tone: Tone };
}

export interface ScanHistoryView {
  /** Gordura estimada, da mais antiga para a mais recente. */
  chart: { labels: string[]; values: number[] };
  /** A diferença entre a primeira e a última do gráfico, sem julgamento. */
  change: string | null;
  rows: HistoryRow[];
}

/**
 * A tela 8. O gráfico é da gordura, que é o que o scan estima: o peso da linha
 * vem da Escala, e desenhá-lo como "estimado por imagem" seria falso.
 *
 * @example scanHistoryView(scans).chart.values // [20.4, 18.3, 17.2]
 */
export function scanHistoryView(scans: readonly BodyScanRecord[]): ScanHistoryView {
  const charted = fatPoints(scans).slice(0, CHART_LIMIT).reverse();
  return {
    chart: {
      labels: charted.map((point) => shortMonthOf(localDateOf(new Date(point.at)))),
      values: charted.map((point) => point.fat),
    },
    change: changeText(charted),
    rows: scans.map((scan) => ({
      id: scan.id,
      date: scanDate(scan.scanned_at),
      summary: scanSummary(scan),
      tag: CONFIDENCE_TAG[scanConfidence(scan).nivel],
    })),
  };
}

interface FatPoint {
  at: string;
  fat: number;
}

/** As análises com gordura estimada, na ordem da lista. */
function fatPoints(scans: readonly BodyScanRecord[]): FatPoint[] {
  return scans.flatMap((scan) =>
    scan.body_fat_pct == null ? [] : [{ at: scan.scanned_at, fat: scan.body_fat_pct }]
  );
}

function changeText(charted: readonly FatPoint[]): string | null {
  const first = charted[0];
  const last = charted[charted.length - 1];
  if (charted.length < 2 || !first || !last) return null;
  const change = last.fat - first.fat;
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  return `Gordura estimada: ${sign}${formatarDecimal(Math.abs(change))} pontos entre ${scanDate(first.at, false)} e ${scanDate(last.at, false)}.`;
}

/**
 * O resumo da linha, com cada número dizendo de onde veio: o peso é conhecido
 * — veio da Escala —, e a gordura é o modelo estimando a partir da foto.
 *
 * @example scanSummary(scan) // "78,4 kg · ~17,2% gordura (est.)"
 */
export function scanSummary(scan: BodyScanRecord): string {
  const parts: string[] = [];
  if (scan.weight_kg != null) parts.push(`${formatarDecimal(scan.weight_kg)} kg`);
  if (scan.body_fat_pct != null)
    parts.push(`~${formatarDecimal(scan.body_fat_pct)}% gordura (est.)`);
  return parts.join(' · ');
}
