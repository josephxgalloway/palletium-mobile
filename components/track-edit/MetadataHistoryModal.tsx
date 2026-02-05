import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { MetadataHistoryEntry } from '@/lib/types/tracks';

interface MetadataHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  history: MetadataHistoryEntry[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function MetadataHistoryModal({
  visible,
  onClose,
  history,
  isLoading,
  onRefresh,
}: MetadataHistoryModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFieldName = (field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (Array.isArray(value)) {
      if (value.length === 0) return '(empty)';
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const renderHistoryItem = ({ item }: { item: MetadataHistoryEntry }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.fieldName}>{formatFieldName(item.field_name)}</Text>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
      </View>

      <View style={styles.changeRow}>
        <View style={styles.changeBox}>
          <Text style={styles.changeLabel}>From</Text>
          <Text style={styles.oldValue} numberOfLines={2}>
            {formatValue(item.old_value)}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={theme.colors.textMuted} />
        <View style={styles.changeBox}>
          <Text style={styles.changeLabel}>To</Text>
          <Text style={styles.newValue} numberOfLines={2}>
            {formatValue(item.new_value)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Edit History</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Edit History</Text>
            <Text style={styles.emptySubtitle}>
              Changes to this track's metadata will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  refreshButton: {
    padding: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  separator: {
    height: theme.spacing.sm,
  },
  historyItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  fieldName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  date: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  changeBox: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
  },
  changeLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  oldValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  newValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
  },
});

export default MetadataHistoryModal;
