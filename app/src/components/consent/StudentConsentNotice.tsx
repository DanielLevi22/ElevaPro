import { useState } from 'react';
import { Text } from 'react-native';
import { GlassSheet } from '@/components/ui/GlassSheet';
import { Row } from '@/components/ui/Row';
import { Vidro } from '@/components/ui/Vidro';

interface Props {
  busy: boolean;
  onCheck: () => void;
}

/** Orienta o especialista sem permitir consentimento em nome do aluno.
 * Montar somente enquanto o BFF exigir autorização; desmontar após a confirmação.
 * @example <StudentConsentNotice busy={loading} onCheck={refresh} />
 */
export function StudentConsentNotice({ busy, onCheck }: Props) {
  const [visible, setVisible] = useState(true);
  const close = () => setVisible(false);
  return (
    <Vidro className="mt-3 p-4">
      <Text className="text-foreground">
        Aguardando a autorização do aluno para usar o assistente.
      </Text>
      <Row icon="lock-closed-outline" title="Ver autorização" onPress={() => setVisible(true)} />
      <GlassSheet
        visible={visible}
        onClose={close}
        busy={busy}
        primary={{ label: busy ? 'Verificando…' : 'Verificar autorização', onPress: onCheck }}
        secondary={{ label: 'Agora não', onPress: close }}
        footnote="O restante do app continua disponível."
      >
        <Text accessibilityRole="header" className="mb-3 text-xl font-bold text-foreground">
          Consentimento do aluno
        </Text>
        <Text className="mb-3 text-base text-foreground">
          Para abrir as conversas de treino e nutrição, o aluno precisa autorizar o uso dos seus
          dados de saúde.
        </Text>
        <Text className="mb-3 text-base text-muted-foreground">
          Peça que ele entre na própria conta e acesse Perfil → Minhas autorizações. O aceite deve
          ser feito pelo aluno, não pelo especialista.
        </Text>
        <Text className="mb-3 text-base text-muted-foreground">
          Depois que ele autorizar, toque em Verificar autorização para continuar.
        </Text>
      </GlassSheet>
    </Vidro>
  );
}
