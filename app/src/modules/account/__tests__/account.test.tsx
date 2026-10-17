import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ROUTES } from '@/navigation/types';
import { MenuScreen } from '../screens/MenuScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const mockPush = jest.fn();
let mockAccountType = 'member';
let mockOverview: unknown;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/auth', () => ({
  isPasskeyEnabled: () => false,
  useAuthStore: () => ({
    user: { id: 'u1', email: 'ana@exemplo.com' },
    signOut: jest.fn(),
    accountType: mockAccountType,
  }),
}));
jest.mock('../hooks/useProfileOverview', () => ({
  useProfileOverview: () => ({ data: mockOverview }),
}));

const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('MenuScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOverview = { fullName: 'Ana Souza', accountType: 'member', student: null };
  });

  it('o aluno chega aos Avisos pelo menu', () => {
    mockAccountType = 'member';
    render(<MenuScreen />, { wrapper: wrap });
    fireEvent.press(screen.getByText('Avisos'));
    expect(mockPush).toHaveBeenCalledWith('/settings/notices');
  });

  it('o especialista não tem Avisos do dia', () => {
    mockAccountType = 'specialist';
    render(<MenuScreen />, { wrapper: wrap });
    expect(screen.queryByText('Avisos')).toBeNull();
  });
});

describe('ProfileScreen (09)', () => {
  it('o aluno vê os números, o plano e quem acompanha', () => {
    mockOverview = {
      fullName: 'Ana Souza',
      accountType: 'student',
      student: {
        workoutsDone: 24,
        achievements: 3,
        currentStreakDays: 5,
        longestStreakDays: 12,
        planName: null,
        specialistName: 'Carla',
      },
    };
    render(<ProfileScreen />, { wrapper: wrap });

    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getByText('Meu especialista')).toBeTruthy();
    fireEvent.press(screen.getByText('Privacidade e dados'));
    expect(mockPush).toHaveBeenCalledWith(ROUTES.HEALTH.AUTHORIZATIONS);
  });
});
