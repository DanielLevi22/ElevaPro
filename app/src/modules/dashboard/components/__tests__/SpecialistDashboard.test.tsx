import type { Briefing } from '@elevapro/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SpecialistDashboard } from '../SpecialistDashboard';

jest.mock('../NoteSheet', () => {
  const { Text } = require('react-native');
  return {
    NoteSheet: ({ student }: { student: { name: string } | null }) =>
      student ? <Text>{`Escrevendo para ${student.name}`}</Text> : null,
  };
});

const BRIEFING: Briefing = {
  signals: [
    {
      studentId: 'a1',
      studentName: 'Ana',
      kind: 'meals_unlogged',
      tone: 'warning',
      message: 'Sem marcar refeição há 6 dias.',
      days: 6,
    },
    {
      studentId: 'a2',
      studentName: 'Bia',
      kind: 'anamnesis_ready',
      tone: 'success',
      message: 'Anamnese concluída — pronto para receber o plano.',
      days: 0,
    },
  ],
  stats: { activeStudents: 2, workoutTemplates: 0, activeDietPlans: 0, aiSessions: 0 },
};

describe('SpecialistDashboard (F8)', () => {
  it('quem sumiu ganha o botão de mensagem; a anamnese pronta não', async () => {
    await render(
      <SpecialistDashboard
        profile={{ full_name: 'Carla' }}
        students={[]}
        briefing={BRIEFING}
        averageAdherence={null}
        isLoading={false}
        onRefresh={jest.fn()}
      />
    );

    expect(screen.getByText('Sem marcar refeição há 6 dias.')).toBeTruthy();
    const buttons = screen.getAllByLabelText('Mensagem');
    expect(buttons).toHaveLength(1);

    await fireEvent.press(buttons[0]);
    expect(screen.getByText('Escrevendo para Ana')).toBeTruthy();
  });
});
