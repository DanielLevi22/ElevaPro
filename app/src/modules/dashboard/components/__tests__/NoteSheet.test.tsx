import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NoteSheet } from '../NoteSheet';

const mockWriteNote = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createSpecialistNoteService: () => ({ writeNote: (input: unknown) => mockWriteNote(input) }),
}));
jest.mock('@elevapro/supabase', () => ({
  supabase: { auth: { getUser: () => mockGetUser() } },
}));

describe('NoteSheet (F8)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('a mensagem vira uma nota do especialista para o aluno do sinal', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'especialista' } } });
    mockWriteNote.mockResolvedValue({});
    const onClose = jest.fn();
    render(<NoteSheet student={{ id: 'aluno', name: 'Ana Souza' }} onClose={onClose} />);

    expect(screen.getByText('Mensagem para Ana')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Mensagem'), 'Oi, Ana! Como foi a semana?');
    fireEvent.press(screen.getByText('Enviar'));

    await waitFor(() =>
      expect(mockWriteNote).toHaveBeenCalledWith({
        studentId: 'aluno',
        specialistId: 'especialista',
        body: 'Oi, Ana! Como foi a semana?',
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('mensagem vazia não vai', () => {
    render(<NoteSheet student={{ id: 'aluno', name: 'Ana' }} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText('Enviar'));
    expect(mockWriteNote).not.toHaveBeenCalled();
  });

  it('sem sessão, não grava nota em nome de ninguém', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<NoteSheet student={{ id: 'aluno', name: 'Ana' }} onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('Mensagem'), 'Oi');
    fireEvent.press(screen.getByText('Enviar'));
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
    expect(mockWriteNote).not.toHaveBeenCalled();
  });
});
