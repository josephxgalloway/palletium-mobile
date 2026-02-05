import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { theme } from '@/constants/theme';

export const toastConfig: ToastConfig = {
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: theme.colors.primary,
        backgroundColor: theme.colors.surfaceElevated,
        borderLeftWidth: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
      }}
      text2Style={{
        fontSize: 13,
        color: theme.colors.textSecondary,
      }}
    />
  ),
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: theme.colors.success,
        backgroundColor: theme.colors.surfaceElevated,
        borderLeftWidth: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
      }}
      text2Style={{
        fontSize: 13,
        color: theme.colors.textSecondary,
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: theme.colors.error,
        backgroundColor: theme.colors.surfaceElevated,
        borderLeftWidth: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
      }}
      text2Style={{
        fontSize: 13,
        color: theme.colors.textSecondary,
      }}
    />
  ),
  payment: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: theme.colors.accent,
        backgroundColor: theme.colors.surfaceElevated,
        borderLeftWidth: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.accent,
      }}
      text2Style={{
        fontSize: 13,
        color: theme.colors.textSecondary,
      }}
    />
  ),
  offline: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: theme.colors.warning,
        backgroundColor: theme.colors.surfaceElevated,
        borderLeftWidth: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.warning,
      }}
      text2Style={{
        fontSize: 13,
        color: theme.colors.textSecondary,
      }}
    />
  ),
  discovery: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#A855F7', // Purple for discovery
        backgroundColor: '#2D1B4E', // Dark purple background
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: '#A855F7',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '700',
        color: '#E9D5FF', // Light purple
      }}
      text2Style={{
        fontSize: 13,
        color: '#C4B5FD',
      }}
    />
  ),
  artistPlay: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#10B981', // Emerald for artist income
        backgroundColor: '#1A2E28', // Dark emerald background
        borderLeftWidth: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: '#6EE7B7', // Light emerald
      }}
      text2Style={{
        fontSize: 13,
        color: '#A7F3D0',
      }}
    />
  ),
};

export { Toast };
