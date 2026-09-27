import { mockSupabase, mockSupabaseBuilder } from '../../../../../jest.setup';
import { fetchDietStudentChoices } from '../dietStudentChoices';

const range = jest.fn();
const profile = (id: string) => ({
  id,
  full_name: `Aluno ${id}`,
  email: 'privado@example.test',
  avatar_url: 'private-image',
  account_status: 'active',
});
const link = (id: string) => ({
  student: profile(id),
  status: 'active',
  service_type: 'nutrition_consulting',
});

beforeEach(() => {
  mockSupabase.from.mockReturnValue(Object.assign(mockSupabaseBuilder, { range }));
  range.mockReturnValue(mockSupabaseBuilder);
});

it('inclui alunos depois da primeira página e remove vínculos duplicados', async () => {
  mockSupabaseBuilder.then
    .mockImplementationOnce((resolve) =>
      resolve({
        data: Array.from({ length: 100 }, (_, index) => link(String(index))),
        count: 102,
        error: null,
      })
    )
    .mockImplementationOnce((resolve) =>
      resolve({ data: [link('0'), link('last')], count: 102, error: null })
    );
  const choices = await fetchDietStudentChoices('specialist-1');
  expect(choices).toHaveLength(101);
  expect(choices.at(-1)).toEqual({ id: 'last', name: 'Aluno last' });
});

// Art. 6°, III: escolher destinatário exige identificação, não contato ou perfil completo.
it('não entrega contato ou outros campos de perfil ao seletor de dieta', async () => {
  mockSupabaseBuilder.then.mockImplementationOnce((resolve) =>
    resolve({ data: [link('student-1')], count: 1, error: null })
  );
  const choices = await fetchDietStudentChoices('specialist-1');
  if (Object.keys(choices[0]).sort().join(',') !== 'id,name') {
    throw new Error('PERFIL EXPOSTO: o seletor recebeu campos além da identificação necessária');
  }
});

it('propaga a falha para permitir recuperação, sem fingir que não há alunos', async () => {
  mockSupabaseBuilder.then.mockImplementationOnce((resolve) =>
    resolve({ data: null, count: 0, error: { message: 'Offline' } })
  );
  await expect(fetchDietStudentChoices('specialist-1')).rejects.toEqual({ message: 'Offline' });
});
