import { filtrarEntradaNumerica } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, View } from 'react-native';
import { cn } from '@/lib/utils';
import { comOpacidade, useCores, useEscala } from '@/shared/design';

interface CampoProps {
  rotulo: string;
  valor: string;
  onChange: (texto: string) => void;
  unidade?: string;
  placeholder?: string;
  /** O formato esperado, com exemplo. Sem ele o campo está certo ou vazio. */
  erro?: string;
  /** Teclado numérico com vírgula: idade, altura, peso. */
  numerico?: boolean;
}

const ICONE_DO_ERRO = 14;
/** O halo do erro no kit: `tint(RED, 16)`. */
const HALO = 0.16;

/**
 * O campo de número do kit (`Campo`): rótulo em mono, o valor grande em display
 * e a unidade à direita. Fora da faixa, a borda e o halo vermelhos e o formato
 * esperado embaixo.
 *
 * @example <Campo rotulo="Altura" valor={altura} onChange={setAltura} unidade="cm" numerico erro={erros.height} />
 */
export function Campo({
  rotulo,
  valor,
  onChange,
  unidade,
  placeholder = '—',
  erro,
  numerico = false,
}: CampoProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="min-w-0 flex-1">
      <Text className="mb-1.5 pl-0.5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
        {rotulo}
      </Text>
      <View
        className={cn(
          'h-[3.25rem] flex-row items-center gap-2 rounded-[0.875rem] border bg-glass px-3.5',
          erro ? 'border-destructive' : 'border-glass-border'
        )}
        style={
          erro ? { boxShadow: `0 0 0 3px ${comOpacidade(cores.destructive, HALO)}` } : undefined
        }
      >
        <TextInput
          value={valor}
          // O teclado numérico é dica: colar e teclado físico entram por fora dele.
          onChangeText={(texto) => onChange(numerico ? filtrarEntradaNumerica(texto) : texto)}
          placeholder={placeholder}
          placeholderTextColor={cores.placeholder}
          keyboardType={numerico ? 'decimal-pad' : 'default'}
          accessibilityLabel={unidade ? `${rotulo} em ${unidade}` : rotulo}
          accessibilityHint={erro}
          className="flex-1 font-display-black text-[1.25rem] tracking-tight text-hero"
        />
        {unidade ? (
          <Text className="text-[0.78125rem] font-semibold text-placeholder">{unidade}</Text>
        ) : null}
      </View>
      {erro ? (
        <View className="mt-[0.4375rem] flex-row items-start gap-1.5">
          <Ionicons
            name="alert-circle-outline"
            size={escalar(ICONE_DO_ERRO)}
            color={cores.destructive}
          />
          <Text className="flex-1 text-[0.71875rem] leading-[0.97rem] text-hero-secondary">
            <Text className="font-bold text-hero">Fora da faixa. </Text>
            {erro}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export type { CampoProps };
