import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAssessmentStore } from '../../store/assessmentStore';
import AssessmentScreen from '../AssessmentScreen';

// Mocks
const mockSetStudentId = jest.fn();
jest.mock('../../store/assessmentStore', () => ({
  useAssessmentStore: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'student-123' }),
}));

jest.mock('../PhysicalAssessment', () => {
  const { View } = require('react-native');
  return () => <View testID="mock-PhysicalAssessment" />;
});
jest.mock('../BodyScanIntroduction', () => {
  const { View } = require('react-native');
  return () => <View testID="mock-BodyScanIntroduction" />;
});

describe('AssessmentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAssessmentStore as unknown as jest.Mock).mockReturnValue({
      setStudentId: mockSetStudentId,
    });
  });

  it('should render initially with I.A. Vision tab active', () => {
    render(<AssessmentScreen />);

    expect(screen.getByText('I.A. Vision')).toBeTruthy();
    expect(screen.getByTestId('mock-BodyScanIntroduction')).toBeTruthy();
    expect(screen.queryByTestId('mock-PhysicalAssessment')).toBeNull();
  });

  it('should switch to Physical tab when pressed', () => {
    render(<AssessmentScreen />);

    fireEvent.press(screen.getByRole('tab', { name: 'Avaliação' }));

    expect(screen.getByTestId('mock-PhysicalAssessment')).toBeTruthy();
    expect(screen.queryByTestId('mock-BodyScanIntroduction')).toBeNull();
  });

  it('should call setStudentId on mount if id is present', async () => {
    render(<AssessmentScreen />);
    await waitFor(() => {
      expect(mockSetStudentId).toHaveBeenCalledWith('student-123');
    });
  });
});
