// `Database` é reexportado de @elevapro/shared, onde vive o tipo gerado do
// banco. Antes havia dois placeholders conflitantes aqui — `any` em types.ts e
// `Record<string, unknown>` em client.ts — e nenhum dos dois tipava nada.
export type { Database } from '@elevapro/shared';
export * from './abilities';
export { setSupabaseStorage, supabase } from './client';
export { getUserContextJWT } from './getUserContextJWT';
export * from './types';
