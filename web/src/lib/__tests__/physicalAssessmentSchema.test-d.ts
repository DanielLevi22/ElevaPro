import type { Database, PhysicalAssessment } from "@elevapro/shared";

/**
 * Amarra `PhysicalAssessment` às colunas reais de `physical_assessments`.
 *
 * Não é teste de runtime — é uma checagem de tipo, que o `tsc --noEmit` do CI
 * executa. Se a interface escrita à mão descrever um campo que a tabela não
 * tem, ou perder um que ela tem, o build quebra aqui.
 *
 * Existe porque foi exatamente essa amarração que faltou: a interface antiga
 * declarava `weight`, `neck` e `photo_front`, colunas que o banco nunca teve, e
 * como nada comparava as duas, o compilador achava tudo certo enquanto o
 * PostgREST recusava toda escrita com 42703.
 *
 * A versão anterior comparava contra o schema Drizzle em tempo de execução —
 * mas isso puxava `drizzle-orm/pg-core` para dentro do vitest do web, onde ele
 * não está instalado: passava local por hoisting e quebrava no CI.
 * `database.types.ts` é gerado do banco e vive em `shared/src/database/`, então
 * não tem esse problema — e é fonte melhor, porque vem do banco, não de outro
 * arquivo à mão.
 */
type Row = Database["public"]["Tables"]["physical_assessments"]["Row"];

/** Vazio quando os dois lados batem; um nome de campo quando não batem. */
type CamposQueSobram = Exclude<keyof PhysicalAssessment, keyof Row>;
type CamposQueFaltam = Exclude<keyof Row, keyof PhysicalAssessment>;

// Um erro aqui nomeia exatamente o campo divergente.
const _semCamposInventados: CamposQueSobram extends never ? true : CamposQueSobram = true;
const _semCamposEsquecidos: CamposQueFaltam extends never ? true : CamposQueFaltam = true;

void _semCamposInventados;
void _semCamposEsquecidos;
