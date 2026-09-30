const base = require('./app.json').expo;

module.exports = () => {
  const profile = process.env.EAS_BUILD_PROFILE || process.env.EXPO_PUBLIC_APP_ENV;
  const rpId =
    process.env.EXPO_PUBLIC_PASSKEY_RP_ID ||
    (profile === 'preview' ? 'elevapro-preview.vercel.app' : undefined);

  return {
    ...base,
    ios: {
      ...base.ios,
      ...(rpId ? { associatedDomains: [`webcredentials:${rpId}`] } : {}),
    },
  };
};
