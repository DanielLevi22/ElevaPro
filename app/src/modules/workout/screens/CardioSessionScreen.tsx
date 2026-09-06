import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { ShareWorkoutModal } from '@/components/workout/ShareWorkoutModal';
import { WorkoutFeedbackModal } from '@/components/workout/WorkoutFeedbackModal';
import { useGamificationStore } from '@/modules/gamification/store/gamificationStore';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { CabecalhoDaSessao } from '../components/CabecalhoDaSessao';
import { ControlesDaSessao } from '../components/ControlesDaSessao';
import { MetaDeTempo } from '../components/MetaDeTempo';
import { MetricasDaCorrida } from '../components/MetricasDaCorrida';
import { RelogioDaSessao } from '../components/RelogioDaSessao';
import { useCronometroDaSessao } from '../hooks/useCronometroDaSessao';
import { useIntensidadeDoMovimento } from '../hooks/useIntensidadeDoMovimento';
import { usePesoDoAluno } from '../hooks/usePesoDoAluno';
import { useRastreioDaCorrida } from '../hooks/useRastreioDaCorrida';
import { mediaDeBatimentos } from '../services/frequenciaDaSessao';
import { useWorkoutStore } from '../store/workoutStore';

/** METs aproximados por modalidade. */
const METS: Record<string, number> = {
  Caminhada: 3.5,
  Corrida: 8.0,
  Bicicleta: 6.0,
  Elíptico: 5.0,
  Natação: 7.0,
  Cardio: 5.0,
};

function formatarTempo(total: number): string {
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const mm = minutos < 10 ? `0${minutos}` : minutos;
  const ss = segundos < 10 ? `0${segundos}` : segundos;
  return `${horas > 0 ? `${horas}:` : ''}${mm}:${ss}`;
}

