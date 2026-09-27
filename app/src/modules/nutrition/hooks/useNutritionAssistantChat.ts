import type { ChatMessage, DietMealsProposal, DietPlanProposal } from '@elevapro/shared';
import { useEffect, useRef, useState } from 'react';
import { mensagemDeErroBff } from '@/shared/bff';
import { useChatConversation } from '@/shared/chat/useChatConversation';
import { NutritionChatService } from '../services/NutritionChatService';

export interface ProposalState<T> {
  data: T;
  saved: boolean;
}

export interface NutritionAssistantChat {
  messages: ChatMessage[];
  initializing: boolean;
  responding: boolean;
  planProposal: ProposalState<DietPlanProposal> | null;
  mealsProposal: ProposalState<DietMealsProposal> | null;
  saving: boolean;
  error: string | null;
  planId: string | null;
  readOnly: boolean;
  retry: () => void;
  sendMessage: (text: string) => void;
  approvePlan: () => void;
  approveMeals: () => void;
}

interface Options {
  token: string;
  studentId: string;
  sessionId: string | null;
  planId?: string;
  onSessionResolved: (sessionId: string) => void;
  /** O plano entrou em rascunho: o wizard passa a apontar para ele. */
  onPlanApproved: (planId: string) => void;
}

const GREETING =
  'Olá! Vou te ajudar a montar a dieta deste aluno. Me conte o objetivo e as preferências.';

/**
 * A conversa com o assistente de nutrição (#337): o chat do web, com as duas
 * propostas — o plano e as refeições — aprovadas pelas rotas que já gravam.
 * O plano aprovado nasce rascunho; o aluno só vê depois do envio.
 *
 * @example
 * const chat = useNutritionAssistantChat({ token, studentId, sessionId, onSessionResolved,
 *   onPlanApproved: wizard.setCreatedPlan });
 */
export function useNutritionAssistantChat({
  token,
  studentId,
  sessionId,
  planId,
  onSessionResolved,
  onPlanApproved,
}: Options): NutritionAssistantChat {
  const chat = useChatConversation(GREETING);
  const [initializing, setInitializing] = useState(true);
  const [plan, setPlan] = useState<ProposalState<DietPlanProposal> | null>(null);
  const [meals, setMeals] = useState<ProposalState<DietMealsProposal> | null>(null);
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(planId ?? null);
  const resolvedSession = useRef<string | null>(null);
  const resolvedPlan = useRef(planId);
  const busy = useRef(false);
  const mounted = useRef(true);
  const authenticated = Boolean(token);

  // A tela remonta por aluno/rascunho; callbacks do wizard não reiniciam a conversa.
  // biome-ignore lint/correctness/useExhaustiveDependencies: sessão resolvida altera o wizard, não o destino da conversa
  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    resolvedSession.current = null;
    setInitializing(true);
    setError(null);
    NutritionChatService.loadSession(token, studentId, sessionId ?? undefined, planId)
      .then((session) => {
        if (cancelled) return;
        resolvedSession.current = session.sessionId;
        resolvedPlan.current = session.savedPlanId ?? planId;
        setSavedPlanId(session.savedPlanId ?? planId ?? null);
        setReadOnly(session.readOnly ?? false);
        onSessionResolved(session.sessionId);
        chat.load(session.messages);
        setPlan(
          session.planProposal ? { data: session.planProposal, saved: session.planSaved } : null
        );
        setMeals(
          session.mealsProposal ? { data: session.mealsProposal, saved: session.mealsSaved } : null
        );
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(mensagemDeErroBff(failure));
      })
      .finally(() => !cancelled && setInitializing(false));
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [authenticated, studentId, attempt]);

  const blocked = () => initializing || !!error || busy.current || !resolvedSession.current;

  const sendMessage = (text: string) => {
    if (blocked() || !text.trim()) return;
    busy.current = true;
    void chat
      .reply(text, ({ text: write, error: fail }) =>
        NutritionChatService.sendMessage(
          token,
          studentId,
          text.trim(),
          resolvedSession.current,
          (event) => {
            if (!mounted.current) return;
            if (event.type === 'text') write(event.content);
            else if (event.type === 'diet_plan_proposal')
              setPlan({ data: event.data, saved: false });
            else if (event.type === 'diet_meals_proposal')
              setMeals({ data: event.data, saved: false });
            else if (event.type === 'error') fail(event.message);
          },
          resolvedPlan.current
        )
      )
      .finally(() => {
        busy.current = false;
      });
  };

  async function approve(work: () => Promise<void>, failure: string) {
    if (blocked() || readOnly) return;
    busy.current = true;
    setSaving(true);
    try {
      await work();
    } catch {
      chat.say(failure);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const approvePlan = () =>
    approve(async () => {
      if (!plan || plan.saved || resolvedPlan.current) return;
      const saved = await NutritionChatService.approvePlan(
        token,
        studentId,
        resolvedSession.current
      );
      if (!mounted.current) return;
      resolvedPlan.current = saved.id;
      setSavedPlanId(saved.id);
      setPlan((current) => (current ? { ...current, saved: true } : current));
      onPlanApproved(saved.id);
      chat.say(`Plano "${saved.name}" salvo em rascunho. Agora posso propor as refeições.`);
    }, 'Não consegui salvar o plano agora. Tente de novo.');

  const approveMeals = () =>
    approve(async () => {
      if (!meals || meals.saved || !resolvedPlan.current) return;
      const result = await NutritionChatService.approveMeals(
        token,
        studentId,
        resolvedSession.current,
        resolvedPlan.current
      );
      if (!mounted.current) return;
      setMeals((current) => (current ? { ...current, saved: true } : current));
      chat.say(`Pronto! ${result.saved.length} refeições salvas no plano.`);
    }, 'Não consegui salvar as refeições agora. Tente de novo.');

  return {
    messages: chat.messages,
    initializing,
    responding: chat.responding,
    planProposal: plan,
    mealsProposal: meals,
    saving,
    error,
    planId: savedPlanId,
    readOnly,
    retry: () => setAttempt((current) => current + 1),
    sendMessage,
    approvePlan,
    approveMeals,
  };
}
