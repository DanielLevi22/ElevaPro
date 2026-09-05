import type { HealthDailyMetric } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useHealthData } from '@/hooks/useHealthData';
import { DIAS_DE_HISTORICO, useHistoricoDeSaude } from '../hooks/useHistoricoDeSaude';

/**
 * O que o relógio mediu, do jeito que o aluno entende.
 *
 * Cada número aparece **contra a linha de base da própria pessoa**, nunca
 * contra uma referência de população. 58 bpm de repouso não quer dizer nada
 * sozinho; 58 quando a média dele é 52 quer dizer bastante. É também o que
 * separa acompanhamento de treino de parecer clínico: a tela mostra a variação
 * e nomeia o que ela é, sem dizer o que ela significa para a saúde de ninguém.
 */

interface Comparacao {
  media: number;
  variacao: number;
}

/**
 * Média dos dias anteriores ao mais recente, e a distância do último até ela.
 *
 * Exclui o dia de hoje da média de propósito: comparar um valor com uma média
 * que o contém achata justamente o desvio que interessa ver.
 *
 * Devolve `null` com menos de três dias de base — média de dois dias tem cara
 * de medição e não é uma.
 */
function compararComABase(valores: (number | null)[]): Comparacao | null {
  const [atual, ...anteriores] = valores;
  if (atual == null) return null;

  const base = anteriores.filter((v): v is number => v != null);
  if (base.length < 3) return null;

  const media = Math.round(base.reduce((soma, v) => soma + v, 0) / base.length);
  return { media, variacao: atual - media };
}

