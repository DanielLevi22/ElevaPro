import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import {
  isPasskeyEnabled,
  listPasskeys,
  type RegisteredPasskey,
  registerPasskey,
  removePasskey,
  renamePasskey,
} from '@/auth';
import { showConfirm } from '@/components/ui/appAlert';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

/** Gerencia as Passkeys da própria conta quando o ambiente está habilitado. */
export default function SecurityScreen() {
  const [passkeys, setPasskeys] = useState<RegisteredPasskey[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => setPasskeys(await listPasskeys()), []);

  useEffect(() => {
    if (!isPasskeyEnabled()) return;
    void refresh().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : 'Não foi possível listar os aparelhos.')
    );
  }, [refresh]);

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await operation();
      await refresh();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o aparelho.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout>
      <ScrollView contentContainerClassName="gap-5 px-5 py-8">
        <Text className="font-display text-titulo text-foreground">Aparelhos de acesso</Text>
        {!isPasskeyEnabled() ? (
          <Text className="text-muted-foreground">Passkeys ainda não estão disponíveis aqui.</Text>
        ) : (
          <>
            <Text className="text-muted-foreground">
              Entre com Face ID, biometria ou PIN. Cadastre outro aparelho antes de remover o atual.
            </Text>
            {error ? (
              <Text className="text-destructive" accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
            <Button
              label="Cadastrar outro aparelho"
              isLoading={busy}
              fullWidth
              onPress={() => void run(registerPasskey)}
            />
            {passkeys.map((passkey) => (
              <PasskeyRow
                key={passkey.id}
                passkey={passkey}
                busy={busy}
                canRemove={passkeys.length > 1}
                onRename={(name) => run(() => renamePasskey(passkey.id, name))}
                onRemove={() => run(() => removePasskey(passkey.id))}
              />
            ))}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

interface PasskeyRowProps {
  passkey: RegisteredPasskey;
  busy: boolean;
  canRemove: boolean;
  onRename: (name: string) => Promise<void>;
  onRemove: () => Promise<void>;
}

function PasskeyRow({ passkey, busy, canRemove, onRename, onRemove }: PasskeyRowProps) {
  const [name, setName] = useState(passkey.friendly_name ?? '');
  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <Text className="font-semibold text-foreground">Nome do aparelho</Text>
      <TextInput
        accessibilityLabel="Nome do aparelho"
        className="rounded-xl border border-border bg-background p-3 text-foreground"
        value={name}
        maxLength={120}
        onChangeText={setName}
      />
      <View className="gap-2">
        <Button
          label="Salvar nome"
          disabled={busy || !name.trim()}
          onPress={() => void onRename(name)}
        />
        <Button
          label="Remover aparelho"
          variant="tinted"
          disabled={busy || !canRemove}
          onPress={() =>
            showConfirm({
              title: 'Remover aparelho',
              message: 'Remover este aparelho do acesso à conta?',
              confirmText: 'Remover',
              cancelText: 'Cancelar',
              type: 'danger',
              onConfirm: () => void onRemove(),
            })
          }
        />
      </View>
    </View>
  );
}
