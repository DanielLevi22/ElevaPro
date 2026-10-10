import { createLinkCodeService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, Text, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { Field } from '@/components/ui/Field';
import { GlassSegmented } from '@/components/ui/GlassSegmented';
import { GlassSheet } from '@/components/ui/GlassSheet';
import { registrarFalha } from '@/lib/registro';

const linkCodes = createLinkCodeService(supabase);

export type LinkRole = 'student' | 'specialist';
type Tab = 'mine' | 'theirs';
type CodeState = { status: 'loading' } | { status: 'ready'; code: string } | { status: 'failed' };

const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'mine', label: 'Meu código' },
  { value: 'theirs', label: 'Tenho um código' },
];

/** O que muda de um lado para o outro: só o texto. */
const COPY: Record<LinkRole, { title: string; mine: string; theirs: string; linked: string }> = {
  student: {
    title: 'Ter um especialista',
    mine: 'Mostre este código ao seu nutricionista ou personal. Ele digita no app dele e passa a te acompanhar.',
    theirs: 'Digite o código que o seu especialista te passou.',
    linked: 'Agora seu especialista te acompanha pelo app.',
  },
  specialist: {
    title: 'Vincular aluno',
    mine: 'Mostre este código ao aluno. Ele digita no app dele e passa a ser acompanhado por você.',
    theirs: 'Digite o código que o aluno te passou.',
    linked: 'O aluno já aparece na sua lista.',
  },
};

interface LinkCodeSheetProps {
  visible: boolean;
  side: LinkRole;
  userId: string | null;
  onClose: () => void;
  /** Depois de ligar pelo código do outro lado. */
  onLinked?: () => void;
}

/**
 * O vínculo por código, dos dois lados (#365): quem gera compartilha, quem
 * recebe digita. Serve o Praticante ("Encontrar um especialista", em O5b) e o
 * especialista ("Vincular aluno"). Quem já tem conta não entra pelo convite por
 * e-mail, e este é o caminho.
 *
 * @example <LinkCodeSheet visible side="specialist" userId={user.id} onClose={fechar} onLinked={recarregar} />
 */
export function LinkCodeSheet({ visible, side, userId, onClose, onLinked }: LinkCodeSheetProps) {
  const [tab, setTab] = useState<Tab>('mine');
  const [typed, setTyped] = useState('');
  const [linking, setLinking] = useState(false);
  const mine = useMyCode(visible && tab === 'mine', side, userId);
  const copy = COPY[side];

  const redeem = async () => {
    setLinking(true);
    try {
      const result = await linkCodes.redeem(side, typed);
      if (!result.success) throw new Error(result.error ?? 'Código inválido ou expirado.');
      showAlert({ type: 'success', title: 'Vínculo feito', message: copy.linked });
      onLinked?.();
      onClose();
    } catch (erro: unknown) {
      showAlert({
        type: 'error',
        title: 'Não deu para vincular',
        message: erro instanceof Error ? erro.message : 'Confira o código e tente de novo.',
      });
    } finally {
      setLinking(false);
    }
  };

  const share = () => {
    if (mine.status !== 'ready') return;
    void Share.share({
      message: `Meu código no Eleva Pro é ${mine.code}. Digite no app para nos conectarmos. Vale por 24 horas.`,
    });
  };

  return (
    <GlassSheet
      visible={visible}
      onClose={onClose}
      hero={<CaixaDeIcone icon="link-outline" tom="marca" tamanho="destaque" />}
      busy={linking || (tab === 'mine' && mine.status === 'loading')}
      primary={
        tab === 'mine'
          ? { label: 'Compartilhar código', onPress: share }
          : { label: linking ? 'Vinculando…' : 'Vincular', onPress: () => void redeem() }
      }
      secondary={{ label: 'Fechar', onPress: onClose }}
      footnote="O código vale por 24 horas e é usado uma vez só."
    >
      <Text className="font-display-black text-[1.375rem] tracking-tight text-foreground">
        {copy.title}
      </Text>
      <View className="mt-3">
        <GlassSegmented<Tab> options={TABS} value={tab} onChange={setTab} />
      </View>
      <Text className="mt-3 text-[0.84375rem] leading-[1.2rem] text-muted-foreground">
        {tab === 'mine' ? copy.mine : copy.theirs}
      </Text>
      {tab === 'mine' ? (
        <MyCode state={mine} />
      ) : (
        <View className="mt-4">
          <Field
            label="Código"
            value={typed}
            onChange={(texto) => setTyped(texto.toUpperCase())}
            placeholder="Ex.: K7Q2MX"
          />
        </View>
      )}
    </GlassSheet>
  );
}

function MyCode({ state }: { state: CodeState }) {
  if (state.status === 'loading') return <ActivityIndicator className="mt-6" />;
  if (state.status === 'failed') {
    return (
      <Text className="mt-6 text-[0.84375rem] text-muted-foreground">
        Não consegui gerar o código agora. Feche e tente de novo.
      </Text>
    );
  }
  return (
    <Text
      selectable
      accessibilityLabel={`Seu código: ${state.code.split('').join(' ')}`}
      className="mt-6 text-center font-mono text-[2rem] font-bold tracking-[0.3em] text-primary-text"
    >
      {state.code}
    </Text>
  );
}

/** Um código novo a cada abertura: gerar apaga o anterior, e o da tela é o que vale. */
function useMyCode(active: boolean, role: LinkRole, userId: string | null): CodeState {
  const [state, setState] = useState<CodeState>({ status: 'loading' });
  useEffect(() => {
    if (!active || !userId) return;
    let current = true;
    setState({ status: 'loading' });
    linkCodes
      .generate({ role, id: userId })
      .then((code) => current && setState({ status: 'ready', code }))
      .catch(() => {
        registrarFalha('vinculo.gerar_codigo', { papel: role });
        if (current) setState({ status: 'failed' });
      });
    return () => {
      current = false;
    };
  }, [active, role, userId]);
  return state;
}
