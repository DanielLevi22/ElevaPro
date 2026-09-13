import type { DailyGoal } from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import type { TomDeMetrica } from '@/components/ui/CaixaDeIcone';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ROUTES } from '@/navigation/types';
import { type EstadoDaAnamnese, type FonteDaSaude, PERCENTUAL_COMPLETO } from '../types';

/**
 * As entradas da tela inicial, em linha de vidro.
 *
 * O kit desenha quatro — dieta, cardio, avaliação e ranking. Aqui são sete,
 * porque três telas do app não têm outro caminho até elas. Cada uma tem o
 * motivo escrito abaixo, e os dois primeiros são de produto, não de estética.
 *
 * @example
 * <EntradasDeHoje metaDoDia={meta} anamnese={anamnese} fonteDaSaude="device" />
 */
interface EntradasDeHojeProps {
  metaDoDia: DailyGoal | null;
  anamnese: EstadoDaAnamnese;
  fonteDaSaude: FonteDaSaude;
}

const REFEICOES_PADRAO = 4;

export function EntradasDeHoje({ metaDoDia, anamnese, fonteDaSaude }: EntradasDeHojeProps) {
  const router = useRouter();

  return (
    <>
      <LinhaDaDieta metaDoDia={metaDoDia} />

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

      <LinhaDaAnamnese anamnese={anamnese} />

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

      <LinhaDaSaude fonte={fonteDaSaude} />

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

function LinhaDaDieta({ metaDoDia }: { metaDoDia: DailyGoal | null }) {
  const router = useRouter();
  const feitas = metaDoDia?.meals_completed ?? 0;
  const meta = metaDoDia?.meals_target ?? REFEICOES_PADRAO;

  return (
    <LinhaDeVidro
      icon="restaurant"
      tom="proteina"
      titulo="Dieta & Macros"
      sub={`${feitas} de ${meta} refeições registradas`}
      direita={
        <Text className="text-legenda font-bold text-metrica-proteina">
          {Math.round((feitas / Math.max(1, meta)) * PERCENTUAL_COMPLETO)}%
        </Text>
      }
      onPress={() => router.push(ROUTES.TABS.NUTRITION)}
    />
  );
}

/**
 * A anamnese sinaliza três estados: concluída, começada e nem começada. É a
 * única entrada em que o estado é a informação principal.
 */
function LinhaDaAnamnese({ anamnese }: { anamnese: EstadoDaAnamnese }) {
  const router = useRouter();
  const estado = estadoDaAnamnese(anamnese);

  return (
    <LinhaDeVidro
      icon={estado.icone}
      tom={estado.tom}
      titulo="Anamnese"
      sub={estado.legenda}
      onPress={() => router.push(ROUTES.ASSESSMENT.ANAMNESIS)}
    />
  );
}

/**
 * Health Connect.
 *
 * Sempre visível, como as linhas vizinhas: é o caminho para rever ou revogar a
 * autorização, não só para concedê-la. Esconder depois de conectado tirava do
 * aluno a única porta de volta. A legenda carrega o estado.
 *
 * Há dado para mostrar, a linha leva ao dado; não há, leva à permissão. Mandar
 * quem já autorizou de volta ao onboarding era pedir de novo o que ele já deu.
 * `mock` conta como "há dado" de propósito: ele existe para a tela funcionar
 * sem aparelho, e tratá-lo como desconectado deixava a tela inalcançável no
 * emulador — que é onde ela é aberta primeiro.
 */
function LinhaDaSaude({ fonte }: { fonte: FonteDaSaude }) {
  const router = useRouter();

  return (
    <LinhaDeVidro
      icon="heart-circle-outline"
      tom="sono"
      titulo={fonte === 'device' ? 'Saúde do dia' : 'Conectar Saúde'}
      sub={LEGENDA_DA_SAUDE[fonte]}
      onPress={() =>
        router.push(
          fonte === 'unavailable' ? ROUTES.ONBOARDING.HEALTH_CONNECT : ROUTES.STUDENT.HEALTH
        )
      }
    />
  );
}

const LEGENDA_DA_SAUDE: Record<FonteDaSaude, string> = {
  device: 'Sono, FC de repouso, passos e calorias',
  mock: 'Dados simulados — toque para conectar',
  unavailable: 'Conecte o relógio para ver',
};

interface AparenciaDaAnamnese {
  tom: TomDeMetrica;
  icone: keyof typeof Ionicons.glyphMap;
  legenda: string;
}

function estadoDaAnamnese({ enviada, respostas }: EstadoDaAnamnese): AparenciaDaAnamnese {
  if (enviada) return { tom: 'passos', icone: 'checkmark-circle', legenda: 'Concluída' };
  if (respostas > 0) return { tom: 'gordura', icone: 'document-text', legenda: 'Em andamento' };
  return { tom: 'marca', icone: 'document-text', legenda: 'Ficha de saúde' };
}
