import { fireEvent, render, screen } from '@testing-library/react-native';
import { ChoiceOptions, YesNoOptions } from '../AnswerOptions';

/**
 * As opções de resposta da anamnese em vidro (#361), as mesmas para o Aluno e o
 * Praticante. A marcação também chega ao leitor de tela: só a cor não diz qual
 * opção está escolhida.
 */

describe('ChoiceOptions', () => {
  it('na escolha única, marca a opção tocada', async () => {
    const onToggle = jest.fn();
    await render(
      <ChoiceOptions options={['Manhã', 'Noite']} selected={['Noite']} onToggle={onToggle} />
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Manhã' }));

    expect(onToggle).toHaveBeenCalledWith('Manhã');
    expect(screen.getByRole('radio', { name: 'Noite' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('na escolha múltipla, cada opção é uma caixa independente', async () => {
    const onToggle = jest.fn();
    await render(
      <ChoiceOptions
        multiple
        options={['Joelho', 'Ombro', 'Lombar']}
        selected={['Joelho', 'Lombar']}
        onToggle={onToggle}
      />
    );

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ombro' }));

    expect(onToggle).toHaveBeenCalledWith('Ombro');
    const marcadas = screen
      .getAllByRole('checkbox')
      .filter((opcao) => opcao.props.accessibilityState?.checked);
    expect(marcadas).toHaveLength(2);
  });
});

describe('YesNoOptions', () => {
  it('responde sim ou não, e mostra qual foi escolhido', async () => {
    const onChange = jest.fn();
    await render(<YesNoOptions value={false} onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Sim' }));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('radio', { name: 'Não' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });
});
