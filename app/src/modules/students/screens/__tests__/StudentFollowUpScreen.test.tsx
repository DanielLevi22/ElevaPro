import { fireEvent, render, screen } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/types';
import type { Student } from '../../store/studentStore';
import StudentFollowUpScreen from '../StudentFollowUpScreen';

const mockNavigate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    navigate: mockNavigate,
    back: jest.fn(),
  }),
}));

// Os dois hooks são a fronteira com o banco: o aluno vinculado e a linha do tempo.
jest.mock('../../hooks/useLinkedStudent', () => ({
  useLinkedStudent: () => ({
    studentId: 'aluno-1',
    student: {
      id: 'aluno-1',
      full_name: 'Ana Souza',
      email: 'ana@example.com',
      account_status: 'active',
    } as Student,
    loading: false,
    retry: jest.fn(),
  }),
}));
jest.mock('../../hooks/useStudentActivities', () => ({
  useStudentActivities: () => ({ days: [], loading: false, failed: false, reload: jest.fn() }),
}));

beforeEach(() => mockNavigate.mockClear());

describe('gerenciamento no Acompanhamento do aluno (#436)', () => {
  it('não oferece avaliação: a análise por foto é do próprio aluno', async () => {
    await render(<StudentFollowUpScreen />);

    expect(screen.getByText('Anamnese')).toBeTruthy();
    expect(screen.queryByText('Avaliação')).toBeNull();
  });

  it('Dieta abre a lista de planos da aba Nutrição, não a tela legada', async () => {
    await render(<StudentFollowUpScreen />);

    await fireEvent.press(screen.getByText('Dieta'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.TABS.NUTRITION);
  });
});

describe('atalhos do Acompanhamento do aluno (#444)', () => {
  it('não oferece a visão do aluno: o especialista não entra como o aluno', async () => {
    await render(<StudentFollowUpScreen />);

    expect(screen.getByText('Evolução geral')).toBeTruthy();
    expect(screen.queryByText('Visão do aluno')).toBeNull();
  });
});
