import { type LinhaMedida, linhasMedidas, type MedidasGeometricas } from '@elevapro/shared';
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

function Linha({ linha }: { linha: LinhaMedida }) {
  // O `lado` some quando o desnível é menor que a incerteza do método, e a
  // `nota` diz isso no lugar. Nomear lado com 0,7° afirmaria uma certeza que a
  // torção tolerada do aparelho já consome inteira.
  const detalhe = linha.lado ?? linha.nota;

  return (
    <View className="flex-row items-baseline justify-between border-zinc-800 border-b py-3">
      <View className="flex-1 pr-3">
        <Text className="text-sm text-zinc-300">{linha.rotulo}</Text>
        {detalhe ? <Text className="mt-0.5 text-xs text-zinc-500">{detalhe}</Text> : null}
      </View>
      <Text className="font-bold text-base text-white">
        {linha.valor.toFixed(1)}
        <Text className="text-sm text-zinc-500"> {linha.unidade}</Text>
      </Text>
    </View>
  );
}

export function MedidasDoScan({ medidas }: { medidas: MedidasGeometricas }) {
  const linhas = linhasMedidas(medidas);

  // Sem nada medido a seção some. Um cabeçalho com nove traços afirmaria que
  // houve medição e que ela deu zero — que é um achado, não uma ausência.
  if (linhas.length === 0) return null;

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

      {linhas.map((linha) => (
        <Linha key={linha.campo} linha={linha} />
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
