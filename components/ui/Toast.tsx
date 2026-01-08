import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { theme } from '@/constants/theme';

export const toastConfig: ToastConfig = {
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
};

export { Toast };
