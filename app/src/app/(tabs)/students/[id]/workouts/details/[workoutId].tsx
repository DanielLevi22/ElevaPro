import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { ExecuteWorkoutScreen, WorkoutDetailsScreen } from '@/workout';

export default function WorkoutDetailsRoute() {
  const { accountType, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#09090B',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  // If user is a personal/professional, show the Details/Edit screen
  // If user is a student, show the Execute/Start screen
  const isProfessional =
    (accountType as string) === 'personal' || (accountType as string) === 'specialist';

  if (isProfessional) {
    return <WorkoutDetailsScreen />;
  }

  return <ExecuteWorkoutScreen />;
}
