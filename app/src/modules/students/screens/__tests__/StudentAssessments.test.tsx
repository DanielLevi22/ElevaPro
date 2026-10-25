import {
  ASSESSMENT_NUMBER_FIELDS,
  type PhysicalAssessment,
  snapshotAssessment,
} from '@elevapro/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { showAlert } from '@/components/ui/appAlert';
import { ROUTES } from '@/navigation/types';
import { assessmentClient } from '../../services/assessmentClient';
import { useAssessmentsStore } from '../../store/assessmentsStore';
import type { Student } from '../../store/studentStore';
import AssessmentFormScreen from '../AssessmentFormScreen';
import AssessmentRevisionsScreen from '../AssessmentRevisionsScreen';
import StudentAssessmentsScreen from '../StudentAssessmentsScreen';

const mockNavigate = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/components/ui/appAlert', () => ({ showAlert: jest.fn() }));
jest.mock('@/auth', () => ({
  useCan: (action: string) => action === 'read' || action === 'update',
  useAuthStore: (select: (state: unknown) => unknown) => select({ user: { id: 'especialista-1' } }),
}));
jest.mock('../../hooks/useLinkedStudent', () => ({
  useLinkedStudent: () => ({
    studentId: 'aluno-1',
    student: { id: 'aluno-1', full_name: 'Ana Souza' } as Student,
    loading: false,
    retry: jest.fn(),
  }),
}));

// O cliente do BFF é a fronteira: tudo atrás dele é rota, RLS e auditoria.
jest.mock('../../services/assessmentClient', () => ({
  assessmentClient: {
    list: jest.fn(),
    create: jest.fn(),
    correct: jest.fn(),
    revisions: jest.fn(),
  },
}));
const mockClient = jest.mocked(assessmentClient);

function assessment(overrides: Partial<PhysicalAssessment>): PhysicalAssessment {
  return {
    ...Object.fromEntries(ASSESSMENT_NUMBER_FIELDS.map((key) => [key, null])),
    id: 'a-1',
    student_id: 'aluno-1',
    specialist_id: 'especialista-1',
    measured_by: 'specialist',
    created_at: '2026-10-20T12:00:00Z',
    weight_kg: 80,
    height_cm: 180,
    notes: null,
    correction_version: 0,
    ...overrides,
  } as PhysicalAssessment;
}

const OWN = assessment({ id: 'propria', weight_kg: 78.8 });
const OTHER = assessment({
  id: 'alheia',
  specialist_id: 'especialista-2',
  created_at: '2026-09-01T12:00:00Z',
});
const DECLARED = assessment({ id: 'declarada', measured_by: 'self', weight_kg: 99 });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'aluno-1' };
  useAssessmentsStore.setState({ studentId: null, assessments: [], status: 'loading' });
});

