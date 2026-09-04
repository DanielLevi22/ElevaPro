import "@testing-library/jest-dom";

// O jsdom não implementa `scrollIntoView`: chamar levanta TypeError, e como as
// telas de chat rolam para o fim a cada mensagem, qualquer teste delas quebrava
// por um detalhe do ambiente, não do componente. Não há layout para rolar aqui,
// então não fazer nada é o comportamento honesto.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
