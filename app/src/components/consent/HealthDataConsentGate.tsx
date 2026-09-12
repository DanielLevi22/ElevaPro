import { createHealthService, POLICY_VERSION } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

/**
 * Pede o consentimento de dados de saúde na versão vigente da política, e
 * repete o pedido quando a versão sobe.
 *
 * Existe porque até 2026-08-28 o único registro de consentimento do mobile era
 * efeito colateral de conectar o HealthKit no onboarding
 * (`onboarding/health-connect.tsx`): quem pulava aquela tela nunca consentia, e
 * quem consentia não tinha como ser perguntado de novo. Um `policy_version`
 * novo no banco não alcançava ninguém — não havia superfície que perguntasse.
 *
 * **Gate na porta, não por chamada.** A alternativa era checar `student_consents`
 * dentro de cada gravação de dado de saúde. Isso cobre as chamadas que alguém
 * lembrou de instrumentar e deixa passar as que ainda não existem — foi
 * exatamente o que aconteceu com `toggleMealCompletion`, pendente na seção 10
 * do `LGPD_COMPLIANCE.md` desde que o módulo foi revisado.
 *
 * **Recusar é possível, e é o que torna o consentimento livre (Art. 5°, XII).**
 * "Agora não" fecha o modal e o app segue utilizável; o que não acontece é a
 * gravação de dado de saúde, porque `hasCollectionConsent` continua falso e é
 * ele que os caminhos de escrita consultam. O pedido volta na próxima abertura.
 */
interface HealthDataConsentGateProps {
  /** Id do aluno logado. `null` desliga o gate — sessão ausente ou ainda carregando. */
  studentId: string | null;
  /** Só alunos consentem coleta de saúde. O especialista não é titular deste dado. */
  isStudent: boolean;
}

const ITENS_ARMAZENADOS = [
  'Passos e calorias do dia',
  'Treinos executados, com séries e cargas',
  'Refeições registradas do seu plano',
  'O que você escreve no feedback de fim de treino',
];

export function HealthDataConsentGate({ studentId, isStudent }: HealthDataConsentGateProps) {
  const insets = useSafeAreaInsets();
  const [precisaConsentir, setPrecisaConsentir] = useState(false);
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    if (!studentId || !isStudent) {
      setPrecisaConsentir(false);
      return;
    }

    let ativo = true;
    createHealthService(supabase)
      .hasCollectionConsent(studentId)
      .then((consentiu) => {
        if (ativo) setPrecisaConsentir(!consentiu);
      })
      // Falha de rede não é recusa: pedir consentimento porque a consulta caiu
      // treina o aluno a aceitar sem ler. Os caminhos de escrita já barram
      // sozinhos enquanto o consentimento não for confirmado.
      .catch(() => undefined);

    return () => {
      ativo = false;
    };
  }, [studentId, isStudent]);

  const aceitar = useCallback(async () => {
    if (!studentId) return;
    setGravando(true);
    try {
      await createHealthService(supabase).grantCollectionConsent(studentId);
      setPrecisaConsentir(false);
    } catch (error: unknown) {
      // Sem corpo: o erro do PostgREST pode trazer o payload da linha.
      console.log('[HealthDataConsentGate] falha ao gravar consentimento:', String(error));
    } finally {
      setGravando(false);
    }
  }, [studentId]);

  if (!precisaConsentir) return null;

  return (
    <Modal
      transparent
      visible
      animationType="slide"
      onRequestClose={() => setPrecisaConsentir(false)}
    >
      <View className="flex-1 justify-end bg-black/80">
        <View className="bg-card rounded-t-[32px] border-t border-border max-h-[88%]">
          <View className="items-center pt-7 pb-4">
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center border border-primary/20">
              <Ionicons name="shield-checkmark" size={32} color={colors.primary.solid} />
            </View>
          </View>

          {/* `flex-1`: sem ele o ScrollView não encolhe dentro do `max-h`, o rodapé
              é empurrado para fora da tela e a última linha do aviso some. */}
          <ScrollView className="px-7 flex-1" contentContainerClassName="pb-2">
            <Text className="text-foreground text-2xl font-extrabold font-display text-center">
              Seus dados de saúde
            </Text>
            <Text className="text-muted-foreground text-center font-sans mt-2 leading-relaxed">
              Atualizamos o texto que explica o que guardamos e quem lê. Precisamos do seu aceite
              outra vez.
            </Text>

            <Text className="text-foreground font-bold font-display mt-7 mb-2">
              O que é armazenado
            </Text>
            {ITENS_ARMAZENADOS.map((item) => (
              <View key={item} className="flex-row items-start gap-2.5 mb-2">
                <Ionicons name="ellipse" size={6} color={colors.text.muted} className="mt-[7px]" />
                <Text className="text-muted-foreground font-sans flex-1 leading-relaxed">
                  {item}
                </Text>
              </View>
            ))}

            <Text className="text-foreground font-bold font-display mt-6 mb-2">Quem lê</Text>
            <Text className="text-muted-foreground font-sans leading-relaxed">
              O especialista vinculado a você — inclusive o que você escrever no feedback de fim de
              treino. É para esse acompanhamento que o feedback existe: é ele que permite ajustar a
              sua prescrição quando algo dói ou some.
            </Text>

            {/* Opacidade cheia: com `/70` este parágrafo ficava em 4.04:1 sobre a
                superfície, abaixo do mínimo de 4.5:1 — e é justamente o texto
                que declara a base legal do tratamento. */}
            <Text className="text-muted-foreground font-sans text-xs mt-6 leading-relaxed">
              Base legal: Tutela da saúde (Art. 11, II, f) e Consentimento (Art. 11, I) da LGPD.
              Você pode revogar quando quiser no seu perfil — a revogação vale daqui para frente e
              não apaga o que já foi registrado. Versão {POLICY_VERSION} da política.
            </Text>
          </ScrollView>

          {/* `pb` do inset, não fixo: com barra de navegação por botões o
              `pb-9` deixava o último texto atrás dela. */}
          <View className="px-7 pt-4 gap-3" style={{ paddingBottom: insets.bottom + 24 }}>
            <TouchableOpacity
              onPress={aceitar}
              disabled={gravando}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Aceitar e continuar"
              className="w-full py-4 rounded-2xl bg-primary items-center justify-center"
            >
              <Text className="text-primary-foreground font-bold text-base font-display uppercase tracking-wider">
                {gravando ? 'Registrando...' : 'Aceitar e continuar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPrecisaConsentir(false)}
              disabled={gravando}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Agora não, seguir sem registrar dados de saúde"
              className="w-full py-4 rounded-2xl bg-muted border border-border items-center justify-center"
            >
              <Text className="text-muted-foreground font-bold text-base font-display uppercase tracking-wider">
                Agora não
              </Text>
            </TouchableOpacity>

            {/* Era `/60` em 11px: 3.30:1, o pior contraste da tela, e no texto que
                explica o que se perde ao recusar. Opacidade cheia e 12px. */}
            <Text className="text-muted-foreground font-sans text-xs text-center leading-relaxed">
              Sem o aceite o app continua funcionando, mas para de registrar treinos, refeições e
              medidas.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
