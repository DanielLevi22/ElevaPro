// @ts-expect-error
global.__DEV__ = true;

// Mock react-native-url-polyfill globally to prevent "URL is not defined" errors
jest.mock('react-native-url-polyfill/auto', () => ({}));

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';
process.env.EXPO_OS = 'ios';

jest.mock(
  'react-native',
  () => {
    const RN = jest.requireActual('react-native');
    RN.Appearance.getColorScheme = jest.fn(() => 'light');
    return RN;
  },
  { virtual: true }
);

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
}));

// Safe area context is mocked at the end of the file

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  AndroidImportance: {
    HIGH: 'high',
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    WEEKLY: 'weekly',
    CALENDAR: 'calendar',
    DAILY: 'daily',
  },
}));

// Mock Supabase to prevent actual network calls during unit tests
export const mockSupabaseBuilder = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockReturnThis(),
  // biome-ignore lint/suspicious/noThenProperty: Mocking a promise builder
  then: jest.fn((resolve) => resolve({ data: null, error: null })),
};

export const mockSupabase = {
  from: jest.fn(() => mockSupabaseBuilder),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest
      .fn()
      .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  }),
  removeChannel: jest.fn().mockResolvedValue({}),
};

jest.mock('@elevapro/supabase', () => ({
  supabase: mockSupabase,
  setSupabaseStorage: jest.fn(),
  getUserContextJWT: jest.fn(),
  defineAbilitiesFor: jest.fn(() => true),
}));

// @ts-expect-error
global.mockSupabase = mockSupabase;
// @ts-expect-error
global.mockSupabaseBuilder = mockSupabaseBuilder;

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clearAll: jest.fn(),
  })),
}));

// Mock Reanimated — using manual mock to avoid worklets native init issues
jest.mock('react-native-reanimated');

// Mock NitroModules
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    getNativeModule: jest.fn(() => ({})),
    registerNativeModule: jest.fn(),
  },
}));
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock react-native-safe-area-context properly for NativeWind
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn(({ children }) => children),
    SafeAreaView: jest.fn(({ children }) => children),
    useSafeAreaInsets: jest.fn(() => inset),
    useSafeAreaFrame: jest.fn(() => ({ x: 0, y: 0, width: 390, height: 844 })),
  };
});
