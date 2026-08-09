module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/nutrition$': '<rootDir>/src/modules/nutrition',
    '^@/workout$': '<rootDir>/src/modules/workout',
    '^@/students$': '<rootDir>/src/modules/students',
    '^@/auth$': '<rootDir>/src/modules/auth',
    '^@/assessment$': '<rootDir>/src/modules/assessment',
    '^@elevapro/core(.*)$': '<rootDir>/src/packages/core$1',
    '^@elevapro/supabase(.*)$': '<rootDir>/src/packages/supabase$1',
    '^@elevapro/shared(.*)$': '<rootDir>/../shared/src$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Permite que arquivos em shared/ resolvam node_modules de app/
  modulePaths: ['<rootDir>/node_modules'],
  // Limita paralelismo para evitar flakiness em testes com timers/async
  maxWorkers: 2,
  // Base recomendada em https://docs.expo.dev/develop/unit-testing/, mais
  // react-native-reanimated, que precisa de transform mesmo sendo mockado.
  // O padrao anterior tinha apenas `@exponent/.*` e deixava o escopo `@expo/`
  // de fora.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated)',
  ],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/__tests__/**'],
};
