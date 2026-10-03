/**
 * A Análise de Técnica está liberada para os alunos?
 *
 * Desligada enquanto está em desenvolvimento (decisão do Daniel, 2026-10-02):
 * as rotas mostram o aviso no lugar da lista e da câmera, o card da tela
 * inicial avisa "Em breve" e o exercício do treino não oferece a análise.
 * Bloquear na rota, e não só no card, impede que um link direto abra a câmera
 * ou peça a autorização de algo que não foi liberado. Para liberar, é virar
 * esta chave.
 */
export const TECHNIQUE_RELEASED = false;
