import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import * as TaskManager from 'expo-task-manager';
import { useCallback, useEffect, useRef, useState } from 'react';
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

/**
 * Faixa que o CHECK da `0049` aceita para cadência. Vale a mesma regra do ritmo:
 * o INSERT recusado derruba a sessão inteira, não só o número.
 *
 * O caso real que isto barra é **zero**. Sem permissão de reconhecimento de
 * atividade o `watchStepCount` nunca dispara, `isAvailableAsync` continua
 * dizendo que sim, e depois de um minuto a conta dá 0 passos por minuto — que
 * o banco recusa, levando a corrida junto.
 */
const CADENCIA_MINIMA_SPM = 30;
const CADENCIA_MAXIMA_SPM = 250;

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
    if (minutos < 1) return;

    const cadencia = Math.round(passosDaSessao.current / minutos);
    const persistivel = cadencia >= CADENCIA_MINIMA_SPM && cadencia <= CADENCIA_MAXIMA_SPM;
    setAvgCadenceSpm(persistivel ? cadencia : null);
  }, []);

  const iniciar = useCallback(async () => {
    // Primeiro início da tela: zera o que sobrou. `posicoesRecebidas` é de
    // módulo, e uma sessão abandonada pelo botão voltar deixa pontos ali — na
    // corrida seguinte eles entrariam no cálculo e no desenho. O intervalo
    // enorme entre os dois grupos não é filtrado pela velocidade, porque
    // dividir metros por horas dá um número plausível.
    if (inicioDosPassos.current === null) posicoesRecebidas.length = 0;

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

    // `isAvailableAsync` responde pelo sensor, não pela autorização: sem pedir
    // ACTIVITY_RECOGNITION no Android ele diz que sim, o `watchStepCount` nunca
    // dispara, e a cadência fica zerada para sempre.
    const { granted } = await Pedometer.requestPermissionsAsync();
    // Retomar não reinscreve: duas inscrições disputariam `passosDaSessao`, e
    // `inicioDosPassos` continua no primeiro início, então a média sairia
    // errada nos dois sentidos.
    if (granted && inscricaoDePassos.current === null && (await Pedometer.isAvailableAsync())) {
      inicioDosPassos.current ??= Date.now();
      inscricaoDePassos.current = Pedometer.watchStepCount(({ steps }) => {
        passosDaSessao.current = steps;
      });
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

    // O fallback também precisa parar. Sem isto, pausar deixa de pausar em todo
    // aparelho que caiu nele: as posições continuam chegando e a distância
    // segue crescendo com o aluno parado.
    inscricaoDeLocalizacao.current?.remove();
    inscricaoDeLocalizacao.current = null;
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

  // Sair da tela encerra tudo. Sem isto, o serviço de primeiro plano, a
  // inscrição do pedômetro e o intervalo de 3 s continuam vivos depois que o
  // aluno voltou — e o GPS segue coletando fora de qualquer finalidade, que é
  // exatamente o defeito que a #278 veio corrigir.
  //
  // O ref segura a versão corrente de `encerrar` para que o efeito rode só na
  // desmontagem: com `encerrar` na lista de dependências, cada recriação dela
  // dispararia a limpeza no meio da corrida.
  const encerrarRef = useRef(encerrar);
  encerrarRef.current = encerrar;

  useEffect(() => {
    return () => {
      encerrarRef.current();
    };
  }, []);

  return { ...percurso, pontos, avgCadenceSpm, temLocalizacao, iniciar, pausar, encerrar };
}
