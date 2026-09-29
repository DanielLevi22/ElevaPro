import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { ROUTES } from '@/navigation/types';
import { ManualKeyBlock } from '../components/ManualKeyBlock';
import { QrCodeBlock } from '../components/QrCodeBlock';
import { TotpCodeForm } from '../components/TotpCodeForm';
import { useTotpEnrollment } from '../hooks/useTotpEnrollment';
import {
  hasCurrentPrivilegedProof,
  hasLegacyTotpFactor,
  isPasskeyEnabled,
  registerPasskey,
  signInWithPasskey,
} from '../services';
import { useAuthStore } from '../store/authStore';

export function MfaScreen() {
  const router = useRouter();
  const passkeyEnabled = isPasskeyEnabled();
  const [legacyFactor, setLegacyFactor] = useState(false);
  const [verifiedLegacy, setVerifiedLegacy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showDeviceSetup, setShowDeviceSetup] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const {
    challenge,
    code,
    setCode,
    loading,
    verifying,
    error,
    showManualKey,
    toggleManualKey,
    prepareChallenge,
    confirmCode,
  } = useTotpEnrollment({
    autoPrepare: !passkeyEnabled,
    onVerified: () => {
      if (passkeyEnabled) setVerifiedLegacy(true);
      else router.replace(ROUTES.TABS.ROOT);
    },
  });

  async function handleDeviceSetup() {
    setShowDeviceSetup(true);
    try {
      setLegacyFactor(await hasLegacyTotpFactor());
    } catch {
      setLegacyFactor(false);
    }
    await prepareChallenge();
  }

  async function handleRegister() {
    setPasskeyLoading(true);
    setPasskeyError('');
    try {
      await registerPasskey();
      setRegistered(true);
    } catch (error: unknown) {
      setPasskeyError(
        error instanceof Error ? error.message : 'Não foi possível cadastrar o aparelho.'
      );
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handlePasskeySignIn() {
    setPasskeyLoading(true);
    setPasskeyError('');
    try {
      await signInWithPasskey();
      if (!(await hasCurrentPrivilegedProof()))
        throw new Error('Prova do aparelho ausente na sessão.');
      router.replace(ROUTES.TABS.ROOT);
    } catch (error: unknown) {
      setPasskeyError(
        error instanceof Error ? error.message : 'Não foi possível verificar o aparelho.'
      );
    } finally {
      setPasskeyLoading(false);
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
            {passkeyEnabled ? 'Proteja sua conta com o aparelho' : 'Proteja sua conta'}
          </Text>
          <Text className="text-center text-corpo text-muted-foreground">
            {passkeyEnabled
              ? 'Cadastre uma Passkey para entrar com Face ID, biometria ou PIN do seu aparelho.'
              : 'Confirme o código do seu aplicativo autenticador para concluir o acesso.'}
          </Text>
        </View>

        {passkeyError ? (
          <Text accessibilityRole="alert" className="text-center text-corpo text-destructive">
            {passkeyError}
          </Text>
        ) : null}

        {passkeyEnabled && !verifiedLegacy ? (
          <Button
            fullWidth
            isLoading={passkeyLoading}
            label="Entrar com Face ID ou PIN"
            onPress={handlePasskeySignIn}
          />
        ) : null}

        {passkeyEnabled && verifiedLegacy ? (
          <Button
            fullWidth
            isLoading={passkeyLoading}
            label={registered ? 'Entrar com o aparelho cadastrado' : 'Cadastrar Face ID ou PIN'}
            onPress={registered ? handlePasskeySignIn : handleRegister}
          />
        ) : null}

        {passkeyEnabled && !showDeviceSetup && !verifiedLegacy ? (
          <Button
            fullWidth
            label="Cadastrar ou trocar aparelho"
            onPress={() => void handleDeviceSetup()}
            variant="ghost"
          />
        ) : null}

        {verifiedLegacy && !passkeyEnabled ? (
          <Button
            fullWidth
            label="Continuar com a sessão atual"
            onPress={() => router.replace(ROUTES.TABS.ROOT)}
          />
        ) : null}

        {!verifiedLegacy && (!passkeyEnabled || showDeviceSetup) ? (
          <View className="gap-4 border-t border-border pt-4">
            <Text className="text-center text-corpo text-muted-foreground">
              {passkeyEnabled
                ? legacyFactor
                  ? 'Confirme o código apenas para cadastrar ou substituir um aparelho. No login diário, use a Passkey.'
                  : 'Na primeira ativação, configure o autenticador uma vez para proteger o cadastro de aparelhos.'
                : 'Use o código do seu aplicativo autenticador.'}
            </Text>

            {challenge?.uri ? <QrCodeBlock uri={challenge.uri} /> : null}

            {challenge?.secret ? (
              <ManualKeyBlock
                onToggleVisibility={toggleManualKey}
                secret={challenge.secret}
                visible={showManualKey}
              />
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
              <TotpCodeForm
                code={code}
                onChangeCode={setCode}
                onSubmit={confirmCode}
                verifying={verifying}
              />
            ) : (
              <Button
                fullWidth
                isLoading={loading}
                label="Tentar novamente"
                onPress={prepareChallenge}
              />
            )}
          </View>
        ) : null}

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
