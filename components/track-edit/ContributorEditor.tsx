import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Contributor } from '@/lib/types/tracks';
import { CONTRIBUTOR_ROLES } from '@/lib/types/tracks';

interface ContributorEditorProps {
  contributors: Contributor[];
  onAdd: () => void;
  onUpdate: (index: number, data: Partial<Contributor>) => void;
  onRemove: (index: number) => void;
  error?: string;
}

export function ContributorEditor({
  contributors,
  onAdd,
  onUpdate,
  onRemove,
  error,
}: ContributorEditorProps) {
  const [rolePickerIndex, setRolePickerIndex] = useState<number | null>(null);

  const totalSplit = contributors.reduce((sum, c) => sum + (c.split_percentage || 0), 0);
  const isValidTotal = Math.abs(totalSplit - 100) <= 0.01;

  const handleRemove = (index: number) => {
    Alert.alert(
      'Remove Contributor',
      'Are you sure you want to remove this contributor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onRemove(index);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  };

  const handleSelectRole = (role: Contributor['role']) => {
    if (rolePickerIndex !== null) {
      onUpdate(rolePickerIndex, { role });
      setRolePickerIndex(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSplitChange = (index: number, text: string) => {
    const value = parseFloat(text) || 0;
    const clampedValue = Math.min(100, Math.max(0, value));
    onUpdate(index, { split_percentage: clampedValue });
  };

  const getRoleLabel = (role: Contributor['role']) => {
    return CONTRIBUTOR_ROLES.find(r => r.value === role)?.label || role;
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Contributors</Text>
        <TouchableOpacity onPress={onAdd} style={styles.addButton}>
          <Ionicons name="add" size={16} color={theme.colors.primary} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {contributors.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>No contributors added</Text>
          <Text style={styles.emptySubtext}>Add contributors to specify royalty splits</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {contributors.map((contributor, index) => (
            <View key={index} style={styles.contributorCard}>
              {/* Name input */}
              <View style={styles.nameRow}>
                <TextInput
                  style={styles.nameInput}
                  value={contributor.name}
                  onChangeText={(text) => onUpdate(index, { name: text })}
                  placeholder="Contributor name"
                  placeholderTextColor={theme.colors.textMuted}
                  maxLength={100}
                />
                <TouchableOpacity
                  onPress={() => handleRemove(index)}
                  style={styles.removeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>

              {/* Role and Split row */}
              <View style={styles.detailsRow}>
                <TouchableOpacity
                  style={styles.rolePicker}
                  onPress={() => setRolePickerIndex(index)}
                >
                  <Text style={styles.roleText}>{getRoleLabel(contributor.role)}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.splitInput}>
                  <TextInput
                    style={styles.splitTextInput}
                    value={contributor.split_percentage?.toString() || '0'}
                    onChangeText={(text) => handleSplitChange(index, text)}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={styles.splitPercent}>%</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Total display */}
      {contributors.length > 0 && (
        <View style={[styles.totalRow, !isValidTotal && styles.totalRowError]}>
          <Text style={styles.totalLabel}>Total Split</Text>
          <View style={styles.totalValue}>
            <Text style={[
              styles.totalText,
              isValidTotal ? styles.totalValid : styles.totalInvalid
            ]}>
              {totalSplit.toFixed(1)}%
            </Text>
            {isValidTotal ? (
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
            ) : (
              <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
            )}
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Role Picker Modal */}
      <Modal
        visible={rolePickerIndex !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setRolePickerIndex(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRolePickerIndex(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Role</Text>
            <FlatList
              data={CONTRIBUTOR_ROLES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    rolePickerIndex !== null &&
                      contributors[rolePickerIndex]?.role === item.value &&
                      styles.roleOptionSelected
                  ]}
                  onPress={() => handleSelectRole(item.value)}
                >
                  <Text style={[
                    styles.roleOptionText,
                    rolePickerIndex !== null &&
                      contributors[rolePickerIndex]?.role === item.value &&
                      styles.roleOptionTextSelected
                  ]}>
                    {item.label}
                  </Text>
                  {rolePickerIndex !== null &&
                    contributors[rolePickerIndex]?.role === item.value && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  addButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  list: {
    gap: theme.spacing.sm,
  },
  contributorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  nameInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  rolePicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  roleText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  splitInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingRight: theme.spacing.sm,
  },
  splitTextInput: {
    width: 50,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    textAlign: 'right',
  },
  splitPercent: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  totalRowError: {
    borderColor: theme.colors.error,
  },
  totalLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  totalValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  totalText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  totalValid: {
    color: theme.colors.success,
  },
  totalInvalid: {
    color: theme.colors.error,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  roleOptionSelected: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  roleOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  roleOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default ContributorEditor;
