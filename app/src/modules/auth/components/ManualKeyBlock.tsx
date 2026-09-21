import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';

type ManualKeyBlockProps = {
  secret: string;
  visible: boolean;
  onToggleVisibility: () => void;
};

/** A chave manual para quem não consegue escanear o QR Code. Some ao trocar de tela — nunca é persistida. */
export function ManualKeyBlock({ secret, visible, onToggleVisibility }: ManualKeyBlockProps) {
  return (
    <View className="items-center gap-3 rounded-3xl bg-card p-5">
      <Text className="text-center text-corpo text-muted-foreground">
        Não consegue escanear? No autenticador, escolha inserir chave de configuração e use a chave
        abaixo. Não a compartilhe com ninguém.
      </Text>
      <Button
        fullWidth
        label={visible ? 'Ocultar chave manual' : 'Mostrar chave manual'}
        onPress={onToggleVisibility}
        variant="ghost"
      />
      {visible ? (
        <Text selectable className="text-center font-mono text-corpo text-foreground">
          {secret}
        </Text>
      ) : null}
    </View>
  );
}
