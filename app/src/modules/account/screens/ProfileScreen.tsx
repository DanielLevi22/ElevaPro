import type { AccountType } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { isPasskeyEnabled, useAuthStore } from '@/auth';
import { showConfirm } from '@/components/ui/appAlert';
import { BlocoDeMetrica } from '@/components/ui/BlocoDeMetrica';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { ProfileHero } from '../components/ProfileHero';
import { type StudentOverview, useProfileOverview } from '../hooks/useProfileOverview';

/** Os rótulos canônicos por `account_type` (CONTEXT.md). */
const ROLE_LABEL: Record<AccountType, string> = {
  admin: 'Administrador',
  specialist: 'Especialista',
  student: 'Aluno',
  member: 'Praticante',
};

/**
 * O perfil no kit de vidro (09 · Perfil): quem é a pessoa, os números do aluno,
 * quem acompanha e a conta. Substitui o "Meu perfil" antigo, que mostrava nível
 * e XP que nunca existiram no banco.
 *
 * @example <ProfileScreen />
 */
export function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { data: overview } = useProfileOverview(user?.id ?? null);
  const accountType = overview?.accountType ?? null;
  const student = overview?.student ?? null;
  const name = overview?.fullName ?? user?.email?.split('@')[0] ?? '';

  const confirmSignOut = () =>
    showConfirm({
      title: 'Sair',
      message: 'Tem certeza que deseja sair?',
      type: 'danger',
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      onConfirm: signOut,
    });

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('peito')}>
      <View className="flex-row justify-end pt-3.5">
        <BotaoRedondo
          icone="settings"
          rotulo="Menu"
          onPress={() => router.push(ROUTES.TABS.MENU)}
        />
      </View>
      <ProfileHero
        name={name}
        context={contextLine(accountType, student)}
        streakDays={student?.currentStreakDays ?? 0}
      />
      {student ? <StudentNumbers student={student} /> : null}
      {student ? <FollowUp student={student} accountType={accountType} /> : null}

      <TituloDeSecao estilo="rotulo">Conta</TituloDeSecao>
      {accountType !== 'specialist' ? (
        <LinhaDeVidro
          icon="watch-outline"
          tom="sono"
          titulo="Meu relógio"
          sub="Apple Health e Health Connect"
          onPress={() => router.push(ROUTES.HEALTH.WATCH)}
        />
      ) : null}
      {/* O caminho de volta do consentimento (Art. 8°, §5°): gratuito e
          facilitado, e no lugar em que o aceite de saúde diz que ele está. */}
      {accountType !== 'specialist' ? (
        <LinhaDeVidro
          icon="shield-checkmark-outline"
          tom="calorias"
          titulo="Privacidade e dados"
          sub="O que você autorizou, e como retirar"
          onPress={() => router.push(ROUTES.HEALTH.AUTHORIZATIONS)}
        />
      ) : null}
      {isPasskeyEnabled() && (accountType === 'specialist' || accountType === 'admin') ? (
        <LinhaDeVidro
          icon="finger-print-outline"
          tom="marca"
          titulo="Aparelhos de acesso"
          sub="Face ID, biometria e PIN"
          onPress={() => router.push(ROUTES.TABS.SECURITY)}
        />
      ) : null}
      <LinhaDeVidro
        icon="mail-outline"
        tom="ritmo"
        titulo="E-mail"
        sub={user?.email}
        direita={<View />}
      />
      <LinhaDeVidro
        icon="log-out-outline"
        tom="batimento"
        titulo="Sair da conta"
        direita={<View />}
        onPress={confirmSignOut}
      />
    </TelaDeVidroComFoto>
  );
}

/** "Aluno · Hipertrofia 12 semanas", "Praticante", "Especialista". */
function contextLine(accountType: AccountType | null, student: StudentOverview | null): string {
  const role = accountType ? ROLE_LABEL[accountType] : '';
  return student?.planName ? `${role} · ${student.planName}` : role;
}

function StudentNumbers({ student }: { student: StudentOverview }) {
  return (
    <View className="mt-[1.625rem] flex-row gap-2.5">
      <BlocoDeMetrica
        icon="barbell-outline"
        tom="marca"
        valor={String(student.workoutsDone)}
        legenda="Treinos feitos"
      />
      <BlocoDeMetrica
        icon="flame-outline"
        tom="calorias"
        valor={String(student.longestStreakDays)}
        unidade="dias"
        legenda="Recorde"
      />
      <BlocoDeMetrica
        icon="ribbon-outline"
        tom="gordura"
        valor={String(student.achievements)}
        legenda="Conquistas"
      />
    </View>
  );
}

/** "Meu acompanhamento": quem acompanha o Aluno, o plano do Praticante, e o corpo. */
function FollowUp({
  student,
  accountType,
}: {
  student: StudentOverview;
  accountType: AccountType | null;
}) {
  const router = useRouter();
  return (
    <>
      <TituloDeSecao estilo="rotulo">Meu acompanhamento</TituloDeSecao>
      {accountType === 'student' ? (
        <LinhaDeVidro
          icon="person-outline"
          tom="marca"
          titulo="Meu especialista"
          sub={student.specialistName ?? 'Sem especialista ativo'}
          direita={<View />}
        />
      ) : (
        <LinhaDeVidro
          icon="sparkles-outline"
          tom="marca"
          titulo="Meu plano"
          sub={student.planName ?? 'Ainda sem plano ativo'}
          onPress={() => router.push(ROUTES.TABS.WORKOUTS)}
        />
      )}
      <LinhaDeVidro
        icon="clipboard-outline"
        tom="passos"
        titulo="Anamnese"
        sub="Suas respostas de saúde e rotina"
        onPress={() => router.push(ROUTES.ASSESSMENT.ANAMNESIS)}
      />
      <LinhaDeVidro
        icon="resize-outline"
        tom="gordura"
        titulo="Avaliações físicas"
        sub="Peso, gordura e medidas"
        onPress={() => router.push(ROUTES.PROGRESS.MEASUREMENTS)}
      />
    </>
  );
}
