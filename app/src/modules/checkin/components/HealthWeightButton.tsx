import { formatarDecimal } from '@elevapro/shared';
import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { registrarFalha } from '@/lib/registro';
import { platformName } from '@/shared/wearable';
import { weekWeightIfConsented } from '../services/healthWeight';

const PLATFORM_LABEL = { healthkit: 'app Saúde', health_connect: 'Health Connect' } as const;

/**
 * F9 · "Usar o peso do app Saúde": a média da semana entra no campo, editável.
 * Só aparece onde há plataforma de saúde, e só lê com o consentimento vigente.
 *
 * @example <HealthWeightButton studentId={user.id} onWeight={(kg) => usar(kg)} />
 */
export function HealthWeightButton({
  studentId,
  onWeight,
}: {
  studentId: string | null;
  onWeight: (weight: string) => void;
}) {
  const [reading, setReading] = useState(false);
  const platform = platformName();
  if (!platform || !studentId) return null;
  const label = PLATFORM_LABEL[platform];

  async function read() {
    if (!studentId) return;
    setReading(true);
    try {
      const kg = await weekWeightIfConsented(studentId, new Date());
      if (kg === null) {
        showAlert({
          title: 'Nenhuma pesagem esta semana',
          message: `O ${label} não tem peso desde segunda, ou a leitura não foi permitida. Digite o seu.`,
          type: 'info',
        });
        return;
      }
      onWeight(formatarDecimal(kg));
    } catch {
      registrarFalha('checkin.health_weight');
    } finally {
      setReading(false);
    }
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={reading}
      onPress={() => void read()}
      className="mt-2.5 self-start rounded-full border border-primary/50 px-3.5 py-2"
    >
      <Text className="text-[0.78125rem] font-bold text-primary">
        {reading ? 'Lendo…' : `Usar o peso do ${label}`}
      </Text>
    </TouchableOpacity>
  );
}
