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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import api from '@/lib/api/client';
import { theme } from '@/constants/theme';
import type { Playlist, Track, RecentPlay } from '@/types';
import { getArtistName, getCoverUrl } from '@/types';

type TabType = 'playlists' | 'history' | 'liked';

export default function LibraryScreen() {
  const { isAuthenticated } = useAuthStore();
  const { playTrack } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<TabType>('playlists');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<RecentPlay[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      if (activeTab === 'playlists') {
        const response = await api.get('/playlists');
        setPlaylists(response.data.playlists || response.data || []);
      } else if (activeTab === 'history') {
        const response = await api.get('/users/history?limit=50');
        setHistory(response.data.plays || response.data || []);
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
    <TouchableOpacity style={styles.playlistCard}>
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your Library</Text>

      {/* Tabs */}
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

      {loading ? (
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
              <Text style={styles.emptyListText}>No playlists yet</Text>
              <TouchableOpacity style={styles.createButton}>
                <Ionicons name="add" size={20} color={theme.colors.primary} />
                <Text style={styles.createButtonText}>Create Playlist</Text>
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
        <View style={styles.emptyList}>
          <Text style={styles.emptyListText}>Liked tracks coming soon</Text>
        </View>
      )}
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
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
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
});
