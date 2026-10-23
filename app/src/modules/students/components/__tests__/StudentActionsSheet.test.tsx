import { render, screen } from '@testing-library/react-native';
import type { Student } from '../../store/studentStore';
import { StudentActionsSheet } from '../StudentActionsSheet';

const ANA = {
  id: 'aluno-1',
  full_name: 'Ana Souza',
  email: 'ana@example.com',
  account_status: 'active',
} as Student;

describe('menu de ações do aluno (#436)', () => {
  it('não oferece avaliação física: a análise por foto é do próprio aluno', async () => {
    await render(
      <StudentActionsSheet
        student={ANA}
        onClose={jest.fn()}
        onResendInvite={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    expect(screen.getByText('Remover aluno')).toBeTruthy();
    expect(screen.queryByText('Avaliação física')).toBeNull();
  });
});
