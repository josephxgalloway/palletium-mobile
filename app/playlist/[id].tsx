import { theme } from '@/constants/theme';
import {
    getPlaylist,
    updatePlaylist,
    removeTrackFromPlaylist,
    reorderPlaylistTracks
} from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import type { Playlist, Track } from '@/types';
import { getArtistName, getCoverUrl, getDuration } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
    GestureHandlerRootView,
    Swipeable
} from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = (width - 64) / 2;

export default function PlaylistDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, isAuthenticated } = useAuthStore();
    const { playTrack, addToQueue, currentTrack, isPlaying, pause, resume } = usePlayerStore();

    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const isOwner = playlist?.is_owner || (playlist?.creator_id === user?.id);

    const fetchData = useCallback(async () => {
        if (!id) return;

        try {
            setError(null);
            const data = await getPlaylist(Number(id));
            const playlistData = data.playlist || data;
            setPlaylist(playlistData);
            setEditName(playlistData.name);
            setEditDescription(playlistData.description || '');
        } catch (err: any) {
            console.error('Failed to fetch playlist:', err);
            setError(err.response?.data?.message || 'Failed to load playlist');
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

    const handlePlay = async () => {
        if (!playlist?.tracks || playlist.tracks.length === 0) return;

        // Play first track, then add rest to queue
        await playTrack(playlist.tracks[0]);
        for (let i = 1; i < playlist.tracks.length; i++) {
            await addToQueue(playlist.tracks[i]);
        }

        Toast.show({
            type: 'success',
            text1: 'Playing Playlist',
            text2: `${playlist.tracks.length} tracks`,
            position: 'bottom',
            visibilityTime: 2000,
        });
    };

    const handleShuffle = async () => {
        if (!playlist?.tracks || playlist.tracks.length === 0) return;

        // Shuffle the tracks
        const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);

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

            // Queue remaining tracks after this one
            if (playlist?.tracks) {
                const trackIndex = playlist.tracks.findIndex(t => t.id === track.id);
                for (let i = trackIndex + 1; i < playlist.tracks.length; i++) {
                    await addToQueue(playlist.tracks[i]);
                }
            }
        }
    };

    const navigateToTrack = (track: Track) => {
        router.push(`/track/${track.id}` as any);
    };

    const navigateToCreator = () => {
        if (!playlist?.creator_id) return;
        // Could be artist or user - for now navigate to artist
        router.push(`/artist/${playlist.creator_id}` as any);
    };

    const handleRemoveTrack = async (trackId: number) => {
        if (!playlist || !isOwner) return;

        Alert.alert(
            'Remove Track',
            'Are you sure you want to remove this track from the playlist?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeTrackFromPlaylist(playlist.id, trackId);
                            // Update local state
                            setPlaylist(prev => {
                                if (!prev || !prev.tracks) return prev;
                                return {
                                    ...prev,
                                    tracks: prev.tracks.filter(t => t.id !== trackId),
                                    track_count: prev.track_count - 1
                                };
                            });
                            Toast.show({
                                type: 'success',
                                text1: 'Track removed',
                                position: 'bottom',
                            });
                        } catch (e: any) {
                            Toast.show({
                                type: 'error',
                                text1: 'Failed to remove track',
                                text2: e.response?.data?.message || 'Please try again',
                            });
                        }
                    }
                }
            ]
        );
    };

    const handleSaveEdit = async () => {
        if (!playlist || !editName.trim()) return;

        setSaving(true);
        try {
            await updatePlaylist(playlist.id, {
                name: editName.trim(),
                description: editDescription.trim() || undefined
            });

            setPlaylist(prev => prev ? {
                ...prev,
                name: editName.trim(),
                description: editDescription.trim()
            } : null);

            setEditModalVisible(false);
            Toast.show({
                type: 'success',
                text1: 'Playlist updated',
            });
        } catch (e: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to update',
                text2: e.response?.data?.message || 'Please try again',
            });
        } finally {
            setSaving(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTotalDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const getTotalDuration = () => {
        if (playlist?.total_duration) return playlist.total_duration;
        if (!playlist?.tracks) return 0;
        return playlist.tracks.reduce((sum, track) => sum + getDuration(track), 0);
    };

    // Generate artwork grid from first 4 track covers
    const renderArtworkGrid = () => {
        if (playlist?.cover_url) {
            return (
                <Image source={{ uri: playlist.cover_url }} style={styles.playlistCover} />
            );
        }

        const covers = (playlist?.tracks || [])
            .slice(0, 4)
            .map(t => getCoverUrl(t))
            .filter(Boolean);

        if (covers.length === 0) {
            return (
                <View style={[styles.playlistCover, styles.playlistCoverPlaceholder]}>
                    <Ionicons name="musical-notes" size={60} color={theme.colors.textMuted} />
                </View>
            );
        }

        if (covers.length < 4) {
            return (
                <Image source={{ uri: covers[0] as string }} style={styles.playlistCover} />
            );
        }

        return (
            <View style={styles.artworkGrid}>
                {covers.map((url, index) => (
                    <Image
                        key={index}
                        source={{ uri: url as string }}
                        style={styles.artworkGridItem}
                    />
                ))}
            </View>
        );
    };

    const renderSwipeActions = (trackId: number) => {
        if (!isOwner) return null;

        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => handleRemoveTrack(trackId)}
            >
                <Ionicons name="trash" size={24} color="#fff" />
            </TouchableOpacity>
        );
    };

    const renderTrack = (track: Track, index: number) => {
        const isActive = currentTrack?.id === track.id;
        const coverUrl = getCoverUrl(track);
        const artistName = getArtistName(track);
        const duration = getDuration(track);

        const trackContent = (
            <TouchableOpacity
                style={[styles.trackItem, isActive && styles.trackItemActive]}
                onPress={() => handleTrackPress(track)}
                onLongPress={() => navigateToTrack(track)}
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
                        {track.title}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                        {artistName}
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

        if (isOwner) {
            return (
                <Swipeable
                    key={track.id}
                    renderRightActions={() => renderSwipeActions(track.id)}
                    overshootRight={false}
                >
                    {trackContent}
                </Swipeable>
            );
        }

        return <View key={track.id}>{trackContent}</View>;
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

    if (error || !playlist) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Playlist</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.center}>
                    <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
                    <Text style={styles.errorText}>{error || 'Playlist not found'}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Playlist</Text>
                    {isOwner ? (
                        <TouchableOpacity
                            onPress={() => setEditModalVisible(true)}
                            style={styles.editButton}
                        >
                            <Ionicons name="create-outline" size={22} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                    }
                >
                    {/* Playlist Info */}
                    <View style={styles.playlistInfo}>
                        {renderArtworkGrid()}

                        <View style={styles.infoContainer}>
                            <Text style={styles.playlistName}>{playlist.name}</Text>

                            <TouchableOpacity onPress={navigateToCreator} style={styles.creatorRow}>
                                <Text style={styles.creatorText}>by {playlist.creator_name || 'Unknown'}</Text>
                            </TouchableOpacity>

                            <Text style={styles.metaText}>
                                {playlist.track_count || playlist.tracks?.length || 0} tracks · {formatTotalDuration(getTotalDuration())}
                            </Text>

                            {playlist.description && (
                                <Text style={styles.description} numberOfLines={2}>
                                    {playlist.description}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Play Buttons */}
                    <View style={styles.playActions}>
                        <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
                            <Ionicons name="play" size={22} color={theme.colors.background} />
                            <Text style={styles.playButtonText}>Play</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.shuffleButton} onPress={handleShuffle}>
                            <Ionicons name="shuffle" size={22} color={theme.colors.primary} />
                            <Text style={styles.shuffleButtonText}>Shuffle</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tracks Section */}
                    <View style={styles.tracksSection}>
                        <Text style={styles.sectionTitle}>Tracks</Text>

                        {isOwner && (
                            <Text style={styles.swipeHint}>Swipe left to remove</Text>
                        )}

                        {(!playlist.tracks || playlist.tracks.length === 0) ? (
                            <View style={styles.emptyTracks}>
                                <Ionicons name="musical-notes-outline" size={48} color={theme.colors.textMuted} />
                                <Text style={styles.emptyText}>No tracks in this playlist</Text>
                                <Text style={styles.emptySubtext}>Add tracks from the discover page</Text>
                            </View>
                        ) : (
                            playlist.tracks.map((track, index) => renderTrack(track, index))
                        )}
                    </View>
                </ScrollView>

                {/* Edit Modal */}
                <Modal
                    visible={editModalVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setEditModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Edit Playlist</Text>
                            <TouchableOpacity onPress={handleSaveEdit} disabled={saving || !editName.trim()}>
                                {saving ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                    <Text style={[
                                        styles.saveText,
                                        !editName.trim() && styles.saveTextDisabled
                                    ]}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.editForm}>
                            <Text style={styles.inputLabel}>Name</Text>
                            <TextInput
                                style={styles.input}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Playlist name"
                                placeholderTextColor={theme.colors.textMuted}
                            />

                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={editDescription}
                                onChangeText={setEditDescription}
                                placeholder="Add a description (optional)"
                                placeholderTextColor={theme.colors.textMuted}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </GestureHandlerRootView>
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
    editButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: theme.spacing.md,
        paddingBottom: 120,
    },
    playlistInfo: {
        flexDirection: 'row',
        marginBottom: theme.spacing.xl,
    },
    playlistCover: {
        width: ARTWORK_SIZE,
        height: ARTWORK_SIZE,
        borderRadius: theme.borderRadius.lg,
    },
    playlistCoverPlaceholder: {
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    artworkGrid: {
        width: ARTWORK_SIZE,
        height: ARTWORK_SIZE,
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
    },
    artworkGridItem: {
        width: ARTWORK_SIZE / 2,
        height: ARTWORK_SIZE / 2,
    },
    infoContainer: {
        flex: 1,
        marginLeft: theme.spacing.md,
        justifyContent: 'center',
    },
    playlistName: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    creatorRow: {
        marginBottom: theme.spacing.xs,
    },
    creatorText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    metaText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.sm,
    },
    description: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    playActions: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    playButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.full,
        gap: theme.spacing.sm,
    },
    playButtonText: {
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
    shuffleButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.primary,
    },
    tracksSection: {
        marginTop: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    swipeHint: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.md,
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.background,
    },
    trackItemActive: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: -theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
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
    trackArtist: {
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
    deleteAction: {
        backgroundColor: theme.colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
    emptyTracks: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
    },
    emptySubtext: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        marginTop: theme.spacing.xs,
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
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    cancelText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
    },
    saveText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.primary,
    },
    saveTextDisabled: {
        opacity: 0.5,
    },
    editForm: {
        padding: theme.spacing.lg,
    },
    inputLabel: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
        marginTop: theme.spacing.md,
    },
    input: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
});
