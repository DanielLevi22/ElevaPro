import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useTemaStore } from '@/shared/design';
import { StartTimes } from '../charts/StartTimes';
import { WeightTrend } from '../charts/WeightTrend';
import { FlowFrame, FlowTitle } from '../FlowFrame';
import { ThemePicker } from '../ThemePicker';

describe('FlowFrame', () => {
  it('o botão principal age; desligado, ele não age e diz o que falta', () => {
    const onPress = jest.fn();
    const { rerender } = render(
      <FlowFrame primary={{ label: 'Continuar', onPress }}>
        <FlowTitle eyebrow="Passo 1" sub="Explicação">
          Título
        </FlowTitle>
      </FlowFrame>
    );
    expect(screen.getByText('Título')).toBeTruthy();
    fireEvent.press(screen.getByText(/Continuar/i));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(
      <FlowFrame
        primary={{ label: 'Continuar', onPress, disabled: true, hint: 'Escolha o motivo' }}
      >
        <Text>corpo</Text>
      </FlowFrame>
    );
    expect(screen.getByText('Escolha o motivo')).toBeTruthy();
    fireEvent.press(screen.getByText(/Continuar/i));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a ação de texto embaixo do botão também age', () => {
    const later = jest.fn();
    render(
      <FlowFrame
        primary={{ label: 'Começar', onPress: jest.fn() }}
        secondaryText={{ label: 'Lembrar amanhã', onPress: later }}
      >
        <Text>corpo</Text>
      </FlowFrame>
    );
    fireEvent.press(screen.getByText('Lembrar amanhã'));
    expect(later).toHaveBeenCalled();
  });
});

describe('ThemePicker', () => {
  it('a escolha de tema fica na preferência do aparelho', () => {
    render(<ThemePicker />);
    fireEvent.press(screen.getByText('Escuro'));
    expect(useTemaStore.getState().preferencia).toBe('escuro');
  });
});

describe('StartTimes (F2)', () => {
  it('diz ao leitor de tela o horário de costume', () => {
    render(<StartTimes starts={[1080, 1100, 1120]} usual={1100} />);
    expect(screen.getByLabelText('Seu horário de costume é 18:20')).toBeTruthy();
  });
});

describe('WeightTrend (A5, A10)', () => {
  it('descreve a variação do peso e mostra a faixa da meta na legenda', () => {
    render(
      <WeightTrend
        weights={[
          { assessedAt: '2026-10-01T10:00:00Z', weightKg: 81 },
          { assessedAt: '2026-10-08T10:00:00Z', weightKg: 80.6 },
          { assessedAt: '2026-10-14T10:00:00Z', weightKg: 80.2 },
        ]}
        expectedChangeKg={-0.3}
      />
    );
    expect(screen.getByLabelText('Peso de 81 kg para 80,2 kg')).toBeTruthy();
    expect(screen.getByText('Ritmo da meta')).toBeTruthy();
  });

  it('sem meta, não desenha a faixa', () => {
    render(
      <WeightTrend
        weights={[{ assessedAt: '2026-10-14T10:00:00Z', weightKg: 80 }]}
        expectedChangeKg={null}
      />
    );
    expect(screen.queryByText('Ritmo da meta')).toBeNull();
  });
});
