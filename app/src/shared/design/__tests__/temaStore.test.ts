import { colorScheme } from 'nativewind';
import type { PreferenciaDeTema } from '../temaStore';
import { useTemaStore } from '../temaStore';

jest.mock('nativewind', () => ({
  colorScheme: { set: jest.fn() },
}));

const setDoNativeWind = colorScheme.set as jest.Mock;

describe('preferência de tema', () => {
  beforeEach(() => {
    setDoNativeWind.mockClear();
    useTemaStore.setState({ preferencia: 'sistema' });
  });

  it('nasce seguindo o sistema, para não surpreender quem nunca abriu a opção', () => {
    expect(useTemaStore.getState().preferencia).toBe('sistema');
  });

  it.each<[PreferenciaDeTema, string]>([
    ['claro', 'light'],
    ['escuro', 'dark'],
    ['sistema', 'system'],
  ])('traduz "%s" para o esquema "%s" do NativeWind', (preferencia, esquema) => {
    useTemaStore.getState().escolher(preferencia);

    expect(setDoNativeWind).toHaveBeenCalledWith(esquema);
    expect(useTemaStore.getState().preferencia).toBe(preferencia);
  });

  it('guarda apenas a preferência, e não o tema resolvido', () => {
    useTemaStore.getState().escolher('escuro');

    // O tema resolvido é do NativeWind. Persistir os dois criaria duas fontes
    // discordando quando o sistema mudasse com o app fechado.
    expect(Object.keys(useTemaStore.getState())).toEqual(['preferencia', 'escolher']);
  });
});
