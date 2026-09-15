import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { useCores, useEscala } from '@/shared/design';

/**
 * O topo da execução e do descanso: fechar, o nome do treino, o tempo correndo
 * e os dois botões de voz.
 *
 * O kit desenha música e reticências no topo do descanso. Não entraram: o app
 * não toca música e não tem menu ali, e botão sem ação é pior que botão ausente.
 * Os de voz e microfone valem nas duas telas, porque o treino ouve e fala nas
 * duas.
 *
 * @example
 * <TopoDaSessao titulo={treino.title} tempo="18:24" voz={voz} onFechar={encerrar} />
 */
interface TopoDaSessaoProps {
  titulo: string;
  /** Já formatado: "18:24". */
  tempo: string;
  voz: { mudo: boolean; alternarMudo: () => void; ouvindo: boolean; alternarMicrofone: () => void };
  onFechar: () => void;
}

const TAMANHO_DO_RELOGIO = 12;

export function TopoDaSessao({ titulo, tempo, voz, onFechar }: TopoDaSessaoProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="flex-row items-center gap-3">
      <BotaoRedondo icone="x" rotulo="Encerrar o treino" onPress={onFechar} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-base font-bold tracking-tight text-hero">
          {titulo}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-[0.3125rem]">
          <Ionicons
            name="time-outline"
            size={escalar(TAMANHO_DO_RELOGIO)}
            color={cores.onHeroSecondary}
          />
          <Text className="text-micro text-hero-secondary">{tempo} em execução</Text>
        </View>
      </View>
      <BotaoRedondo
        icone={voz.mudo ? 'volume-x' : 'volume-2'}
        rotulo={voz.mudo ? 'Ligar a voz do treino' : 'Silenciar a voz do treino'}
        onPress={voz.alternarMudo}
      />
      <BotaoRedondo
        icone={voz.ouvindo ? 'mic' : 'mic-off'}
        rotulo={voz.ouvindo ? 'Parar de ouvir comandos' : 'Ouvir comandos de voz'}
        onPress={voz.alternarMicrofone}
      />
    </View>
  );
}
