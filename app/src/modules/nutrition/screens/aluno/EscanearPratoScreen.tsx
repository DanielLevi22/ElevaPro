import type { AnaliseDoPrato } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Anel } from '@/components/ui/Anel';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { Vidro } from '@/components/ui/Vidro';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { TresMacros } from '../../components/aluno/AnelDeMacro';
import { ComponentesDoPrato } from '../../components/aluno/ComponentesDoPrato';
import { ConfirmacaoDoRegistro } from '../../components/aluno/ConfirmacaoDoRegistro';
import { TelaDaNutricao } from '../../components/aluno/TelaDaNutricao';
import { type ScanDoPrato, useScanDoPrato } from '../../hooks/useScanDoPrato';
import { percentualDaMeta } from '../../services/consumoDoDia';

/**
 * Tela 5 do fluxo de nutrição do kit: a foto com a moldura de reconhecimento,
 * o prato, as calorias sobre a meta do dia e os macros.
 *
 * O kit desenha a câmera ao vivo; o app fotografa ou escolhe da galeria, e a
 * foto ocupa o lugar dela. "Componentes detectados" só aparece quando o modelo
 * separou o prato; as porções ajustadas mudam o total e o que vai ao diário.
 *
 * @example
 * <EscanearPratoScreen alunoId={user.id} somenteLeitura={false} obterToken={() => token} />
 */
interface EscanearPratoScreenProps {
  alunoId: string;
  somenteLeitura: boolean;
  obterToken: () => string;
}

/** A ordem do kit no scan: proteína, gordura, carbos. */
const ORDEM_DO_SCAN = ['proteina', 'gordura', 'carboidrato'] as const;

export function EscanearPratoScreen({
  alunoId,
  somenteLeitura,
  obterToken,
}: EscanearPratoScreenProps) {
  const router = useRouter();
  const scan = useScanDoPrato(alunoId, { somenteLeitura, obterToken });

  return (
    <TelaDaNutricao semRespiroNoTopo folgaNoFim="rodape" sobreposicao={<AcoesDoScan scan={scan} />}>
      <FotoDoPrato scan={scan} onVoltar={router.back} />
      <View className="-mt-[1.625rem] rounded-t-[1.75rem] bg-background px-[1.125rem] pt-5">
        {scan.resultado ? (
          <ResultadoDoScan scan={scan} resultado={scan.resultado} />
        ) : (
          <Text className="py-6 text-center text-legenda text-muted-foreground">
            {scan.analisando
              ? 'Analisando o prato…'
              : 'Fotografe o prato ou escolha uma foto. A imagem vai à análise e não é guardada.'}
          </Text>
        )}
      </View>
      <ConfirmacaoDoRegistro registro={scan.registro} />
    </TelaDaNutricao>
  );
}

function AcoesDoScan({ scan }: { scan: ScanDoPrato }) {
  if (!scan.imagem) {
    return (
      <BarraDeDuasAcoes
        secundaria={{ rotulo: 'Galeria', icone: 'images-outline', onPress: scan.escolherDaGaleria }}
        principal={{ rotulo: 'Tirar foto', icone: 'camera', onPress: scan.fotografar }}
      />
    );
  }
  return (
    <BarraDeDuasAcoes
      secundaria={{ rotulo: 'Escanear outro', icone: 'camera', onPress: scan.fotografar }}
      principal={{
        rotulo: 'Adicionar ao diário',
        icone: 'add',
        onPress: scan.adicionar,
        desabilitada: !scan.podeAdicionar,
      }}
    />
  );
}

/** `0 0 34px -6px` por fora e `inset 0 0 34px -14px` por dentro, da primária. */
function useBrilhoDaMoldura() {
  const brilho = useBrilho();
  return [
    ...brilho({ blur: 34, espalhamento: -6 }),
    ...brilho({ blur: 34, espalhamento: -14 }).map((sombra) => ({ ...sombra, inset: true })),
  ];
}

/**
 * O lugar da câmera, 296 no kit abaixo dos 52 da barra de status, com a
 * moldura verde de reconhecimento.
 */
function FotoDoPrato({ scan, onVoltar }: { scan: ScanDoPrato; onVoltar: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  const brilhoDaMoldura = useBrilhoDaMoldura();

  return (
    <View className="h-[21.75rem] items-center justify-center overflow-hidden bg-glass-strong pt-[3.25rem]">
      {scan.imagem ? (
        <Image source={{ uri: scan.imagem }} className="absolute inset-0" contentFit="cover" />
      ) : (
        <Ionicons name="camera-outline" size={escalar(64)} color={cores.placeholder} />
      )}
      <View
        pointerEvents="none"
        className="absolute bottom-[4.375rem] left-[2.875rem] right-[2.875rem] top-[6.75rem] rounded-xl border-2 border-primary"
        style={{ boxShadow: brilhoDaMoldura }}
      />
      <View className="absolute left-[1.125rem] right-[1.125rem] top-[4.125rem] flex-row">
        <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={onVoltar} />
      </View>
      {scan.analisando ? <AvisoDeAnalise /> : null}
    </View>
  );
}

function AvisoDeAnalise() {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="absolute bottom-4 left-0 right-0 items-center">
      {/* Véu preto a 60% nos dois temas, como o kit: fica sobre foto. */}
      <View className="flex-row items-center gap-[0.4375rem] rounded-full bg-black/60 px-3.5 py-[0.4375rem]">
        <Ionicons name="sparkles" size={escalar(14)} color={cores.primary} />
        <Text className="text-[0.71875rem] font-bold text-sobre-imagem">
          Identificando o prato e as porções
        </Text>
      </View>
    </View>
  );
}

interface ResultadoDoScanProps {
  scan: ScanDoPrato;
  resultado: AnaliseDoPrato;
}

function ResultadoDoScan({ scan, resultado }: ResultadoDoScanProps) {
  const cores = useCores();
  const escalar = useEscala();
  const confianca = Math.round(resultado.confidence * 100);

  return (
    <>
      <View className="mb-2.5 flex-row gap-1.5">
        <Chip tom="destaque">Reconhecido</Chip>
        <Chip>{`Confiança ${confianca}%`}</Chip>
      </View>
      <Text className="text-[1.4375rem] font-bold tracking-tight text-foreground">
        {resultado.name}
      </Text>
      <Vidro classeExterna="mt-3.5" className="flex-row items-center p-4">
        <View className="flex-1">
          <Text className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-placeholder">
            Calorias totais
          </Text>
          <View className="mt-1 flex-row items-baseline gap-[0.3125rem]">
            <Text className="font-display-black text-[2.5rem] tracking-tight text-foreground">
              {Math.round(scan.macros.calorias)}
            </Text>
            <Text className="text-[0.8125rem] font-bold text-muted-foreground">kcal</Text>
          </View>
        </View>
        <Anel
          valor={scan.macros.calorias}
          meta={scan.metaDiaria.calorias}
          rotulo={`${percentualDaMeta(scan.macros.calorias, scan.metaDiaria.calorias)}%`}
          sub="da meta diária"
          tamanho={80}
          espessura={9}
          brilho={12}
          cor={cores.metricaGordura}
        >
          <Ionicons name="flame" size={escalar(28)} color={cores.metricaGordura} />
        </Anel>
      </Vidro>
      <TresMacros valores={scan.macros} metas={scan.metaDiaria} ordem={ORDEM_DO_SCAN} />
      <ComponentesDoPrato componentes={scan.componentes} onAjustar={scan.ajustarPorcao} />
    </>
  );
}
