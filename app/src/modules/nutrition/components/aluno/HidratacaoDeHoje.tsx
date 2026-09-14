import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import type { AguaDoDiaDoAluno } from '../../hooks/useAguaDoDia';
import { litros } from '../../services/aguaDoDia';

/**
 * "Hidratação de hoje" do kit: oito copos, a meta e o que falta.
 *
 * O copo cheio usa a cor de carboidrato do kit (`--mc`) a 22%, com a borda na
 * própria cor. Tocar num copo enche até ele; tocar no último cheio o esvazia.
 *
 * @example
 * <HidratacaoDeHoje agua={useAguaDoDia(alunoId, { somenteLeitura })} />
 */
export function HidratacaoDeHoje({ agua }: { agua: AguaDoDiaDoAluno }) {
  const { copos, metaMl } = agua;

  return (
    <>
      <TituloDeSecao estilo="rotulo" acao={`Meta ${litros(metaMl)}`}>
        Hidratação de hoje
      </TituloDeSecao>
      <Vidro className="p-4">
        <View className="flex-row gap-1.5">
          {Array.from({ length: copos.total }, (_, indice) => indice).map((indice) => (
            <Copo
              key={`copo-${indice + 1}`}
              cheio={indice < copos.cheios}
              numero={indice + 1}
              onPress={() => agua.tocar(indice)}
            />
          ))}
        </View>
        <Text className="mt-[0.6875rem] text-[0.75rem] text-muted-foreground">
          {`${copos.cheios} de ${copos.total} copos · ${
            copos.faltamMl > 0 ? `faltam ${copos.faltamMl} ml` : 'meta do dia fechada'
          }`}
        </Text>
      </Vidro>
    </>
  );
}

function Copo({ cheio, numero, onPress }: { cheio: boolean; numero: number; onPress: () => void }) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Copo ${numero}${cheio ? ', cheio' : ''}`}
      className={cn(
        'h-[2.875rem] flex-1 items-center justify-center rounded-[0.6875rem] border',
        cheio
          ? 'border-metrica-carboidrato bg-metrica-carboidrato/20'
          : 'border-transparent bg-glass-strong'
      )}
    >
      <Ionicons
        name="water"
        size={escalar(16)}
        color={cheio ? cores.textoCarboidrato : cores.placeholder}
      />
    </TouchableOpacity>
  );
}
