// Auth Module - Public API
// This module handles authentication and user session management

// Routes
export * from './routes';
// Types (re-export from store for now)
export type { AuthState } from './store/authStore';

// Store
export { useAuthStore } from './store/authStore';
export { tokenDaSessao } from './tokenDaSessao';
