import { RoleGate } from '@/components/RoleGate';
import { theme } from '@/constants/theme';
import { useTrackEditStore } from '@/lib/store/trackEditStore';
import { useAuthStore } from '@/lib/store/authStore';
import {
  EditableField,
  TagInput,
  ContributorEditor,
  GenrePicker,
  MetadataHistoryModal,
} from '@/components/track-edit';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

// Gate: artist-only — no hooks fire before RoleGate resolves
export default function TrackEditPage() {
  return (
    <RoleGate allow={['artist']}>
      <TrackEditScreen />
    </RoleGate>
  );
}

function TrackEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const {
    track,
    isDirty,
    isSaving,
    isLoading,
    errors,
    remainingEdits,
    history,
    isLoadingHistory,
    loadTrack,
    updateField,
    addContributor,
    updateContributor,
    removeContributor,
    addTag,
    removeTag,
    save,
    loadHistory,
    reset,
    discardChanges,
  } = useTrackEditStore();

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Load track on mount
  useEffect(() => {
    if (id) {
      loadTrack(id).catch((error) => {
        console.error('Failed to load track:', error);
      });
    }

    return () => {
      reset();
    };
  }, [id]);

  // Handle unsaved changes on back navigation
  const handleBack = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              discardChanges();
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  }, [isDirty, discardChanges]);

  // Handle save
  const handleSave = async () => {
    const success = await save();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: 'Changes Saved',
        text2: 'Track metadata has been updated',
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = errors.save || 'Failed to save changes';
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: errorMessage,
      });
    }
  };

  // Handle history modal
  const handleOpenHistory = () => {
    setShowHistoryModal(true);
    loadHistory();
  };

  // Format release date for display
  const formatReleaseDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading track...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (errors.load || !track) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Track</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Track</Text>
          <Text style={styles.errorSubtitle}>{errors.load || 'Track not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => id && loadTrack(id)}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const coverUrl = track.artwork_url || track.cover_art_url;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Track</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, !isDirty && styles.saveButtonDisabled]}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Text style={[styles.saveButtonText, !isDirty && styles.saveButtonTextDisabled]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Track Preview */}
          <View style={styles.trackPreview}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.artwork} />
            ) : (
              <View style={[styles.artwork, styles.artworkPlaceholder]}>
                <Ionicons name="musical-note" size={24} color={theme.colors.textMuted} />
              </View>
            )}
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {track.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {track.artist_name}
              </Text>
            </View>
          </View>

          {/* Rate Limit Indicator */}
          {remainingEdits >= 0 && (
            <View style={[
              styles.rateLimitBanner,
              remainingEdits === 0 && styles.rateLimitBannerWarning
            ]}>
              <Ionicons
                name={remainingEdits === 0 ? 'alert-circle' : 'information-circle'}
                size={16}
                color={remainingEdits === 0 ? theme.colors.error : theme.colors.textSecondary}
              />
              <Text style={[
                styles.rateLimitText,
                remainingEdits === 0 && styles.rateLimitTextWarning
              ]}>
                {remainingEdits === 0
                  ? 'Edit limit reached. Try again tomorrow.'
                  : `${remainingEdits} edit${remainingEdits !== 1 ? 's' : ''} remaining today`
                }
              </Text>
            </View>
          )}

          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BASIC INFO</Text>

            <EditableField
              label="Title"
              value={track.title}
              onChangeText={(text) => updateField('title', text)}
              maxLength={100}
              error={errors.title}
              placeholder="Track title"
            />

            <EditableField
              label="Description"
              value={track.description || ''}
              onChangeText={(text) => updateField('description', text)}
              maxLength={500}
              error={errors.description}
              placeholder="Describe your track..."
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Classification Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CLASSIFICATION</Text>

            <GenrePicker
              type="genre"
              value={track.genre}
              onSelect={(genre) => updateField('genre', genre)}
              error={errors.genre}
            />

            <GenrePicker
              type="mood"
              value={track.mood}
              onSelect={(mood) => updateField('mood', mood)}
              error={errors.mood}
            />

            <TagInput
              tags={track.tags}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              error={errors.tags}
            />
          </View>

          {/* Credits Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CREDITS</Text>

            <EditableField
              label="Artist Name"
              value={track.artist_name}
              onChangeText={() => {}}
              locked
              lockedReason="Set in account settings"
            />

            <ContributorEditor
              contributors={track.contributors}
              onAdd={addContributor}
              onUpdate={updateContributor}
              onRemove={removeContributor}
              error={errors.contributors}
            />
          </View>

          {/* Identifiers Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>IDENTIFIERS</Text>

            <EditableField
              label="ISRC"
              value={track.isrc || ''}
              onChangeText={() => {}}
              locked
              lockedReason="Auto-generated"
              placeholder="Not generated"
            />

            <EditableField
              label="Release Date"
              value={formatReleaseDate(track.release_date)}
              onChangeText={() => {}}
              locked
              lockedReason="Set during upload"
            />
          </View>

          {/* History Button */}
          <TouchableOpacity style={styles.historyButton} onPress={handleOpenHistory}>
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.historyButtonText}>View Edit History</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Error display */}
          {errors.save && (
            <View style={styles.saveError}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
              <Text style={styles.saveErrorText}>{errors.save}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* History Modal */}
      <MetadataHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={history}
        isLoading={isLoadingHistory}
        onRefresh={loadHistory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  saveButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: theme.colors.background,
  },
  saveButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  // Loading/Error states
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  errorSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  retryText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  // Track preview
  trackPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.sm,
  },
  artworkPlaceholder: {
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  trackArtist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  // Rate limit banner
  rateLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  rateLimitBannerWarning: {
    backgroundColor: theme.colors.error + '20',
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
  },
  rateLimitText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  rateLimitTextWarning: {
    color: theme.colors.error,
  },
  // Sections
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    letterSpacing: 1,
  },
  // History button
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  historyButtonText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
  },
  // Save error
  saveError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  saveErrorText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
  },
});
