export { PasskeySettings } from "./components/PasskeySettings";
export { useAuth } from "./hooks/useAuth";
export type { AccountRole, RegisteredPasskey, TotpChallenge } from "./services";
export {
  beginTotpChallenge,
  hasCurrentMfaAssurance,
  hasCurrentPrivilegedProof,
  hasLegacyTotpFactor,
  isPasskeyEnabled,
  listPasskeys,
  MfaSetupUnavailableError,
  registerAccount,
  registerPasskey,
  removePasskey,
  renamePasskey,
  signInWithPasskey,
  verifyTotp,
} from "./services";
export type { AuthState } from "./store/authStore";
export { useAuthStore } from "./store/authStore";
