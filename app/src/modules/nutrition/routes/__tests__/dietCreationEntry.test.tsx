import { render } from '@testing-library/react-native';
import type { Href } from 'expo-router';
import LegacyCreateDietRoute from '@/app/(tabs)/nutrition/create';

const mockRedirect = jest.fn();
let mockParams: { preselectedStudentId?: string } = {};
let mockAccountType = 'specialist';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: Href }) => {
    mockRedirect(href);
    return null;
  },
}));
jest.mock('@/auth', () => ({
  useAuthStore: () => ({ user: { id: 'owner' }, accountType: mockAccountType }),
}));

beforeEach(() => {
  mockParams = {};
  mockAccountType = 'specialist';
  mockRedirect.mockClear();
});

it('criar dieta sem aluno permanece no fluxo de dieta, nunca abre Meus alunos', async () => {
  await render(<LegacyCreateDietRoute />);
  expect(mockRedirect).toHaveBeenLastCalledWith({
    pathname: '/(tabs)/nutrition/wizard/start',
    params: {},
  });
});

it('criar pelo perfil preserva o aluno pré-selecionado', async () => {
  mockParams = { preselectedStudentId: 'student-a' };
  await render(<LegacyCreateDietRoute />);
  expect(mockRedirect).toHaveBeenLastCalledWith({
    pathname: '/(tabs)/nutrition/wizard/start',
    params: { studentId: 'student-a' },
  });
});

it('o Praticante cria para si, mesmo quando o link tem outro aluno', async () => {
  mockAccountType = 'member';
  mockParams = { preselectedStudentId: 'student-a' };
  await render(<LegacyCreateDietRoute />);
  expect(mockRedirect).toHaveBeenLastCalledWith({
    pathname: '/(tabs)/nutrition/wizard/start',
    params: { studentId: 'owner' },
  });
});
