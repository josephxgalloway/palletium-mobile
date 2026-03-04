import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
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

  // Rename Playlist Modal
  const [showRenamePlaylist, setShowRenamePlaylist] = useState(false);
  const [renamePlaylistTarget, setRenamePlaylistTarget] = useState<Playlist | null>(null);
  const [renamePlaylistName, setRenamePlaylistName] = useState('');
  const [renamingPlaylist, setRenamingPlaylist] = useState(false);

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
          setHistory([]);
        }
      } else if (activeTab === 'liked') {
        try {
          const response = await getLikedTracks();
          setLikedTracks(response.tracks || response.data?.tracks || response || []);
        } catch {
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
      fetchData();
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

  // Playlist long-press actions
  const handlePlaylistLongPress = (playlist: Playlist) => {
    Alert.alert(
      playlist.name,
      undefined,
      [
        {
          text: 'Rename',
          onPress: () => handleRenamePlaylist(playlist),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeletePlaylist(playlist),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRenamePlaylist = (playlist: Playlist) => {
    setRenamePlaylistTarget(playlist);
    setRenamePlaylistName(playlist.name);
    setShowRenamePlaylist(true);
  };

  const submitRenamePlaylist = async () => {
    if (!renamePlaylistTarget || !renamePlaylistName.trim()) return;
    setRenamingPlaylist(true);
    try {
      await api.patch(`/playlists/${renamePlaylistTarget.id}`, { name: renamePlaylistName.trim() });
      Toast.show({ type: 'success', text1: 'Playlist renamed' });
      setShowRenamePlaylist(false);
      setRenamePlaylistTarget(null);
      fetchData();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to rename', text2: error.response?.data?.error || error.message });
    } finally {
      setRenamingPlaylist(false);
    }
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/playlists/${playlist.id}`);
              Toast.show({ type: 'success', text1: 'Playlist deleted' });
              fetchData();
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Failed to delete', text2: error.response?.data?.error || error.message });
            }
          },
        },
      ]
    );
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['rgba(108,134,168,0.12)', 'transparent']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.emptyState}>
          <View style={styles.emptyIconRing}>
            <Ionicons name="library-outline" size={48} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Your Library</Text>
          <Text style={styles.emptySubtitle}>
            Sign in to see your playlists and listening history
          </Text>
          <Pressable
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={['#c0c8d6', '#9ba8bc']}
              style={styles.signInGradient}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <Pressable
      style={styles.playlistCard}
      onPress={() => router.push(`/playlist/${item.id}` as any)}
      onLongPress={() => handlePlaylistLongPress(item)}
    >
      {item.cover_url ? (
        <Image source={{ uri: item.cover_url }} style={styles.playlistCover} transition={200} />
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
      <Pressable
        style={styles.editButton}
        onPress={() => handlePlaylistLongPress(item)}
        hitSlop={8}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textMuted} />
      </Pressable>
    </Pressable>
  );

  const renderHistoryItem = ({ item }: { item: RecentPlay }) => {
    const coverUrl = getCoverUrl(item.track);
    const artistName = getArtistName(item.track);

    return (
      <Pressable
        style={styles.historyItem}
        onPress={() => playTrack(item.track)}
        onLongPress={() => router.push(`/track/${item.track.id}` as any)}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.historyCover} transition={200} />
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
          <LinearGradient
            colors={['#6c86a8', '#c0c8d6']}
            style={styles.firstListenBadge}
          >
            <Text style={styles.firstListenText}>1st</Text>
          </LinearGradient>
        )}
      </Pressable>
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
      <Pressable
        style={[styles.likedTrackItem, isActive && styles.likedTrackItemActive]}
        onPress={() => handleTrackPress(item)}
        onLongPress={() => router.push(`/track/${item.id}` as any)}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.likedTrackCover} transition={200} />
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
        <Ionicons name="heart" size={18} color="#e74c3c" style={styles.heartIcon} />
      </Pressable>
    );
  };

  const renderSearchResult = ({ item }: { item: Track }) => {
    const isActive = currentTrack?.id === item.id;
    const coverUrl = getCoverUrl(item);
    const artistName = getArtistName(item);

    return (
      <Pressable
        style={[styles.historyItem, isActive && styles.likedTrackItemActive]}
        onPress={() => {
          Keyboard.dismiss();
          playTrack(item);
        }}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.historyCover} transition={200} />
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
            {artistName} · {formatDuration(getDuration(item))}
          </Text>
        </View>
        {isActive && isPlaying && (
          <Ionicons name="volume-high" size={18} color={theme.colors.primary} />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Ambient gradient */}
      <LinearGradient
        colors={['rgba(108,134,168,0.12)', 'transparent', 'rgba(108,134,168,0.06)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your Library</Text>
          <Text style={styles.subtitle}>Playlists, history & favorites</Text>
        </View>
        {isAuthenticated && activeTab === 'playlists' && (
          <Pressable
            style={styles.addButton}
            onPress={() => setShowCreatePlaylist(true)}
          >
            <LinearGradient
              colors={['rgba(192,200,214,0.15)', 'rgba(108,134,168,0.15)']}
              style={styles.addButtonGradient}
            >
              <Ionicons name="add" size={22} color={theme.colors.primary} />
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Frosted Glass Search Bar */}
      {isAuthenticated && (
        <View style={styles.searchContainer}>
          <BlurView intensity={40} tint="dark" style={styles.searchBlur}>
            <LinearGradient
              colors={['rgba(27,31,43,0.7)', 'rgba(33,38,55,0.7)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.searchInner}>
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
                <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); setActiveTab('playlists'); }}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                </Pressable>
              )}
            </View>
          </BlurView>
        </View>
      )}

      {/* Glass Pill Tabs */}
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
              <Pressable style={styles.createButton} onPress={() => setShowCreatePlaylist(true)}>
                <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.createButtonText}>Create Your First Playlist</Text>
              </Pressable>
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

      {/* Create Playlist Modal — Frosted Glass */}
      <Modal
        visible={showCreatePlaylist}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreatePlaylist(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['rgba(108,134,168,0.08)', 'transparent']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCreatePlaylist(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <Pressable onPress={handleCreatePlaylist} disabled={creatingPlaylist}>
              {creatingPlaylist ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.modalCreate, !newPlaylistName.trim() && styles.modalCreateDisabled]}>
                  Create
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.playlistIconContainer}>
              <LinearGradient
                colors={['rgba(108,134,168,0.2)', 'rgba(192,200,214,0.1)']}
                style={styles.playlistIconGradient}
              >
                <Ionicons name="musical-notes" size={48} color={theme.colors.textMuted} />
              </LinearGradient>
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

      {/* Rename Playlist Modal */}
      <Modal
        visible={showRenamePlaylist}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRenamePlaylist(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['rgba(108,134,168,0.08)', 'transparent']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowRenamePlaylist(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Rename Playlist</Text>
            <Pressable onPress={submitRenamePlaylist} disabled={renamingPlaylist || !renamePlaylistName.trim()}>
              {renamingPlaylist ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.modalCreate, !renamePlaylistName.trim() && styles.modalCreateDisabled]}>
                  Save
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.playlistIconContainer}>
              <LinearGradient
                colors={['rgba(108,134,168,0.2)', 'rgba(192,200,214,0.1)']}
                style={styles.playlistIconGradient}
              >
                <Ionicons name="create-outline" size={48} color={theme.colors.textMuted} />
              </LinearGradient>
            </View>
            <TextInput
              style={styles.playlistNameInput}
              placeholder="Playlist name"
              placeholderTextColor={theme.colors.textMuted}
              value={renamePlaylistName}
              onChangeText={setRenamePlaylistName}
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
    <Pressable
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
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
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    letterSpacing: 0.2,
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.15)',
  },
  // Frosted Glass Search
  searchContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  searchBlur: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    height: 44,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  // Glass Pill Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
    backgroundColor: 'rgba(192,200,214,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.06)',
  },
  tabActive: {
    backgroundColor: 'rgba(108,134,168,0.25)',
    borderColor: 'rgba(192,200,214,0.15)',
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  list: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  // Glass Playlist Card
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27,31,43,0.6)',
    padding: theme.spacing.sm,
    borderRadius: 14,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.06)',
  },
  playlistCover: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
  },
  playlistCoverPlaceholder: {
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    borderRadius: 16,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  playlistName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
  playlistMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  // History Item
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 10,
    marginBottom: 2,
  },
  historyCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
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
    fontWeight: '500',
  },
  historyArtist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  firstListenBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  firstListenText: {
    fontSize: theme.fontSize.xs,
    color: '#fff',
    fontWeight: '700',
  },
  // Auth Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(108,134,168,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.1)',
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  signInButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  signInGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderRadius: 14,
  },
  signInText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  // List Empty State
  emptyList: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyListText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  emptyListSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
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
    fontWeight: '500',
  },
  // Liked Tracks
  likedTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 10,
    marginBottom: 2,
  },
  likedTrackItemActive: {
    backgroundColor: 'rgba(108,134,168,0.12)',
    borderRadius: 10,
  },
  likedTrackCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
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
    fontWeight: '500',
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
  // Frosted Glass Modal
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
    borderBottomColor: 'rgba(192,200,214,0.08)',
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalCancel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  modalCreate: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalCreateDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  playlistIconContainer: {
    marginBottom: theme.spacing.xl,
  },
  playlistIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.1)',
  },
  playlistNameInput: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    width: '100%',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
});
