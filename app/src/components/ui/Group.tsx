import { Children, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';

/**
 * A lista grouped-inset do iOS: bloco de cantos arredondados, com as linhas
 * separadas por um fio e um rótulo opcional acima e abaixo.
 *
 * É o contêiner que estrutura quase toda tela do app desenhado — formulário,
 * seleção de tipo de conta, lista de opções. O separador nasce aqui, entre as
 * linhas e nunca na última, para que a linha não precise saber onde está.
 *
 * O fio é `0.5px` porque é o que o desenho diz. Em tela de densidade 3 isso não
 * é exatamente o hairline do sistema, mas é o valor desenhado e fica dentro do
 * NativeWind — trocar por `StyleSheet.hairlineWidth` exigiria estilo inline.
 *
 * @example
 * <Group header="Dados pessoais" footer="A senha deve ter no mínimo 8 caracteres.">
 *   <Input icon="person" placeholder="Seu nome" />
 *   <Input icon="mail" placeholder="seu@email.com" />
 * </Group>
 */
interface GroupProps {
  children: ReactNode;
  header?: string;
  footer?: string;
  className?: string;
}

export function Group({ children, header, footer, className }: GroupProps) {
  const linhas = Children.toArray(children);

  return (
    <View className={cn('mb-5', className)}>
      {header ? (
        <Text className="px-4 pb-[0.4375rem] text-legenda uppercase tracking-wide text-muted-foreground">
          {header}
        </Text>
      ) : null}

      <View className="overflow-hidden rounded-md bg-card">
        {linhas.map((linha, i) => (
          <View
            // Linha de lista não tem identidade própria: o conteúdo é do call
            // site e a ordem é a única coisa que este componente conhece.
            // biome-ignore lint/suspicious/noArrayIndexKey: a posição é a identidade
            key={i}
            className={cn(i < linhas.length - 1 && 'border-b-[0.5px] border-border')}
          >
            {linha}
          </View>
        ))}
      </View>

      {footer ? (
        <Text className="px-4 pt-[0.4375rem] text-legenda leading-[1.35] text-muted-foreground">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}