describe('lista de avaliações do aluno', () => {
  it('mostra só a série do especialista, com a variação de peso', async () => {
    mockClient.list.mockResolvedValue([OWN, DECLARED, OTHER]);
    await render(<StudentAssessmentsScreen />);

    expect(await screen.findByText('2 avaliações')).toBeTruthy();
    expect(screen.getByText('-1,2 kg desde a anterior')).toBeTruthy();
    expect(screen.queryByText('99 kg')).toBeNull();
  });

  it('oferece corrigir só a avaliação que a própria conta mediu', async () => {
    mockClient.list.mockResolvedValue([OWN, OTHER]);
    await render(<StudentAssessmentsScreen />);

    expect(await screen.findAllByText('Corrigir')).toHaveLength(1);
    await fireEvent.press(screen.getByText('Corrigir'));
    expect(mockNavigate).toHaveBeenCalledWith(
      ROUTES.STUDENTS.ASSESSMENTS.FORM('aluno-1', 'propria')
    );
  });

  it('série vazia convida à primeira avaliação', async () => {
    mockClient.list.mockResolvedValue([]);
    await render(<StudentAssessmentsScreen />);

    await fireEvent.press(await screen.findByText('Nova avaliação'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.STUDENTS.ASSESSMENTS.FORM('aluno-1'));
  });

  it('falha de carga avisa em vez de mostrar série vazia', async () => {
    mockClient.list.mockRejectedValue(new Error('rede'));
    await render(<StudentAssessmentsScreen />);

    expect(await screen.findByText('Não foi possível carregar as avaliações.')).toBeTruthy();
    expect(screen.queryByText('Nova avaliação')).toBeNull();
  });
});

describe('ficha da avaliação', () => {
  it('não grava sem peso e altura, e diz por quê', async () => {
    await render(<AssessmentFormScreen />);

    await fireEvent.changeText(screen.getByLabelText('Peso em kg'), '80');
    await fireEvent.press(screen.getByText('Salvar'));

    expect(mockClient.create).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/obrigatórios/) })
    );
  });

  it('nova avaliação grava as medidas das abas e volta à lista', async () => {
    mockClient.create.mockResolvedValue(OWN);
    mockClient.list.mockResolvedValue([OWN]);
    await render(<AssessmentFormScreen />);

    await fireEvent.changeText(screen.getByLabelText('Peso em kg'), '80,5');
    await fireEvent.changeText(screen.getByLabelText('Altura em cm'), '180');
    await fireEvent.press(screen.getByText('Circunferências'));
    await fireEvent.changeText(screen.getByLabelText('Cintura em cm'), '82');
    await act(() => fireEvent.press(screen.getByText('Salvar')));

    expect(mockClient.create).toHaveBeenCalledWith(
      'aluno-1',
      expect.objectContaining({ weight_kg: 80.5, height_cm: 180, circ_waist: 82 })
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('a correção abre com a ficha carregada e mostra a recusa da rota', async () => {
    useAssessmentsStore.setState({ studentId: 'aluno-1', assessments: [OWN], status: 'ready' });
    mockParams = { id: 'aluno-1', assessmentId: 'propria' };
    mockClient.correct.mockRejectedValue(
      new Error('Esta avaliação foi corrigida em outra sessão.')
    );
    mockClient.list.mockResolvedValue([OWN]);
    await render(<AssessmentFormScreen />);

    expect(screen.getByDisplayValue('78.8')).toBeTruthy();
    await act(() => fireEvent.press(screen.getByText('Salvar correção')));

    expect(mockClient.correct).toHaveBeenCalledWith(
      OWN,
      expect.objectContaining({ weight_kg: 78.8 })
    );
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Esta avaliação foi corrigida em outra sessão.' })
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('correção sem a ficha carregada não abre em branco', async () => {
    mockParams = { id: 'aluno-1', assessmentId: 'sumiu' };
    await render(<AssessmentFormScreen />);

    expect(screen.queryByText('Salvar correção')).toBeNull();
    expect(screen.getByText(/não está mais carregada/)).toBeTruthy();
  });
});

describe('histórico de correções', () => {
  it('mostra a versão anterior só com os campos que tinham valor', async () => {
    mockParams = { id: 'aluno-1', assessmentId: 'propria' };
    mockClient.revisions.mockResolvedValue([
      {
        id: 'r-1',
        corrected_at: '2026-10-21T15:30:00Z',
        previous_values: snapshotAssessment(assessment({ weight_kg: 79.5, notes: 'antes' })),
      },
    ]);
    await render(<AssessmentRevisionsScreen />);

    expect(await screen.findByText('79,5 kg')).toBeTruthy();
    expect(screen.queryByText('Cintura')).toBeNull();
    expect(screen.getByText('antes')).toBeTruthy();
    expect(mockClient.revisions).toHaveBeenCalledWith('aluno-1', 'propria');
  });

  it('falha mostra a mensagem da rota', async () => {
    mockParams = { id: 'aluno-1', assessmentId: 'propria' };
    mockClient.revisions.mockRejectedValue(new Error('Sem vínculo ativo com este aluno.'));
    await render(<AssessmentRevisionsScreen />);

    expect(await screen.findByText('Sem vínculo ativo com este aluno.')).toBeTruthy();
  });
});
