import { useRouter } from 'expo-router';
import { useState } from 'react';
import { type ImageSourcePropType, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ConfettiOverlay } from '@/components/gamification/ConfettiOverlay';
import { AlvoDoVidro } from '@/components/ui/AlvoDoVidro';
import { Anel } from '@/components/ui/Anel';
import { BrilhoAmbiente } from '@/components/ui/BrilhoAmbiente';
import { CartaoDeTreino } from '@/components/ui/CartaoDeTreino';
import { FundoDeFoto, RECEITA_DA_HOME } from '@/components/ui/FundoDeFoto';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { BlocosDaSaude } from '../components/BlocosDaSaude';
import { CabecalhoDaHome } from '../components/CabecalhoDaHome';
import { EntradasDeHoje } from '../components/EntradasDeHoje';
import { faltaParaFecharODia } from '../services/faltaParaFecharODia';
import { type DadosDaHomeDoAluno, PERCENTUAL_COMPLETO } from '../types';

/**
 * A entrada do aluno, no desenho de vidro do kit.
 *
 * **As entradas não são só as quatro do desenho.** O kit desenha dieta, cardio,
 * avaliação e ranking; o app tem também anamnese, análise de técnica e saúde, e
 * cada uma é o único caminho para a sua tela. A de saúde é ainda o caminho para
 * **rever ou revogar** a autorização de dado de saúde — derrubá-la tiraria do
 * aluno a porta de volta.
 *
 * A "Meta de Treino" em barra, que a home anterior tinha, não voltou: o kit a
 * trocou pelo anel da meta do dia, e a frase logo abaixo dele diz quantos
 * treinos faltam.
 *
 * @example
 * <HomeDoAluno dados={aluno} />
 */

export function HomeDoAluno({ dados }: { dados: DadosDaHomeDoAluno }) {
  const cores = useCores();
  const { treinoSugerido, carregando, recarregar } = dados;
  const foto = fotoDoGrupo(treinoSugerido?.muscle_group);
  // A luz de fundo se ancora nos blocos de métrica, e não na altura da tela.
  const [topoDosBlocos, setTopoDosBlocos] = useState<number | null>(null);

  return (
    <ScreenLayout useSafeArea={false}>
      {/*
        O fundo fora da rolagem, como no kit: a foto é `position: absolute` e o
        conteúdo rola por cima dela. A rolagem fica dentro do alvo como filha,
        para os cartões receberem o alvo do blur pelo contexto.
      */}
      <AlvoDoVidro
        fundo={
          <>
            <FundoDeFoto imagem={foto} receita={RECEITA_DA_HOME} />
            {topoDosBlocos === null ? null : <BrilhoAmbiente topoDosBlocos={topoDosBlocos} />}
          </>
        }
      >
        <ScrollView
          contentContainerClassName="px-4 pb-28 pt-14"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={carregando}
              onRefresh={recarregar}
              tintColor={cores.primary}
            />
          }
        >
          <CabecalhoDaHome perfil={dados.perfil} ofensiva={dados.ofensiva} />
          <MetaDoDia dados={dados} />
          {/* O conteúdo começa no topo da tela (sem safe area), então o `y` no
              contêiner da rolagem é o `y` na tela enquanto ela não rolou. */}
          <BlocosDaSaude
            saude={dados.saude}
            onLayout={(evento) => setTopoDosBlocos(evento.nativeEvent.layout.y)}
          />
          <TreinoDoDia dados={dados} foto={foto} />
          <TituloDeSecao>Hoje</TituloDeSecao>
          <EntradasDeHoje
            metaDoDia={dados.metaDoDia}
            anamnese={dados.anamnese}
            fonteDaSaude={dados.saude.source}
          />
        </ScrollView>
      </AlvoDoVidro>

      <ConfettiOverlay show={dados.mostrarConfete} />
    </ScreenLayout>
  );
}

function MetaDoDia({ dados }: { dados: DadosDaHomeDoAluno }) {
  const percentual = dados.metaDoDia?.completion_percentage ?? 0;

  return (
    <>
      <View className="mt-6 items-center">
        <Anel
          valor={percentual}
          meta={PERCENTUAL_COMPLETO}
          rotulo={`${Math.round(percentual)}%`}
          sub="Meta do dia"
        />
      </View>
      <Text className="mb-5 mt-2.5 text-center text-legenda text-hero-secondary">
        {faltaParaFecharODia(dados.metaDoDia)}
      </Text>
    </>
  );
}

function TreinoDoDia({ dados, foto }: { dados: DadosDaHomeDoAluno; foto: ImageSourcePropType }) {
  const router = useRouter();
  const treino = dados.treinoSugerido;
  if (!treino) return null;

  return (
    <>
      <TituloDeSecao acao="Ver tudo" onAcao={() => router.push(ROUTES.TABS.WORKOUTS)}>
        Treino do dia
      </TituloDeSecao>
      <CartaoDeTreino
        titulo={treino.title}
        chips={[{ texto: treino.muscle_group || 'Geral', tom: 'destaque' }]}
        imagem={foto}
        exercicios={treino.exercicios}
        minutos={treino.duration_minutes}
        onPress={() => router.push(ROUTES.WORKOUTS.DETAILS(treino.id))}
      />
    </>
  );
}
