import { fireEvent, render, screen } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/types';
import CreateStudentScreen from '../CreateStudentScreen';

const mockReplace = jest.fn();
const mockNavigate = jest.fn();
const mockCreateStudent = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    navigate: mockNavigate,
    back: jest.fn(),
  }),
}));

jest.mock('@/auth', () => ({
  useAuthStore: () => ({ user: { id: 'esp-1' } }),
}));

jest.mock('../../store/studentStore', () => ({
  useStudentStore: () => ({
    myServiceTypes: ['personal_training', 'nutrition_consulting'],
    fetchMyServiceTypes: jest.fn(),
    createStudent: mockCreateStudent,
  }),
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockNavigate.mockClear();
  mockCreateStudent.mockResolvedValue({ success: true, studentId: 'aluno-1' });
});

async function sendInvite() {
  await render(<CreateStudentScreen />);
  await fireEvent.changeText(screen.getByPlaceholderText('Nome e sobrenome'), 'Ana Souza');
  await fireEvent.changeText(screen.getByPlaceholderText('email@exemplo.com'), 'ana@example.com');
  await fireEvent.press(screen.getByText('Treino + Nutrição'));
  await fireEvent.press(screen.getByText('Enviar convite'));
  expect(await screen.findByText('Convite enviado')).toBeTruthy();
}

describe('próximos passos do convite enviado (#436)', () => {
  it('não oferece avaliação: a análise por foto é do próprio aluno', async () => {
    await sendInvite();

    expect(screen.getByText('Montar treino')).toBeTruthy();
    expect(screen.queryByText('Fazer avaliação física')).toBeNull();
  });

  it('Montar dieta abre a lista de planos da aba Nutrição, não a tela legada', async () => {
    await sendInvite();

    await fireEvent.press(screen.getByText('Montar dieta'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.TABS.NUTRITION);
  });
});
