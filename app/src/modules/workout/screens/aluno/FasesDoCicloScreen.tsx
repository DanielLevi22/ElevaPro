import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { AlvoDoVidro } from '@/components/ui/AlvoDoVidro';
import { BrilhoAmbiente } from '@/components/ui/BrilhoAmbiente';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { FundoDeFoto, RECEITA_DA_HOME } from '@/components/ui/FundoDeFoto';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoObjetivo } from '@/shared/imagens/fotosDeTreino';
import { CartaoDaFase } from '../../components/aluno/CartaoDaFase';
import { CartaoDoCiclo } from '../../components/aluno/CartaoDoCiclo';
import { useFasesDoCiclo } from '../../hooks/useFasesDoCiclo';
import { comModo } from '../../services/visaoDoAluno';

/**
 * As fases do ciclo, na visão do aluno — tela 1 do fluxo de treino do kit.
 *
 * A do especialista continua em `PeriodizationDetailsScreen`, com ativar,
 * encerrar e criar fase. As duas liam o papel com `isStudentView` em cada
 * botão; separadas, cada uma tem só o que o papel dela faz.
 *
 * @example
 * <FasesDoCicloScreen periodizacaoId={id} alunoId={user.id} modo={mode} />
 */
interface FasesDoCicloScreenProps {
  periodizacaoId: string;
  alunoId: string;
  /** `execute` quando quem abre é o membro treinando o próprio plano. */
  modo?: string;
}

export function FasesDoCicloScreen({ periodizacaoId, alunoId, modo }: FasesDoCicloScreenProps) {
  const router = useRouter();
  const cores = useCores();
  const { periodizacao, fases, especialista, carregando } = useFasesDoCiclo(
    periodizacaoId,
    alunoId
  );

  if (!periodizacao) {
    return (
      <ScreenLayout className="items-center justify-center">
        {carregando ? (
          <ActivityIndicator color={cores.primary} />
        ) : (
          <Text className="text-corpo text-muted-foreground">Ciclo não encontrado.</Text>
        )}
      </ScreenLayout>
    );
  }

  const treinos = fases.reduce((soma, fase) => soma + (fase.workouts_count ?? 0), 0);

  return (
    <ScreenLayout useSafeArea={false}>
      <AlvoDoVidro
        fundo={
          <>
            <FundoDeFoto
              imagem={fotoDoObjetivo(periodizacao.objective)}
              receita={RECEITA_DA_HOME}
            />
            <BrilhoAmbiente />
          </>
        }
      >
        <ScrollView
          contentContainerClassName="px-4 pb-28 pt-14"
          showsVerticalScrollIndicator={false}
        >
          <CabecalhoSobreFoto
            sobrelinha="Periodização"
            titulo={periodizacao.name}
            onVoltar={router.back}
          />
          <CartaoDoCiclo
            periodizacao={periodizacao}
            fases={fases.length}
            treinos={treinos}
            especialista={especialista}
          />

          <TituloDeSecao estilo="rotulo">Fases</TituloDeSecao>
          {fases.map((fase, indice) => (
            <CartaoDaFase
              key={fase.id}
              fase={fase}
              numero={indice + 1}
              onPress={() =>
                router.push(comModo(ROUTES.WORKOUTS.PHASE(periodizacaoId, fase.id), modo))
              }
            />
          ))}
          {fases.length === 0 && !carregando ? (
            <View className="items-center py-8">
              <Text className="text-micro text-muted-foreground">
                Seu especialista ainda não montou as fases deste ciclo.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </AlvoDoVidro>
    </ScreenLayout>
  );
}
