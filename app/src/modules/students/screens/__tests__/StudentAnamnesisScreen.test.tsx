import { render, screen } from '@testing-library/react-native';
import StudentAnamnesisScreen from '../StudentAnamnesisScreen';

const mockAnamnesis = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({ studentId: 'aluno-1' }),
}));

// O hook é a fronteira com o banco.
jest.mock('../../hooks/useStudentAnamnesis', () => ({
  useStudentAnamnesis: () => mockAnamnesis(),
}));

describe('anamnese do aluno vista pelo especialista', () => {
  it('lista a resposta e marca o que ficou sem resposta', async () => {
    mockAnamnesis.mockReturnValue({ responses: { full_name: 'Ana Souza' }, status: 'ready' });
    await render(<StudentAnamnesisScreen />);

    expect(screen.getByText('Ana Souza')).toBeTruthy();
    expect(screen.getAllByText('Não respondido').length).toBeGreaterThan(0);
  });

  it('avisa quando o aluno ainda não respondeu', async () => {
    mockAnamnesis.mockReturnValue({ responses: {}, status: 'empty' });
    await render(<StudentAnamnesisScreen />);

    expect(screen.getByText('O aluno ainda não respondeu a anamnese.')).toBeTruthy();
  });

  it('avisa quando a carga falha, em vez de mostrar o questionário vazio', async () => {
    mockAnamnesis.mockReturnValue({ responses: {}, status: 'failed' });
    await render(<StudentAnamnesisScreen />);

    expect(screen.getByText('Não foi possível carregar a anamnese.')).toBeTruthy();
    expect(screen.queryByText('Não respondido')).toBeNull();
  });
});
