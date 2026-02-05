import { theme } from '@/constants/theme';
import {
    getTrack,
    getTrackInteraction,
    getUserPlaylists,
    addTrackToPlaylist,
    likeTrack,
    unlikeTrack
} from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import type { Track, Playlist, TrackInteraction } from '@/types';
import { getArtistName, getCoverUrl, getDuration } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = width - 80;

export default function TrackDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, isAuthenticated } = useAuthStore();
    const { playTrack, addToQueue, currentTrack, isPlaying, pause, resume } = usePlayerStore();

    const [track, setTrack] = useState<Track | null>(null);
    const [interaction, setInteraction] = useState<TrackInteraction | null>(null);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [addingToPlaylist, setAddingToPlaylist] = useState<number | null>(null);
    const [isLiked, setIsLiked] = useState(false);

    const fetchData = useCallback(async () => {
        if (!id) return;

        try {
            setError(null);
            const trackData = await getTrack(Number(id));
            setTrack(trackData.track || trackData);

            // Fetch interaction data if authenticated
            if (isAuthenticated) {
                try {
                    const interactionData = await getTrackInteraction(Number(id));
                    setInteraction(interactionData);
                    setIsLiked(interactionData.is_liked || false);
                } catch (e) {
                    // Interaction endpoint may not exist yet - that's ok
                    console.log('Could not fetch track interaction:', e);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch track:', err);
            setError(err.response?.data?.message || 'Failed to load track');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, isAuthenticated]);

    const fetchPlaylists = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const data = await getUserPlaylists();
            setPlaylists(data.playlists || data || []);
        } catch (e) {
            console.error('Failed to fetch playlists:', e);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
    };

    const handlePlay = async () => {
        if (!track) return;

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

    const handleAddToQueue = async () => {
        if (!track) return;
        await addToQueue(track);
        Toast.show({
            type: 'success',
            text1: 'Added to Queue',
            text2: track.title,
            position: 'bottom',
            visibilityTime: 2000,
        });
    };

    const handleOpenPlaylistModal = async () => {
        if (!isAuthenticated) {
            Toast.show({
                type: 'info',
                text1: 'Sign in Required',
                text2: 'Please sign in to add to playlists',
            });
            return;
        }
        await fetchPlaylists();
        setShowPlaylistModal(true);
    };

    const handleAddToPlaylist = async (playlistId: number) => {
        if (!track) return;
        setAddingToPlaylist(playlistId);
        try {
            await addTrackToPlaylist(playlistId, track.id);
            Toast.show({
                type: 'success',
                text1: 'Added to Playlist',
                position: 'bottom',
            });
            setShowPlaylistModal(false);
        } catch (e: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to add',
                text2: e.response?.data?.message || 'Please try again',
            });
        } finally {
            setAddingToPlaylist(null);
        }
    };

    const handleLikeToggle = async () => {
        if (!track || !isAuthenticated) {
            Toast.show({
                type: 'info',
                text1: 'Sign in Required',
            });
            return;
        }

        try {
            if (isLiked) {
                await unlikeTrack(track.id);
                setIsLiked(false);
            } else {
                await likeTrack(track.id);
                setIsLiked(true);
            }
        } catch (e) {
            console.error('Failed to toggle like:', e);
        }
    };

    const handleShare = async () => {
        if (!track) return;
        try {
            await Share.share({
                message: `Check out "${track.title}" by ${getArtistName(track)} on Palletium!`,
                url: `https://palletium.com/track/${track.id}`,
            });
        } catch (e) {
            console.error('Share failed:', e);
        }
    };

    const navigateToArtist = () => {
        if (!track?.artist_id) return;
        router.push(`/artist/${track.artist_id}` as any);
    };

    const navigateToAlbum = () => {
        if (!track?.album) return;
        // Album detail not implemented yet - show toast
        Toast.show({
            type: 'info',
            text1: 'Coming Soon',
            text2: 'Album pages are in development',
        });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
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

    if (error || !track) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Track</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.center}>
                    <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
                    <Text style={styles.errorText}>{error || 'Track not found'}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const isCurrentTrack = currentTrack?.id === track.id;
    const coverUrl = getCoverUrl(track);
    const artistName = getArtistName(track);
    const duration = getDuration(track);
    const isFirstListen = !interaction?.has_listened;

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Track</Text>
                <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                    <Ionicons name="share-outline" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* Artwork */}
                <View style={styles.artworkContainer}>
                    {coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={styles.artwork} />
                    ) : (
                        <View style={[styles.artwork, styles.artworkPlaceholder]}>
                            <Ionicons name="musical-note" size={80} color={theme.colors.textMuted} />
                        </View>
                    )}
                </View>

                {/* Track Info */}
                <View style={styles.trackInfo}>
                    <Text style={styles.title}>{track.title}</Text>

                    <TouchableOpacity onPress={navigateToArtist} style={styles.artistRow}>
                        <Text style={styles.artist}>{artistName}</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {track.album && (
                        <TouchableOpacity onPress={navigateToAlbum} style={styles.albumRow}>
                            <Text style={styles.album}>{track.album}</Text>
                            <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
                        <Ionicons
                            name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
                            size={28}
                            color={theme.colors.background}
                        />
                        <Text style={styles.playButtonText}>
                            {isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={handleAddToQueue}>
                        <Ionicons name="list" size={22} color={theme.colors.textPrimary} />
                        <Text style={styles.secondaryButtonText}>Queue</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenPlaylistModal}>
                        <Ionicons name="add" size={22} color={theme.colors.textPrimary} />
                        <Text style={styles.secondaryButtonText}>Playlist</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconButton} onPress={handleLikeToggle}>
                        <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={24}
                            color={isLiked ? theme.colors.error : theme.colors.textMuted}
                        />
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
                        <Text style={styles.statText}>{formatDuration(duration)}</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Ionicons name="play" size={18} color={theme.colors.textMuted} />
                        <Text style={styles.statText}>{formatNumber(track.play_count || 0)} plays</Text>
                    </View>

                    {track.genre && (
                        <View style={styles.statItem}>
                            <Ionicons name="musical-notes" size={18} color={theme.colors.textMuted} />
                            <Text style={styles.statText}>{track.genre}</Text>
                        </View>
                    )}
                </View>

                {/* Payment Info */}
                <View style={styles.paymentSection}>
                    <View style={styles.divider} />
                    <View style={styles.paymentInfo}>
                        <Ionicons
                            name="cash"
                            size={20}
                            color={isFirstListen ? theme.colors.success : theme.colors.textMuted}
                        />
                        <View style={styles.paymentText}>
                            {isFirstListen ? (
                                <>
                                    <Text style={styles.paymentTitle}>First Listen Bonus</Text>
                                    <Text style={styles.paymentAmount}>Verified artist earns $1.00</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.paymentTitleMuted}>You've played this track</Text>
                                    <Text style={styles.paymentAmountMuted}>Artist earns $0.01 per play</Text>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* Share Button */}
                <TouchableOpacity style={styles.shareSection} onPress={handleShare}>
                    <Ionicons name="share-social" size={20} color={theme.colors.primary} />
                    <Text style={styles.shareText}>Share this track</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Add to Playlist Modal */}
            <Modal
                visible={showPlaylistModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowPlaylistModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add to Playlist</Text>
                        <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={playlists}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.playlistList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.playlistItem}
                                onPress={() => handleAddToPlaylist(item.id)}
                                disabled={addingToPlaylist === item.id}
                            >
                                <View style={styles.playlistCover}>
                                    <Ionicons name="musical-notes" size={20} color={theme.colors.textMuted} />
                                </View>
                                <View style={styles.playlistInfo}>
                                    <Text style={styles.playlistName}>{item.name}</Text>
                                    <Text style={styles.playlistMeta}>{item.track_count} tracks</Text>
                                </View>
                                {addingToPlaylist === item.id ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                    <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyPlaylists}>
                                <Text style={styles.emptyText}>No playlists yet</Text>
                                <Text style={styles.emptySubtext}>Create a playlist to add tracks</Text>
                            </View>
                        }
                    />
                </View>
            </Modal>
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
    shareButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: theme.spacing.md,
        paddingBottom: 120,
    },
    artworkContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    artwork: {
        width: ARTWORK_SIZE,
        height: ARTWORK_SIZE,
        borderRadius: theme.borderRadius.lg,
    },
    artworkPlaceholder: {
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackInfo: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    artistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    artist: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.textSecondary,
    },
    albumRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: theme.spacing.xs,
    },
    album: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.full,
        gap: theme.spacing.sm,
    },
    playButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.background,
    },
    secondaryButton: {
        alignItems: 'center',
        gap: 4,
    },
    secondaryButtonText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
    },
    iconButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    statText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
    },
    paymentSection: {
        marginBottom: theme.spacing.xl,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    paymentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
    },
    paymentText: {
        alignItems: 'flex-start',
    },
    paymentTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.success,
    },
    paymentAmount: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    paymentTitleMuted: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.textSecondary,
    },
    paymentAmountMuted: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
    },
    shareSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
    },
    shareText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.primary,
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
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    playlistList: {
        padding: theme.spacing.md,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surfaceElevated,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    playlistCover: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.background,
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
    },
    emptyPlaylists: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
    },
    emptySubtext: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        marginTop: theme.spacing.xs,
    },
});
