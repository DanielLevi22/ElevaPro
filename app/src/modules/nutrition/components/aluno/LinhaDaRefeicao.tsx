import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { IconeDaRefeicao } from './IconeDaRefeicao';

/**
 * Uma refeição de hoje: imagem, nome, horário, o que tem no prato, kcal e o
 * check de feita.
 *
 * A linha abre o detalhe; o círculo marca. São dois alvos porque "abrir para
 * ver" e "já comi" são intenções diferentes, e juntar as duas faria o aluno
 * marcar sem querer toda vez que fosse só olhar.
 *
 * @example
 * <LinhaDaRefeicao nome="Almoço" horario="12:40" resumo="Frango, arroz" calorias={740}
 *   feita={false} onAbrir={abrir} onMarcar={marcar} />
 */
interface LinhaDaRefeicaoProps {
  nome: string;
  horario: string | null;
  resumo: string;
  calorias: number;
  feita: boolean;
  onAbrir: () => void;
  onMarcar: () => void;
}

const TAMANHO_DO_CHECK = 14;

export function LinhaDaRefeicao({
  nome,
  horario,
  resumo,
  calorias,
  feita,
  onAbrir,
  onMarcar,
}: LinhaDaRefeicaoProps) {
  return (
    <TouchableOpacity
      onPress={onAbrir}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${nome}${horario ? `, ${horario}` : ''}, ${calorias} calorias`}
      className="mb-[0.5625rem]"
    >
      <Vidro className="flex-row items-center gap-3 p-[0.6875rem]">
        <IconeDaRefeicao nome={nome} />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-baseline gap-[0.4375rem]">
            <Text
              numberOfLines={1}
              className="shrink text-[0.90625rem] font-semibold tracking-tight text-foreground"
            >
              {nome}
            </Text>
            {horario ? <Text className="text-[0.6875rem] text-placeholder">{horario}</Text> : null}
          </View>
          <Text numberOfLines={1} className="mt-0.5 text-[0.75rem] text-muted-foreground">
            {resumo}
          </Text>
        </View>
        <View className="items-end gap-[0.3125rem]">
          <Text className="text-[0.78125rem] font-bold text-foreground">{calorias}</Text>
          <CheckDaRefeicao feita={feita} nome={nome} onMarcar={onMarcar} />
        </View>
      </Vidro>
    </TouchableOpacity>
  );
}

function CheckDaRefeicao({
  feita,
  nome,
  onMarcar,
}: {
  feita: boolean;
  nome: string;
  onMarcar: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onMarcar}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityLabel={`Marcar ${nome} como feita`}
      accessibilityState={{ checked: feita }}
      className={cn(
        'h-6 w-6 items-center justify-center rounded-full',
        feita ? 'bg-metrica-proteina' : 'border-[0.09375rem] border-placeholder'
      )}
    >
      {feita ? (
        <Ionicons name="checkmark" size={escalar(TAMANHO_DO_CHECK)} color={cores.sobreMetrica} />
      ) : null}
    </TouchableOpacity>
  );
}