function formatarSono(minutos: number | null): string {
  if (minutos == null) return '—';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`;
}

function Metrica({
  icone,
  cor,
  rotulo,
  valor,
  unidade,
  comparacao,
  sufixoDaBase,
  menorEMelhor = false,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  rotulo: string;
  valor: string;
  unidade?: string;
  comparacao: Comparacao | null;
  sufixoDaBase: string;
  menorEMelhor?: boolean;
}) {
  const semDado = valor === '—';
  const subiu = comparacao != null && comparacao.variacao > 0;
  const corDaVariacao =
    comparacao == null || comparacao.variacao === 0
      ? 'text-zinc-500'
      : subiu === menorEMelhor
        ? 'text-amber-500'
        : 'text-emerald-500';

  return (
    <View className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <View
          className="w-7 h-7 rounded-full items-center justify-center"
          style={{ backgroundColor: `${cor}1A` }}
        >
          <Ionicons color={cor} name={icone} size={15} />
        </View>
        <Text className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
          {rotulo}
        </Text>
      </View>

      <View className="flex-row items-baseline gap-1">
        <Text className="text-white text-2xl font-black font-display">{valor}</Text>
        {unidade != null && !semDado ? (
          <Text className="text-zinc-500 text-xs font-semibold">{unidade}</Text>
        ) : null}
      </View>

      {/*
        A comparação some quando não há base suficiente, em vez de aparecer
        zerada: "0 em relação à média" com dois dias de histórico é um número
        inventado com cara de medição.
      */}
      {comparacao != null ? (
        <Text className={`text-[11px] mt-1.5 font-semibold ${corDaVariacao}`}>
          {comparacao.variacao > 0 ? '+' : ''}
          {comparacao.variacao} {sufixoDaBase}
        </Text>
      ) : (
        <Text className="text-zinc-600 text-[11px] mt-1.5">
          {semDado ? 'sem leitura hoje' : 'sem base ainda'}
        </Text>
      )}
    </View>
  );
}

/** Barras do período. Altura relativa ao maior valor, não a uma escala fixa. */
function BarrasDoPeriodo({
  dias,
  extrair,
  cor,
  formatar,
}: {
  dias: HealthDailyMetric[];
  extrair: (dia: HealthDailyMetric) => number | null;
  cor: string;
  formatar: (valor: number) => string;
}) {
  const valores = dias.map(extrair);
  const maximo = Math.max(...valores.filter((v): v is number => v != null), 1);

  return (
    <View className="flex-row items-end justify-between gap-1 h-24 mt-1">
      {dias.map((dia, indice) => {
        const valor = valores[indice];
        // Dia sem leitura vira tracinho apagado, e não barra de altura zero:
        // zero desenhado no mesmo tom do resto lê como "dormiu nada".
        const altura = valor == null ? 4 : Math.max(6, (valor / maximo) * 88);

        return (
          <View className="flex-1 items-center" key={dia.date}>
            <View
              className="w-full rounded-t-md"
              style={{
                height: altura,
                backgroundColor: valor == null ? '#3f3f46' : cor,
                opacity: valor == null ? 0.4 : indice === 0 ? 1 : 0.55,
              }}
            />
            <Text className="text-zinc-600 text-[9px] mt-1.5">
              {valor == null ? '' : formatar(valor)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="mb-7">
      <Text className="text-zinc-500 text-[13px] font-bold uppercase tracking-widest mb-3 ml-1">
        {titulo}
      </Text>
      {children}
    </View>
  );
}

export function SaudeDiariaScreen() {
  const router = useRouter();
  const { steps, calories, sleepMinutes, restingHeartRate, source, refetch } = useHealthData();
  const { dias, carregando, erro, recarregar } = useHistoricoDeSaude();

  const sonoDaBase = compararComABase(dias.map((d) => d.sleep_minutes));
  const fcDaBase = compararComABase(dias.map((d) => d.resting_heart_rate));
  const passosDaBase = compararComABase(dias.map((d) => d.steps));

  async function atualizar() {
    await Promise.all([refetch(), recarregar()]);
  }

  const semHistorico = !carregando && erro == null && dias.length === 0;

  return (
    <ScreenLayout>
      <View className="flex-row items-center px-5 pt-2 pb-4 gap-3">
        <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()}>
          <Ionicons color="white" name="chevron-back" size={26} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold font-display flex-1">Saúde do dia</Text>
        {source === 'device' ? (
          <View className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10">
            <Text className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">
              Live
            </Text>
          </View>
        ) : null}
        {source === 'mock' ? (
          <View className="bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/10">
            <Text className="text-amber-500 text-[10px] font-black uppercase tracking-widest">
              Simulado
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl onRefresh={atualizar} refreshing={false} tintColor="#71717a" />
        }
        showsVerticalScrollIndicator={false}
      >
        <Secao titulo="Hoje">
          <View className="flex-row gap-3 mb-3">
            <Metrica
              comparacao={sonoDaBase}
              cor="#818cf8"
              icone="moon"
              rotulo="Sono"
              sufixoDaBase="min vs. sua média"
              valor={formatarSono(sleepMinutes)}
            />
            <Metrica
              comparacao={fcDaBase}
              cor="#f87171"
              icone="heart"
              menorEMelhor
              rotulo="FC repouso"
              sufixoDaBase="bpm vs. sua média"
              unidade="bpm"
              valor={restingHeartRate == null ? '—' : String(restingHeartRate)}
            />
          </View>

          <View className="flex-row gap-3">
            <Metrica
              comparacao={passosDaBase}
              cor="#34d399"
              icone="walk"
              rotulo="Passos"
              sufixoDaBase="vs. sua média"
              valor={steps.toLocaleString('pt-BR')}
            />
            <Metrica
              comparacao={null}
              cor="#fbbf24"
              icone="flame"
              rotulo="Calorias"
              sufixoDaBase=""
              unidade="kcal"
              valor={String(calories)}
            />
          </View>
        </Secao>

        {carregando ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#71717a" />
          </View>
        ) : null}

        {erro != null ? (
          <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 items-center mb-7">
            <Text className="text-zinc-400 text-sm text-center">{erro}</Text>
          </View>
        ) : null}

        {semHistorico ? (
          <View className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-6 items-center mb-7">
            <Ionicons color="#52525b" name="watch-outline" size={28} />
            <Text className="text-zinc-400 text-sm text-center mt-3 leading-5">
              Ainda não há histórico. Conecte seu relógio e volte amanhã — é a comparação entre os
              dias que faz esses números valerem alguma coisa.
            </Text>
          </View>
        ) : null}

        {!carregando && dias.length > 0 ? (
          <>
            <Secao titulo={`Sono — ${DIAS_DE_HISTORICO} dias`}>
              <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <BarrasDoPeriodo
                  cor="#818cf8"
                  dias={dias}
                  extrair={(d) => d.sleep_minutes}
                  formatar={(v) => `${Math.round(v / 60)}h`}
                />
              </View>
            </Secao>

            <Secao titulo={`FC de repouso — ${DIAS_DE_HISTORICO} dias`}>
              <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <BarrasDoPeriodo
                  cor="#f87171"
                  dias={dias}
                  extrair={(d) => d.resting_heart_rate}
                  formatar={(v) => String(v)}
                />
              </View>
            </Secao>
          </>
        ) : null}

        {/*
          Fecha a tela, e não é rodapé decorativo: é onde o aluno reencontra que
          o personal vê isto e que existe caminho de volta. A `POLICY_VERSION`
          1.3 promete as duas coisas no consentimento, e promessa que só aparece
          no onboarding some da memória na semana seguinte.
        */}
        <View className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex-row gap-3">
          <Ionicons color="#52525b" name="lock-closed-outline" size={16} />
          <Text className="text-zinc-500 text-xs flex-1 leading-5">
            Seu personal vinculado vê estes dados. Você pode desligar quando quiser em Minhas
            Autorizações: a coleta para na hora e ele perde o acesso — o histórico continua visível
            só para você.
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
