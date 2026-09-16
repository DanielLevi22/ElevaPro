import { type ReportSheet, reportHtml } from '../reportPdf';

const FOLHA: ReportSheet = {
  studentName: 'Ana Souza',
  period: '17 jun → 15 set 2026',
  subtitle: 'Base de força · com Marina Dias',
  panel: {
    workouts: 34,
    adherence: 88,
    goal: 90,
    cardioSessions: 6,
    measurements: 3,
  },
  // A data vem como `LoadRecord` a carrega, do dia local da série: ISO, e não já
  // formatada. Era isso que a fixture antiga escondia — o PDF imprimia o ISO cru.
  records: [{ exerciseId: 'supino', name: 'Supino reto', weight: 95.5, date: '2026-08-12' }],
  streak: { current: 12, best: 18 },
  composition: { weightDelta: -1.4, fatDelta: -1.5, source: 'declarada por você' },
  note: { body: 'Boa evolução na puxada.', author: 'Marina Dias', date: '10 set' },
  formatDate: (date) => `${Number(date.slice(8, 10))} ago`,
};

describe('reportHtml', () => {
  it('leva para o papel o que a tela mostra', () => {
    const html = reportHtml(FOLHA);

    expect(html).toContain('Ana Souza');
    expect(html).toContain('34');
    expect(html).toContain('88%');
    expect(html).toContain('Supino reto');
    // Como a tela escreve: vírgula decimal e a data por extenso, nunca o ISO.
    expect(html).toContain('95,5 kg em 12 ago');
    expect(html).not.toContain('2026-08-12');
    expect(html).toContain('Boa evolução na puxada.');
    expect(html).toContain('−1,4 kg');
  });

  // LGPD, Art. 6°, III. O PDF sai do controle do app no instante em que é
  // compartilhado: e-mail e identificador interno não têm finalidade nenhuma
  // numa folha que o aluno manda para quem quiser.
  it('não carrega e-mail nem identificador interno', () => {
    const html = reportHtml({
      ...FOLHA,
      studentName: 'Ana Souza',
      records: [
        {
          exerciseId: '3f1c0a52-6d21-4a3e-9c88-1b2d3e4f5a6b',
          name: 'Supino reto',
          weight: 95,
          date: '2026-08-12',
        },
      ],
    });

    if (/@|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(html)) {
      throw new Error('DADO A MAIS NO PDF: o relatório saiu com e-mail ou id interno');
    }
  });

  it('avisa, no próprio arquivo, que ele carrega dado de saúde', () => {
    expect(reportHtml(FOLHA)).toContain('dados de saúde');
  });

  it('sem nota no período, o PDF não tem a seção', () => {
    const html = reportHtml({ ...FOLHA, note: null });

    expect(html).not.toContain('Nota do especialista');
  });

  // O texto da nota é escrito por outra pessoa e entra no HTML: sem escapar, uma
  // nota com `<` quebraria o documento inteiro.
  it('escapa o que veio de texto livre', () => {
    const html = reportHtml({
      ...FOLHA,
      note: { body: '<script>alert(1)</script>', author: null, date: '10 set' },
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('sem aderência no período, mostra travessão e não zero', () => {
    const html = reportHtml({ ...FOLHA, panel: { ...FOLHA.panel, adherence: null } });

    expect(html).toContain('<div class="value">—</div>');
    expect(html).not.toContain('<div class="value">0%</div>');
  });
});
