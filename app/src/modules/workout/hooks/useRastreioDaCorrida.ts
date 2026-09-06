import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import * as TaskManager from 'expo-task-manager';
import { useCallback, useRef, useState } from 'react';
import { medirPercurso, type Percurso, type Posicao } from '../services/percurso';

/**
 * Rastreio de uma corrida: distância, ritmo, cadência e o traçado da tela.
 *
 * **As posições não saem daqui.** Elas vivem num ref, alimentam a medida e o
 * desenho, e morrem com a tela. Nada de coordenada chega ao banco — ver a issue
 * #278 e a §2.3 de `docs/LGPD_COMPLIANCE.md`. O `pontos` exposto existe só para
 * o SVG do resumo, que é renderizado no aparelho.
 */

const TAREFA_DE_LOCALIZACAO = 'background-location-task';

/**
 * A tarefa precisa ser registrada no escopo do módulo, e não dentro do
 * componente: o sistema pode reentregar posições depois de o processo ser
 * reciclado, quando nenhum componente está montado.
 *
 * **Este registro é o defeito que a #278 encontrou.** Até aqui a tela pedia
 * permissão de localização em background e chamava `startLocationUpdatesAsync`
 * sem nenhum `defineTask` no app inteiro: o sistema concedia a permissão mais
 * invasiva que existe e nenhuma coordenada era recebida. Coleta sem finalidade,
 * Art. 6°, I e III.
 */
const posicoesRecebidas: Posicao[] = [];

TaskManager.defineTask(TAREFA_DE_LOCALIZACAO, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };

  for (const { coords, timestamp } of locations ?? []) {
    posicoesRecebidas.push({
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp,
      accuracy: coords.accuracy,
    });
  }
});

export interface RastreioDaCorrida extends Percurso {
  /** Traçado para o SVG do resumo. Só existe em memória. */
  pontos: Posicao[];
  /** Passos por minuto, ou `null` sem contador de passos no aparelho. */
  avgCadenceSpm: number | null;
  /** Falso quando o aluno negou a localização — a corrida roda sem medida. */
  temLocalizacao: boolean;
  iniciar: () => Promise<void>;
  pausar: () => Promise<void>;
  encerrar: () => Promise<void>;
}

/**
 * Opções de precisão da corrida. `BestForNavigation` porque `Balanced` entrega
 * fixes de ~100 m, e o filtro de precisão de `medirPercurso` descartaria todos
 * eles — a corrida terminaria sempre sem distância.
 */
const PRECISAO_DA_CORRIDA: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 5,
  foregroundService: {
    notificationTitle: 'Corrida em andamento',
    notificationBody: 'Medindo distância e ritmo.',
    notificationColor: '#FF6B35',
  },
};

export function useRastreioDaCorrida(): RastreioDaCorrida {
  const [percurso, setPercurso] = useState<Percurso>({
    distanceMeters: 0,
    paceSecondsPerKm: null,
  });
  const [pontos, setPontos] = useState<Posicao[]>([]);
  const [avgCadenceSpm, setAvgCadenceSpm] = useState<number | null>(null);
  const [temLocalizacao, setTemLocalizacao] = useState(false);

  const inscricaoDePassos = useRef<{ remove: () => void } | null>(null);
  // Ref separado do de passos: as duas inscrições têm ciclos de vida
  // independentes, e guardá-las no mesmo lugar faria a segunda sobrescrever a
  // primeira e vazar o rastreio de localização até o app morrer.
  const inscricaoDeLocalizacao = useRef<{ remove: () => void } | null>(null);
  const passosDaSessao = useRef(0);
  const inicioDosPassos = useRef<number | null>(null);
  const releitura = useRef<ReturnType<typeof setInterval> | null>(null);

  const recalcular = useCallback(() => {
    setPontos([...posicoesRecebidas]);
    setPercurso(medirPercurso(posicoesRecebidas));

    const desde = inicioDosPassos.current;
    if (desde === null) return;
    const minutos = (Date.now() - desde) / 60_000;
    // Um minuto de corrida é o mínimo para a média significar algo: nos
    // primeiros segundos, meia dúzia de passos vira cadência de 400.
    if (minutos >= 1) setAvgCadenceSpm(Math.round(passosDaSessao.current / minutos));
  }, []);

  const iniciar = useCallback(async () => {
    // Só primeiro plano. A permissão de background saiu com a #278: o
    // rastreador de corrida roda em serviço de primeiro plano iniciado pelo
    // aluno, que é o desenho que o Android prevê para este caso e dispensa a
    // declaração de background na Play Store.
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setTemLocalizacao(false);
      return;
    }
    setTemLocalizacao(true);

    try {
      await Location.startLocationUpdatesAsync(TAREFA_DE_LOCALIZACAO, PRECISAO_DA_CORRIDA);
    } catch {
      // Sem serviço de primeiro plano o rastreio segue enquanto a tela estiver
      // aberta. Medir menos é melhor que não medir, e melhor ainda que pedir a
      // permissão de background só para cobrir este caso.
      const inscricao = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
        ({ coords, timestamp }) => {
          posicoesRecebidas.push({
            latitude: coords.latitude,
            longitude: coords.longitude,
            timestamp,
            accuracy: coords.accuracy,
          });
        }
      );
      inscricaoDeLocalizacao.current = inscricao;
    }

    if (await Pedometer.isAvailableAsync()) {
      inicioDosPassos.current ??= Date.now();
      const inscricao = Pedometer.watchStepCount(({ steps }) => {
        passosDaSessao.current = steps;
      });
      inscricaoDePassos.current = inscricao;
    }

    releitura.current = setInterval(recalcular, 3000);
  }, [recalcular]);

  const pausar = useCallback(async () => {
    if (releitura.current) clearInterval(releitura.current);
    releitura.current = null;
    recalcular();

    if (await TaskManager.isTaskRegisteredAsync(TAREFA_DE_LOCALIZACAO)) {
      await Location.stopLocationUpdatesAsync(TAREFA_DE_LOCALIZACAO);
    }
  }, [recalcular]);

  const encerrar = useCallback(async () => {
    await pausar();
    inscricaoDePassos.current?.remove();
    inscricaoDePassos.current = null;
    inscricaoDeLocalizacao.current?.remove();
    inscricaoDeLocalizacao.current = null;
    // As coordenadas morrem aqui. É o fim da vida útil delas: a medida já foi
    // derivada e é ela, e só ela, que vai para o banco.
    posicoesRecebidas.length = 0;
    passosDaSessao.current = 0;
    inicioDosPassos.current = null;
  }, [pausar]);

  return { ...percurso, pontos, avgCadenceSpm, temLocalizacao, iniciar, pausar, encerrar };
}
