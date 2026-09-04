import { useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { type Medida, TechniqueSpikeView } from '../../modules/technique-spike';

/**
 * Tela do spike descartável da issue #194. **Não é a feature.**
 *
 * Nada é gravado aqui: o que sobe do nativo são contadores e percentis, e o
 * frame morre em memória. Mesmo assim é `__DEV__`, porque processar a imagem do
 * corpo já é tratamento pelo Art. 5°, X — e o consentimento que cobre isso
 * (`POLICY_VERSION` 1.3) só existe quando a feature existir. Medir não é
 * motivo para abrir a câmera sobre alguém sem a base legal pronta.
 *
 * Apagar junto com o módulo depois de medir.
 */

/** O pior que se viu na sessão. É o número que decide, não o instantâneo. */
interface Pior {
  fps: number;
  p95: number;
  termico: string;
}

const ORDEM_TERMICA = ['none', 'light', 'moderate', 'severe', 'critical', 'emergency+'];

function piorTermico(atual: string, novo: string): string {
  return ORDEM_TERMICA.indexOf(novo) > ORDEM_TERMICA.indexOf(atual) ? novo : atual;
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className="text-white/70 text-xs">{rotulo}</Text>
      <Text className="text-white text-xs font-bold">{valor}</Text>
    </View>
  );
}

/**
 * O portão de produção.
 *
 * Fica antes de qualquer hook de propósito: com o `if` lá dentro, o
 * `useKeepAwake` já tinha rodado quando ele decidia devolver `null` — a tela
 * não aparecia e mesmo assim segurava a tela do aparelho acesa em release.
 *
 * Separar em dois componentes é o que permite a saída acontecer antes dos
 * hooks sem quebrar as regras deles: o corpo só monta quando `__DEV__` é
 * verdadeiro, e nada dentro dele existe em build de produção.
 */
export default function SpikeTecnica() {
  if (!__DEV__) return null;
  return <CorpoDoSpike />;
}

function CorpoDoSpike() {
  useKeepAwake();

  const [permissao, pedirPermissao] = useCameraPermissions();
  const [estado, setEstado] = useState('preparando');
  const [medida, setMedida] = useState<Medida | null>(null);
  const [pior, setPior] = useState<Pior>({
    fps: Number.POSITIVE_INFINITY,
    p95: 0,
    termico: 'none',
  });

  if (!permissao?.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Text className="text-white text-center mb-6">
          O spike precisa da câmera para medir o passe.
        </Text>
        <TouchableOpacity className="bg-white rounded-lg px-6 py-3" onPress={pedirPermissao}>
          <Text className="text-black font-bold">Permitir câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const aoMedir = (nova: Medida) => {
    setMedida(nova);
    // Só conta para o pior caso a janela em que o modelo de fato trabalhou:
    // janela sem corpo mede o detector recusando, não o passe.
    if (nova.comCorpo > 0) {
      setPior((anterior) => ({
        fps: Math.min(anterior.fps, nova.fps),
        p95: Math.max(anterior.p95, nova.p95),
        termico: piorTermico(anterior.termico, nova.termico),
      }));
    }
  };

  return (
    <View className="flex-1 bg-black">
      <TechniqueSpikeView
        className="flex-1"
        onEstado={(e) => setEstado(e.nativeEvent.estado)}
        onMedida={(e) => aoMedir(e.nativeEvent)}
      />

      <View className="absolute top-12 left-4 right-4 bg-black/70 rounded-xl p-3">
        <Text className="text-white text-xs mb-2">{estado}</Text>

        {medida === null ? (
          <Text className="text-white/50 text-xs">aguardando a primeira janela…</Text>
        ) : (
          <>
            <Linha rotulo="delegate" valor={medida.delegate} />
            <Linha rotulo="fps" valor={medida.fps.toFixed(1)} />
            <Linha rotulo="p50 / p95" valor={`${medida.p50} / ${medida.p95} ms`} />
            <Linha rotulo="com corpo" valor={`${medida.comCorpo} / ${medida.passes}`} />
            <Linha rotulo="térmico" valor={medida.termico} />

            <View className="h-px bg-white/20 my-2" />

            <Text className="text-white/50 text-xs mb-1">pior da sessão</Text>
            <Linha
              rotulo="fps mínimo"
              valor={Number.isFinite(pior.fps) ? pior.fps.toFixed(1) : '—'}
            />
            <Linha rotulo="p95 máximo" valor={`${pior.p95} ms`} />
            <Linha rotulo="térmico máximo" valor={pior.termico} />
          </>
        )}
      </View>

      {medida !== null && medida.comCorpo === 0 && (
        <View className="absolute bottom-12 left-4 right-4 bg-red-900/90 rounded-xl p-3">
          <Text className="text-white text-xs font-bold mb-1">Nenhum corpo detectado</Text>
          <Text className="text-white/80 text-xs">
            Os números acima medem o detector recusando o frame, não o passe. Ponha uma pessoa de
            perfil, corpo inteiro no quadro.
          </Text>
        </View>
      )}
    </View>
  );
}
