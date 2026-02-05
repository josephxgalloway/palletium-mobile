import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '@/lib/api/client';
import { usePlayerStore } from '@/lib/store/playerStore';
import { theme } from '@/constants/theme';
import type { Track } from '@/types';
import { getArtistName, getCoverUrl, getDuration } from '@/types';

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
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await api.get('/search', {
          params: { q: searchQuery, type: 'tracks', limit: 20 },
        });
        const results = response.data?.tracks || response.data?.results?.tracks || [];
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
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
        // Fallback to regular discovery if no analyzed tracks
        const fallbackResponse = await api.get('/discovery', { params: { limit: 20 } });
        const fallbackTracks = fallbackResponse.data?.tracks || fallbackResponse.data || [];
        setRadioTracks(shuffleArray(fallbackTracks));
      } else {
        setRadioTracks(shuffleArray(stationTracks));
      }
    } catch (err) {
      console.error('Failed to load station:', err);
      // Fallback to regular discovery
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
      <TouchableOpacity
        style={[styles.trackCard, isActive && styles.trackCardActive]}
        onPress={() => handleTrackPress(item)}
        onLongPress={() => navigateToTrack(item)}
        activeOpacity={0.7}
      >
        <View style={styles.coverContainer}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cover} />
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
                color={theme.colors.background}
              />
            </View>
          )}
        </View>

        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{artistName}</Text>
          <View style={styles.trackMeta}>
            <Text style={styles.duration}>{formatDuration(duration)}</Text>
            <Text style={styles.plays}>{item.play_count?.toLocaleString() || 0} plays</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.moreButton} onPress={() => navigateToTrack(item)}>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderRadioStation = (station: RadioStation) => {
    const isSelected = selectedStation?.id === station.id;

    return (
      <TouchableOpacity
        key={station.id}
        style={[styles.stationCard, isSelected && styles.stationCardSelected]}
        onPress={() => loadStation(station)}
        activeOpacity={0.8}
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
      </TouchableOpacity>
    );
  };

  const isSearchActive = searchQuery.trim().length > 0;
  const displayTracks = isSearchActive ? searchResults : tracks;

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Find new music, earn rewards</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tracks, artists..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Navigation (only show when not searching) */}
      {!isSearchActive && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'browse' && styles.tabActive]}
            onPress={() => setActiveTab('browse')}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={activeTab === 'browse' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'browse' && styles.tabTextActive]}>
              Browse
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'radio' && styles.tabActive]}
            onPress={() => setActiveTab('radio')}
          >
            <Ionicons
              name="radio"
              size={16}
              color={activeTab === 'radio' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'radio' && styles.tabTextActive]}>
              Mood Radio
            </Text>
          </TouchableOpacity>
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
        // Search Results
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTrack}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !searchLoading && searchQuery.length >= 2 ? (
              <View style={styles.centered}>
                <Ionicons name="search" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>Try different keywords</Text>
              </View>
            ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
              <View style={styles.centered}>
                <Text style={styles.emptySubtext}>Enter at least 2 characters to search</Text>
              </View>
            ) : null
          }
        />
      ) : activeTab === 'browse' ? (
        // Browse Tab
        <>
          {error ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchTracks}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
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
                <TouchableOpacity
                  onPress={handleSkipNext}
                  style={styles.skipButton}
                  disabled={radioTracks.length === 0}
                >
                  <Ionicons name="play-skip-forward" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
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
                      <TouchableOpacity
                        key={track.id}
                        style={[styles.radioTrackItem, isActive && styles.radioTrackItemActive]}
                        onPress={() => playRadioTrack(track, index)}
                      >
                        <Text style={styles.radioTrackIndex}>{index + 1}</Text>
                        {coverUrl ? (
                          <Image source={{ uri: coverUrl }} style={styles.radioTrackCover} />
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
                      </TouchableOpacity>
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
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  // Search
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  trackCardActive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
  },
  coverPlaceholder: {
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(232, 232, 232, 0.85)',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  trackTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
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
  duration: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  plays: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.md,
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
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  stationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  stationCard: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stationCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  stationGradient: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  stationName: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  nowPlayingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  nowPlayingIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  nowPlayingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
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
    borderRadius: theme.borderRadius.sm,
  },
  radioTrackItemActive: {
    backgroundColor: theme.colors.surfaceElevated,
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
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  retryText: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
});
