import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

let nextDate = '';

function DatePickerStub({ onChange }: { onChange: (event: object, date: Date) => void }) {
  return <Text onPress={() => onChange({}, new Date(`${nextDate}T12:00:00`))}>Confirmar data</Text>;
}

/**
 * O calendário nativo, trocado por um botão que escolhe a data da vez. O
 * `jest.mock` precisa do módulo inteiro, com o `default` que a tela importa.
 *
 * @example jest.mock('@react-native-community/datetimepicker', () => require('../__fixtures__/datePicker').datePickerModule);
 */
export const datePickerModule = { __esModule: true, default: DatePickerStub };

/**
 * Abre o campo de data pelo rótulo que o leitor de tela ouve e escolhe `date`.
 *
 * @example pickDate('Término: 01/12/2026', '2026-12-15');
 */
export function pickDate(label: string, date: string) {
  nextDate = date;
  fireEvent.press(screen.getByLabelText(label));
  fireEvent.press(screen.getByText('Confirmar data'));
}
