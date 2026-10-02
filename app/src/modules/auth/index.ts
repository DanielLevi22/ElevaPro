// Auth Module - Public API
// This module handles authentication and user session management

// Routes
export * from './routes';
export { MfaScreen } from './screens/MfaScreen';
export { PasskeySettingsScreen } from './screens/PasskeySettingsScreen';
export type { RegisteredPasskey, TotpChallenge } from './services';
export {
  beginTotpChallenge,
  confirmLocalMfa,
  hasCurrentMfaAssurance,
  hasCurrentPrivilegedProof,
  hasLegacyTotpFactor,
  isPasskeyEnabled,
  listPasskeys,
  registerPasskey,
  removePasskey,
  renamePasskey,
  signInWithPasskey,
  verifyTotp,
} from './services';
// Types (re-export from store for now)
export type { AuthState } from './store/authStore';
// Store
export { useAuthStore } from './store/authStore';
export { tokenDaSessao } from './tokenDaSessao';
