import { Text } from 'react-native';
import { GlassSheet } from '@/components/ui/GlassSheet';

/**
 * "Como funciona": o que o body scan é e o que ele não é.
 *
 * O texto morava no pé da tela de resultado. Lá ele chegava depois dos números,
 * e aviso lido depois do número já chegou tarde; aqui ele vem antes de a pessoa
 * decidir se fotografa (#316). A tela de resultado fica com a frase curta.
 *
 * @example <HowItWorksSheet visible={aberta} onClose={fechar} onStart={comecar} />
 */
interface HowItWorksSheetProps {
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
}

export function HowItWorksSheet({ visible, onClose, onStart }: HowItWorksSheetProps) {
  return (
    <GlassSheet
      visible={visible}
      onClose={onClose}
      primary={{ label: 'Começar scan', onPress: onStart }}
      secondary={{ label: 'Fechar', onPress: onClose }}
    >
      <Text className="font-display-black text-[1.3125rem] tracking-tight text-foreground">
        Como funciona
      </Text>
      <Paragraph>
        Você tira três fotos, de frente, de costas e de perfil. O celular confere a posição e mede a
        silhueta de cada uma; depois as fotos vão para a análise, que estima proporção, simetria e
        postura.
      </Paragraph>
      <Paragraph>
        O resultado serve para te dar direção e acompanhar mudança ao longo do tempo. Ele não
        substitui avaliação física presencial nem a orientação de um profissional — e não é
        diagnóstico.
      </Paragraph>
      <Paragraph>
        Antes de mudar treino ou alimentação, e sempre que houver dor, lesão ou condição de saúde,
        fale com seu personal ou com um nutricionista. Leve estes números para a conversa: eles
        ajudam quem vai te avaliar de perto.
      </Paragraph>
    </GlassSheet>
  );
}

function Paragraph({ children }: { children: string }) {
  return (
    <Text className="mt-3 text-[0.875rem] leading-[1.35rem] text-muted-foreground">{children}</Text>
  );
}
