module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // `expo/fetch` delega ao `global.fetch`, que e o que as suites mockam.
    '^expo/fetch$': '<rootDir>/__mocks__/expo-fetch.ts',
    // O Lucide publica o ESM em `.mjs`, que o babel-jest não transforma: sob o Jest
    // vale o build CommonJS do próprio pacote, ícone por ícone como o app importa.
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
    '^@/nutrition$': '<rootDir>/src/modules/nutrition',
    '^@/workout$': '<rootDir>/src/modules/workout',
    '^@/students$': '<rootDir>/src/modules/students',
    '^@/auth$': '<rootDir>/src/modules/auth',
    '^@/technique$': '<rootDir>/src/modules/technique',
    '^@/assessment$': '<rootDir>/src/modules/assessment',
    '^@elevapro/core(.*)$': '<rootDir>/src/packages/core$1',
    '^@elevapro/supabase(.*)$': '<rootDir>/src/packages/supabase$1',
    '^@elevapro/shared(.*)$': '<rootDir>/../shared/src$1',
    // `shared/` não tem node_modules próprio; sem isto o import de runtime de
    // `abilities.ts` não resolve a partir de lá.
    '^@casl/ability$': '<rootDir>/node_modules/@casl/ability',
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
  // Degrau, não a meta. O número que entra é o que já se sustenta hoje — um
  // threshold que falha no dia em que entra não é guarda, é bloqueio. Sobe a
  // cada PR que traz teste (alvo do PRD: 30%).
  //
  // 9 → 19 na #281: os testes de contrato das primitivas do design system e
  // dos dois seams de token levaram a cobertura real a 20,12%. O degrau fica
  // um ponto abaixo do medido, para não falhar por variação de arredondamento
  // em arquivo que ninguém tocou.
  //
  // Antes não havia limite nenhum: a cobertura era coletada, publicada como
  // artefato do CI e ignorada. Dava para zerar a suíte sem quebrar o build.
  coverageThreshold: {
    global: {
      statements: 19,
      lines: 18,
    },
  },
};
