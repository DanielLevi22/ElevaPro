import { createAuthService } from '@elevapro/shared';
import {
  type AccountType,
  type AppAbility,
  defineAbilitiesFor,
  getUserContextJWT,
  supabase,
} from '@elevapro/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { resetNotices } from '@/shared/notices';
// Direto do arquivo do cache, e não do índice do módulo: o índice arrasta os
// adaptadores nativos do Health Connect e do HealthKit para dentro do login.
import { clearCapabilityReport } from '@/shared/wearable/capabilityCache';
import { useNutritionStore } from '../../nutrition/store/nutritionStore';
import { useStudentStore } from '../../students/store/studentStore';
import { useWorkoutStore } from '../../workout/store/workoutStore';

// A URL absoluta é para o registro de auditoria de `completeAccountInvite`:
// no mobile não existe origem relativa para resolver `/api/auth/accept-invite`.
const authService = createAuthService(supabase, process.env.EXPO_PUBLIC_API_URL ?? '');

export interface AuthState {
  session: Session | null;
  user: User | null;
  accountType: AccountType | null;
  accountStatus: 'active' | 'inactive' | 'invited' | null;
  abilities: AppAbility | null;
  isLoading: boolean;

  initializeSession: (session: Session | null) => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    role: AccountType,
    metadata?: Record<string, unknown>
  ) => Promise<{ success: boolean; error?: string }>;
  completeAccountInvite: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  accountType: null,
  accountStatus: null,
  abilities: null,
  isLoading: true,

  initializeSession: async (session) => {
    const state = get();

    // Prevent multiple initializations for the same user or if already loading
    if (state.isLoading && session && state.session?.user?.id === session.user.id) {
      console.log('⏭️ Already initializing session for this user, skipping...');
      return;
    }

    if (!session?.user || state.user?.id !== session.user.id) {
      // O evento de expiração/troca também precisa descartar formulários sensíveis.
      useNutritionStore.getState().reset();
    }
    set({ isLoading: true });
    try {
      if (!session?.user) {
        set({
          session: null,
          user: null,
          accountType: null,
          accountStatus: null,
          abilities: null,
          isLoading: false,
        });
        return;
      }

      const user = session.user;

      try {
        // Fetch context and define abilities (using JWT version for admin)
        console.log('🔄 Fetching user context for:', user.id);
        const context = await getUserContextJWT(user.id);
        console.log('📊 User context loaded:', context);

        const abilities = defineAbilitiesFor(context);

        // Log admin access
        if (context.accountType === 'admin') {
          console.log('🔐 Admin access granted:', {
            isSuperAdmin: context.isSuperAdmin,
            userId: user.id,
            email: user.email,
          });
        }

        console.log('✅ Setting accountType to:', context.accountType);
        set({
          session,
          user,
          accountType: context.accountType,
          accountStatus: context.accountStatus || 'active',
          abilities,
          isLoading: false,
        });
        console.log('✅ AuthStore updated. Current state:', {
          accountType: context.accountType,
          hasAbilities: !!abilities,
        });
      } catch (error) {
        console.error('Error loading user context:', error);
        // If profile doesn't exist or error, set basic session but no role/abilities
        set({ session, user, accountStatus: null, isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await authService.signOut();
    set({ session: null, user: null, accountType: null, accountStatus: null, abilities: null });

    // CRITICAL: Clear all stores to prevent data leakage between users
    useStudentStore.getState().reset();
    useNutritionStore.getState().reset();
    useWorkoutStore.getState().reset();
    // O próximo Student do aparelho pode usar outro relógio: o relatório de um não
    // pode liberar tela para o outro (Art. 18).
    clearCapabilityReport();
    // Os avisos agendados e o widget eram de quem saiu (#376).
    await resetNotices();
  },

  signIn: async (email, password) => {
    try {
      const { error } = await authService.signIn(email, password);
      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      console.error('SignIn error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao entrar.' };
    }
  },

  signUp: async (email, password, role, metadata = {}) => {
    try {
      return await authService.signUp(email, password, role, metadata);
    } catch (error: unknown) {
      console.error('SignUp error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar conta.',
      };
    }
  },

  completeAccountInvite: async (newPassword) => {
    try {
      return await authService.completeAccountInvite(newPassword);
    } catch (error: unknown) {
      console.error('CompleteAccountInvite error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao definir a senha.',
      };
    }
  },
}));
