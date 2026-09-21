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

  // Masquerade Mode
  originalUser: User | null;
  originalAccountType: AccountType | null;
  originalAccountStatus: 'active' | 'inactive' | 'invited' | null;
  originalAbilities: AppAbility | null;
  isMasquerading: boolean;
  enterStudentView: (student: { id: string; email: string; full_name: string }) => Promise<void>;
  exitStudentView: () => Promise<void>;

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
  originalUser: null,
  originalAccountType: null,
  originalAccountStatus: null,
  originalAbilities: null,
  isMasquerading: false,

  enterStudentView: async (student) => {
    const state = get();
    if (state.isMasquerading) return;

    console.log('🎭 Entering Student View as:', student.full_name);

    try {
      // Fetch the actual context for this student to ensure we have correct permissions
      // This is critical for autonomous students who rely on feature flags
      const context = await getUserContextJWT(student.id);
      console.log('🎭 Student context loaded:', context);

      // CRITICAL: Reset domain stores to ensure clean state for the student
      // This forces the UI to re-fetch data for the student ID

      useNutritionStore.getState().reset();
      useWorkoutStore.getState().reset();
      console.log('🧹 Domain stores reset for student view');

      set({
        originalUser: state.user,
        originalAccountType: state.accountType,
        originalAccountStatus: state.accountStatus, // Save original status
        originalAbilities: state.abilities, // Save original abilities
        isMasquerading: true,
        user: {
          ...state.user,
          id: student.id,
          email: student.email,
          user_metadata: { ...state.user?.user_metadata, full_name: student.full_name },
        } as User,
        accountType: context.accountType,
        accountStatus: context.accountStatus,
        abilities: defineAbilitiesFor(context),
      });
    } catch (error) {
      console.error('❌ Error entering student view:', error);
      // Fallback to basic student view if context fetch fails, but log error
      set({
        originalUser: state.user,
        originalAccountType: state.accountType,
        originalAccountStatus: state.accountStatus,
        originalAbilities: state.abilities,
        isMasquerading: true,
        user: {
          ...state.user,
          id: student.id,
          email: student.email,
          user_metadata: { ...state.user?.user_metadata, full_name: student.full_name },
        } as User,
        accountType: 'student',
        abilities: defineAbilitiesFor({
          accountType: 'student',
          accountStatus: 'active',
        }),
      });
    }
  },

  exitStudentView: async () => {
    const state = get();
    if (!state.isMasquerading || !state.originalUser) return;

    console.log('🎭 Exiting Student View');

    // 1. Reset domain stores to clear student data

    useNutritionStore.getState().reset();
    useWorkoutStore.getState().reset();
    console.log('🧹 Domain stores reset for exit student view');

    // 2. Instant/Optimistic Restore
    const restoredAccountStatus = state.originalAccountStatus || state.accountStatus || 'active';

    // Fallback: If originalAbilities wasn't saved (legacy state), reconstruct it.
    // Ideally originalAbilities is present.
    const restoredAbilities =
      state.originalAbilities ||
      defineAbilitiesFor({
        accountType: state.originalAccountType as AccountType,
        accountStatus: restoredAccountStatus,
      });

    set({
      user: state.originalUser,
      accountType: state.originalAccountType,
      accountStatus: restoredAccountStatus,
      abilities: restoredAbilities,
      originalUser: null,
      originalAccountType: null,
      originalAccountStatus: null,
      originalAbilities: null,
      isMasquerading: false,
    });

    console.log('✅ Instant restore completed. Skipping re-init to avoid flicker.');

    // 3. OPTIONAL: We intentionally DO NOT call initializeSession here.
    // Calling it causes a 2s delay where loading content might flash or permission checks might run against empty state.
    // We trust the original state we just restored.
  },

  initializeSession: async (session) => {
    const state = get();

    // Create a stable check for masquerading to prevent overwrites
    if (state.isMasquerading) {
      console.log('🎭 Skipping session init during masquerade');
      return;
    }

    // Prevent multiple initializations for the same user or if already loading
    if (state.isLoading && session && state.session?.user?.id === session.user.id) {
      console.log('⏭️ Already initializing session for this user, skipping...');
      return;
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
