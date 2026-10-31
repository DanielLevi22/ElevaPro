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

// O hook é a fronteira com o banco: o aluno vinculado.
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

beforeEach(() => mockNavigate.mockClear());

describe('gerenciamento no Acompanhamento do aluno (#436)', () => {
  it('Avaliações abre a avaliação física, não a análise por foto do aluno', async () => {
    await render(<StudentFollowUpScreen />);

    await fireEvent.press(screen.getByText('Avaliações'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.STUDENTS.ASSESSMENTS.LIST('aluno-1'));
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

describe('atividades do aluno', () => {
  it('a linha do tempo sai do Acompanhamento e abre pelas Atividades', async () => {
    await render(<StudentFollowUpScreen />);

    expect(screen.queryByText('Linha do tempo')).toBeNull();
    await fireEvent.press(screen.getByText('Atividades'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.STUDENTS.ACTIVITIES('aluno-1'));
  });
});
