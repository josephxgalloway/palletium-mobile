import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
  Keyboard,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import api, { getLikedTracks } from '@/lib/api/client';
import { theme } from '@/constants/theme';
import type { Playlist, Track, RecentPlay } from '@/types';
import { getArtistName, getCoverUrl, getDuration } from '@/types';
import Toast from 'react-native-toast-message';

type TabType = 'playlists' | 'history' | 'liked' | 'search';

export default function LibraryScreen() {
  const { isAuthenticated } = useAuthStore();
  const { playTrack, currentTrack, isPlaying, pause, resume } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<TabType>('playlists');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<RecentPlay[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Create Playlist Modal
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      if (activeTab === 'playlists') {
        const response = await api.get('/playlists');
        setPlaylists(response.data.playlists || response.data || []);
      } else if (activeTab === 'history') {
        try {
          const response = await api.get('/users/history?limit=50');
          setHistory(response.data.plays || response.data?.history || response.data || []);
        } catch {
          // Silently handle - endpoint may not be implemented yet
          setHistory([]);
        }
      } else if (activeTab === 'liked') {
        try {
          const response = await getLikedTracks();
          setLikedTracks(response.tracks || response.data?.tracks || response || []);
        } catch {
          // Silently handle - endpoint may not be implemented yet
          setLikedTracks([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch library data:', error);
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [isAuthenticated, activeTab, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Search function
  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);

    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);

    try {
      const response = await api.get('/discovery/');
      const allTracks = response.data.tracks || response.data || [];
      const searchTerm = text.trim().toLowerCase();

      const filtered = allTracks.filter((track: Track) =>
        track.title?.toLowerCase().includes(searchTerm) ||
        getArtistName(track).toLowerCase().includes(searchTerm)
      );

      setSearchResults(filtered);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Create playlist function
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a playlist name' });
      return;
    }

    setCreatingPlaylist(true);
    try {
      await api.post('/playlists', {
        name: newPlaylistName.trim(),
        description: '',
        is_public: false,
      });
      Toast.show({ type: 'success', text1: 'Playlist created!' });
      setShowCreatePlaylist(false);
      setNewPlaylistName('');
      fetchData(); // Refresh playlists
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to create playlist',
        text2: error.response?.data?.error || error.message,
      });
    } finally {
      setCreatingPlaylist(false);
    }
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="library-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Your Library</Text>
          <Text style={styles.emptySubtitle}>
            Sign in to see your playlists and listening history
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistCard}
      onPress={() => router.push(`/playlist/${item.id}` as any)}
    >
      {item.cover_url ? (
        <Image source={{ uri: item.cover_url }} style={styles.playlistCover} />
      ) : (
        <View style={[styles.playlistCover, styles.playlistCoverPlaceholder]}>
          <Ionicons name="musical-notes" size={24} color={theme.colors.textMuted} />
        </View>
      )}
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.playlistMeta}>
          {item.track_count} tracks {item.is_public ? '' : '- Private'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  const renderHistoryItem = ({ item }: { item: RecentPlay }) => {
    const coverUrl = getCoverUrl(item.track);
    const artistName = getArtistName(item.track);

    return (
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => playTrack(item.track)}
        onLongPress={() => router.push(`/track/${item.track.id}` as any)}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.historyCover} />
        ) : (
          <View style={[styles.historyCover, styles.historyCoverPlaceholder]}>
            <Ionicons name="musical-note" size={18} color={theme.colors.textMuted} />
          </View>
        )}
        <View style={styles.historyInfo}>
          <Text style={styles.historyTitle} numberOfLines={1}>{item.track.title}</Text>
          <Text style={styles.historyArtist} numberOfLines={1}>
            {artistName}
          </Text>
        </View>
        {item.is_first_listen && (
          <View style={styles.firstListenBadge}>
            <Text style={styles.firstListenText}>1st</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleTrackPress = async (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        await pause();
      } else {
        await resume();
      }
    } else {
      await playTrack(track);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderLikedTrack = ({ item }: { item: Track }) => {
    const coverUrl = getCoverUrl(item);
    const artistName = getArtistName(item);
    const duration = getDuration(item);
    const isActive = currentTrack?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.likedTrackItem, isActive && styles.likedTrackItemActive]}
        onPress={() => handleTrackPress(item)}
        onLongPress={() => router.push(`/track/${item.id}` as any)}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.likedTrackCover} />
        ) : (
          <View style={[styles.likedTrackCover, styles.likedTrackCoverPlaceholder]}>
            <Ionicons name="musical-note" size={20} color={theme.colors.textMuted} />
          </View>
        )}
        <View style={styles.likedTrackInfo}>
          <Text
            style={[styles.likedTrackTitle, isActive && styles.likedTrackTitleActive]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.likedTrackArtist} numberOfLines={1}>
            {artistName}
          </Text>
        </View>
        <View style={styles.likedTrackRight}>
          <Text style={styles.likedTrackDuration}>{formatDuration(duration)}</Text>
          {isActive && isPlaying && (
            <Ionicons name="volume-high" size={16} color={theme.colors.primary} />
          )}
        </View>
        <Ionicons name="heart" size={18} color={theme.colors.error} style={styles.heartIcon} />
      </TouchableOpacity>
    );
  };

  const formatDurationSearch = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSearchResult = ({ item }: { item: Track }) => {
    const isActive = currentTrack?.id === item.id;
    const coverUrl = getCoverUrl(item);
    const artistName = getArtistName(item);

    return (
      <TouchableOpacity
        style={[styles.historyItem, isActive && styles.likedTrackItemActive]}
        onPress={() => {
          Keyboard.dismiss();
          playTrack(item);
        }}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.historyCover} />
        ) : (
          <View style={[styles.historyCover, styles.historyCoverPlaceholder]}>
            <Ionicons name="musical-note" size={18} color={theme.colors.textMuted} />
          </View>
        )}
        <View style={styles.historyInfo}>
          <Text style={[styles.historyTitle, isActive && styles.likedTrackTitleActive]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.historyArtist} numberOfLines={1}>
            {artistName} • {formatDurationSearch(getDuration(item))}
          </Text>
        </View>
        {isActive && isPlaying && (
          <Ionicons name="volume-high" size={18} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your Library</Text>
          <Text style={styles.subtitle}>Playlists, history & favorites</Text>
        </View>
        {isAuthenticated && activeTab === 'playlists' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreatePlaylist(true)}
          >
            <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      {isAuthenticated && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs, artists..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setActiveTab('search')}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setActiveTab('playlists'); }}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tabs - hidden when searching */}
      {activeTab !== 'search' && (
        <View style={styles.tabs}>
          <TabButton
            label="Playlists"
            active={activeTab === 'playlists'}
            onPress={() => setActiveTab('playlists')}
          />
          <TabButton
            label="History"
            active={activeTab === 'history'}
            onPress={() => setActiveTab('history')}
          />
          <TabButton
            label="Liked"
            active={activeTab === 'liked'}
            onPress={() => setActiveTab('liked')}
          />
        </View>
      )}

      {/* Search Results */}
      {activeTab === 'search' && (
        searchLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              searchQuery.length >= 2 ? (
                <View style={styles.emptyList}>
                  <Ionicons name="search-outline" size={48} color={theme.colors.textMuted} />
                  <Text style={styles.emptyListText}>No results found</Text>
                  <Text style={styles.emptyListSubtext}>Try a different search term</Text>
                </View>
              ) : (
                <View style={styles.emptyList}>
                  <Ionicons name="musical-notes-outline" size={48} color={theme.colors.textMuted} />
                  <Text style={styles.emptyListText}>Search for music</Text>
                  <Text style={styles.emptyListSubtext}>Find songs and artists</Text>
                </View>
              )
            }
          />
        )
      )}

      {loading && activeTab !== 'search' ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : activeTab === 'playlists' ? (
        <FlatList
          data={playlists}
          renderItem={renderPlaylist}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="musical-notes-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyListText}>No playlists yet</Text>
              <TouchableOpacity style={styles.createButton} onPress={() => setShowCreatePlaylist(true)}>
                <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.createButtonText}>Create Your First Playlist</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : activeTab === 'history' ? (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>No listening history</Text>
              <Text style={styles.emptyListSubtext}>Start playing music!</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={likedTracks}
          renderItem={renderLikedTrack}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="heart-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyListText}>No liked tracks yet</Text>
              <Text style={styles.emptyListSubtext}>
                Tap the heart icon on any track to save it here
              </Text>
            </View>
          }
        />
      )}

      {/* Create Playlist Modal */}
      <Modal
        visible={showCreatePlaylist}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreatePlaylist(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreatePlaylist(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TouchableOpacity onPress={handleCreatePlaylist} disabled={creatingPlaylist}>
              {creatingPlaylist ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.modalCreate, !newPlaylistName.trim() && styles.modalCreateDisabled]}>
                  Create
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.playlistIconContainer}>
              <Ionicons name="musical-notes" size={48} color={theme.colors.textMuted} />
            </View>
            <TextInput
              style={styles.playlistNameInput}
              placeholder="Playlist name"
              placeholderTextColor={theme.colors.textMuted}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
              maxLength={50}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
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
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  addButton: {
    padding: theme.spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  tab: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  tabTextActive: {
    color: theme.colors.background,
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  list: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  playlistCover: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.sm,
  },
  playlistCoverPlaceholder: {
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  playlistName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  playlistMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  historyCover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  historyCoverPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  historyTitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  historyArtist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  firstListenBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  firstListenText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.background,
    fontWeight: theme.fontWeight.bold,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.borderRadius.md,
  },
  signInText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyListText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  emptyListSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  createButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
  },
  likedTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  likedTrackItemActive: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  likedTrackCover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  likedTrackCoverPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likedTrackInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  likedTrackTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  likedTrackTitleActive: {
    color: theme.colors.primary,
  },
  likedTrackArtist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  likedTrackRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  likedTrackDuration: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  heartIcon: {
    marginLeft: theme.spacing.sm,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalCancel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  modalCreate: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  modalCreateDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  playlistIconContainer: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  playlistNameInput: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    width: '100%',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
});
