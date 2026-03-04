import { theme } from '@/constants/theme';
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
