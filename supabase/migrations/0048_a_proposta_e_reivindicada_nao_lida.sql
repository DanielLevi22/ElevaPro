-- A proposta pendente passa a ser reivindicada, não lida.
--
-- As três rotas de aprovação — save-workouts, save-plan, save-meals — seguiam o
-- mesmo desenho:
--
--   getSessionState  →  insere N linhas  →  updateSessionState({ pendente: undefined })
--
-- Entre a leitura e a limpeza não havia nada segurando a porta. Duas abas, dois
-- aparelhos, ou um retry depois do `maxDuration = 60` da Vercel, e os dois
-- pedidos liam a mesma proposta pendente e gravavam os mesmos treinos. O
-- `savingWorkouts` da tela só tranca o clique daquela aba.
--
-- `reivindicar_proposta` fecha a janela: tira a chave do `state` e devolve o que
-- estava lá, sob a trava da linha. Quem chega primeiro recebe a proposta; quem
-- chega depois espera, relê a linha já sem a chave, e recebe `null`.
--
-- **Por que `SELECT … FOR UPDATE` e não um `UPDATE … RETURNING` só.** O
-- `RETURNING` enxerga a linha depois do SET, e o que a rota precisa é do valor
-- de antes. Travar, ler e então apagar é o caminho que devolve o valor antigo
-- sem abrir espaço entre a leitura e a escrita. Em READ COMMITTED o segundo
-- chamador reavalia a linha ao destravar, que é justamente o comportamento de
-- que este desenho depende.
--
-- A trava dura o que dura a função, não o pedido HTTP inteiro: os inserts
-- acontecem depois, fora dela. Segurar a linha durante dezenas de inserts
-- transformaria uma corrida rara em fila garantida.

CREATE OR REPLACE FUNCTION public.reivindicar_proposta(
  p_session_id uuid,
  p_chave text
)
RETURNS jsonb
LANGUAGE plpgsql
-- INVOKER de propósito: quem chama é o `service_role` da rota, que já passou
-- pelo `authorizeLinkedSpecialist`. DEFINER faria a função conceder mais do que
-- o chamador tem — uma porta lateral para o `state` de qualquer conversa.
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  valor jsonb;
BEGIN
  SELECT s.state -> p_chave
    INTO valor
    FROM public.ai_chat_sessions s
   WHERE s.id = p_session_id
     FOR UPDATE;

  -- Chave ausente e chave com `null` dentro são a mesma coisa aqui: não há
  -- proposta para aprovar. `jsonb_typeof` separa o JSON `null` do SQL NULL, que
  -- o operador `->` devolve nos dois casos.
  IF valor IS NULL OR jsonb_typeof(valor) = 'null' THEN
    RETURN NULL;
  END IF;

  -- `-` remove só esta chave. O resto do `state` — savedWorkouts, as propostas
  -- já resolvidas, a outra pendente — atravessa intacto.
  UPDATE public.ai_chat_sessions
     SET state = state - p_chave
   WHERE id = p_session_id;

  RETURN valor;
END;
$$;

-- Só a rota chama. Um especialista autenticado alcançaria a própria conversa
-- pela política `specialist_own_sessions` e poderia esvaziar a proposta pendente
-- sem gravar nada — dano pequeno, porta desnecessária.
REVOKE EXECUTE ON FUNCTION public.reivindicar_proposta(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reivindicar_proposta(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reivindicar_proposta(uuid, text) TO service_role;

-- Devolve ao `state` a proposta que a rota reivindicou e não conseguiu gravar.
--
-- Sem isto, uma falha no meio dos inserts deixaria a pessoa sem proposta e sem
-- treinos — a reivindicação é destrutiva por desenho, e o preço dela é ter a
-- volta. `||` sobrescreve a chave se ela existir, o que só acontece se o modelo
-- tiver proposto de novo enquanto a gravação falhava; nesse caso a proposta
-- nova é a que vale, e é por isso que o COALESCE monta o objeto ao contrário.
CREATE OR REPLACE FUNCTION public.devolver_proposta(
  p_session_id uuid,
  p_chave text,
  p_valor jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.ai_chat_sessions
     SET state = jsonb_build_object(p_chave, p_valor) || COALESCE(state, '{}'::jsonb)
   WHERE id = p_session_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.devolver_proposta(uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.devolver_proposta(uuid, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.devolver_proposta(uuid, text, jsonb) TO service_role;
