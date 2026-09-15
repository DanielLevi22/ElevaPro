import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * O aviso de quem vê e de como desligar, que fecha a Saúde do dia.
 *
 * Não é rodapé decorativo: é onde o Student reencontra quem lê estes dados e o
 * caminho de volta, e promessa que só aparece no onboarding some da memória na
 * semana seguinte. Diz "seu personal" só a quem tem personal (ADR-0028).
 *
 * @example <PrivacyNote hasSpecialist={false} />
 */
const ICON = 15;

export function PrivacyNote({ hasSpecialist }: { hasSpecialist: boolean }) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Vidro classeExterna="mt-3.5" className="flex-row items-start gap-[0.6875rem] p-3.5">
      <Ionicons name="lock-closed-outline" size={escalar(ICON)} color={cores.placeholder} />
      <Text className="flex-1 text-[0.71875rem] leading-[1.05rem] text-muted-foreground">
        {hasSpecialist
          ? 'Seu personal vinculado vê estes dados. Você pode desligar quando quiser em Minhas autorizações: a coleta para na hora e ele perde o acesso — o histórico continua visível só para você.'
          : 'Só você vê estes dados. Você pode desligar quando quiser em Minhas autorizações: a coleta para na hora, e o histórico continua com você.'}
      </Text>
    </Vidro>
  );
}
