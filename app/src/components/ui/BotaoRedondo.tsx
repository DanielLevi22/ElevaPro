import type { LucideIcon } from 'lucide-react-native';
import Calendar from 'lucide-react-native/icons/calendar';
import Camera from 'lucide-react-native/icons/camera';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Clock from 'lucide-react-native/icons/clock';
import Download from 'lucide-react-native/icons/download';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import Heart from 'lucide-react-native/icons/heart';
import Info from 'lucide-react-native/icons/info';
import Link from 'lucide-react-native/icons/link';
import Mic from 'lucide-react-native/icons/mic';
import MicOff from 'lucide-react-native/icons/mic-off';
import Music from 'lucide-react-native/icons/music';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Ruler from 'lucide-react-native/icons/ruler';
import Search from 'lucide-react-native/icons/search';
import Share from 'lucide-react-native/icons/share';
import Sparkles from 'lucide-react-native/icons/sparkles';
// No lucide 1.46 o `trash-2` do kit é apelido do arquivo `trash`.
import Trash2 from 'lucide-react-native/icons/trash';
import Volume2 from 'lucide-react-native/icons/volume-2';
import VolumeX from 'lucide-react-native/icons/volume-x';
import X from 'lucide-react-native/icons/x';
import { TouchableOpacity } from 'react-native';
import { useCores, useEscala } from '@/shared/design';

/**
 * O botão redondo de vidro que o kit põe sobre a foto: voltar, fechar, voz.
 *
 * Usa a superfície de chip de hero, e não o `Vidro`: sobre fotografia o kit
 * troca o preenchimento pelo `hero-chip`, que funciona nos dois temas. O
 * `IconButton` antigo continua na paleta anterior e sai com as telas dele.
 *
 * @example
 * <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
 *
 * Os ícones são os do Lucide, com os nomes que o kit usa: o botão é navegação, e
 * a navegação segue o traço fino do desenho (ver `ICONS`).
 */

/**
 * Os ícones que os cabeçalhos usam, pelo nome do Lucide no kit. Um catálogo, e
 * não o pacote inteiro: o nome é o que a tela escreve, e cada ícone novo entra
 * aqui de propósito.
 */
const ICONS = {
  link: Link,
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  x: X,
  music: Music,
  'refresh-cw': RefreshCw,
  share: Share,
  /** O "baixar" que o kit desenha no cabeçalho do relatório (#312). */
  download: Download,
  history: Clock,
  camera: Camera,
  heart: Heart,
  calendar: Calendar,
  'volume-2': Volume2,
  'volume-x': VolumeX,
  mic: Mic,
  'mic-off': MicOff,
  plus: Plus,
  search: Search,
  /** Apagar uma análise do body scan e a régua da medida com fita (#316). */
  'trash-2': Trash2,
  ruler: Ruler,
  /** "Como funciona" do ranking (#320). */
  info: Info,
  /** Editar a periodização, no cabeçalho da ficha (#335). */
  pencil: Pencil,
  /** O assistente de IA na montagem das refeições, e as opções do plano (#337). */
  sparkles: Sparkles,
  ellipsis: Ellipsis,
} as const satisfies Record<string, LucideIcon>;

export type RoundIcon = keyof typeof ICONS;
interface BotaoRedondoProps {
  icone: RoundIcon;
  /** O ícone preenchido na cor dele: o coração da refeição favorita. */
  preenchido?: boolean;
  /** Obrigatório: sem texto, o leitor de tela só anunciaria "botão". */
  rotulo: string;
  onPress: () => void;
  disabled?: boolean;
}

const LADO = 38;
/** O traço fino do Lucide no kit (`svg.lucide { stroke-width: 1.35px }`). */
const TRACO = 1.5;
/** O kit dimensiona o ícone pelo botão: 47% do lado. */
const FRACAO_DO_ICONE = 0.47;

export function BotaoRedondo({
  icone,
  rotulo,
  onPress,
  preenchido = false,
  disabled = false,
}: BotaoRedondoProps) {
  const Icone = ICONS[icone];
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      className="h-[2.375rem] w-[2.375rem] shrink-0 items-center justify-center rounded-full border border-hero-chip-border bg-hero-chip"
    >
      <Icone
        size={escalar(LADO * FRACAO_DO_ICONE)}
        strokeWidth={TRACO}
        color={cores.onHero}
        fill={preenchido ? cores.onHero : 'none'}
      />
    </TouchableOpacity>
  );
}

export type { BotaoRedondoProps };
