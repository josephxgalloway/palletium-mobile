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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '@/lib/store/playerStore';
import { unifiedSearch, type SearchArtist, type SearchPlaylist, type UnifiedSearchResults } from '@/lib/api/search';
import { theme } from '@/constants/theme';
import type { Track } from '@/types';
import { getArtistName, getCoverUrl, getDuration } from '@/types';

type SearchRow =
  | { kind: 'header'; key: string; title: string; count: number }
  | { kind: 'track'; key: string; track: Track }
  | { kind: 'artist'; key: string; artist: SearchArtist }
  | { kind: 'playlist'; key: string; playlist: SearchPlaylist };

function buildRows(results: UnifiedSearchResults | null): SearchRow[] {
  if (!results) return [];

  const rows: SearchRow[] = [];

  if (results.results.tracks.length > 0) {
    rows.push({
      kind: 'header',
      key: 'header-tracks',
      title: 'Tracks',
      count: results.results.tracks.length,
    });
    rows.push(
      ...results.results.tracks.map((track) => ({
        kind: 'track' as const,
        key: `track-${track.id}`,
        track,
      }))
    );
  }

  if (results.results.artists.length > 0) {
    rows.push({
      kind: 'header',
      key: 'header-artists',
      title: 'Artists',
      count: results.results.artists.length,
    });
    rows.push(
      ...results.results.artists.map((artist) => ({
        kind: 'artist' as const,
        key: `artist-${artist.id}`,
        artist,
      }))
    );
  }

  if (results.results.playlists.length > 0) {
    rows.push({
      kind: 'header',
      key: 'header-playlists',
      title: 'Playlists',
      count: results.results.playlists.length,
    });
    rows.push(
      ...results.results.playlists.map((playlist) => ({
        kind: 'playlist' as const,
        key: `playlist-${playlist.id}`,
        playlist,
      }))
    );
  }

  return rows;
}

export default function SearchScreen() {
  const { playTrack, currentTrack, isPlaying } = usePlayerStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);

    if (text.trim().length < 2) {
      setResults(null);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const searchResults = await unifiedSearch(text, { type: 'all', limit: 20 });
      setResults(searchResults);
    } catch (error: any) {
      console.error('Search failed:', error);
      setResults(null);
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
    setResults(null);
    setHasSearched(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderRow = ({ item }: { item: SearchRow }) => {
    if (item.kind === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          <Text style={styles.sectionCount}>{item.count}</Text>
        </View>
      );
    }

    if (item.kind === 'track') {
      const track = item.track;
      const isActive = currentTrack?.id === track.id;
      const coverUrl = getCoverUrl(track);
      const artistName = getArtistName(track);
      const duration = getDuration(track);

      return (
        <TouchableOpacity
          style={[styles.resultItem, isActive && styles.resultItemActive]}
          onPress={() => handleTrackPress(track)}
        >
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.resultCover} />
          ) : (
            <View style={[styles.resultCover, styles.resultCoverPlaceholder]}>
              <Ionicons name="musical-note" size={20} color={theme.colors.textMuted} />
            </View>
          )}

          <View style={styles.resultInfo}>
            <Text style={[styles.resultTitle, isActive && styles.resultTitleActive]} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.resultMeta} numberOfLines={1}>
              {artistName} - {formatDuration(duration)}
            </Text>
          </View>

          {isActive && isPlaying ? (
            <View style={styles.resultAction}>
              <Ionicons name="volume-high" size={20} color={theme.colors.accent} />
            </View>
          ) : (
            <TouchableOpacity style={styles.resultAction} onPress={() => handleTrackPress(track)}>
              <Ionicons name="play" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    }

    if (item.kind === 'artist') {
      const artist = item.artist;
      return (
        <TouchableOpacity
          style={styles.resultItem}
          onPress={() => router.push(`/artist/${artist.id}` as any)}
        >
          {artist.profileImageUrl ? (
            <Image source={{ uri: artist.profileImageUrl }} style={[styles.resultCover, styles.artistCover]} />
          ) : (
            <View style={[styles.resultCover, styles.resultCoverPlaceholder, styles.artistCover]}>
              <Ionicons name="person" size={20} color={theme.colors.textMuted} />
            </View>
          )}
          <View style={styles.resultInfo}>
            <Text style={styles.resultTitle} numberOfLines={1}>{artist.name}</Text>
            <Text style={styles.resultMeta} numberOfLines={1}>
              {artist.trackCount || 0} tracks · {artist.followerCount || 0} followers
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      );
    }

    const playlist = item.playlist;
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => router.push(`/playlist/${playlist.id}` as any)}
      >
        {playlist.coverUrl ? (
          <Image source={{ uri: playlist.coverUrl }} style={styles.resultCover} />
        ) : (
          <View style={[styles.resultCover, styles.resultCoverPlaceholder]}>
            <Ionicons name="list" size={20} color={theme.colors.textMuted} />
          </View>
        )}
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>{playlist.name}</Text>
          <Text style={styles.resultMeta} numberOfLines={1}>
            {(playlist.trackCount || 0)} tracks{playlist.creatorName ? ` · ${playlist.creatorName}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const rows = buildRows(results);
  const hasAnyResult = !!results && results.counts.total > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Search</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Songs, artists, playlists..."
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

      {results?.fallback && (
        <View style={styles.fallbackBanner}>
          <Ionicons name="warning-outline" size={14} color={theme.colors.warning} />
          <Text style={styles.fallbackText}>Showing track-only fallback results</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : hasSearched ? (
        hasAnyResult ? (
          <FlatList
            data={rows}
            renderItem={renderRow}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.results}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <View style={styles.emptyResults}>
            <Ionicons name="search-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        )
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="musical-notes-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.placeholderText}>Search for music</Text>
          <Text style={styles.placeholderSubtext}>Find tracks, artists, and playlists on Palletium</Text>
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
  fallbackBanner: {
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fallbackText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
  },
  loader: {
    marginTop: theme.spacing.xxl,
  },
  results: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultItemActive: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: -theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderBottomWidth: 0,
  },
  resultCover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  resultCoverPlaceholder: {
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistCover: {
    borderRadius: 24,
  },
  resultInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  resultTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  resultTitleActive: {
    color: theme.colors.accent,
  },
  resultMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  resultAction: {
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
