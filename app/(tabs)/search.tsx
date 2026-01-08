import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '@/lib/store/playerStore';
import api from '@/lib/api/client';
import { theme } from '@/constants/theme';
import type { Track } from '@/types';

export default function SearchScreen() {
  const { playTrack, currentTrack, isPlaying } = usePlayerStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);

    if (text.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // No search API exists - use discovery and filter client-side
      const response = await api.get('/discovery/');
      const allTracks = response.data.tracks || response.data || [];
      const searchTerm = text.trim().toLowerCase();

      // Filter tracks by title or artist name
      const filtered = allTracks.filter((track: Track) =>
        track.title?.toLowerCase().includes(searchTerm) ||
        track.artist_name?.toLowerCase().includes(searchTerm)
      );

      setResults(filtered);
    } catch (error: any) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTrackPress = async (track: Track) => {
    Keyboard.dismiss();
    await playTrack(track);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTrack = ({ item }: { item: Track }) => {
    const isActive = currentTrack?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.trackItem, isActive && styles.trackItemActive]}
        onPress={() => handleTrackPress(item)}
      >
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={styles.trackCover} />
        ) : (
          <View style={[styles.trackCover, styles.trackCoverPlaceholder]}>
            <Ionicons name="musical-note" size={20} color={theme.colors.textMuted} />
          </View>
        )}

        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, isActive && styles.trackTitleActive]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist_name} - {formatDuration(item.duration_seconds)}
          </Text>
        </View>

        {isActive && isPlaying ? (
          <View style={styles.playingIndicator}>
            <Ionicons name="volume-high" size={20} color={theme.colors.accent} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => handleTrackPress(item)}
          >
            <Ionicons name="play" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Search</Text>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Songs, artists..."
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : hasSearched ? (
        <FlatList
          data={results}
          renderItem={renderTrack}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.results}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyResults}>
              <Ionicons name="search-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="musical-notes-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.placeholderText}>Search for music</Text>
          <Text style={styles.placeholderSubtext}>Find songs and artists on Palletium</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  loader: {
    marginTop: theme.spacing.xxl,
  },
  results: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  trackItemActive: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: -theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderBottomWidth: 0,
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  trackCoverPlaceholder: {
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  trackTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  trackTitleActive: {
    color: theme.colors.accent,
  },
  trackArtist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingIndicator: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyResults: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  placeholderText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  placeholderSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});
