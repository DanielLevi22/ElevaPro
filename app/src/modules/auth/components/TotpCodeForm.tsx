import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Group } from '@/components/ui/Group';
import { Input } from '@/components/ui/Input';

type TotpCodeFormProps = {
  code: string;
  onChangeCode: (value: string) => void;
  onSubmit: () => void;
  verifying: boolean;
};

/** O formulário de 6 dígitos que confirma a inscrição do autenticador. */
export function TotpCodeForm({ code, onChangeCode, onSubmit, verifying }: TotpCodeFormProps) {
  return (
    <View className="gap-4">
      <Group>
        <Input
          accessibilityLabel="Código do autenticador"
          autoComplete="one-time-code"
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={onChangeCode}
          placeholder="000000"
          textContentType="oneTimeCode"
          value={code}
        />
      </Group>
      <Button fullWidth isLoading={verifying} label="Confirmar código" onPress={onSubmit} />
    </View>
  );
}
