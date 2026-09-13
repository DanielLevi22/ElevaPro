import { type LayoutChangeEvent, View } from 'react-native';
import { BlocoDeMetrica } from '@/components/ui/BlocoDeMetrica';
import { PERCENTUAL_COMPLETO, type SaudeDoDia } from '../types';

/**
 * Passos, calorias e sono, em três blocos de vidro de mesma altura.
 *
 * Com a saúde em modo simulado cada bloco leva o selo "Simulado". A home
 * anterior dizia isso num selo da seção; a reescrita o tinha perdido, e o
 * número de mentira que o app usa sem relógio lia como leitura real.
 *
 * @example
 * <BlocosDaSaude saude={saude} onLayout={(e) => medir(e.nativeEvent.layout.y)} />
 */
interface BlocosDaSaudeProps {
  saude: SaudeDoDia;
  /** A luz de fundo se ancora no topo destes blocos. */
  onLayout: (evento: LayoutChangeEvent) => void;
}

const META_DE_PASSOS = 10000;
const MINUTOS_POR_HORA = 60;

export function BlocosDaSaude({ saude, onLayout }: BlocosDaSaudeProps) {
  const selo = saude.source === 'mock' ? 'Simulado' : undefined;
  const percentualDePassos = Math.round((saude.steps / META_DE_PASSOS) * PERCENTUAL_COMPLETO);

  return (
    <View className="flex-row items-stretch gap-2.5" onLayout={onLayout}>
      <BlocoDeMetrica
        icon="footsteps"
        tom="passos"
        valor={saude.steps.toLocaleString('pt-BR')}
        unidade="passos"
        legenda={`${percentualDePassos}% da meta`}
        selo={selo}
      />
      <BlocoDeMetrica
        icon="flame"
        tom="calorias"
        valor={`${saude.calories}`}
        unidade="kcal"
        legenda="Queimadas hoje"
        selo={selo}
      />
      <BlocoDeMetrica
        icon="moon"
        tom="sono"
        valor={emHoras(saude.sleepMinutes)}
        legenda="Sono"
        selo={selo}
      />
    </View>
  );
}

/** Sono vem em minutos; "7h20" é como a pessoa fala, e "440" não é. */
export function emHoras(minutos: number | null): string {
  if (!minutos) return '—';
  const horas = Math.floor(minutos / MINUTOS_POR_HORA);
  const resto = String(minutos % MINUTOS_POR_HORA).padStart(2, '0');
  return `${horas}h${resto}`;
}
