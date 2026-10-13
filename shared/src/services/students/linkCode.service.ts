import type { SupabaseClient } from "@supabase/supabase-js";
import type { LinkStudentResult } from "../../types/students.types";

/** O código vale um dia: o tempo de mandar por mensagem e o outro digitar. */
const CODE_TTL_MS = 24 * 60 * 60 * 1000;
const CODE_LENGTH = 6;
/** Sem 0/O e 1/I: o código é lido em voz alta e digitado à mão. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Um código de 6 caracteres, de um gerador criptográfico: ele dá acesso a um vínculo. */
function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/**
 * O vínculo entre aluno e especialista por código, nos dois sentidos (#365).
 *
 * Quem gera o código compartilha; quem recebe digita. O banco é quem liga, com
 * quem resgata saindo da sessão (`link_student_by_code`, 0016;
 * `link_to_specialist_by_code`, 0087), e o código some ao ser usado.
 *
 * @example
 * const codigo = await linkCodes.generate({ role: "specialist", id: user.id });
 * const resultado = await linkCodes.redeem("student", "K7Q2MX");
 */
export const createLinkCodeService = (supabase: SupabaseClient) => ({
  /** Gera um código novo e apaga o anterior: só o último compartilhado vale. */
  generate: async (owner: { role: "student" | "specialist"; id: string }): Promise<string> => {
    const table = owner.role === "student" ? "student_link_codes" : "specialist_link_codes";
    const column = owner.role === "student" ? "student_id" : "specialist_id";
    const { error: deleteError } = await supabase.from(table).delete().eq(column, owner.id);
    if (deleteError) throw deleteError;
    const code = newCode();
    const expires_at = new Date(Date.now() + CODE_TTL_MS).toISOString();
    const { error } = await supabase.from(table).insert({ [column]: owner.id, code, expires_at });
    if (error) throw error;
    return code;
  },

  /**
   * Resgata o código do outro lado: o aluno, o do especialista; o especialista,
   * o do aluno.
   */
  redeem: async (as: "student" | "specialist", code: string): Promise<LinkStudentResult> => {
    const fn = as === "student" ? "link_to_specialist_by_code" : "link_student_by_code";
    const { data, error } = await supabase.rpc(fn, { p_code: code });
    if (error) throw error;
    return data as LinkStudentResult;
  },
});

export type LinkCodeService = ReturnType<typeof createLinkCodeService>;
