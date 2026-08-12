import { useStudentStore } from '../studentStore';

// biome-ignore lint/suspicious/noExplicitAny: Required for mock definitions
const { mockSupabase } = global as unknown as { mockSupabase: jest.Mocked<any> };

describe('studentStore', () => {
  const mockSupabaseQuery = (data: unknown, error: unknown = null, count: number | null = null) => {
    const query = Promise.resolve({ data, error, count });
    // biome-ignore lint/suspicious/noExplicitAny: Adding chainable methods
    const q = query as any;
    q.select = jest.fn().mockReturnValue(q);
    q.insert = jest.fn().mockReturnValue(q);
    q.update = jest.fn().mockReturnValue(q);
    q.delete = jest.fn().mockReturnValue(q);
    q.eq = jest.fn().mockReturnValue(q);
    q.in = jest.fn().mockReturnValue(q);
    q.order = jest.fn().mockReturnValue(q);
    q.range = jest.fn().mockReturnValue(q);
    q.single = jest.fn().mockReturnValue(q);
    q.limit = jest.fn().mockReturnValue(q);
    q.ilike = jest.fn().mockReturnValue(q);
    q.gt = jest.fn().mockReturnValue(q);
    q.maybeSingle = jest.fn().mockReturnValue(q);
    return q;
  };

  beforeEach(async () => {
    useStudentStore.getState().reset();
    jest.clearAllMocks();

    mockSupabase.from.mockClear();
    mockSupabase.auth.getSession.mockClear();

    mockSupabase.from.mockImplementation(() => mockSupabaseQuery(null));
  });

  it('should be initially empty', () => {
    const state = useStudentStore.getState();
    expect(state.students).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it('should fetch students successfully', async () => {
    mockSupabase.from
      .mockReturnValueOnce(
        mockSupabaseQuery(
          [
            {
              status: 'active',
              service_type: 'personal_training',
              created_at: '2024-01-01',
              student: {
                id: '1',
                full_name: 'Student 1',
                email: 't@t.com',
                avatar_url: null,
                account_status: 'active',
              },
            },
          ],
          null,
          1
        )
      )
      .mockReturnValueOnce(mockSupabaseQuery([]));

    await useStudentStore.getState().fetchStudents('specialist-123');

    const state = useStudentStore.getState();
    expect(state.students).toHaveLength(1);
    expect(state.students[0].id).toBe('1');
  });

  it('should append students when append param is true', async () => {
    useStudentStore.setState({
      students: [
        {
          id: 'prev',
          full_name: 'Prev',
          email: 'p@p.com',
          avatar_url: null,
          account_status: 'active',
          service_type: 'personal_training',
          link_status: 'active',
          link_created_at: '2024-01-01',
        },
      ],
    });

    mockSupabase.from
      .mockReturnValueOnce(
        mockSupabaseQuery(
          [
            {
              status: 'active',
              service_type: 'personal_training',
              created_at: '2024-01-02',
              student: {
                id: 'new',
                full_name: 'New',
                email: 'n@n.com',
                avatar_url: null,
                account_status: 'active',
              },
            },
          ],
          null,
          2
        )
      )
      .mockReturnValueOnce(mockSupabaseQuery([]));

    await useStudentStore.getState().fetchStudents('p1', { append: true, page: 2 });

    const state = useStudentStore.getState();
    expect(state.students).toHaveLength(2);
    expect(state.students[0].id).toBe('prev');
    expect(state.students[1].id).toBe('new');
  });

  it('should handle fetch students error', async () => {
    mockSupabase.from.mockReturnValue(mockSupabaseQuery(null, { message: 'Fetch failed' }));

    await useStudentStore.getState().fetchStudents('specialist-123');

    expect(useStudentStore.getState().students).toHaveLength(0);
  });

  it('should generate link code', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabaseQuery(null))
      .mockReturnValueOnce(mockSupabaseQuery(null));

    const code = await useStudentStore.getState().generateLinkCode('u1');

    expect(code).toHaveLength(6);
    expect(mockSupabase.from).toHaveBeenCalledWith('student_link_codes');
  });

  // O vínculo virou uma RPC. Antes eram cinco passos no cliente — ler o código,
  // ler o serviço, checar duplicado, inserir e apagar —, e por isso o teste
  // enfileirava cinco respostas de `from`. Validação no cliente não é validação:
  // como `student_specialists` aceitava INSERT direto, dava para pular tudo
  // falando com o PostgREST. Agora o servidor decide, e o teste só verifica que
  // o código sai daqui e a decisão volta de lá.
  it('should link student successfully', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    const result = await useStudentStore.getState().linkStudent('specialist-1', 'CODE12');

    expect(result.success).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('link_student_by_code', { p_code: 'CODE12' });
  });

  it('should handle invalid code when linking', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: { success: false, error: 'Código inválido ou expirado.' },
      error: null,
    });

    const result = await useStudentStore.getState().linkStudent('s1', 'WRONG');

    expect(result.success).toBe(false);
  });

  // O specialist_id não vai mais no payload: o servidor tira de auth.uid().
  // Aceitar quem é o specialist por parâmetro foi exatamente o furo.
  it('não envia o specialist_id para a RPC', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    await useStudentStore.getState().linkStudent('specialist-1', 'CODE12');

    const [, params] = mockSupabase.rpc.mock.calls[0];
    expect(params).not.toHaveProperty('p_specialist_id');
  });

  it('should remove student (soft delete)', async () => {
    useStudentStore.setState({
      students: [
        {
          id: 's1',
          full_name: 'ToDelete',
          email: 'd@d.com',
          avatar_url: null,
          account_status: 'active',
          service_type: 'personal_training',
          link_status: 'active',
          link_created_at: '2024-01-01',
        },
      ],
    });

    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'p1' } } },
    });
    mockSupabase.from.mockReturnValue(mockSupabaseQuery(null));

    await useStudentStore.getState().removeStudent('p1', 's1', 'personal_training');

    expect(useStudentStore.getState().students).toHaveLength(0);
  });

  it('should add physical assessment', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'p1' } } },
    });

    mockSupabase.from
      .mockReturnValueOnce(mockSupabaseQuery(null))
      .mockReturnValueOnce(mockSupabaseQuery([{ id: 'a1', weight: 80 }]));

    const result = await useStudentStore
      .getState()
      .addPhysicalAssessment('s1', { weight: 80 } as never);

    expect(result.success).toBe(true);
    expect(useStudentStore.getState().history).toHaveLength(1);
  });

  it('should handle add physical assessment error', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'p1' } } },
    });

    mockSupabase.from.mockReturnValue(mockSupabaseQuery(null, { message: 'Insert failed' }));

    const result = await useStudentStore
      .getState()
      .addPhysicalAssessment('s1', { weight: 80 } as never);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Insert failed');
  });
});
