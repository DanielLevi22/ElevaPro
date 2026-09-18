import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '@/components/ui/Button';
import { Group } from '@/components/ui/Group';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useEscala } from '@/shared/design';
import { beginTotpChallenge, type TotpChallenge, verifyTotp } from '../services';
import { useAuthStore } from '../store/authStore';

export function MfaScreen() {
  const [challenge, setChallenge] = useState<TotpChallenge | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [showManualKey, setShowManualKey] = useState(false);
  const [error, setError] = useState('');
  const escalar = useEscala();

  const prepareChallenge = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    setShowManualKey(false);
    setChallenge(null);
    try {
      setChallenge(await beginTotpChallenge());
    } catch {
      setError('Não foi possível preparar seu autenticador. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void prepareChallenge();
  }, [prepareChallenge]);

  async function confirmCode(): Promise<void> {
    if (!challenge || !/^\d{6}$/.test(code)) {
      setError('Digite o código de 6 dígitos do seu autenticador.');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      await verifyTotp(challenge.factorId, code);
      useAuthStore.getState().initializeSession(useAuthStore.getState().session);
    } catch {
      setError('Código inválido ou expirado. Gere um novo código e tente novamente.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerClassName="grow justify-center gap-6 px-5 py-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          <Text className="text-center font-display text-titulo text-foreground">
            Proteja sua conta
          </Text>
          <Text className="text-center text-corpo text-muted-foreground">
            Use um aplicativo autenticador, como Google Authenticator, Microsoft Authenticator ou
            Authy.
          </Text>
        </View>

        {challenge?.uri ? (
          <View className="items-center gap-4 rounded-3xl bg-card p-5">
            <QRCode size={escalar(208)} value={challenge.uri} />
            <Text className="text-center text-corpo text-muted-foreground">
              Escaneie o QR Code no aplicativo autenticador e informe o código gerado.
            </Text>
            <Text className="text-center text-corpo text-muted-foreground">
              No aplicativo, toque em adicionar conta e selecione escanear QR Code.
            </Text>
          </View>
        ) : null}

        {challenge?.secret ? (
          <View className="items-center gap-3 rounded-3xl bg-card p-5">
            <Text className="text-center text-corpo text-muted-foreground">
              Não consegue escanear? No autenticador, escolha inserir chave de configuração e use a
              chave abaixo. Não a compartilhe com ninguém.
            </Text>
            <Button
              fullWidth
              label={showManualKey ? 'Ocultar chave manual' : 'Mostrar chave manual'}
              onPress={() => setShowManualKey((visible) => !visible)}
              variant="ghost"
            />
            {showManualKey ? (
              <Text selectable className="text-center font-mono text-corpo text-foreground">
                {challenge.secret}
              </Text>
            ) : null}
          </View>
        ) : null}

        {challenge && !challenge.uri ? (
          <Text className="text-center text-corpo text-muted-foreground">
            Informe o código gerado no seu aplicativo autenticador.
          </Text>
        ) : null}

        {error ? (
          <Text accessibilityRole="alert" className="text-center text-corpo text-destructive">
            {error}
          </Text>
        ) : null}

        {challenge ? (
          <View className="gap-4">
            <Group>
              <Input
                accessibilityLabel="Código do autenticador"
                autoComplete="one-time-code"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
                placeholder="000000"
                textContentType="oneTimeCode"
                value={code}
              />
            </Group>
            <Button
              fullWidth
              isLoading={verifying}
              label="Confirmar código"
              onPress={confirmCode}
            />
          </View>
        ) : (
          <Button
            fullWidth
            isLoading={loading}
            label="Tentar novamente"
            onPress={prepareChallenge}
          />
        )}

        <Button
          fullWidth
          label="Sair"
          onPress={() => {
            void useAuthStore.getState().signOut();
          }}
          variant="ghost"
        />
      </ScrollView>
    </ScreenLayout>
  );
}
