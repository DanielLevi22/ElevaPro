import { memo } from 'react';
import { Text, View } from 'react-native';
import type { Posicao } from '../services/percurso';
import { TracadoDaCorrida } from './TracadoDaCorrida';

interface MetricasDaCorridaProps {
  distanceMeters: number;
  paceSecondsPerKm: number | null;
  avgCadenceSpm: number | null;
  pontos: Posicao[];
  /** Falso quando o aluno negou a localização — a corrida roda sem medida. */
  temLocalizacao: boolean;
}

/** 9620 m → "9,62". Vírgula porque a tela é pt-BR. */
function emQuilometros(metros: number): string {
  return (metros / 1000).toFixed(2).replace('.', ',');
}

/** 374 s/km → "6'14"". */
function comoRitmo(segundosPorKm: number): string {
  const minutos = Math.floor(segundosPorKm / 60);
  const segundos = segundosPorKm % 60;
  return `${minutos}'${segundos < 10 ? '0' : ''}${segundos}"`;
}

const Medida = memo(function Medida({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View className="items-center flex-1">
      <Text className="text-white text-2xl font-bold font-display">{valor}</Text>
      <Text className="text-zinc-500 text-[10px] font-bold uppercase mt-1">{rotulo}</Text>
    </View>
  );
});

/**
 * Distância, ritmo, cadência e o desenho do percurso.
 *
 * O traçado aparece aqui e em nenhum outro lugar do produto: as coordenadas
 * vivem na memória da sessão e não são gravadas, então não há histórico de mapa
 * para reabrir depois (issue #278). Distância e ritmo, esses ficam.
 */
export const MetricasDaCorrida = memo(function MetricasDaCorrida({
  distanceMeters,
  paceSecondsPerKm,
  avgCadenceSpm,
  pontos,
  temLocalizacao,
}: MetricasDaCorridaProps) {
  if (!temLocalizacao) {
    return (
      <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <Text className="text-zinc-400 text-xs text-center">
          Sem acesso à localização. A corrida está sendo cronometrada, mas sem distância nem ritmo.
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
      <View className="flex-row">
        <Medida valor={emQuilometros(distanceMeters)} rotulo="km" />
        <Medida
          valor={paceSecondsPerKm === null ? '--' : comoRitmo(paceSecondsPerKm)}
          rotulo="ritmo médio"
        />
        <Medida valor={avgCadenceSpm === null ? '--' : String(avgCadenceSpm)} rotulo="cadência" />
      </View>

      <TracadoDaCorrida pontos={pontos} className="h-40 mt-4" />
    </View>
  );
});
