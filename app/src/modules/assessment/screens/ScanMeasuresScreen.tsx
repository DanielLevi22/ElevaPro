import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { InfoNote } from '@/components/ui/InfoNote';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { TrendDelta } from '@/components/ui/TrendDelta';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { ScanGeometry } from '../components/ScanGeometry';
import { ScanMissing } from '../components/ScanMissing';
import { useScan } from '../hooks/useScanHistory';
import { type MeasureRow, previousScan, scanMeasures } from '../services/scanView';

/**
 * Tela 7 do kit de body scan: as medidas estimadas de uma análise, contra a
 * anterior (#316).
 *
 * A variação fica neutra: perder cintura é o objetivo de um e o problema de
 * outro, e quem sabe é quem treina — a mesma regra das medidas da #312. O kit
 * pinta subir de verde.
 *
 * @example <ScanMeasuresScreen studentId={user.id} scanId={id} />
 */
export function ScanMeasuresScreen({ studentId, scanId }: { studentId: string; scanId: string }) {
  const router = useRouter();
  const { scan, scans, missing } = useScan(studentId, scanId);

  if (!scan) return missing ? <ScanMissing /> : null;
  const measures = scanMeasures(scan, previousScan(scans, scanId));

  return (
    <GlassScreen
      glow={PROGRESS_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{
            rotulo: 'Repetir scan',
            icone: 'refresh',
            onPress: () => router.push(ROUTES.ASSESSMENT.BODY_SCAN),
          }}
          principal={{
            rotulo: 'Ver histórico',
            icone: 'time-outline',
            onPress: () => router.push(ROUTES.PROGRESS.SCANS),
          }}
        />
      }
    >
      <ProgressHeader
        size="page"
        eyebrow="Estimado por imagem"
        title="Suas medidas"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
        trailing={
          <BotaoRedondo
            icone="ruler"
            rotulo="Medidas com fita e declaradas"
            onPress={() => router.push(ROUTES.PROGRESS.BODY)}
          />
        }
      />

      <InfoNote icon="information-circle-outline" className="mt-3.5">
        Duas análises na mesma pose dão a diferença mais confiável desta tela. Compare sempre
        estimativa com estimativa — fita e medida declarada são outra origem.
      </InfoNote>

      <TituloDeSecao
        estilo="rotulo"
        acao={measures.comparedWith ? `vs. ${measures.comparedWith}` : undefined}
      >
        Composição
      </TituloDeSecao>
      <View className="flex-row flex-wrap gap-2.5">
        {measures.composition.map((row) => (
          <CompositionTile key={row.label} row={row} />
        ))}
      </View>

      {measures.circumferences.length > 0 ? (
        <>
          <TituloDeSecao estilo="rotulo" acao="cm">
            Circunferências estimadas
          </TituloDeSecao>
          <View className="gap-[0.5625rem]">
            {measures.circumferences.map((row) => (
              <CircumferenceRow key={row.label} row={row} />
            ))}
          </View>
        </>
      ) : null}

      <ScanGeometry medidas={scan} />

      <InfoNote icon="shield-checkmark-outline" className="mt-2.5">
        As três fotos foram descartadas depois da análise. O que ficou salvo são estes números e as
        notas de postura.
      </InfoNote>
    </GlassScreen>
  );
}

function CompositionTile({ row }: { row: MeasureRow }) {
  return (
    <Vidro classeExterna="w-[48.4%]" className="p-3.5">
      <Text className="text-[0.625rem] font-bold uppercase tracking-widest text-placeholder">
        {row.label}
      </Text>
      <View className="mt-[0.4375rem] flex-row items-baseline gap-[0.1875rem]">
        <Text className="font-display-black text-[1.4375rem] tracking-tight text-foreground">
          {row.value}
        </Text>
        <Text className="text-[0.6875rem] font-bold text-muted-foreground">{row.unit}</Text>
      </View>
    </Vidro>
  );
}

function CircumferenceRow({ row }: { row: MeasureRow }) {
  return (
    <Vidro className="flex-row items-center gap-3 p-3">
      <Text className="flex-1 text-[0.84375rem] font-semibold text-foreground">{row.label}</Text>
      {row.delta !== null ? <TrendDelta value={row.delta} judgement="neutral" /> : null}
      <Text className="w-[3.375rem] text-right font-display-black text-base tracking-tight text-foreground">
        {row.value}
      </Text>
    </Vidro>
  );
}
