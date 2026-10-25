import { render, screen } from '@testing-library/react-native';
import type { Student } from '../../store/studentStore';
import StudentActivitiesScreen from '../StudentActivitiesScreen';

const mockActivities = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));

// Os dois hooks são a fronteira com o banco: o aluno vinculado e a linha do tempo.
jest.mock('../../hooks/useLinkedStudent', () => ({
  useLinkedStudent: () => ({
    studentId: 'aluno-1',
    student: { id: 'aluno-1', full_name: 'Ana Souza' } as Student,
    loading: false,
    retry: jest.fn(),
  }),
}));
jest.mock('../../hooks/useStudentActivities', () => ({
  useStudentActivities: () => mockActivities(),
}));

describe('Atividades do aluno', () => {
  it('traz os filtros e a linha do tempo do aluno', async () => {
    mockActivities.mockReturnValue({ days: [], loading: false, failed: false, reload: jest.fn() });
    await render(<StudentActivitiesScreen />);

    expect(screen.getByText('Ana Souza')).toBeTruthy();
    for (const filtro of ['Histórico', 'Treinos', 'Nutrição', 'Medidas']) {
      expect(screen.getByText(filtro)).toBeTruthy();
    }
    expect(screen.getByText('Linha do tempo')).toBeTruthy();
    expect(screen.getByText('Nenhum registro por aqui ainda.')).toBeTruthy();
  });

  it('avisa quando a carga falha', async () => {
    mockActivities.mockReturnValue({ days: [], loading: false, failed: true, reload: jest.fn() });
    await render(<StudentActivitiesScreen />);

    expect(screen.getByText('Não foi possível carregar as atividades.')).toBeTruthy();
  });
});
