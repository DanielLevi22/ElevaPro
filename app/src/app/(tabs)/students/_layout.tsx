import { StudentsNavigator } from '@/modules/students';

/**
 * A lista é a base da pilha. Quem entra vindo de outra aba (o alerta do Painel)
 * navega com `withAnchor`, e é ela que fica por baixo do aluno (#357).
 */
export const unstable_settings = { anchor: 'index' };

export default function StudentsLayout() {
  return <StudentsNavigator />;
}
