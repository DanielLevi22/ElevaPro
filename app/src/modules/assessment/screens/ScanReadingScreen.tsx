import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { Chip } from '@/components/ui/Chip';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { ConfidenceCard } from '../components/ConfidenceCard';
import { ScanMissing } from '../components/ScanMissing';
import { ToneTag } from '../components/ToneTag';
import { useScanHistory } from '../hooks/useScanHistory';
import { type ScanReading, scanReading } from '../services/scanView';
import { useAssessmentStore } from '../store/assessmentStore';

/**
 * Tela 6 do kit de body scan: a leitura de uma análise gravada (#316).
 *
 * A ordem é a da confiança, e não a do impacto visual: primeiro o quanto dá
 * para confiar nesta captura, depois o que a análise estimou por cima. Ressalva
 * lida depois do número já chegou tarde.
 *
 * @example <ScanReadingScreen studentId={user.id} scanId={id} />
 */
export function ScanReadingScreen({ studentId, scanId }: { studentId: string; scanId: string }) {
  const router = useRouter();
  const { scans, loading, remove } = useScanHistory(studentId);
  const fresh = useAssessmentStore((s) => s.lastScanId === scanId);
  const [confirming, setConfirming] = useState(false);
  const scan = scans.find((item) => item.id === scanId);

  if (!scan) return loading ? null : <ScanMissing />;
  const reading = scanReading(scan);

  const erase = async () => {
    setConfirming(false);
    if (await remove(scanId)) {
      router.back();
      return;
    }
    showAlert({
      title: 'Não consegui apagar',
      message: 'A análise continua salva. Tente de novo em instantes.',
      type: 'error',
    });
  };

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
            rotulo: 'Ver medidas',
            icone: 'resize-outline',
            onPress: () => router.push(ROUTES.PROGRESS.SCAN_MEASURES(scanId)),
          }}
        />
      }
    >
      <View className="flex-row justify-between pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
        <BotaoRedondo
          icone="trash-2"
          rotulo="Apagar esta análise"
          onPress={() => setConfirming(true)}
        />
      </View>

      <View className="pt-4">
        {fresh ? <Chip tom="ia">Análise pronta</Chip> : null}
        <Text
          accessibilityRole="header"
          className="mt-3 font-display-black text-[1.625rem] tracking-tight text-hero"
        >
          {reading.title}
        </Text>
        <Text className="mt-1.5 text-[0.8125rem] text-hero-secondary">{reading.subtitle}</Text>
      </View>

      <ConfidenceCard confidence={reading.confidence} />
      <Scores scores={reading.scores} />
      <Findings findings={reading.findings} />
      <Recommendation text={reading.recommendation} />

      {/* A confirmação diz o que sai e o que fica: apagar a análise não apaga o
          peso registrado por outros caminhos. */}
      <ConfirmModal
        visible={confirming}
        type="danger"
        title="Apagar esta análise?"
        message="A análise e as medidas estimadas por ela somem, e não voltam. Suas outras análises e o restante do histórico continuam."
        confirmText="Apagar análise"
        cancelText="Manter"
        onConfirm={erase}
        onClose={() => setConfirming(false)}
      />
    </GlassScreen>
  );
}

/**
 * As três notas continuam porque são o que a análise devolveu. Aqui morava um
 * "Athletic Score", a média delas com selo sempre verde: somar simetria com
 * postura não produz uma quarta grandeza, produz um número com cara de índice.
 */
function Scores({ scores }: { scores: ScanReading['scores'] }) {
  if (scores.length === 0) return null;
  return (
    <>
      <TituloDeSecao estilo="rotulo" acao="Não são medidas">
        Notas estimadas
      </TituloDeSecao>
      <Vidro className="gap-[0.8125rem] p-4">
        {scores.map((score) => (
          <View key={score.label}>
            <View className="mb-1.5 flex-row items-baseline justify-between">
              <Text className="text-[0.78125rem] text-muted-foreground">{score.label}</Text>
              <Text className="font-display-black text-[0.9375rem] tracking-tight text-primary-text">
                {score.value}
                <Text className="text-[0.625rem] font-semibold text-placeholder">/100</Text>
              </Text>
            </View>
            <BarraDeProgresso percentual={score.value} />
          </View>
        ))}
        <Text className="text-[0.71875rem] leading-[1.08rem] text-placeholder">
          São notas que a análise estimou a partir das imagens — não substituem avaliação física
          presencial e não são diagnóstico.
        </Text>
      </Vidro>
    </>
  );
}

function Findings({ findings }: { findings: ScanReading['findings'] }) {
  return (
    <>
      <TituloDeSecao estilo="rotulo">Insights da I.A.</TituloDeSecao>
      {findings.length === 0 ? (
        <Text className="text-[0.8125rem] text-placeholder">Sem observações nesta análise.</Text>
      ) : (
        <View className="gap-2.5">
          {findings.map((finding) => (
            <Vidro key={`${finding.title}-${finding.text}`} className="p-[0.9375rem]">
              <View className="flex-row items-start justify-between gap-2.5">
                <Text className="flex-1 text-[0.90625rem] font-bold tracking-tight text-foreground">
                  {finding.title}
                </Text>
                <ToneTag tone={finding.tag.tone}>{finding.tag.label}</ToneTag>
              </View>
              <Text className="mt-1.5 text-[0.78125rem] leading-[1.13rem] text-muted-foreground">
                {finding.text}
              </Text>
            </Vidro>
          ))}
        </View>
      )}
    </>
  );
}

function Recommendation({ text }: { text: string | null }) {
  const cores = useCores();
  const escalar = useEscala();
  if (!text) return null;
  return (
    <Vidro classeExterna="mt-2.5" className="p-[0.9375rem]">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name="barbell-outline" size={escalar(16)} color={cores.primaryText} />
        <Text className="text-[0.84375rem] font-bold text-foreground">Recomendação de treino</Text>
      </View>
      <Text className="text-[0.78125rem] leading-[1.13rem] text-muted-foreground">{text}</Text>
    </Vidro>
  );
}
