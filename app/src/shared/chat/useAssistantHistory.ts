import { useCallback, useEffect, useRef, useState } from 'react';
import { BffHttpError, isConsentRequired, mensagemDeErroBff } from '@/shared/bff';
import {
  type AssistantConversation,
  type AssistantModule,
  assistantConversations,
} from './assistantConversations';

/** Lista e altera as conversas de um aluno sem reaproveitar respostas de outra sessão.
 * @example const history = useAssistantHistory(token, studentId);
 */
export function useAssistantHistory(token: string, studentId: string) {
  const scope = `${token}:${studentId}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const mounted = useRef(true);
  const lock = useRef<string | null>(null);
  const loadSequence = useRef(0);
  const [state, setState] = useState<{
    scope: string;
    sessions: AssistantConversation[];
    loading: boolean;
    error: string | null;
  }>({ scope, sessions: [], loading: true, error: null });
  const [pendingScope, setPendingScope] = useState<string | null>(null);
  const [deniedScope, setDeniedScope] = useState<string | null>(null);
  const [consentScope, setConsentScope] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setState((previous) => ({
      scope,
      sessions: previous.scope === scope ? previous.sessions : [],
      loading: true,
      error: null,
    }));
    try {
      if (!token || !studentId) throw new Error('Sessão ou aluno indisponível.');
      const sessions = await assistantConversations.list(token, studentId);
      if (mounted.current && currentScope.current === scope && sequence === loadSequence.current) {
        setDeniedScope(null);
        setConsentScope(null);
        setState({ scope, sessions, loading: false, error: null });
      }
    } catch (failure) {
      if (mounted.current && currentScope.current === scope && sequence === loadSequence.current) {
        const denied = failure instanceof BffHttpError && [401, 403].includes(failure.status);
        if (denied) setDeniedScope(scope);
        const consentRequired = isConsentRequired(failure);
        setConsentScope(consentRequired ? scope : null);
        setState((previous) => ({
          ...previous,
          sessions: [],
          loading: false,
          error: consentRequired ? null : mensagemDeErroBff(failure),
        }));
      }
    }
  }, [scope, token, studentId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      loadSequence.current++;
    };
  }, [refresh]);

  async function change<T>(work: () => Promise<T>): Promise<T | null> {
    if (
      !token ||
      !studentId ||
      lock.current === scope ||
      state.loading ||
      deniedScope === scope ||
      currentScope.current !== scope
    )
      return null;
    lock.current = scope;
    setPendingScope(scope);
    setState((previous) => ({ ...previous, error: null }));
    try {
      const result = await work();
      return mounted.current && currentScope.current === scope ? result : null;
    } catch (failure) {
      if (mounted.current && currentScope.current === scope) {
        const denied = failure instanceof BffHttpError && [401, 403].includes(failure.status);
        if (denied) setDeniedScope(scope);
        const consentRequired = isConsentRequired(failure);
        setConsentScope(consentRequired ? scope : null);
        setState((previous) => ({
          ...previous,
          sessions: denied ? [] : previous.sessions,
          error: consentRequired ? null : mensagemDeErroBff(failure),
        }));
      }
      return null;
    } finally {
      if (lock.current === scope) {
        lock.current = null;
        if (mounted.current) setPendingScope(null);
      }
    }
  }

  async function create(module: AssistantModule) {
    const result = await change(() => assistantConversations.create(token, studentId, module));
    return result ? { id: result.sessionId, module } : null;
  }

  async function rename(sessionId: string, title: string): Promise<boolean> {
    if (!title.trim()) return false;
    const result = await change(() =>
      assistantConversations.rename(token, studentId, sessionId, title)
    );
    if (!result?.success) return false;
    setState((previous) => ({
      ...previous,
      sessions: previous.sessions.map((item) =>
        item.id === sessionId ? { ...item, title: title.trim().slice(0, 80) } : item
      ),
    }));
    return true;
  }

  async function archive(sessionId: string): Promise<boolean> {
    const result = await change(() => assistantConversations.archive(token, studentId, sessionId));
    if (!result?.success) return false;
    setState((previous) => ({
      ...previous,
      sessions: previous.sessions.filter((item) => item.id !== sessionId),
    }));
    return true;
  }

  return {
    sessions: state.scope === scope ? state.sessions : [],
    loading: state.scope !== scope || state.loading,
    error: state.scope === scope ? state.error : null,
    pending: pendingScope === scope,
    denied: deniedScope === scope,
    consentRequired: consentScope === scope,
    refresh,
    create,
    rename,
    archive,
  };
}
