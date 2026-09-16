import type { Cores } from '@/shared/design';
import type { Tone } from '../services/scanView';

/**
 * Um tom do body scan em cada forma que as telas usam: o verde dos passos para
 * "tudo certo", o âmbar da gordura para atenção, o vermelho do batimento para
 * "melhor repetir".
 *
 * Uma tabela só, com as classes escritas por extenso: o Tailwind só gera classe
 * que aparece literal no fonte, e a tela antiga montava `bg-${cor}-500/10` e
 * saía sem fundo. Antes da tabela, o mesmo mapeamento estava em cinco lugares.
 *
 * @example cn('rounded-full', TONE_STYLE.attention.tagFill)
 */
interface ToneStyle {
  /** Fundo da etiqueta e da caixa de ícone, a 15%. */
  tagFill: string;
  /** Caixa de aviso: fundo a 10% e borda a 40%. */
  box: string;
  /** Fio que separa os motivos dentro da caixa, a 30%. */
  rule: string;
  /** Chip sobre a câmera: fundo a 20% e borda a 45%. */
  chip: string;
  dot: string;
  text: string;
  /** A cor do ícone, que não aceita classe. */
  icon: (cores: Cores) => string;
}

export const TONE_STYLE: Record<Tone, ToneStyle> = {
  ok: {
    tagFill: 'bg-metrica-passos/15',
    box: 'border-metrica-passos/40 bg-metrica-passos/10',
    rule: 'border-metrica-passos/30',
    chip: 'border-metrica-passos/45 bg-metrica-passos/20',
    dot: 'bg-metrica-passos',
    text: 'text-texto-saude-passos',
    icon: (cores) => cores.textoPassos,
  },
  attention: {
    tagFill: 'bg-metrica-gordura/15',
    box: 'border-metrica-gordura/40 bg-metrica-gordura/10',
    rule: 'border-metrica-gordura/30',
    chip: 'border-metrica-gordura/45 bg-metrica-gordura/20',
    dot: 'bg-metrica-gordura',
    text: 'text-texto-macro-gordura',
    icon: (cores) => cores.textoGordura,
  },
  bad: {
    tagFill: 'bg-metrica-batimento/15',
    box: 'border-metrica-batimento/40 bg-metrica-batimento/10',
    rule: 'border-metrica-batimento/30',
    chip: 'border-metrica-batimento/45 bg-metrica-batimento/20',
    dot: 'bg-metrica-batimento',
    text: 'text-texto-cardio-batimento',
    icon: (cores) => cores.textoBatimento,
  },
  neutral: {
    tagFill: 'bg-glass-strong',
    box: 'border-glass-border bg-glass-strong',
    rule: 'border-glass-border',
    chip: 'border-glass-border bg-glass-strong',
    dot: 'bg-placeholder',
    text: 'text-muted-foreground',
    icon: (cores) => cores.placeholder,
  },
};
