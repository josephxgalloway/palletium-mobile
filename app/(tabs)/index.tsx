import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import api from '@/lib/api/client';
import { usePlayerStore } from '@/lib/store/playerStore';
import { theme } from '@/constants/theme';
import type { Track } from '@/types';
import { getArtistName, getCoverUrl, getDuration } from '@/types';

interface SearchArtist {
  id: number;
  name: string;
  slug?: string;
  profile_image_url?: string;
  bio?: string;
  track_count?: number;
  total_plays?: number;
  follower_count?: number;
}

// Mood Radio station definitions
interface RadioStation {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  filters: {
    mood?: string;
    energy_level?: string;
    bpm_min?: number;
    bpm_max?: number;
  };
}

const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'energetic',
    name: 'Energetic',
    description: 'High-energy tracks',
    icon: 'flash',
    gradient: ['#f97316', '#dc2626'],
    filters: { mood: 'Energetic', energy_level: 'High' },
  },
  {
    id: 'peaceful',
    name: 'Peaceful',
    description: 'Calm, relaxing vibes',
    icon: 'moon',
    gradient: ['#6366f1', '#9333ea'],
    filters: { mood: 'Peaceful', energy_level: 'Low' },
  },
  {
    id: 'uplifting',
    name: 'Uplifting',
    description: 'Feel-good music',
    icon: 'sunny',
    gradient: ['#facc15', '#f97316'],
    filters: { mood: 'Uplifting' },
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Moody soundscapes',
    icon: 'cloudy-night',
    gradient: ['#475569', '#1e293b'],
    filters: { mood: 'Dark' },
  },
  {
    id: 'focus',
    name: 'Focus',
    description: 'For concentration',
    icon: 'cafe',
    gradient: ['#06b6d4', '#2563eb'],
    filters: { energy_level: 'Medium', bpm_min: 80, bpm_max: 120 },
  },
  {
    id: 'workout',
    name: 'Workout',
    description: 'High-tempo tracks',
    icon: 'fitness',
    gradient: ['#22c55e', '#10b981'],
    filters: { energy_level: 'High', bpm_min: 120 },
  },
];

type TabType = 'browse' | 'radio';

