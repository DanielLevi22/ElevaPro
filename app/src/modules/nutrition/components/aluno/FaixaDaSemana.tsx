import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useBrilho } from '@/shared/design';
import { semanaDe } from '../../services/aderenciaDaSemana';

/**
 * Os sete dias da semana do plano, de segunda a domingo, com o escolhido em
 * destaque.
 *
 * Mesma semana da tela de aderência (`semanaDe`), para o domingo não ser o
 * domingo anterior numa tela e o seguinte na outra. A tela antiga contava a
 * semana a partir do domingo.
 *
 * @example
 * <FaixaDaSemana hoje="2026-08-12" escolhida={data} onEscolher={setData} />
 */
interface FaixaDaSemanaProps {
  /** `YYYY-MM-DD` de hoje: define a semana. */
  hoje: string;
  /** `YYYY-MM-DD` do dia aberto. */
  escolhida: string;
  onEscolher: (data: string) => void;
}

const INICIAIS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const NOMES = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

/** O brilho do dia escolhido: `0 8px 22px -8px` da primária. */
const BRILHO_DO_ESCOLHIDO = { y: 8, blur: 22, espalhamento: -8 } as const;

export function FaixaDaSemana({ hoje, escolhida, onEscolher }: FaixaDaSemanaProps) {
  return (
    <View className="mt-4 flex-row gap-1.5">
      {semanaDe(hoje).map((data, i) => (
        <TouchableOpacity
          key={data}
          onPress={() => onEscolher(data)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${NOMES[i]}, dia ${Number(data.slice(8))}`}
          accessibilityState={{ selected: data === escolhida }}
          className="flex-1"
        >
          <Dia
            inicial={INICIAIS[i]}
            numero={Number(data.slice(8))}
            escolhido={data === escolhida}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Dia({
  inicial,
  numero,
  escolhido,
}: {
  inicial: string;
  numero: number;
  escolhido: boolean;
}) {
  const brilho = useBrilho();
  const miolo = 'items-center gap-[0.1875rem] rounded-[0.875rem] py-[0.5625rem]';

  if (!escolhido) {
    return (
      <Vidro classeExterna="rounded-[0.875rem]" className={miolo}>
        <Text className="text-[0.625rem] font-bold uppercase text-placeholder">{inicial}</Text>
        <Text className="font-display-black text-[0.875rem] text-foreground">{numero}</Text>
      </Vidro>
    );
  }
  return (
    <View className={`${miolo} bg-primary`} style={{ boxShadow: brilho(BRILHO_DO_ESCOLHIDO) }}>
      <Text className="text-[0.625rem] font-bold uppercase text-primary-foreground">{inicial}</Text>
      <Text className="font-display-black text-[0.875rem] text-primary-foreground">{numero}</Text>
    </View>
  );
}
