/**
 * O nome como cabe numa linha de metadado: primeiro nome e inicial do último.
 *
 * Mostra quem é sem expor o nome completo onde ele não é o assunto — o
 * especialista no cartão do ciclo, por exemplo.
 *
 * @example nomeCurto("Daniel Levi Souza") // "Daniel S."
 */
export function nomeCurto(nome: string | null | undefined): string | null {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return null;
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0]}.`;
}
