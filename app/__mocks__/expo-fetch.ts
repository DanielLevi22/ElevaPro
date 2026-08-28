/**
 * Mock de `expo/fetch` para os testes.
 *
 * Delega ao `global.fetch`, que é o que as suítes já mockam. O helper de BFF usa
 * `expo/fetch` no app de verdade porque só ele honra `redirect: 'manual'` — o
 * `fetch` global do React Native é XHR por baixo e ignora a opção. Essa
 * diferença não é observável em Jest, então o mock não tenta reproduzi-la; o
 * que os testes exercitam é a checagem de `content-type`, que vale nos dois.
 */
export const fetch = ((...args: Parameters<typeof globalThis.fetch>) =>
  globalThis.fetch(...args)) as typeof globalThis.fetch;
