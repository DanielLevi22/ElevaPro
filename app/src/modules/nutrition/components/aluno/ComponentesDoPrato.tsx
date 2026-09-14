import type { ComponenteDoPrato } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

interface ComponentesDoPratoProps {
  componentes: ComponenteDoPrato[];
  onAjustar: (indice: number, deltaGramas: number) => void;
}

const PASSO_EM_GRAMAS = 10;

/**
 * "Componentes detectados" do scan: o que o modelo separou no prato, com as
 * gramas e as kcal de cada um, e "Ajustar porções" para corrigir a estimativa.
 *
 * O ajuste é de 10 em 10 g: a foto não dá precisão maior que essa, e o toque
 * repetido chega em qualquer porção de prato.
 *
 * @example
 * <ComponentesDoPrato componentes={scan.componentes} onAjustar={scan.ajustarPorcao} />
 */
export function ComponentesDoPrato({ componentes, onAjustar }: ComponentesDoPratoProps) {
  const [ajustando, setAjustando] = useState(false);
  if (componentes.length === 0) return null;

  return (
    <>
      <TituloDeSecao
        estilo="rotulo"
        acao={ajustando ? 'Pronto' : 'Ajustar porções'}
        onAcao={() => setAjustando((atual) => !atual)}
      >
        Componentes detectados
      </TituloDeSecao>
      {componentes.map((componente, indice) => (
        <LinhaDoComponente
          key={componente.name}
          componente={componente}
          ajustando={ajustando}
          onAjustar={(delta) => onAjustar(indice, delta)}
        />
      ))}
    </>
  );
}

interface LinhaDoComponenteProps {
  componente: ComponenteDoPrato;
  ajustando: boolean;
  onAjustar: (deltaGramas: number) => void;
}

function LinhaDoComponente({ componente, ajustando, onAjustar }: LinhaDoComponenteProps) {
  return (
    <Vidro classeExterna="mb-[0.5625rem]" className="flex-row items-center gap-3 p-[0.6875rem]">
      <View className="ml-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[0.84375rem] font-semibold text-foreground">
          {componente.name}
        </Text>
        <Text className="mt-px text-[0.71875rem] text-muted-foreground">{`${componente.grams} g`}</Text>
      </View>
      {ajustando ? (
        <View className="flex-row items-center gap-2">
          <BotaoDePorcao
            icone="remove"
            rotulo={`Menos ${componente.name}`}
            onPress={() => onAjustar(-PASSO_EM_GRAMAS)}
          />
          <BotaoDePorcao
            icone="add"
            rotulo={`Mais ${componente.name}`}
            onPress={() => onAjustar(PASSO_EM_GRAMAS)}
          />
        </View>
      ) : (
        <Text className="text-[0.78125rem] font-bold text-foreground">
          {`${Math.round(componente.calories)} kcal`}
        </Text>
      )}
    </Vidro>
  );
}

function BotaoDePorcao({
  icone,
  rotulo,
  onPress,
}: {
  icone: 'add' | 'remove';
  rotulo: string;
  onPress: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      className="h-7 w-7 items-center justify-center rounded-full bg-glass-strong"
    >
      <Ionicons name={icone} size={escalar(16)} color={cores.foreground} />
    </TouchableOpacity>
  );
}
