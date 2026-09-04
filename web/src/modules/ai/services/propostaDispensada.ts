/**
 * Quais propostas já resolvidas quem está olhando mandou sair da tela.
 *
 * O painel oferece "Fechar" depois que a proposta foi salva. Se ela voltasse na
 * próxima vez que a conversa abrisse, o botão teria mentido.
 *
 * Isto é preferência de quem olha, não fato da conversa — por isso vive no
 * navegador e não no `state` da sessão. Outro especialista abrindo a mesma
 * conversa precisa ver o que foi salvo; a decisão de "já vi, pode sumir" é de
 * quem a tomou.
 *
 * Toda leitura e escrita é protegida: em janela anônima, com dados de site
 * bloqueados ou em renderização de servidor, o acessador em si levanta exceção.
 * Sem storage, o comportamento é o de antes — a proposta aparece.
 */
const CHAVE = "elevapro:propostas-dispensadas";

function lerTodas(): string[] {
  try {
    const cru = localStorage.getItem(CHAVE);
    const lista: unknown = cru ? JSON.parse(cru) : [];
    return Array.isArray(lista) ? lista.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function foiDispensada(sessionId: string): boolean {
  return lerTodas().includes(sessionId);
}

export function dispensar(sessionId: string): void {
  try {
    const todas = lerTodas();
    if (todas.includes(sessionId)) return;
    localStorage.setItem(CHAVE, JSON.stringify([...todas, sessionId]));
  } catch {
    // Sem storage a proposta volta na próxima abertura. É pior que lembrar, e
    // melhor que derrubar a tela por causa de uma preferência de exibição.
  }
}
