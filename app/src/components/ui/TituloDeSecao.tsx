import { Text, TouchableOpacity, View } from 'react-native';

/**
 * Título de seção do kit de vidro, com uma ação opcional à direita.
 *
 * É maior e mais próximo do conteúdo que o rótulo maiúsculo das telas chapadas:
 * 19 em peso 700, alinhado pela linha de base com a ação. Toda tela de vidro
 * usa este par, e é por isso que ele é componente e não duas linhas repetidas.
 *
 * O fluxo de treino do kit usa a outra forma, `rotulo`: 10,5 em caixa alta e
 * espaçada, no tom terciário, com a ação à direita como informação e não link
 * ("4 treinos"). É o mesmo papel na página — nomear a seção —, então é
 * variante, e não componente novo.
 *
 * @example
 * <TituloDeSecao acao="Ver tudo" onAcao={verTreinos}>Treino do dia</TituloDeSecao>
 * <TituloDeSecao estilo="rotulo" acao="4 treinos">Treinos da fase</TituloDeSecao>
 * <TituloDeSecao estilo="rotulo" acao="Substituir" onAcao={trocar}>Alimentos</TituloDeSecao>
 */
interface TituloDeSecaoProps {
  children: string;
  acao?: string;
  onAcao?: () => void;
  estilo?: 'titulo' | 'rotulo';
}

export function TituloDeSecao({ children, acao, onAcao, estilo = 'titulo' }: TituloDeSecaoProps) {
  return (
    <View className="mb-2.5 mt-5 flex-row items-baseline justify-between px-0.5">
      {estilo === 'rotulo' ? (
        <>
          <Text className="text-[0.65625rem] font-bold uppercase tracking-widest text-placeholder">
            {children}
          </Text>
          {acao ? <AcaoDoRotulo acao={acao} onAcao={onAcao} /> : null}
        </>
      ) : (
        <>
          <Text className="text-h2 font-bold tracking-tight text-foreground">{children}</Text>
          {acao ? (
            <TouchableOpacity onPress={onAcao} disabled={!onAcao} accessibilityRole="button">
              <Text className="text-legenda font-semibold text-primary-text">{acao}</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
}

/**
 * A ação do rótulo. Sem toque ela é informação ("4 treinos"), no tom do rótulo;
 * com toque é link, e o fluxo de nutrição do kit a pinta na primária em peso
 * 600 ("Substituir", "Ver tudo").
 */
function AcaoDoRotulo({ acao, onAcao }: { acao: string; onAcao?: () => void }) {
  if (!onAcao) return <Text className="text-[0.71875rem] text-placeholder">{acao}</Text>;
  return (
    <TouchableOpacity onPress={onAcao} accessibilityRole="button">
      <Text className="text-[0.71875rem] font-semibold text-primary-text">{acao}</Text>
    </TouchableOpacity>
  );
}
