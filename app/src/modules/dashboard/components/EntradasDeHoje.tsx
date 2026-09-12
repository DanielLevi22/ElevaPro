import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { useAssessmentStore } from '@/modules/assessment/store/assessmentStore';
import { ROUTES } from '@/navigation/types';
import type { useDadosDaHome } from '../hooks/useDadosDaHome';

/**
 * As entradas da tela inicial, em linha de vidro.
 *
 * O kit desenha quatro — dieta, cardio, avaliação e ranking. Aqui são sete,
 * porque três telas do app não têm outro caminho até elas. Cada uma tem o
 * motivo escrito abaixo, e os dois primeiros são de produto, não de estética.
 */
type Dados = ReturnType<typeof useDadosDaHome>;

const REFEICOES_PADRAO = 4;
const PORCENTAGEM = 100;

export function EntradasDeHoje({ dados }: { dados: Dados }) {
  const router = useRouter();
  const { anamnesisResponses, isAnamnesisSubmitted } = useAssessmentStore();
  const { dailyGoal } = dados.gamificacao;
  const { saude } = dados;

  const feitas = dailyGoal?.meals_completed ?? 0;
  const meta = dailyGoal?.meals_target ?? REFEICOES_PADRAO;
  const anamnese = estadoDaAnamnese(isAnamnesisSubmitted, Object.keys(anamnesisResponses).length);

  return (
    <>
      <LinhaDeVidro
        icon="restaurant"
        tom="proteina"
        titulo="Dieta & Macros"
        sub={`${feitas} de ${meta} refeições registradas`}
        direita={
          <Text className="text-legenda font-bold text-metrica-proteina">
            {Math.round((feitas / Math.max(1, meta)) * PORCENTAGEM)}%
          </Text>
        }
        onPress={() => router.push(ROUTES.TABS.NUTRITION)}
      />

      <LinhaDeVidro
        icon="speedometer"
        tom="passos"
        titulo="Sessão de Cardio"
        sub="Correr, pedalar, caminhar"
        onPress={() => router.push(ROUTES.TABS.CARDIO)}
      />

      <LinhaDeVidro
        icon="scan"
        tom="marca"
        titulo="Avaliação IA"
        sub="Escaneamento corporal"
        onPress={() => router.push(ROUTES.ASSESSMENT.BODY_SCAN)}
      />

      {/* A anamnese sinaliza três estados: concluída, começada e nem começada.
          É a única entrada em que o estado é a informação principal. */}
      <LinhaDeVidro
        icon={anamnese.icone}
        tom={anamnese.tom}
        titulo="Anamnese"
        sub={anamnese.legenda}
        onPress={() => router.push(ROUTES.ASSESSMENT.ANAMNESIS)}
      />

      {/* Análise de Técnica (issue #194, fase 3).
          Só vira caminho aqui: até este cartão existir, nenhum aluno alcançava
          a tela. Quem barra a câmera é o consentimento próprio da finalidade,
          não a ausência de rota. */}
      <LinhaDeVidro
        icon="body"
        tom="marca"
        titulo="Análise de Técnica"
        sub="Agachamento — conta e julga a profundidade"
        onPress={() => router.push(ROUTES.TECHNIQUE.ROOT)}
      />

      {/* Health Connect.
          Sempre visível, como as linhas vizinhas: é o caminho para rever ou
          revogar a autorização, não só para concedê-la. Esconder depois de
          conectado tirava do aluno a única porta de volta. A legenda carrega o
          estado.

          Há dado para mostrar, a linha leva ao dado; não há, leva à permissão.
          Mandar quem já autorizou de volta ao onboarding era pedir de novo o
          que ele já deu. `mock` conta como "há dado" de propósito: ele existe
          para a tela funcionar sem aparelho, e tratá-lo como desconectado
          deixava a tela inalcançável no emulador — que é onde ela é aberta
          primeiro. */}
      <LinhaDeVidro
        icon="heart-circle-outline"
        tom="sono"
        titulo={saude.source === 'device' ? 'Saúde do dia' : 'Conectar Saúde'}
        sub={legendaDaSaude(saude.source)}
        onPress={() =>
          router.push(
            saude.source === 'unavailable'
              ? ROUTES.ONBOARDING.HEALTH_CONNECT
              : ROUTES.STUDENT.HEALTH
          )
        }
      />

      <LinhaDeVidro
        icon="trophy"
        tom="gordura"
        titulo="Ranking de Elite"
        sub="Sua posição entre os alunos"
        onPress={() => router.push(ROUTES.TABS.RANKING)}
      />
    </>
  );
}

function estadoDaAnamnese(enviada: boolean, respostas: number) {
  if (enviada)
    return { tom: 'passos' as const, icone: 'checkmark-circle' as const, legenda: 'Concluída' };
  if (respostas > 0) {
    return { tom: 'gordura' as const, icone: 'document-text' as const, legenda: 'Em andamento' };
  }
  return { tom: 'marca' as const, icone: 'document-text' as const, legenda: 'Ficha de saúde' };
}

function legendaDaSaude(fonte: string): string {
  if (fonte === 'device') return 'Sono, FC de repouso, passos e calorias';
  if (fonte === 'mock') return 'Dados simulados — toque para conectar';
  return 'Conecte o relógio para ver';
}
