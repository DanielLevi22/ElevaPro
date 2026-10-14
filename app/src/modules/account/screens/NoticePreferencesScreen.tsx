import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { ChipPick } from '@/components/ui/ChipPick';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { GlassSegmented } from '@/components/ui/GlassSegmented';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { Switch } from '@/components/ui/Switch';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { requestNotificationPermissions } from '@/services/notificationService';
import { useNoticePreferencesStore } from '@/shared/notices';

const WORKOUT_MODES = [
  { value: 'learned' as const, label: 'Meu horário' },
  { value: 'fixed' as const, label: 'Fixo' },
];
const FIXED_TIMES = ['06:00', '07:00', '12:00', '18:00', '20:00'];
const DAILY_LIMITS = [1, 2, 3];

/**
 * E5 · Avisos: liga e desliga cada tipo, o horário do treino, o limite do dia
 * e se a tela bloqueada mostra detalhes (F6). Tudo fica no aparelho.
 *
 * @example <NoticePreferencesScreen />
 */
export function NoticePreferencesScreen() {
  const router = useRouter();
  const prefs = useNoticePreferencesStore();
  const granted = useNotificationPermission();

  return (
    <GlassScreen bottomSpace="tab">
      <ProgressHeader
        size="page"
        eyebrow="Ajustes"
        title="Avisos"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
      />
      {granted.value === false ? (
        <View className="mt-3">
          <LinhaDeVidro
            icon="notifications-outline"
            tom="batimento"
            titulo="Os avisos estão desligados"
            sub="Toque para permitir no aparelho"
            onPress={granted.request}
          />
        </View>
      ) : null}

      <TituloDeSecao estilo="rotulo">O que avisar</TituloDeSecao>
      <LinhaDeVidro
        icon="restaurant-outline"
        tom="calorias"
        titulo="Refeição não marcada"
        sub="1h30 depois do horário dela"
        direita={<Switch checked={prefs.meal} onChange={(meal) => prefs.update({ meal })} />}
      />
      <LinhaDeVidro
        icon="barbell-outline"
        tom="marca"
        titulo="Treino do dia"
        sub={
          prefs.workoutMode === 'fixed'
            ? `30 min depois das ${prefs.workoutTime}`
            : '30 min depois do horário em que você costuma treinar'
        }
        direita={
          <Switch checked={prefs.workout} onChange={(workout) => prefs.update({ workout })} />
        }
      />
      {prefs.workout ? <WorkoutTime /> : null}

      <TituloDeSecao estilo="rotulo">Quantos por dia</TituloDeSecao>
      <View className="flex-row gap-2">
        {DAILY_LIMITS.map((limit) => (
          <ChipPick
            key={limit}
            label={`Até ${limit}`}
            selected={prefs.dailyLimit === limit}
            onPress={() => prefs.update({ dailyLimit: limit })}
          />
        ))}
      </View>
      <Text className="mt-2 text-[0.71875rem] text-muted-foreground">
        {`O que passar disso fica no "Falta hoje" do Início. Silêncio das ${prefs.quietStart} às ${prefs.quietEnd}.`}
      </Text>

      <TituloDeSecao estilo="rotulo">Privacidade</TituloDeSecao>
      <LinhaDeVidro
        icon="lock-closed-outline"
        tom="passos"
        titulo="Esconder detalhes na tela bloqueada"
        sub='Mostra só "Você tem 2 pendências de hoje"'
        direita={
          <Switch
            checked={prefs.hideDetails}
            onChange={(hideDetails) => prefs.update({ hideDetails })}
          />
        }
      />
    </GlassScreen>
  );
}

/** O horário do aviso de treino: o aprendido (F2) ou um fixo. */
function WorkoutTime() {
  const prefs = useNoticePreferencesStore();
  return (
    <View className="mt-2 gap-2">
      <GlassSegmented
        options={WORKOUT_MODES}
        value={prefs.workoutMode}
        onChange={(workoutMode) => prefs.update({ workoutMode })}
      />
      {prefs.workoutMode === 'fixed' ? (
        <View className="flex-row gap-2">
          {FIXED_TIMES.map((time) => (
            <ChipPick
              key={time}
              label={time}
              selected={prefs.workoutTime === time}
              onPress={() => prefs.update({ workoutTime: time })}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Se o aparelho deixa avisar; nulo enquanto confere. */
function useNotificationPermission() {
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => setValue(status === 'granted'));
  }, []);
  const request = async () => setValue(await requestNotificationPermissions());
  return { value, request };
}
