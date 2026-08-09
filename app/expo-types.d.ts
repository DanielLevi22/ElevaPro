/**
 * A declaracao de `*.css` — necessaria para o `import '../global.css'` do
 * NativeWind — vem de `expo/types`. O `expo-env.d.ts` que a referencia e
 * gerado pelo CLI e esta no .gitignore, entao no CI ele nao existe e o tsc
 * falha com TS2882.
 *
 * Este arquivo e versionado justamente para a referencia nao depender de um
 * artefato gerado.
 */
/// <reference types="expo/types" />