export default function DiscoverScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchArtists, setSearchArtists] = useState<SearchArtist[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Mood Radio state
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null);
  const [radioTracks, setRadioTracks] = useState<Track[]>([]);
  const [radioLoading, setRadioLoading] = useState(false);
  const [currentRadioIndex, setCurrentRadioIndex] = useState(0);

  const { currentTrack, isPlaying } = usePlayerStore();

  const fetchTracks = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/discovery');
      setTracks(response.data.tracks || response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch tracks:', err);
      setError(err.response?.data?.message || 'Failed to load tracks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // Search functionality with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchArtists([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await api.get('/discovery/search', {
          params: { q: searchQuery, type: 'all', limit: 30 },
        });
        const results = response.data?.results || response.data || {};
        setSearchArtists(results.artists || []);
        setSearchResults(results.tracks || []);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
        setSearchArtists([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTracks();
  };

  const handleTrackPress = async (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        await usePlayerStore.getState().pause();
      } else {
        await usePlayerStore.getState().resume();
      }
    } else {
      await usePlayerStore.getState().playTrack(track);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const navigateToTrack = (track: Track) => {
    router.push(`/track/${track.id}` as any);
  };

  // Load Mood Radio station
  const loadStation = async (station: RadioStation) => {
    setSelectedStation(station);
    setRadioLoading(true);
    setRadioTracks([]);
    setCurrentRadioIndex(0);

    try {
      const response = await api.get('/analysis/filter', {
        params: {
          ...station.filters,
          limit: 30,
        },
      });

      const stationTracks = (response.data?.tracks || []).filter((t: any) => t.audio_url);

      if (stationTracks.length === 0) {
        const fallbackResponse = await api.get('/discovery', { params: { limit: 20 } });
        const fallbackTracks = fallbackResponse.data?.tracks || fallbackResponse.data || [];
        setRadioTracks(shuffleArray(fallbackTracks));
      } else {
        setRadioTracks(shuffleArray(stationTracks));
      }
    } catch (err) {
      console.error('Failed to load station:', err);
      try {
        const fallbackResponse = await api.get('/discovery', { params: { limit: 20 } });
        const fallbackTracks = fallbackResponse.data?.tracks || fallbackResponse.data || [];
        setRadioTracks(shuffleArray(fallbackTracks));
      } catch {
        setRadioTracks([]);
      }
    } finally {
      setRadioLoading(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const playRadioTrack = async (track: Track, index: number) => {
    setCurrentRadioIndex(index);
    await usePlayerStore.getState().playTrack(track);
  };

  const handleSkipNext = async () => {
    if (radioTracks.length === 0) return;
    const nextIndex = (currentRadioIndex + 1) % radioTracks.length;
    await playRadioTrack(radioTracks[nextIndex], nextIndex);
  };

  const renderTrack = ({ item }: { item: Track }) => {
    const isActive = currentTrack?.id === item.id;
    const coverUrl = getCoverUrl(item);
    const artistName = getArtistName(item);
    const duration = getDuration(item);

    return (
      <Pressable
        style={[styles.trackCard, isActive && styles.trackCardActive]}
        onPress={() => handleTrackPress(item)}
        onLongPress={() => navigateToTrack(item)}
      >
        <View style={styles.coverContainer}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cover} transition={200} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="musical-note" size={24} color={theme.colors.textMuted} />
            </View>
          )}
          {isActive && (
            <View style={styles.playingOverlay}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color="#fff"
              />
            </View>
          )}
        </View>

        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{artistName}</Text>
          <View style={styles.trackMeta}>
            <Text style={styles.duration}>{formatDuration(duration)}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.plays}>{(item.plays ?? item.play_count ?? 0).toLocaleString()} plays</Text>
          </View>
        </View>

        <Pressable style={styles.moreButton} onPress={() => navigateToTrack(item)}>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} />
        </Pressable>
      </Pressable>
    );
  };

  const renderRadioStation = (station: RadioStation) => {
    const isSelected = selectedStation?.id === station.id;

    return (
      <Pressable
        key={station.id}
        style={[styles.stationCard, isSelected && styles.stationCardSelected]}
        onPress={() => loadStation(station)}
      >
        <LinearGradient
          colors={station.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.stationGradient}
        >
          <Ionicons name={station.icon} size={28} color="#fff" />
        </LinearGradient>
        <Text style={styles.stationName}>{station.name}</Text>
        <Text style={styles.stationDescription} numberOfLines={1}>{station.description}</Text>
      </Pressable>
    );
  };

  const isSearchActive = searchQuery.trim().length > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading tracks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Ambient gradient overlay */}
      <LinearGradient
        colors={['rgba(108,134,168,0.12)', 'transparent', 'rgba(108,134,168,0.06)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Find new music, earn rewards</Text>
      </View>

      {/* Frosted Glass Search Bar */}
      <View style={styles.searchContainer}>
        <BlurView intensity={40} tint="dark" style={styles.searchBlur}>
          <LinearGradient
            colors={['rgba(27,31,43,0.7)', 'rgba(33,38,55,0.7)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.searchInner}>
            <Ionicons name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tracks, artists..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
              </Pressable>
            )}
          </View>
        </BlurView>
      </View>

      {/* Tab Navigation */}
      {!isSearchActive && (
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'browse' && styles.tabActive]}
            onPress={() => setActiveTab('browse')}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={activeTab === 'browse' ? '#fff' : theme.colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'browse' && styles.tabTextActive]}>
              Browse
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'radio' && styles.tabActive]}
            onPress={() => setActiveTab('radio')}
          >
            <Ionicons
              name="radio"
              size={16}
              color={activeTab === 'radio' ? '#fff' : theme.colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'radio' && styles.tabTextActive]}>
              Mood Radio
            </Text>
          </Pressable>
        </View>
      )}

      {/* Search Loading Indicator */}
      {isSearchActive && searchLoading && (
        <View style={styles.searchLoadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.searchLoadingText}>Searching...</Text>
        </View>
      )}

      {/* Content */}
      {isSearchActive ? (
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {searchLoading ? null : searchQuery.length >= 2 && searchArtists.length === 0 && searchResults.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="search" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try different keywords</Text>
            </View>
          ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
            <View style={styles.centered}>
              <Text style={styles.emptySubtext}>Enter at least 2 characters to search</Text>
            </View>
          ) : (
            <>
              {/* Artist profiles with their tracks */}
              {searchArtists.map((artist) => {
                const artistTracks = searchResults.filter(
                  (t) => t.artist_id === artist.id || (t as any).artistId === artist.id
                );
                return (
                  <View key={`artist-${artist.id}`} style={styles.artistSection}>
                    <Pressable
                      style={styles.artistCard}
                      onPress={() => router.push(`/artist/${artist.id}` as any)}
                    >
                      {artist.profile_image_url ? (
                        <Image
                          source={{ uri: artist.profile_image_url }}
                          style={styles.artistAvatar}
                          transition={200}
                        />
                      ) : (
                        <View style={[styles.artistAvatar, styles.artistAvatarPlaceholder]}>
                          <Ionicons name="person" size={24} color={theme.colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.artistInfo}>
                        <Text style={styles.artistCardName} numberOfLines={1}>{artist.name}</Text>
                        <Text style={styles.artistCardMeta} numberOfLines={1}>
                          {artist.track_count ?? 0} tracks
                          {artist.total_plays ? ` · ${artist.total_plays.toLocaleString()} plays` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                    </Pressable>
                    {artistTracks.map((track) => (
                      <View key={`track-${track.id}`}>
                        {renderTrack({ item: track })}
                      </View>
                    ))}
                  </View>
                );
              })}

              {/* Remaining tracks not matched to an artist result */}
              {(() => {
                const artistIds = new Set(searchArtists.map((a) => a.id));
                const remaining = searchResults.filter(
                  (t) => !artistIds.has(t.artist_id as number) && !artistIds.has((t as any).artistId as number)
                );
                if (remaining.length === 0) return null;
                return (
                  <View style={styles.artistSection}>
                    {searchArtists.length > 0 && (
                      <Text style={styles.searchSectionLabel}>More tracks</Text>
                    )}
                    {remaining.map((track) => (
                      <View key={`track-${track.id}`}>
                        {renderTrack({ item: track })}
                      </View>
                    ))}
                  </View>
                );
              })()}
            </>
          )}
        </ScrollView>
      ) : activeTab === 'browse' ? (
        <>
          {error ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={fetchTracks}>
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={tracks}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderTrack}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Ionicons name="musical-notes" size={48} color={theme.colors.textMuted} />
                  <Text style={styles.emptyText}>No tracks available</Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        // Mood Radio Tab
        <ScrollView
          style={styles.radioContainer}
          contentContainerStyle={styles.radioContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Station Grid */}
          <Text style={styles.sectionTitle}>Choose Your Mood</Text>
          <View style={styles.stationGrid}>
            {RADIO_STATIONS.map(renderRadioStation)}
          </View>

          {/* Now Playing Section */}
          {selectedStation && (
            <View style={styles.nowPlayingSection}>
              <LinearGradient
                colors={['rgba(27,31,43,0.6)', 'rgba(33,38,55,0.6)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.nowPlayingHeader}>
                <LinearGradient
                  colors={selectedStation.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nowPlayingIcon}
                >
                  <Ionicons name={selectedStation.icon} size={20} color="#fff" />
                </LinearGradient>
                <View style={styles.nowPlayingInfo}>
                  <Text style={styles.nowPlayingTitle}>{selectedStation.name} Radio</Text>
                  <Text style={styles.nowPlayingCount}>
                    {radioLoading ? 'Loading...' : `${radioTracks.length} tracks`}
                  </Text>
                </View>
                <Pressable
                  onPress={handleSkipNext}
                  style={styles.skipButton}
                  disabled={radioTracks.length === 0}
                >
                  <Ionicons name="play-skip-forward" size={24} color={theme.colors.textPrimary} />
                </Pressable>
              </View>

              {radioLoading ? (
                <View style={styles.radioLoadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              ) : radioTracks.length > 0 ? (
                <View style={styles.radioTrackList}>
                  {radioTracks.slice(0, 5).map((track, index) => {
                    const isActive = currentTrack?.id === track.id;
                    const coverUrl = getCoverUrl(track);
                    const artistName = getArtistName(track);

                    return (
                      <Pressable
                        key={track.id}
                        style={[styles.radioTrackItem, isActive && styles.radioTrackItemActive]}
                        onPress={() => playRadioTrack(track, index)}
                      >
                        <Text style={styles.radioTrackIndex}>{index + 1}</Text>
                        {coverUrl ? (
                          <Image source={{ uri: coverUrl }} style={styles.radioTrackCover} transition={200} />
                        ) : (
                          <View style={[styles.radioTrackCover, styles.coverPlaceholder]}>
                            <Ionicons name="musical-note" size={16} color={theme.colors.textMuted} />
                          </View>
                        )}
                        <View style={styles.radioTrackInfo}>
                          <Text style={styles.radioTrackTitle} numberOfLines={1}>{track.title}</Text>
                          <Text style={styles.radioTrackArtist} numberOfLines={1}>{artistName}</Text>
                        </View>
                        {isActive && (
                          <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={20}
                            color={theme.colors.primary}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.radioEmptyContainer}>
                  <Text style={styles.radioEmptyText}>No tracks found for this mood</Text>
                </View>
              )}
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={theme.colors.textMuted} />
            <Text style={styles.infoText}>
              Mood Radio uses audio analysis to find tracks matching your selected mood. Pick a station and enjoy!
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
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
  // Frosted Glass Search
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
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
    height: 48,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchLoadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  // Tabs — glass pill style
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
    backgroundColor: 'rgba(192,200,214,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.06)',
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(108,134,168,0.25)',
    borderColor: 'rgba(192,200,214,0.15)',
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  // Search Results — Artists
  artistSection: {
    marginBottom: theme.spacing.md,
  },
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(108,134,168,0.12)',
    borderRadius: 14,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.1)',
  },
  artistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.12)',
  },
  artistAvatarPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  artistCardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
  artistCardMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  searchSectionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Track List
  list: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(27,31,43,0.6)',
    borderRadius: 14,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.06)',
  },
  trackCardActive: {
    backgroundColor: 'rgba(108,134,168,0.15)',
    borderColor: 'rgba(192,200,214,0.15)',
    shadowColor: '#6c86a8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.1)',
  },
  coverPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(108,134,168,0.7)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  trackTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
  trackArtist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.textMuted,
    marginHorizontal: 8,
  },
  duration: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  plays: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  moreButton: {
    padding: theme.spacing.sm,
  },
  // Mood Radio
  radioContainer: {
    flex: 1,
  },
  radioContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    letterSpacing: 0.2,
  },
  stationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  stationCard: {
    width: '31%',
    backgroundColor: 'rgba(27,31,43,0.6)',
    borderRadius: 14,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.06)',
  },
  stationCardSelected: {
    borderColor: 'rgba(192,200,214,0.2)',
    backgroundColor: 'rgba(108,134,168,0.15)',
    shadowColor: '#6c86a8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  stationGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  stationName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  stationDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  nowPlayingSection: {
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
  },
  nowPlayingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  nowPlayingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  nowPlayingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  nowPlayingCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  skipButton: {
    padding: theme.spacing.sm,
  },
  radioLoadingContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  radioTrackList: {
    gap: theme.spacing.xs,
  },
  radioTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 10,
  },
  radioTrackItemActive: {
    backgroundColor: 'rgba(108,134,168,0.15)',
  },
  radioTrackIndex: {
    width: 24,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  radioTrackCover: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
  },
  radioTrackInfo: {
    flex: 1,
  },
  radioTrackTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  radioTrackArtist: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  radioEmptyContainer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  radioEmptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(27,31,43,0.6)',
    borderRadius: 14,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.06)',
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  // States
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(108,134,168,0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.1)',
  },
  retryText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
