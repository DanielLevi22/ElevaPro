import { memo } from 'react';
import { Text, View } from 'react-native';

interface RelogioDaSessaoProps {
  /** Já formatado: o dono do formato é quem conta o tempo. */
  tempo: string;
  calorias: number;
  metaEmMinutos: number | null;
  met: number;
}

/** Aro do cronômetro. Não muda nunca, então não volta a ser criado a cada tique. */
const ARO = (
  <View className="absolute w-full h-full rounded-full border-8 border-orange-500 opacity-20" />
);

/**
 * Cronômetro e gasto calórico da sessão.
 *
 * Componente memoizado de propósito: ele re-renderiza a cada segundo, e sem o
 * corte aqui a tela inteira — cabeçalho, metas, controles e o traçado do
 * percurso — re-renderizaria junto.
 */
export const RelogioDaSessao = memo(function RelogioDaSessao({
  tempo,
  calorias,
  metaEmMinutos,
  met,
}: RelogioDaSessaoProps) {
  return (
    <View className="items-center justify-center">
      <View className="w-64 h-64 rounded-full border-8 border-zinc-800 items-center justify-center mb-8 relative">
        {ARO}
        <Text className="text-6xl font-mono font-bold text-white tracking-tighter">{tempo}</Text>
        <Text className="text-zinc-500 text-sm font-bold uppercase mt-2">
          {metaEmMinutos === null ? 'Duração' : `Meta: ${metaEmMinutos} min`}
        </Text>
      </View>

      <View className="flex-row items-end">
        <Text className="text-5xl font-bold text-white font-display">{Math.round(calorias)}</Text>
        <Text className="text-zinc-500 text-lg font-bold mb-2 ml-2">kcal</Text>
      </View>
      <Text className="text-zinc-600 text-xs mt-1">Estimado (~{met} METs)</Text>
    </View>
  );
});