export default function CardioSessionScreen() {
  const { exerciseName } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { incrementWorkoutProgress } = useGamificationStore();
  const { saveCardioSession } = useWorkoutStore();

  const modalidade = (exerciseName as string) || 'Cardio Livre';
  const met = METS[modalidade] ?? METS.Cardio;

  const [metaEmMinutos, setMetaEmMinutos] = useState<number | null>(null);
  const [minutosDigitados, setMinutosDigitados] = useState('');
  const [mostrarCompartilhar, setMostrarCompartilhar] = useState(false);
  const [mostrarFeedback, setMostrarFeedback] = useState(false);
  const [resumoParaCompartilhar, setResumoParaCompartilhar] = useState({
    title: '',
    duration: '',
    calories: '',
    date: '',
    exerciseName: '',
  });

  const pesoKg = usePesoDoAluno(user?.id);
  const cronometro = useCronometroDaSessao({ met, pesoKg, metaEmMinutos });
  const intensidade = useIntensidadeDoMovimento(cronometro.emAndamento);
  const rastreio = useRastreioDaCorrida();

  const iniciar = useCallback(() => {
    cronometro.iniciar();
    rastreio.iniciar();
  }, [cronometro.iniciar, rastreio.iniciar]);

  const pausar = useCallback(() => {
    cronometro.pausar();
    rastreio.pausar();
  }, [cronometro.pausar, rastreio.pausar]);

  const finalizar = useCallback(() => {
    pausar();
    setMostrarFeedback(true);
  }, [pausar]);

  const escolherPreset = useCallback((minutos: number) => {
    setMetaEmMinutos((atual) => (atual === minutos ? null : minutos));
    setMinutosDigitados((atual) => (atual === String(minutos) ? '' : String(minutos)));
  }, []);

  const digitarMeta = useCallback((texto: string) => {
    setMinutosDigitados(texto);
    const minutos = Number.parseInt(texto, 10);
    setMetaEmMinutos(Number.isNaN(minutos) || minutos <= 0 ? null : minutos);
  }, []);

  const aoEnviarFeedback = useCallback(
    async (rpe: number, notas: string) => {
      setMostrarFeedback(false);

      const inicio = cronometro.inicioDaSessao;
      if (!user?.id || !inicio) return;

      const fim = new Date();
      const tempoFormatado = formatarTempo(cronometro.segundos);
      const caloriasFinais = Math.round(cronometro.calorias);

      try {
        // O batimento é lido antes de encerrar o rastreio, mas depois de o
        // relógio ter tido o período inteiro para gravar — é por isso que a
        // leitura acontece aqui, e não a cada tique.
        const batimento = await mediaDeBatimentos(inicio, fim);

        await saveCardioSession({
          studentId: user.id,
          exerciseName: modalidade,
          durationSeconds: cronometro.segundos,
          calories: cronometro.calorias,
          startedAt: inicio.toISOString(),
          completedAt: fim.toISOString(),
          intensity: rpe,
          notes: notas,
          distanceMeters: rastreio.distanceMeters > 0 ? Math.round(rastreio.distanceMeters) : null,
          avgPaceSecondsPerKm: rastreio.paceSecondsPerKm,
          avgCadenceSpm: rastreio.avgCadenceSpm,
          avgHeartRate: batimento,
        });

        // Só depois de gravar: encerrar apaga as posições da memória, e uma
        // falha antes disto deixaria o aluno sem o traçado e sem a sessão.
        await rastreio.encerrar();
        await incrementWorkoutProgress(getLocalDateISOString());

        showConfirm({
          title: 'Treino Salvo! 🎉',
          message: `Tempo: ${tempoFormatado}\nCalorias: ${caloriasFinais} kcal`,
          type: 'success',
          confirmText: 'Compartilhar 📸',
          cancelText: 'Sair',
          onConfirm: () => {
            setResumoParaCompartilhar({
              title: 'Cardio Finalizado',
              duration: tempoFormatado,
              calories: `${caloriasFinais} kcal`,
              date: new Date().toLocaleDateString('pt-BR'),
              exerciseName: modalidade,
            });
            setMostrarCompartilhar(true);
          },
          onCancel: () => router.navigate('/(tabs)/cardio'),
        });
      } catch {
        // Sem o objeto de erro: o do PostgREST pode carregar o payload, e
        // `notes` é dado sensível de saúde.
        showAlert({ title: 'Erro', message: 'Erro ao salvar treino.', type: 'error' });
      }
    },
    [
      user?.id,
      modalidade,
      cronometro.inicioDaSessao,
      cronometro.segundos,
      cronometro.calorias,
      rastreio.distanceMeters,
      rastreio.paceSecondsPerKm,
      rastreio.avgCadenceSpm,
      rastreio.encerrar,
      saveCardioSession,
      incrementWorkoutProgress,
      router,
    ]
  );

  const naoComecou = !cronometro.emAndamento && cronometro.segundos === 0;

  return (
    <ScreenLayout>
      <View className="flex-1 p-6 pb-32 justify-between">
        <CabecalhoDaSessao
          exercicio={modalidade}
          intensidade={intensidade}
          onVoltar={router.back}
        />

        <RelogioDaSessao
          tempo={formatarTempo(cronometro.segundos)}
          calorias={cronometro.calorias}
          metaEmMinutos={metaEmMinutos}
          met={met}
        />

        {naoComecou ? (
          <MetaDeTempo
            metaEmMinutos={metaEmMinutos}
            minutosDigitados={minutosDigitados}
            onEscolherPreset={escolherPreset}
            onDigitar={digitarMeta}
          />
        ) : (
          <MetricasDaCorrida
            distanceMeters={rastreio.distanceMeters}
            paceSecondsPerKm={rastreio.paceSecondsPerKm}
            avgCadenceSpm={rastreio.avgCadenceSpm}
            pontos={rastreio.pontos}
            temLocalizacao={rastreio.temLocalizacao}
          />
        )}

        <ControlesDaSessao
          naoComecou={naoComecou}
          emAndamento={cronometro.emAndamento}
          onIniciar={iniciar}
          onPausar={pausar}
          onFinalizar={finalizar}
        />

        <ShareWorkoutModal
          visible={mostrarCompartilhar}
          onClose={() => {
            setMostrarCompartilhar(false);
            router.navigate('/(tabs)/cardio');
          }}
          stats={resumoParaCompartilhar}
        />

        <WorkoutFeedbackModal
          visible={mostrarFeedback}
          onClose={() => setMostrarFeedback(false)}
          onSubmit={aoEnviarFeedback}
        />
      </View>
    </ScreenLayout>
  );
}
