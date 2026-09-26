import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { ActionPill } from '../components/ActionPill';
import { FormField } from '../components/FormField';
import { ServiceChoice } from '../components/ServiceChoice';
import { StepBar } from '../components/StepBar';
import { useStudentRegistration } from '../hooks/useStudentRegistration';
import { useStudentStore } from '../store/studentStore';

const TOTAL_STEPS = 2;

/**
 * O cadastro de aluno pelo especialista — as telas 3 e 5 do fluxo no kit de vidro
 * (#334): dados e tipo de acompanhamento, e o convite enviado.
 *
 * Telefone, nascimento e sexo do kit ficam de fora de propósito: o mapa de dados
 * rejeita os três sem uso funcional (docs/LGPD_COMPLIANCE.md, "o que NÃO coletar").
 * A anamnese (tela 4) é respondida pelo próprio aluno no primeiro acesso (#332).
 */
export default function CreateStudentScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { myServiceTypes, fetchMyServiceTypes, createStudent } = useStudentStore();
  const [isSending, setIsSending] = useState(false);
  const registration = useStudentRegistration({ offeredServices: myServiceTypes });

  // biome-ignore lint/correctness/useExhaustiveDependencies: só na entrada da tela
  useEffect(() => {
    if (user?.id) fetchMyServiceTypes(user.id);
  }, [user?.id]);

  async function sendInvite() {
    if (registration.blockingReason) {
      showAlert({ title: 'Faltam dados', message: registration.blockingReason, type: 'info' });
      return;
    }
    if (!user?.id || isSending) return;
    setIsSending(true);
    const result = await createStudent({
      specialist_id: user.id,
      full_name: registration.fullName,
      email: registration.email.trim(),
      service_types: registration.serviceTypes,
    });
    setIsSending(false);
    if (result.success && result.studentId) {
      registration.completeInvite(result.studentId);
      return;
    }
    showAlert({
      title: 'Não foi possível enviar o convite',
      message: result.error || 'Tente novamente.',
      type: 'error',
    });
  }

  if (registration.step === 'invite' && registration.studentId) {
    return (
      <InviteSent
        studentId={registration.studentId}
        name={registration.fullName}
        email={registration.email}
      />
    );
  }

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('arms')}
      bottomSpace="fixedButton"
      overlay={
        <BotaoFixoNoRodape
          rotulo={isSending ? 'Enviando' : 'Enviar convite'}
          icone="send"
          onPress={sendInvite}
        />
      }
    >
      <CabecalhoSobreFoto sobrelinha="Novo aluno" titulo="Dados básicos" onVoltar={router.back} />
      <StepBar current={1} total={TOTAL_STEPS} />
      <Vidro classeExterna="mt-[1.125rem]" className="p-4 pb-1">
        <FormField
          label="Nome completo"
          icon="person-outline"
          value={registration.fullName}
          onChangeText={registration.setFullName}
          placeholder="Nome e sobrenome"
          autoCapitalize="words"
          autoComplete="name"
        />
        <FormField
          label="E-mail"
          icon="mail-outline"
          value={registration.email}
          onChangeText={registration.setEmail}
          placeholder="email@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </Vidro>
      <TituloDeSecao estilo="rotulo">Tipo de acompanhamento</TituloDeSecao>
      <ServiceChoice
        offered={myServiceTypes}
        selected={registration.serviceTypes}
        onSelect={registration.selectServices}
      />
      <Text className="mt-1 px-0.5 text-[0.71875rem] leading-[1.4] text-muted-foreground">
        O aluno recebe um convite por e-mail e define a própria senha. Só aparecem os serviços que
        você presta — configure em seu perfil para oferecer outro.
      </Text>
    </TelaDeVidroComFoto>
  );
}

const SENT_ICON = 30;

function InviteSent({
  studentId,
  name,
  email,
}: {
  studentId: string;
  name: string;
  email: string;
}) {
  const router = useRouter();
  const cores = useCores();
  const escalar = useEscala();
  const firstName = name.trim().split(/\s+/)[0] || 'O aluno';

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('chest')}>
      <CabecalhoSobreFoto sobrelinha="Novo aluno" titulo="Convite" />
      <StepBar current={TOTAL_STEPS} total={TOTAL_STEPS} />
      <Vidro classeExterna="mt-[1.125rem]" className="items-center p-6">
        <View className="mb-4 h-[4.375rem] w-[4.375rem] items-center justify-center rounded-full border border-primary/40 bg-primary/15">
          <Ionicons name="send" size={escalar(SENT_ICON)} color={cores.primaryText} />
        </View>
        <Text className="font-display-black text-[1.3125rem] tracking-tight text-foreground">
          Convite enviado
        </Text>
        <Text className="mt-2 text-center text-[0.8125rem] leading-[1.45] text-muted-foreground">
          {`${firstName} recebeu o acesso em ${email}. Entra como aluno gerenciado e define a própria senha — sem custo para ele.`}
        </Text>
      </Vidro>
      <TituloDeSecao estilo="rotulo">Próximos passos</TituloDeSecao>
      <LinhaDeVidro
        icon="barbell-outline"
        tom="marca"
        titulo="Montar treino"
        sub="Periodização e divisão"
        onPress={() =>
          router.replace({ pathname: ROUTES.WORKOUTS.WIZARD_STRUCTURE, params: { studentId } })
        }
      />
      <LinhaDeVidro
        icon="nutrition-outline"
        tom="ritmo"
        titulo="Montar dieta"
        sub="Macros e refeições"
        onPress={() => router.replace(ROUTES.STUDENTS.NUTRITION(studentId))}
      />
      <LinhaDeVidro
        icon="body-outline"
        tom="cadencia"
        titulo="Fazer avaliação física"
        sub="Medidas e fotos"
        onPress={() => router.replace(ROUTES.STUDENTS.ASSESSMENT(studentId))}
      />
      <View className="mt-3 flex-row">
        <ActionPill
          icon="people-outline"
          label="Voltar para Alunos"
          onPress={() => router.replace(ROUTES.STUDENTS.ROOT)}
        />
      </View>
    </TelaDeVidroComFoto>
  );
}
