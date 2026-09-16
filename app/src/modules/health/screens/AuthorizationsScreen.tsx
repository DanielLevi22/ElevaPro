import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useConsentPromptStore } from '@/components/consent/consentPromptStore';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { InfoNote } from '@/components/ui/InfoNote';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { RevokeSheet } from '../components/RevokeSheet';
import { type AuthorizationItem, useAuthorizations } from '../hooks/useAuthorizations';
import { type Authorization, authorizationFooter } from '../services/authorizations';

export interface AuthorizationsScreenProps {
  studentId: string;
  /** O Aluno lê, na folha de retirar, que o especialista perde o acesso. */
  hasSpecialist: boolean;
}

/**
 * Tela 7 do kit: Minhas autorizações. Cada finalidade com o aceite, a data e a
 * versão, e o caminho de volta.
 *
 * Art. 8°, §5°: o consentimento se revoga a qualquer momento, por procedimento
 * **gratuito e facilitado**. A tela de introdução da Análise de Técnica e o aceite
 * de saúde prometem este lugar em texto, e consentimento informado é sobre o que a
 * pessoa leu (Art. 9°).
 *
 * "Seus direitos" tem só o que existe: exportar e a política no app ainda não há, e
 * uma linha que não leva a lugar nenhum seria promessa (#308).
 *
 * @example <AuthorizationsScreen studentId={user.id} hasSpecialist />
 */
export function AuthorizationsScreen({ studentId, hasSpecialist }: AuthorizationsScreenProps) {
  const router = useRouter();
  const { items, revoke } = useAuthorizations(studentId);
  const [chosen, setChosen] = useState<Authorization | null>(null);
  const [revoking, setRevoking] = useState(false);

  const confirm = async () => {
    if (!chosen) return;
    setRevoking(true);
    try {
      await revoke(chosen.purpose);
      setChosen(null);
    } catch {
      showAlert({
        title: 'Não consegui retirar agora',
        message: 'Tente de novo em instantes. Sua autorização continua como estava.',
        type: 'error',
      });
    } finally {
      setRevoking(false);
    }
  };

  return (
    <GlassScreen glow={HEALTH_GLOW}>
      <View className="flex-row items-center gap-3 pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
        <View className="min-w-0 flex-1">
          <Text className="text-micro font-bold uppercase tracking-wide text-hero-secondary">
            Privacidade
          </Text>
          <Text className="mt-0.5 text-[1.3125rem] font-bold tracking-tight text-hero">
            Minhas autorizações
          </Text>
        </View>
      </View>

      <InfoNote icon="shield-outline" className="mt-4">
        Cada finalidade é separada: dá para retirar a câmera durante o exercício e continuar com a
        avaliação física.
      </InfoNote>

      <TituloDeSecao estilo="rotulo">Finalidades</TituloDeSecao>
      {items.map((item) => (
        <AuthorizationCard
          key={item.authorization.purpose.type}
          item={item}
          onRevoke={() => setChosen(item.authorization)}
        />
      ))}

      <TituloDeSecao estilo="rotulo">Seus direitos</TituloDeSecao>
      <LinhaDeVidro
        icon="help-buoy-outline"
        tom="marca"
        titulo="Apagar histórico"
        sub="Fale com o suporte para a exclusão definitiva"
        direita={<View />}
      />

      <RevokeSheet
        authorization={chosen}
        hasSpecialist={hasSpecialist}
        busy={revoking}
        onConfirm={confirm}
        onCancel={() => setChosen(null)}
      />
    </GlassScreen>
  );
}

const STATE_ICON = 21;

function AuthorizationCard({ item, onRevoke }: { item: AuthorizationItem; onRevoke: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  const requestConsent = useConsentPromptStore((state) => state.request);
  const { authorization, status } = item;
  // Sem o estado (carregando ou falhou), nem ícone nem rodapé: dizer "não
  // autorizado" a quem autorizou é pior que não dizer nada.
  const footer = status ? authorizationFooter(authorization, status) : null;
  const granted = footer?.action === 'revoke';

  return (
    <Vidro classeExterna="mb-2.5" className="p-[0.9375rem]">
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[0.9375rem] font-bold tracking-tight text-foreground">
            {authorization.title}
          </Text>
          <Text className="mt-1 text-[0.75rem] leading-[1.08rem] text-muted-foreground">
            {authorization.description}
          </Text>
        </View>
        {footer ? (
          <Ionicons
            name={granted ? 'checkmark-circle-outline' : 'close-circle-outline'}
            size={escalar(STATE_ICON)}
            color={granted ? cores.textoPassos : cores.placeholder}
          />
        ) : null}
      </View>

      {footer ? (
        <View className="mt-3 flex-row items-center justify-between gap-3 border-t border-glass-border pt-3">
          <Text className="flex-1 text-[0.6875rem] leading-[1rem] text-placeholder">
            {footer.text}
          </Text>
          {footer.action === 'revoke' ? (
            <TouchableOpacity
              onPress={onRevoke}
              accessibilityRole="button"
              accessibilityLabel={`Retirar ${authorization.title}`}
            >
              <Text className="text-[0.6875rem] font-extrabold uppercase tracking-widest text-texto-perigo">
                Retirar autorização
              </Text>
            </TouchableOpacity>
          ) : null}
          {footer.action === 'authorize' ? (
            <TouchableOpacity
              onPress={requestConsent}
              accessibilityRole="button"
              accessibilityLabel={`Autorizar ${authorization.title}`}
            >
              <Text className="text-[0.6875rem] font-extrabold uppercase tracking-widest text-primary-text">
                Autorizar
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </Vidro>
  );
}
