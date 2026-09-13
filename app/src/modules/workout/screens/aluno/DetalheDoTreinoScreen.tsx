import { gruposDoTreino } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlvoDoVidro } from '@/components/ui/AlvoDoVidro';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { BrilhoAmbiente } from '@/components/ui/BrilhoAmbiente';
import { Chip } from '@/components/ui/Chip';
import { FundoDeFoto, RECEITA_DA_HOME } from '@/components/ui/FundoDeFoto';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { LinhaDoExercicio } from '../../components/aluno/LinhaDoExercicio';
import { useDetalheDoTreino } from '../../hooks/useDetalheDoTreino';
import { comModo } from '../../services/visaoDoAluno';

/**
 * O treino antes de começar, na visão do aluno — tela 3 do fluxo do kit.
 *
 * A do especialista continua em `WorkoutDetailsScreen`, com a edição de cada
 * exercício. O botão de compartilhar do kit não entrou: não existe o que
 * compartilhar de um treino ainda não feito, e botão sem ação é pior que
 * botão ausente.
 *
 * @example
 * <DetalheDoTreinoScreen treinoId={id} modo={mode} />
 */
const MARGEM_DO_FUNDO = 16;

interface DetalheDoTreinoScreenProps {
  treinoId: string;
  modo?: string;
}

export function DetalheDoTreinoScreen({ treinoId, modo }: DetalheDoTreinoScreenProps) {
  const router = useRouter();
  const cores = useCores();
  const escalar = useEscala();
  const insets = useSafeAreaInsets();
  const { treino, naoEncontrado } = useDetalheDoTreino(treinoId);

  if (!treino) {
    return (
      <ScreenLayout className="items-center justify-center">
        {naoEncontrado ? (
          <Text className="text-corpo text-muted-foreground">Treino não encontrado.</Text>
        ) : (
          <ActivityIndicator color={cores.primary} />
        )}
      </ScreenLayout>
    );
  }

  const exercicios = treino.exercises ?? [];

  return (
    <ScreenLayout useSafeArea={false}>
      <AlvoDoVidro
        fundo={
          <>
            <FundoDeFoto imagem={fotoDoGrupo(treino.muscle_group)} receita={RECEITA_DA_HOME} />
            <BrilhoAmbiente />
          </>
        }
      >
        <ScrollView
          contentContainerClassName="px-4 pb-32 pt-14"
          showsVerticalScrollIndicator={false}
        >
          <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={router.back} />

          <View className="mt-[3.625rem]">
            <View className="mb-2.5 flex-row flex-wrap gap-1.5">
              {gruposDoTreino(treino).map((grupo) => (
                <Chip key={grupo}>{grupo}</Chip>
              ))}
            </View>
            <Text className="text-[1.875rem] font-bold leading-tight tracking-tight text-hero">
              {treino.title}
            </Text>
            {treino.description ? (
              <Text className="mt-[0.4375rem] text-[0.84375rem] leading-snug text-hero-secondary">
                {treino.description}
              </Text>
            ) : null}
          </View>

          <TituloDeSecao estilo="rotulo" acao={`${exercicios.length} movimentos planejados`}>
            Lista de exercícios
          </TituloDeSecao>
          {exercicios.map((item, indice) => (
            <LinhaDoExercicio key={item.id} item={item} ordem={indice + 1} />
          ))}
        </ScrollView>

        {exercicios.length > 0 ? (
          // O kit põe o botão a 100 do fundo, acima da tab bar. Aqui o detalhe é
          // rota imersiva (`immersiveRoutes.ts`) e a tab bar some: o botão desce
          // para junto do fundo, acima da área do sistema — medida, não classe.
          <View
            className="absolute left-[1.125rem] right-[1.125rem]"
            style={{ bottom: insets.bottom + escalar(MARGEM_DO_FUNDO) }}
          >
            <BotaoDeDestaque
              rotulo="Iniciar treino"
              icone="play"
              onPress={() => router.push(comModo(ROUTES.WORKOUTS.EXECUTE(treino.id), modo))}
            />
          </View>
        ) : null}
      </AlvoDoVidro>
    </ScreenLayout>
  );
}
