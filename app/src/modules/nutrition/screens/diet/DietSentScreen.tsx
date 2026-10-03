import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { DietListFeedback } from '../../components/diet/DietListFeedback';
import { useDietPlanEditor } from '../../hooks/useDietPlanEditor';

const SENT_ICON = 30;

/**
 * A dieta enviada (#337): a confirmação e os próximos passos, no molde de
 * "Convite enviado" (tela 5). É a tela que o mock não desenha, no estilo dele.
 */
export default function DietSentScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const cores = useCores();
  const escalar = useEscala();
  const editor = useDietPlanEditor(planId);
  const studentId = editor.plan?.student_id;
  const ownPlan = editor.plan?.specialist_id === null;

  const message = ownPlan
    ? 'O plano já vale a partir de hoje, e o anterior foi para o histórico.'
    : 'O plano já está disponível para o aluno. A dieta anterior foi para o histórico.';

  if (!editor.plan)
    return (
      <TelaDeVidroComFoto image={fotoDoGrupo('back')}>
        <CabecalhoSobreFoto
          sobrelinha="Plano alimentar"
          titulo="Confirmando envio"
          onVoltar={router.back}
        />
        <DietListFeedback
          loaded={!editor.loading}
          error={editor.error}
          paused={false}
          onRetry={() => void editor.reload()}
          noun="planos"
        />
      </TelaDeVidroComFoto>
    );
  if (editor.plan.status !== 'active') return <Redirect href={ROUTES.NUTRITION.PLAN(planId)} />;

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('back')}>
      <CabecalhoSobreFoto
        sobrelinha="Nova dieta"
        titulo={ownPlan ? 'Plano ativo' : 'Dieta enviada'}
      />
      <Vidro classeExterna="mt-[1.125rem]" className="items-center p-6">
        <View className="mb-4 h-[4.375rem] w-[4.375rem] items-center justify-center rounded-full border border-primary/40 bg-primary/15">
          <Ionicons
            name={ownPlan ? 'checkmark' : 'send'}
            size={escalar(SENT_ICON)}
            color={cores.primaryText}
          />
        </View>
        <Text className="font-display-black text-[1.3125rem] tracking-tight text-foreground">
          {ownPlan ? 'Plano ativado' : 'Dieta enviada'}
        </Text>
        <Text className="mt-2 text-center text-[0.8125rem] leading-[1.45] text-muted-foreground">
          {message}
        </Text>
      </Vidro>

      <TituloDeSecao estilo="rotulo">Próximos passos</TituloDeSecao>
      <LinhaDeVidro
        icon="restaurant-outline"
        tom="proteina"
        titulo="Ver o plano"
        sub="Refeições e alimentos"
        onPress={() => router.replace(ROUTES.NUTRITION.PLAN(planId))}
      />
      {!ownPlan && studentId && (
        <LinhaDeVidro
          icon="person-outline"
          tom="ritmo"
          titulo="Voltar ao perfil"
          sub="Aluno deste plano"
          onPress={() =>
            // Com a lista por baixo: voltar do aluno não sai da aba Alunos (#357).
            router.replace(ROUTES.STUDENTS.DETAILS(studentId), { withAnchor: true })
          }
        />
      )}
    </TelaDeVidroComFoto>
  );
}
