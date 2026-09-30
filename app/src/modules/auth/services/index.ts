export type { TotpChallenge } from './mfa.service';
export { beginTotpChallenge, hasCurrentMfaAssurance, verifyTotp } from './mfa.service';
export type { RegisteredPasskey } from './passkey.service';
export {
  hasCurrentPrivilegedProof,
  hasLegacyTotpFactor,
  isPasskeyEnabled,
  listPasskeys,
  registerPasskey,
  removePasskey,
  renamePasskey,
  signInWithPasskey,
} from './passkey.service';
