import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View, TextInputProps } from 'react-native';

interface EditableFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
  error?: string;
  locked?: boolean;
  lockedReason?: string;
  multiline?: boolean;
  numberOfLines?: number;
  showCounter?: boolean;
}

export function EditableField({
  label,
  value,
  onChangeText,
  maxLength,
  error,
  locked = false,
  lockedReason,
  multiline = false,
  numberOfLines = 1,
  showCounter = true,
  ...textInputProps
}: EditableFieldProps) {
  const currentLength = value?.length || 0;
  const isNearLimit = maxLength && currentLength > maxLength * 0.8;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {locked && (
          <View style={styles.lockIndicator}>
            <Ionicons name="lock-closed" size={12} color={theme.colors.textMuted} />
            {lockedReason && (
              <Text style={styles.lockText}>{lockedReason}</Text>
            )}
          </View>
        )}
        {showCounter && maxLength && !locked && (
          <Text style={[
            styles.counter,
            isNearLimit ? styles.counterWarning : undefined,
            currentLength > maxLength ? styles.counterError : undefined
          ]}>
            {currentLength}/{maxLength}
          </Text>
        )}
      </View>

      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          multiline && { height: numberOfLines * 24 + 32 },
          error && styles.inputError,
          locked && styles.inputLocked,
        ]}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        editable={!locked}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={theme.colors.textMuted}
        {...textInputProps}
      />

      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  counter: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  counterWarning: {
    color: theme.colors.warning,
  },
  counterError: {
    color: theme.colors.error,
  },
  lockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: theme.fontSize.md,
  },
  inputMultiline: {
    paddingTop: theme.spacing.md,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  inputLocked: {
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.textMuted,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
  },
});

export default EditableField;
