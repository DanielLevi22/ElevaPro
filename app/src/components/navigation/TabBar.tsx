import type { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useGlobalSearchParams, usePathname } from 'expo-router';
// O expo-router publica o compat como `expo-router/react-navigation`, mas sem
// shim para os subpacotes — o de bottom-tabs só resolve pelo caminho de build.
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useColorScheme } from 'nativewind';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../modules/auth/store/authStore';
import { ehVisaoDoAluno, modoDaRota } from '../../modules/workout/routes/visaoDoAluno';
import { PREENCHE } from '../ui/Vidro';
import { type AcaoRapida, BotaoDeAcoes } from './BotaoDeAcoes';
import { ItemDaAba } from './ItemDaAba';
import { isImmersiveRoute } from './immersiveRoutes';

type Route = BottomTabBarProps['state']['routes'][number];
type Icone = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * A tab bar do kit de vidro: faixa inteira no rodapé, fundo translúcido com
 * blur, fio de cima e as abas com ícone e rótulo.
 *
 * O kit tem cinco abas e nenhum botão central. Aqui o "+" fica no meio
 * (`BotaoDeAcoes`), por decisão de produto (#295); o Perfil, a quinta aba do
 * kit, segue pelo menu do "+". O aluno tem cinco abas (Saúde entrou na #308) e o
 * especialista quatro: cada lado do "+" ocupa metade da barra, para ele ficar no
 * centro com dois itens de um lado e três do outro. As abas são as do kit para cada papel — o aluno
 * vê Ranking, e não Progresso, que abre pelo bloco de métricas da tela inicial.
 *
 * @example
 * <Tabs tabBar={(props) => <TabBar {...props} />} />
 */
interface Aba {
  rotulo: string;
  icone: Icone;
  iconeAtivo: Icone;
}

const DO_ALUNO: Record<string, Aba> = {
  index: { rotulo: 'Início', icone: 'home-outline', iconeAtivo: 'home' },
  workouts: { rotulo: 'Treinos', icone: 'dumbbell', iconeAtivo: 'dumbbell' },
  nutrition: {
    rotulo: 'Nutrição',
    icone: 'silverware-fork-knife',
    iconeAtivo: 'silverware-fork-knife',
  },
  // A saúde e o relógio ganharam aba própria (#308): é onde o aluno vê a
  // prontidão e resolve o que falta no relógio, e escondido na tela inicial ficava
  // a um bloco de distância de quem mais precisa dele.
  saude: { rotulo: 'Saúde', icone: 'watch-variant', iconeAtivo: 'watch' },
  ranking: { rotulo: 'Ranking', icone: 'trophy-outline', iconeAtivo: 'trophy' },
};

const DO_ESPECIALISTA: Record<string, Aba> = {
  index: { rotulo: 'Painel', icone: 'view-dashboard-outline', iconeAtivo: 'view-dashboard' },
  students: { rotulo: 'Alunos', icone: 'account-group-outline', iconeAtivo: 'account-group' },
  workouts: { rotulo: 'Treinos', icone: 'dumbbell', iconeAtivo: 'dumbbell' },
  nutrition: { rotulo: 'Nutrição', icone: 'food-apple-outline', iconeAtivo: 'food-apple' },
};

/** O kit desfoca o que passa por baixo com `blur(24px)`. */
const INTENSIDADE_DO_BLUR = 24;

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { mode } = useGlobalSearchParams<{ mode?: string }>();
  const { accountType, isMasquerading } = useAuthStore();
  const arrastando = useSharedValue(0);
  const estiloDasAbas = useAnimatedStyle(() => ({
    opacity: withSpring(arrastando.value ? 0.3 : 1, { damping: 20 }),
  }));

  const ehAluno = !accountType || accountType !== 'specialist' || isMasquerading;
  const abas = ehAluno ? DO_ALUNO : DO_ESPECIALISTA;
  const rotas = Object.keys(abas)
    .map((nome) => state.routes.find((r: Route) => r.name === nome))
    .filter((r): r is Route => r !== undefined);

  const opcoes = descriptors[state.routes[state.index].key].options as {
    tabBarStyle?: { display?: string };
  };
  // Sem o especialista mascarado: a rota do detalhe também não o trata como
  // aluno, e ele vê a tela antiga, que precisa da barra escondida.
  const visaoDoAluno = ehVisaoDoAluno(accountType, modoDaRota(mode));
  if (opcoes.tabBarStyle?.display === 'none' || isImmersiveRoute(pathname, visaoDoAluno)) {
    return null;
  }

  const aba = (rota: Route) => (
    <ItemDaAba
      key={rota.key}
      rotulo={abas[rota.name].rotulo}
      {...iconeEEstado(abas[rota.name], state.routes[state.index].key === rota.key)}
      onPress={() => abrir(navigation, rota, state.routes[state.index].key === rota.key)}
      onLongPress={() => navigation.emit({ type: 'tabLongPress', target: rota.key })}
    />
  );

  return (
    // O container ocupa a faixa inteira do rodapé. Sem `box-none` ele captura o
    // toque acima da barra, onde o "+" sobressai, e um botão flutuante no rodapé
    // da tela fica visível e inerte.
    <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0">
      <FundoDaBarra />
      <Animated.View
        pointerEvents="box-none"
        className="flex-row items-start justify-around px-2 pt-3"
        style={[{ paddingBottom: insets.bottom }, estiloDasAbas]}
      >
        <View pointerEvents="box-none" className="flex-1 flex-row items-start">
          {rotas.slice(0, 2).map(aba)}
        </View>
        <BotaoDeAcoes
          comCardio={ehAluno}
          arrastando={arrastando}
          onAcao={(acao) => executar(navigation, acao)}
        />
        <View pointerEvents="box-none" className="flex-1 flex-row items-start">
          {rotas.slice(2).map(aba)}
        </View>
      </Animated.View>
    </View>
  );
}

function iconeEEstado(aba: Aba, ativo: boolean) {
  return { icone: ativo ? aba.iconeAtivo : aba.icone, ativo };
}

function abrir(navigation: BottomTabBarProps['navigation'], rota: Route, ativa: boolean) {
  const evento = navigation.emit({ type: 'tabPress', target: rota.key, canPreventDefault: true });
  if (!ativa && !evento.defaultPrevented) navigation.navigate(rota.name, rota.params);
}

const DESTINO: Record<AcaoRapida, string> = {
  treino: 'workouts',
  menu: 'menu',
  dieta: 'nutrition',
  cardio: 'cardio/index',
};

function executar(navigation: BottomTabBarProps['navigation'], acao: AcaoRapida) {
  navigation.navigate(DESTINO[acao]);
}

/**
 * O fundo: `--tab-bg` do kit, fio de cima e, no iOS, o blur.
 *
 * No Android o blur precisaria de um alvo em volta da tela inteira, e a barra
 * fica fora dele — ela vive no navegador, não na tela. O fundo do kit já é 72%
 * opaco no escuro e 90% no claro, e segura a leitura sozinho.
 */
function FundoDaBarra() {
  const { colorScheme } = useColorScheme();

  return (
    <View
      pointerEvents="none"
      className="absolute bottom-0 left-0 right-0 top-0 overflow-hidden border-t-[0.5px] border-glass-border bg-barra-de-abas"
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={INTENSIDADE_DO_BLUR}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={PREENCHE}
        />
      ) : null}
    </View>
  );
}
