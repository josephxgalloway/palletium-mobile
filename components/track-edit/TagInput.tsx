import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => boolean;
  onRemoveTag: (tag: string) => void;
  error?: string;
  maxTags?: number;
  maxLength?: number;
}

export function TagInput({
  tags,
  onAddTag,
  onRemoveTag,
  error,
  maxTags = 10,
  maxLength = 30,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    if (!inputValue.trim()) return;

    const success = onAddTag(inputValue);
    if (success) {
      setInputValue('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleRemoveTag = (tag: string) => {
    onRemoveTag(tag);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Tags</Text>
        <Text style={styles.counter}>{tags.length}/{maxTags}</Text>
      </View>

      {/* Tag chips */}
      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsScroll}
          contentContainerStyle={styles.tagsContainer}
        >
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveTag(tag)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={14} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Add a tag..."
          placeholderTextColor={theme.colors.textMuted}
          maxLength={maxLength}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
          editable={tags.length < maxTags}
        />
        <TouchableOpacity
          style={[
            styles.addButton,
            (!inputValue.trim() || tags.length >= maxTags) && styles.addButtonDisabled,
          ]}
          onPress={handleAddTag}
          disabled={!inputValue.trim() || tags.length >= maxTags}
        >
          <Ionicons
            name="add"
            size={20}
            color={inputValue.trim() && tags.length < maxTags
              ? theme.colors.textPrimary
              : theme.colors.textMuted
            }
          />
        </TouchableOpacity>
      </View>

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
  tagsScroll: {
    marginBottom: theme.spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  tagText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: theme.fontSize.md,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: theme.colors.surfaceElevated,
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

export default TagInput;
