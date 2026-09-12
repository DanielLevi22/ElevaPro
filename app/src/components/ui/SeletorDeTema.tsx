import type { Ionicons } from '@expo/vector-icons';
import { type PreferenciaDeTema, useTemaStore } from '@/shared/design';
import { Group } from './Group';
import { Row } from './Row';

/**
 * A escolha de tema, em grupo pronto para entrar em qualquer tela.
 *
 * Sai como componente porque a primeira versão dele foi construída dentro de
 * `(tabs)/menu.tsx` — uma tela com `href: null` no layout de abas, ou seja
 * **inalcançável**. O seletor existia e ninguém conseguia chegar nele.
 *
 * É o mesmo defeito que os cartões da tela inicial já documentavam: "até este
 * cartão existir, nenhum aluno alcançava a tela". Verificar alcance faz parte
 * de entregar a tela, não de revisá-la depois.
 *
 * @example
 * <SeletorDeTema />
 */
type OpcaoDeTema = {
  valor: PreferenciaDeTema;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const TEMAS: OpcaoDeTema[] = [
  {
    valor: 'sistema',
    label: 'Seguir o sistema',
    sub: 'Acompanha o tema do aparelho',
    icon: 'phone-portrait-outline',
  },
  { valor: 'claro', label: 'Claro', sub: 'Fundo claro o tempo todo', icon: 'sunny-outline' },
  { valor: 'escuro', label: 'Escuro', sub: 'Fundo escuro o tempo todo', icon: 'moon-outline' },
];

export function SeletorDeTema() {
  const { preferencia, escolher } = useTemaStore();

  return (
    <Group header="Aparência" footer="A escolha vale só neste aparelho.">
      {TEMAS.map((tema) => (
        <Row
          key={tema.valor}
          icon={tema.icon}
          title={tema.label}
          sub={tema.sub}
          selected={preferencia === tema.valor}
          onPress={() => escolher(tema.valor)}
        />
      ))}
    </Group>
  );
}
