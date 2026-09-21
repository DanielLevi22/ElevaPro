import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { ManualKeyBlock } from '../components/ManualKeyBlock';
import { QrCodeBlock } from '../components/QrCodeBlock';
import { TotpCodeForm } from '../components/TotpCodeForm';
import { useTotpEnrollment } from '../hooks/useTotpEnrollment';
import { useAuthStore } from '../store/authStore';

export function MfaScreen() {
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
    onVerified: () => useAuthStore.getState().initializeSession(useAuthStore.getState().session),
  });

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
