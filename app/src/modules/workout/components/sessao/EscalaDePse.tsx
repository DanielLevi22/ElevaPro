import { PSE_MAX, SENSACOES, type Sensacao, sensacaoDaPse } from '@elevapro/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * "Intensidade percebida" em dez blocos e a "Sensação" em três cartões — as
 * duas formas de o aluno dizer o mesmo número.
 *
 * Só a PSE é estado. A sensação acesa é derivada dela (`sensacaoDaPse`), e
 * tocar num cartão move a PSE para o meio da faixa. Guardar as duas deixaria o
 * aluno com "8" e "Leve" acesos ao mesmo tempo depois de mexer nos blocos.
 *
 * @example
 * <EscalaDePse pse={pse} onMudar={setPse} />
 */
interface EscalaDePseProps {
  pse: number;
  onMudar: (pse: number) => void;
}

/** Os blocos acesos sobem de 45% a 100% de opacidade, como no kit. */
const OPACIDADE_INICIAL = 0.45;
const PASSO_DE_OPACIDADE = 0.08;

const ICONE_DA_SENSACAO: Record<Sensacao['chave'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  leve: 'emoticon-happy-outline',
  na_medida: 'emoticon-neutral-outline',
  puxado: 'fire',
};

const TAMANHO_DO_ICONE = 21;

/** 1 a 10: o valor de cada bloco é também a sua identidade. */
const VALORES_DA_PSE = Array.from({ length: PSE_MAX }, (_, indice) => indice + 1);

export function EscalaDePse({ pse, onMudar }: EscalaDePseProps) {
  return (
    <>
      <Vidro classeExterna="mt-[1.375rem]" className="p-4">
        <View className="mb-2.5 flex-row items-baseline justify-between">
          <Text className="text-[0.84375rem] font-bold text-foreground">Intensidade percebida</Text>
          <Text className="font-display-black text-lg text-primary-text">{pse}</Text>
        </View>
        <View className="flex-row gap-1">
          {VALORES_DA_PSE.map((valor) => (
            <BlocoDaPse key={valor} valor={valor} aceso={valor <= pse} onPress={onMudar} />
          ))}
        </View>
        <View className="mt-2 flex-row justify-between">
          <Text className="text-[0.6875rem] text-placeholder">Tranquilo</Text>
          <Text className="text-[0.6875rem] text-placeholder">Máximo esforço</Text>
        </View>
      </Vidro>

      <TituloDeSecao estilo="rotulo">Sensação</TituloDeSecao>
      <View className="flex-row gap-[0.5625rem]">
        {SENSACOES.map((sensacao) => (
          <CartaoDeSensacao
            key={sensacao.chave}
            sensacao={sensacao}
            escolhida={sensacaoDaPse(pse).chave === sensacao.chave}
            onPress={() => onMudar(sensacao.pse)}
          />
        ))}
      </View>
    </>
  );
}

interface BlocoDaPseProps {
  valor: number;
  aceso: boolean;
  onPress: (valor: number) => void;
}

function BlocoDaPse({ valor, aceso, onPress }: BlocoDaPseProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress(valor)}
      accessibilityRole="button"
      accessibilityLabel={`Intensidade ${valor} de ${PSE_MAX}`}
      accessibilityState={{ selected: aceso }}
      className={cn(
        'h-[1.875rem] flex-1 items-center justify-center rounded-sm',
        aceso ? 'bg-primary' : 'bg-glass-strong'
      )}
      style={aceso ? { opacity: OPACIDADE_INICIAL + (valor - 1) * PASSO_DE_OPACIDADE } : undefined}
    >
      <Text
        className={cn(
          'text-[0.625rem] font-extrabold',
          aceso ? 'text-primary-foreground' : 'text-placeholder'
        )}
      >
        {valor}
      </Text>
    </TouchableOpacity>
  );
}

interface CartaoDeSensacaoProps {
  sensacao: Sensacao;
  escolhida: boolean;
  onPress: () => void;
}

function CartaoDeSensacao({ sensacao, escolhida, onPress }: CartaoDeSensacaoProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={sensacao.rotulo}
      accessibilityState={{ selected: escolhida }}
      className="flex-1"
    >
      <Vidro
        className={cn(
          'items-center gap-[0.4375rem] px-2 py-3.5',
          escolhida ? 'border-primary' : null
        )}
      >
        <MaterialCommunityIcons
          name={ICONE_DA_SENSACAO[sensacao.chave]}
          size={escalar(TAMANHO_DO_ICONE)}
          color={escolhida ? cores.primary : cores.mutedForeground}
        />
        <Text
          className={cn(
            'text-micro font-bold',
            escolhida ? 'text-primary-text' : 'text-muted-foreground'
          )}
        >
          {sensacao.rotulo}
        </Text>
      </Vidro>
    </TouchableOpacity>
  );
}
