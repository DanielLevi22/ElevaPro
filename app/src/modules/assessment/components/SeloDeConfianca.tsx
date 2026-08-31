import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import type { ConfiancaDoScan, NivelDeConfianca } from '../services/confiancaDoScan';

/**
 * O quanto confiar nos números deste scan, antes de lê-los.
 *
 * Vem **antes** das medidas de propósito, pela mesma razão que a comparação vem
 * antes do valor absoluto: ressalva lida depois do número já chegou tarde — a
 * essa altura o aluno anotou "89 cm" e seguiu. Saber que a foto saiu contra a
 * luz muda como se lê a tela inteira.
 */

const APARENCIA: Record<
  NivelDeConfianca,
  {
    icone: 'checkmark-circle' | 'alert-circle' | 'warning';
    cor: string;
    caixa: string;
    rotulo: string;
  }
> = {
  alta: {
    icone: 'checkmark-circle',
    cor: '#34d399',
    caixa: 'bg-emerald-500/10 border-emerald-500/30',
    rotulo: 'Captura confiável',
  },
  media: {
    icone: 'alert-circle',
    cor: '#fbbf24',
    caixa: 'bg-amber-500/10 border-amber-500/30',
    rotulo: 'Confiança parcial',
  },
  baixa: {
    icone: 'warning',
    cor: '#fb7185',
    caixa: 'bg-rose-500/10 border-rose-500/30',
    rotulo: 'Melhor repetir',
  },
};

export function SeloDeConfianca({ confianca }: { confianca: ConfiancaDoScan }) {
  const aparencia = APARENCIA[confianca.nivel];

  return (
    <View className={`mt-6 rounded-2xl border p-5 ${aparencia.caixa}`}>
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons color={aparencia.cor} name={aparencia.icone} size={20} />
        <Text className="font-bold text-base text-white">{aparencia.rotulo}</Text>
      </View>

      <Text className="text-[15px] text-zinc-200 leading-6">{confianca.resumo}</Text>

      {confianca.motivos.length > 0 && (
        <View className="mt-3 gap-2">
          {confianca.motivos.map((motivo) => (
            <View className="flex-row gap-2" key={motivo}>
              <Text className="text-sm text-zinc-500">•</Text>
              <Text className="flex-1 text-sm text-zinc-300 leading-5">{motivo}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
