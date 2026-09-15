import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { GlassSheet } from '@/components/ui/GlassSheet';
import { LockHero } from '@/components/ui/LockHero';
import { Pedestal } from '@/components/ui/Pedestal';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { type Authorization, revokeEffects } from '../services/authorizations';

interface RevokeSheetProps {
  /** A finalidade a retirar. `null` fecha a folha. */
  authorization: Authorization | null;
  hasSpecialist: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const EFFECT_ICON = 15;

/**
 * Tela 8 do kit: retirar uma autorização. O cadeado em rosa, o que acontece com o
 * que já foi registrado e o que muda agora — só o que de fato para.
 *
 * Confirmar não é cerimônia: retirar interrompe um tratamento em curso, e um toque
 * acidental deixaria o Student sem entender por que o app parou de contar.
 *
 * @example <RevokeSheet authorization={chosen} hasSpecialist busy={false} onConfirm={revoke} onCancel={close} />
 */
export function RevokeSheet({
  authorization,
  hasSpecialist,
  busy,
  onConfirm,
  onCancel,
}: RevokeSheetProps) {
  const cores = useCores();
  const escalar = useEscala();
  if (!authorization) return null;

  return (
    <GlassSheet
      visible
      onClose={onCancel}
      tone="danger"
      busy={busy}
      hero={
        <Pedestal size={142} lift={4} glow={cores.perigo}>
          <LockHero scale={0.72} accent={cores.perigo} />
        </Pedestal>
      }
      primary={{
        label: busy ? 'Retirando...' : 'Retirar autorização',
        accessibilityLabel: 'Confirmar retirada',
        onPress: onConfirm,
      }}
      secondary={{ label: 'Manter como está', onPress: onCancel }}
      footnote="Você pode autorizar de novo quando quiser — é gratuito e leva um toque."
    >
      <Text className="mt-3.5 text-center font-display-black text-[1.3125rem] tracking-tight text-foreground">
        {`Retirar “${authorization.title}”?`}
      </Text>
      {/* A retirada é prospectiva. Prometer que apaga o passado seria mentir, e o
          Student tem o direito do Art. 18, VI por um caminho próprio. */}
      <Text className="mt-2 text-center text-[0.8125rem] leading-[1.2rem] text-muted-foreground">
        O tratamento para essa finalidade para na hora. O que já foi registrado antes disso continua
        no seu histórico — para apagá-lo, fale com o suporte.
      </Text>

      <Vidro classeExterna="mt-4" className="p-3.5">
        <Text className="mb-2.5 text-[0.65625rem] font-extrabold uppercase tracking-widest text-placeholder">
          O que muda agora
        </Text>
        {revokeEffects(authorization, hasSpecialist).map((effect) => (
          <View key={effect.text} className="mb-2 flex-row items-center gap-2.5">
            <Ionicons name={effect.icon} size={escalar(EFFECT_ICON)} color={cores.placeholder} />
            <Text className="flex-1 text-[0.78125rem] leading-[1.1rem] text-muted-foreground">
              {effect.text}
            </Text>
          </View>
        ))}
      </Vidro>
    </GlassSheet>
  );
}
