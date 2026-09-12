import { Switch as SwitchNativo } from 'react-native';
import { useCores } from '@/shared/design';

/**
 * Chave liga/desliga.
 *
 * Usa a do React Native de propósito: no iOS ela **é** a pílula que o design
 * desenha, e no Android é o controle do Material. Reimplementar em `View` daria
 * o mesmo pixel nas duas plataformas ao custo de perder o gesto de arrastar, o
 * retorno tátil e o leitor de tela — e essas três são ergonomia, que segue o
 * nativo mesmo quando o visual não segue.
 *
 * @example
 * <Switch checked={segueOSistema} onChange={setSegueOSistema} />
 */
interface SwitchProps {
  checked: boolean;
  onChange: (proximo: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Switch({ checked, onChange, disabled, accessibilityLabel }: SwitchProps) {
  const cores = useCores();

  return (
    <SwitchNativo
      value={checked}
      onValueChange={onChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      // Nenhuma destas aceita `className`: a chave nativa só fala em props de cor.
      trackColor={{ false: cores.muted, true: cores.primary }}
      thumbColor={cores.card}
      ios_backgroundColor={cores.muted}
    />
  );
}

export type { SwitchProps };
