import { theme } from '@/constants/theme';
import {
    getArtist,
    getArtistTracks,
    followArtist,
    unfollowArtist
} from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import type { Artist, Track } from '@/types';
import { getArtistName, getCoverUrl, getDuration } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function ArtistDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, isAuthenticated } = useAuthStore();
    const { playTrack, addToQueue, currentTrack, isPlaying, pause, resume } = usePlayerStore();

    const [artist, setArtist] = useState<Artist | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const isOwnProfile = user?.type === 'artist' && user?.id === Number(id);

    const fetchData = useCallback(async () => {
        if (!id) return;

        try {
            setError(null);
            const [artistData, tracksData] = await Promise.all([
                getArtist(Number(id)),
                getArtistTracks(Number(id))
            ]);

            const artistInfo = artistData.artist || artistData;
            setArtist(artistInfo);
            setIsFollowing(artistInfo.is_following || false);
            setTracks(tracksData.tracks || tracksData || []);
        } catch (err: any) {
            console.error('Failed to fetch artist:', err);
            setError(err.response?.data?.message || 'Failed to load artist');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
    };

    const handleFollow = async () => {
        if (!isAuthenticated) {
            Toast.show({
                type: 'info',
                text1: 'Sign in Required',
                text2: 'Please sign in to follow artists',
            });
            return;
        }

        if (!artist) return;

        setFollowLoading(true);
        try {
            if (isFollowing) {
                await unfollowArtist(artist.id);
                setIsFollowing(false);
                setArtist(prev => prev ? { ...prev, follower_count: prev.follower_count - 1 } : null);
            } else {
                await followArtist(artist.id);
                setIsFollowing(true);
                setArtist(prev => prev ? { ...prev, follower_count: prev.follower_count + 1 } : null);
            }
        } catch (e: any) {
            Toast.show({
                type: 'error',
                text1: 'Action failed',
                text2: e.response?.data?.message || 'Please try again',
            });
        } finally {
            setFollowLoading(false);
        }
    };

    const handlePlayAll = async () => {
        if (tracks.length === 0) return;

        // Play first track, then add rest to queue
        await playTrack(tracks[0]);
        for (let i = 1; i < tracks.length; i++) {
            await addToQueue(tracks[i]);
        }

        Toast.show({
            type: 'success',
            text1: 'Playing All',
            text2: `${tracks.length} tracks queued`,
            position: 'bottom',
            visibilityTime: 2000,
        });
    };

    const handleShuffle = async () => {
        if (tracks.length === 0) return;

        // Shuffle the tracks
        const shuffled = [...tracks].sort(() => Math.random() - 0.5);

        // Play first shuffled track, then add rest to queue
        await playTrack(shuffled[0]);
        for (let i = 1; i < shuffled.length; i++) {
            await addToQueue(shuffled[i]);
        }

        Toast.show({
            type: 'success',
            text1: 'Shuffle Play',
            text2: `${shuffled.length} tracks shuffled`,
            position: 'bottom',
            visibilityTime: 2000,
        });
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

    const navigateToTrack = (track: Track) => {
        router.push(`/track/${track.id}` as any);
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getArtistTierLabel = (level: number) => {
        if (level >= 40) return 'Icon';
        if (level >= 25) return 'Established';
        if (level >= 10) return 'Rising Star';
        return 'Emerging';
    };

    const renderHeader = () => {
        if (!artist) return null;

        return (
            <View>
                {/* Profile Section */}
                <LinearGradient
                    colors={[theme.colors.surfaceElevated, theme.colors.background]}
                    style={styles.profileSection}
                >
                    <View style={styles.profileRow}>
                        {artist.profile_image_url ? (
                            <Image
                                source={{ uri: artist.profile_image_url }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                                <Text style={styles.profileImageText}>
                                    {artist.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}

                        <View style={styles.profileInfo}>
                            <Text style={styles.artistName}>{artist.name}</Text>
                            {artist.handle && (
                                <Text style={styles.handle}>@{artist.handle}</Text>
                            )}
                            <View style={styles.statsRow}>
                                <Text style={styles.statText}>
                                    {formatNumber(artist.follower_count)} followers
                                </Text>
                                <Text style={styles.statDivider}>·</Text>
                                <Text style={styles.statText}>
                                    Level {artist.level}
                                </Text>
                            </View>
                        </View>

                        {!isOwnProfile && (
                            <TouchableOpacity
                                style={[
                                    styles.followButton,
                                    isFollowing && styles.followingButton
                                ]}
                                onPress={handleFollow}
                                disabled={followLoading}
                            >
                                {followLoading ? (
                                    <ActivityIndicator size="small" color={isFollowing ? theme.colors.primary : theme.colors.background} />
                                ) : (
                                    <Text style={[
                                        styles.followButtonText,
                                        isFollowing && styles.followingButtonText
                                    ]}>
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Artist Tier Badge */}
                    <View style={styles.tierBadge}>
                        <Ionicons name="star" size={14} color={theme.colors.accent} />
                        <Text style={styles.tierText}>{getArtistTierLabel(artist.level)}</Text>
                    </View>

                    {/* Bio */}
                    {artist.bio && (
                        <Text style={styles.bio} numberOfLines={4}>{artist.bio}</Text>
                    )}

                    {/* Stats Cards - Only show earnings if own profile */}
                    <View style={styles.statsCards}>
                        <View style={styles.statCard}>
                            <Text style={styles.statCardValue}>{formatNumber(artist.total_plays)}</Text>
                            <Text style={styles.statCardLabel}>Total Plays</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statCardValue}>{artist.track_count || tracks.length}</Text>
                            <Text style={styles.statCardLabel}>Tracks</Text>
                        </View>
                        {isOwnProfile && artist.total_earnings !== undefined && (
                            <View style={styles.statCard}>
                                <Text style={[styles.statCardValue, { color: theme.colors.success }]}>
                                    ${artist.total_earnings.toFixed(2)}
                                </Text>
                                <Text style={styles.statCardLabel}>Earnings</Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>

                {/* Play All / Shuffle Buttons */}
                <View style={styles.playActions}>
                    <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAll}>
                        <Ionicons name="play" size={22} color={theme.colors.background} />
                        <Text style={styles.playAllText}>Play All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.shuffleButton} onPress={handleShuffle}>
                        <Ionicons name="shuffle" size={22} color={theme.colors.primary} />
                        <Text style={styles.shuffleText}>Shuffle</Text>
                    </TouchableOpacity>
                </View>

                {/* Tracks Section Title */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Popular Tracks</Text>
                </View>
            </View>
        );
    };

    const renderTrack = ({ item, index }: { item: Track; index: number }) => {
        const isActive = currentTrack?.id === item.id;
        const coverUrl = getCoverUrl(item);
        const duration = getDuration(item);

        return (
            <TouchableOpacity
                style={[styles.trackItem, isActive && styles.trackItemActive]}
                onPress={() => handleTrackPress(item)}
                onLongPress={() => navigateToTrack(item)}
            >
                <Text style={styles.trackNumber}>{index + 1}</Text>

                {coverUrl ? (
                    <Image source={{ uri: coverUrl }} style={styles.trackCover} />
                ) : (
                    <View style={[styles.trackCover, styles.trackCoverPlaceholder]}>
                        <Ionicons name="musical-note" size={16} color={theme.colors.textMuted} />
                    </View>
                )}

                <View style={styles.trackInfo}>
                    <Text
                        style={[styles.trackTitle, isActive && styles.trackTitleActive]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    <Text style={styles.trackMeta}>
                        {formatNumber(item.play_count || 0)} plays
                    </Text>
                </View>

                <Text style={styles.trackDuration}>{formatDuration(duration)}</Text>

                {isActive && isPlaying && (
                    <View style={styles.nowPlaying}>
                        <Ionicons name="volume-high" size={16} color={theme.colors.primary} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !artist) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Artist</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.center}>
                    <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
                    <Text style={styles.errorText}>{error || 'Artist not found'}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Artist</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={tracks}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderTrack}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyTracks}>
                        <Ionicons name="musical-notes-outline" size={48} color={theme.colors.textMuted} />
                        <Text style={styles.emptyText}>No tracks yet</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.textSecondary,
    },
    content: {
        paddingBottom: 120,
    },
    profileSection: {
        padding: theme.spacing.lg,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    profileImagePlaceholder: {
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImageText: {
        fontSize: 32,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.primary,
    },
    profileInfo: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    artistName: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    handle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing.xs,
    },
    statText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    statDivider: {
        color: theme.colors.textMuted,
        marginHorizontal: theme.spacing.sm,
    },
    followButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        minWidth: 90,
        alignItems: 'center',
    },
    followingButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    followButtonText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.background,
    },
    followingButtonText: {
        color: theme.colors.primary,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    tierText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.accent,
    },
    bio: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        lineHeight: 22,
        marginBottom: theme.spacing.lg,
    },
    statsCards: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    statCardValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    statCardLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
        marginTop: 4,
    },
    playActions: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    playAllButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.full,
        gap: theme.spacing.sm,
    },
    playAllText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.background,
    },
    shuffleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.full,
        gap: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    shuffleText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.primary,
    },
    sectionHeader: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
    },
    trackItemActive: {
        backgroundColor: theme.colors.surface,
    },
    trackNumber: {
        width: 24,
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
    trackCover: {
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.sm,
        marginLeft: theme.spacing.sm,
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
        color: theme.colors.primary,
    },
    trackMeta: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    trackDuration: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        marginLeft: theme.spacing.md,
    },
    nowPlaying: {
        marginLeft: theme.spacing.sm,
    },
    emptyTracks: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textMuted,
        marginTop: theme.spacing.md,
    },
    errorText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
    },
    retryText: {
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.semibold,
    },
});
