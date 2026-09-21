import { createAuthService } from "@elevapro/shared";
import {
  type AccountType,
  type AppAbility,
  defineAbilitiesFor,
  getUserContextJWT,
  supabase,
} from "@elevapro/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

const authService = createAuthService(supabase);

export interface AuthState {
  session: Session | null;
  user: User | null;
  accountType: AccountType | null;
  accountStatus: "active" | "inactive" | "invited" | null;
  abilities: AppAbility | null;
  services: string[];
  isLoading: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateSession: (session: Session | null) => Promise<void>;
  completeAccountInvite: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  accountType: null,
  accountStatus: null,
  abilities: null,
  services: [],
  isLoading: true,

  initialize: async () => {
    try {
      const {
        data: { session },
      } = await authService.getSession();
      await get().updateSession(session);
    } catch (error) {
      console.error("Error initializing auth:", error);
      set({ isLoading: false });
    }
  },

  updateSession: async (session) => {
    const state = get();

    // Prevent duplicate initialization for the same logged-in user
    if (
      state.isLoading &&
      state.session?.user?.id &&
      state.session?.user?.id === session?.user?.id
    ) {
      console.log("⏭️ Already initializing session for this user, skipping...");
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
          services: [],
          isLoading: false,
        });
        return;
      }

      const user = session.user;

      try {
        const context = await getUserContextJWT(user.id, session);
        const abilities = defineAbilitiesFor(context);
        const services = context.services || [];

        set({
          session,
          user,
          accountType: context.accountType,
          accountStatus: context.accountStatus || "active",
          abilities,
          services,
          isLoading: false,
        });
      } catch (error) {
        // Profile not found in DB — user exists in Auth but has no profile row.
        // Sign out to prevent a broken session state.
        console.error("Failed to load user profile, signing out:", error);
        await supabase.auth.signOut();
        set({
          session: null,
          user: null,
          accountType: null,
          accountStatus: null,
          abilities: null,
          services: [],
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Error updating session:", error);
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    try {
      return await authService.signInWithStatusCheck(email, password);
    } catch (error: unknown) {
      console.error("SignIn error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao fazer login",
      };
    }
  },

  completeAccountInvite: async (newPassword) => {
    try {
      return await authService.completeAccountInvite(newPassword);
    } catch (error: unknown) {
      console.error("CompleteAccountInvite error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao definir a senha",
      };
    }
  },

  signOut: async () => {
    await authService.signOut();
    set({
      session: null,
      user: null,
      accountType: null,
      accountStatus: null,
      abilities: null,
      services: [],
    });
  },
}));
