import { type LinhaMedida, linhasMedidas, type MedidasGeometricas } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * O que o aparelho mediu sobre o corpo do aluno, na tela dele.
 *
 * Existe por obrigação, não por enfeite: medida gravada que só o especialista
 * lê é tratamento sem livre acesso (Art. 18, II). O parecer do `/lgpd-check`
 * exigiu que os campos aparecessem para o titular, e a #316 manteve o painel na
 * tela de medidas.
 *
 * **Recolhido por padrão, e a distinção é essa:** o Art. 18 garante ACESSO ao
 * que foi tratado, não exibição no meio do resultado. "Desvio do eixo do corpo:
 * 1,4 cm" não tem faixa de referência que o aluno conheça — número sem régua ou
 * não comunica nada, ou comunica ansiedade.
 *
 * É a única parte que não vem do modelo. Por isso o cabeçalho diz que isto é o
 * que foi medido, e nenhuma linha vira julgamento: "ombro direito 1,8 cm mais
 * alto", nunca "assimetria preocupante".
 *
 * @example <ScanGeometry medidas={scan} />
 */

const ICON = 18;

function Row({ linha }: { linha: LinhaMedida }) {
  // O `lado` some quando o desnível é menor que a incerteza do método, e a
  // `nota` diz isso no lugar. Nomear lado com 0,7° afirmaria uma certeza que a
  // torção tolerada do aparelho já consome inteira.
  const detail = linha.lado ?? linha.nota;
  return (
    <View className="flex-row items-baseline justify-between border-b border-glass-border py-3">
      <View className="flex-1 pr-3">
        <Text className="text-[0.8125rem] text-foreground">{linha.rotulo}</Text>
        {detail ? <Text className="mt-0.5 text-xs text-placeholder">{detail}</Text> : null}
      </View>
      <Text className="font-display-black text-[0.9375rem] text-foreground">
        {linha.valor.toFixed(1)}
        <Text className="text-xs text-muted-foreground"> {linha.unidade}</Text>
      </Text>
    </View>
  );
}

export function ScanGeometry({ medidas }: { medidas: MedidasGeometricas }) {
  const cores = useCores();
  const escalar = useEscala();
  const linhas = linhasMedidas(medidas);
  const [open, setOpen] = useState(false);

  // Sem nada medido a seção some. Um cabeçalho com nove traços afirmaria que
  // houve medição e que ela deu zero — que é um achado, não uma ausência.
  if (linhas.length === 0) return null;

  return (
    <Vidro classeExterna="mt-2.5" className="p-[0.9375rem]">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        activeOpacity={0.7}
        className="flex-row items-center gap-2"
        onPress={() => setOpen((was) => !was)}
      >
        <Ionicons name="resize-outline" color={cores.primaryText} size={escalar(ICON)} />
        <Text className="flex-1 text-[0.9375rem] font-bold text-foreground">
          Medido no seu aparelho
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          color={cores.placeholder}
          size={escalar(ICON)}
        />
      </TouchableOpacity>

      {open ? (
        <>
          <Text className="mb-1 mt-1 text-xs leading-5 text-muted-foreground">
            Estes números saem da geometria da foto, não da estimativa da análise. O que muda entre
            dois scans é mais confiável que o valor isolado de um.
          </Text>
          {linhas.map((linha) => (
            <Row key={linha.campo} linha={linha} />
          ))}
        </>
      ) : (
        <Text className="mt-1 text-xs leading-5 text-muted-foreground">
          {linhas.length} medidas da geometria das suas fotos. Toque para ver.
        </Text>
      )}

      {medidas.trunk_rotated ? (
        <View className="mt-3 flex-row gap-2 rounded-xl bg-metrica-gordura/10 p-3">
          <Ionicons name="alert-circle-outline" color={cores.textoGordura} size={escalar(16)} />
          <Text className="flex-1 text-xs leading-5 text-muted-foreground">
            Na foto de frente seu tronco estava um pouco virado. Isso pode fazer uma diferença entre
            os lados parecer maior do que é.
          </Text>
        </View>
      ) : null}
    </Vidro>
  );
}
