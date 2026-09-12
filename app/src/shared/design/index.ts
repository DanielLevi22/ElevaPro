/**
 * Design system do app: a fonte de cor, as escalas e a preferência de tema.
 *
 * Tudo que precisa de cor entra por aqui. Classe do NativeWind resolve a
 * maioria dos casos; `useCores` existe para as props que não aceitam
 * `className`, e é a única saída autorizada pela regra de lint que proíbe
 * hexadecimal escrito à mão.
 */
export { type Cores, coresDoTema, useCores } from './cores';
export { gerarGlobalCss } from './globalCss';
export { type PreferenciaDeTema, useTemaStore } from './temaStore';
export {
  escala,
  hslParaHex,
  marca,
  type NomeDeCor,
  paleta,
  type Tema,
} from './tokens';
