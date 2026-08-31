import type { MedidasGeometricas } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

/**
 * O que o aparelho mediu sobre o corpo do aluno, na tela dele.
 *
 * Existe por obrigação, não por enfeite: medida gravada que só o especialista
 * lê é tratamento sem livre acesso (Art. 18, II). O parecer do `/lgpd-check`
 * exigiu que os campos novos aparecessem para o titular.
 *
 * É a única parte da tela que não vem do modelo. Por isso o cabeçalho separa as
 * duas coisas — aqui é o que foi medido, o resto da tela é o que foi
 * interpretado —, e por isso nenhuma linha daqui vira julgamento: o texto diz
 * "ombro direito 1,8 cm mais alto", nunca "assimetria preocupante".
 */

/** Nome e unidade de cada medida. A ordem é a de leitura, de cima para baixo. */
const LINHAS: Array<{
  campo: keyof MedidasGeometricas;
  rotulo: string;
  unidade: string;
  /** Medidas com lado: o sinal vira palavra, e o número perde o sinal. */
  lados?: [string, string];
}> = [
  {
    campo: 'shoulder_drop_cm',
    rotulo: 'Desnível dos ombros',
    unidade: 'cm',
    lados: ['direito mais alto', 'esquerdo mais alto'],
  },
  { campo: 'shoulder_tilt_deg', rotulo: 'Inclinação dos ombros', unidade: '°' },
  {
    campo: 'hip_drop_cm',
    rotulo: 'Desnível do quadril',
    unidade: 'cm',
    lados: ['direito mais alto', 'esquerdo mais alto'],
  },
  { campo: 'hip_tilt_deg', rotulo: 'Inclinação do quadril', unidade: '°' },
  { campo: 'axis_deviation_cm', rotulo: 'Desvio do eixo do corpo', unidade: 'cm' },
  { campo: 'plumb_shoulder_cm', rotulo: 'Ombro à frente do tornozelo', unidade: 'cm' },
  { campo: 'plumb_hip_cm', rotulo: 'Quadril à frente do tornozelo', unidade: 'cm' },
  { campo: 'plumb_knee_cm', rotulo: 'Joelho à frente do tornozelo', unidade: 'cm' },
];

function valorDe(medidas: MedidasGeometricas, campo: keyof MedidasGeometricas): number | null {
  const bruto = medidas[campo];

  return typeof bruto === 'number' ? bruto : null;
}

/** Quantas medidas saíram. Zero significa que a máscara não mediu nada. */
export function quantasMedidas(medidas: MedidasGeometricas): number {
  return LINHAS.filter((linha) => valorDe(medidas, linha.campo) !== null).length;
}

function Linha({
  medidas,
  linha,
}: {
  medidas: MedidasGeometricas;
  linha: (typeof LINHAS)[number];
}) {
  const valor = valorDe(medidas, linha.campo);
  if (valor === null) return null;

  const lado = linha.lados ? (valor > 0 ? linha.lados[0] : linha.lados[1]) : null;

  return (
    <View className="flex-row items-baseline justify-between border-zinc-800 border-b py-3">
      <View className="flex-1 pr-3">
        <Text className="text-sm text-zinc-300">{linha.rotulo}</Text>
        {lado ? <Text className="mt-0.5 text-xs text-zinc-500">{lado}</Text> : null}
      </View>
      <Text className="font-bold text-base text-white">
        {Math.abs(valor).toFixed(1)}
        <Text className="text-sm text-zinc-500"> {linha.unidade}</Text>
      </Text>
    </View>
  );
}

export function MedidasDoScan({ medidas }: { medidas: MedidasGeometricas }) {
  // Sem nada medido a seção some. Um cabeçalho com nove traços afirmaria que
  // houve medição e que ela deu zero — que é um achado, não uma ausência.
  if (quantasMedidas(medidas) === 0) return null;

  return (
    <View className="mt-6 rounded-2xl bg-zinc-900 p-5">
      <View className="mb-1 flex-row items-center gap-2">
        <Ionicons name="resize-outline" color="#a1a1aa" size={18} />
        <Text className="font-bold text-lg text-white">Medido no seu aparelho</Text>
      </View>
      <Text className="mb-3 text-xs text-zinc-500 leading-5">
        Estes números saem da geometria da foto, não da estimativa da análise. O que muda entre dois
        scans é mais confiável que o valor isolado de um.
      </Text>

      {LINHAS.map((linha) => (
        <Linha key={linha.campo} linha={linha} medidas={medidas} />
      ))}

      {medidas.trunk_rotated ? (
        <View className="mt-4 flex-row gap-2 rounded-xl bg-amber-500/10 p-3">
          <Ionicons name="alert-circle-outline" color="#fbbf24" size={16} />
          <Text className="flex-1 text-amber-200/90 text-xs leading-5">
            Na foto de frente seu tronco estava um pouco virado. Isso pode fazer uma diferença entre
            os lados parecer maior do que é.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
