import type { BodyScanRecord } from '@elevapro/shared';
import { render, screen } from '@testing-library/react-native';
import { ScanHistoryList } from '../ScanHistoryList';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  const Icone = () => <View />;
  return { Ionicons: Icone };
});

function scan(sobrescreve: Partial<BodyScanRecord> = {}): BodyScanRecord {
  return {
    id: 'scan-1',
    scanned_at: '2026-08-31T12:00:00Z',
    weight_kg: 94,
    body_fat_pct: 24,
    ...sobrescreve,
  } as BodyScanRecord;
}

describe('o resumo de cada análise no histórico', () => {
  // Peso vem da Escala — medido com fita ou informado pelo aluno. Gordura é o
  // modelo estimando sobre uma foto. Com a mesma cara, o segundo herdava a
  // autoridade do primeiro.
  it('marca a gordura como estimativa e o peso não', () => {
    render(<ScanHistoryList onDelete={jest.fn()} scans={[scan()]} />);

    const linha = screen.getByText(/94 kg/);

    expect(linha).toBeTruthy();
    expect(screen.getByText(/\(est\.\)/)).toBeTruthy();
    expect(screen.queryByText(/94 kg \(est\.\)/)).toBeNull();
  });

  // Zero por cento de gordura não existe. Campo ausente tem de sumir da linha,
  // não virar número.
  it('omite a gordura quando ela não veio', () => {
    render(<ScanHistoryList onDelete={jest.fn()} scans={[scan({ body_fat_pct: null })]} />);

    expect(screen.getByText('94 kg')).toBeTruthy();
    expect(screen.queryByText(/gordura/)).toBeNull();
  });

  it('mostra só a data quando não há métrica nenhuma', () => {
    render(
      <ScanHistoryList
        onDelete={jest.fn()}
        scans={[scan({ weight_kg: null, body_fat_pct: null })]}
      />
    );

    expect(screen.getByText('31/08/2026')).toBeTruthy();
    expect(screen.queryByText(/kg|gordura/)).toBeNull();
  });
});
