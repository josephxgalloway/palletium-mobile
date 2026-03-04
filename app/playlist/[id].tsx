import { theme } from '@/constants/theme';
import {
    getPlaylist,
    updatePlaylist,
    uploadPlaylistCover,
    removeTrackFromPlaylist,
    reorderPlaylistTracks
} from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import type { Playlist, Track } from '@/types';
import { getArtistName, getCoverUrl, getDuration } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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
const COVER_SIZE = width * 0.52;

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
    const [editCoverUri, setEditCoverUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

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

        const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);

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
        router.push(`/artist/${playlist.creator_id}` as any);
    };

    const handleRemoveTrack = async (trackId: number) => {
        if (!playlist || !isOwner) return;

        Alert.alert(
            'Remove Track',
            'Remove this track from the playlist?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeTrackFromPlaylist(playlist.id, trackId);
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

    const pickCoverImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setEditCoverUri(result.assets[0].uri);
        }
    };

    const handleSaveEdit = async () => {
        if (!playlist || !editName.trim()) return;

        setSaving(true);
        try {
            // Upload cover image if changed
            if (editCoverUri) {
                setUploadingCover(true);
                try {
                    const coverResult = await uploadPlaylistCover(playlist.id, editCoverUri);
                    setPlaylist(prev => prev ? {
                        ...prev,
                        cover_url: coverResult.coverImageUrl || coverResult.playlist?.cover_image
                    } : null);
                } catch (e: any) {
                    Toast.show({
                        type: 'error',
                        text1: 'Cover upload failed',
                        text2: e.response?.data?.message || 'Image may be too large',
                    });
                } finally {
                    setUploadingCover(false);
                }
            }

            // Update name/description
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
            setEditCoverUri(null);
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
        return `${mins} min`;
    };

    const getTotalDuration = () => {
        if (playlist?.total_duration) return playlist.total_duration;
        if (!playlist?.tracks) return 0;
        return playlist.tracks.reduce((sum, track) => sum + getDuration(track), 0);
    };

    const getPlaylistCoverUrl = (): string | null => {
        if (playlist?.cover_url) return playlist.cover_url;
        // Fallback to cover_image from backend
        if ((playlist as any)?.cover_image) return (playlist as any).cover_image;
        return null;
    };

    // Generate artwork grid from first 4 track covers
    const renderArtworkGrid = () => {
        const coverUrl = getPlaylistCoverUrl();
        if (coverUrl) {
            return (
                <Image source={{ uri: coverUrl }} style={styles.playlistCover} />
            );
        }

        const covers = (playlist?.tracks || [])
            .slice(0, 4)
            .map(t => getCoverUrl(t))
            .filter(Boolean);

        if (covers.length === 0) {
            return (
                <View style={[styles.playlistCover, styles.playlistCoverPlaceholder]}>
                    <LinearGradient
                        colors={['rgba(108,134,168,0.15)', 'rgba(108,134,168,0.05)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name="musical-notes" size={52} color={theme.colors.textMuted} />
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
                <Ionicons name="trash-outline" size={22} color="#fff" />
                <Text style={styles.deleteActionText}>Remove</Text>
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
                activeOpacity={0.6}
            >
                {/* Track number or playing indicator */}
                {isActive && isPlaying ? (
                    <View style={styles.trackNumberContainer}>
                        <Ionicons name="volume-high" size={14} color={theme.colors.primary} />
                    </View>
                ) : (
                    <View style={styles.trackNumberContainer}>
                        <Text style={[styles.trackNumber, isActive && styles.trackNumberActive]}>{index + 1}</Text>
                    </View>
                )}

                {coverUrl ? (
                    <Image source={{ uri: coverUrl }} style={styles.trackCover} />
                ) : (
                    <View style={[styles.trackCover, styles.trackCoverPlaceholder]}>
                        <Ionicons name="musical-note" size={18} color={theme.colors.textMuted} />
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
                        {artistName}{track.album ? ` · ${track.album}` : ''}
                    </Text>
                </View>

                <Text style={[styles.trackDuration, isActive && styles.trackDurationActive]}>
                    {formatDuration(duration)}
                </Text>
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

    const trackCount = playlist.track_count || playlist.tracks?.length || 0;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                <LinearGradient
                    colors={['rgba(108,134,168,0.1)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Playlist</Text>
                    {isOwner ? (
                        <TouchableOpacity
                            onPress={() => {
                                setEditCoverUri(null);
                                setEditName(playlist.name);
                                setEditDescription(playlist.description || '');
                                setEditModalVisible(true);
                            }}
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
                    showsVerticalScrollIndicator={false}
                >
                    {/* Playlist Hero */}
                    <View style={styles.heroSection}>
                        <View style={styles.coverContainer}>
                            {renderArtworkGrid()}
                            <View style={styles.coverShadow} />
                        </View>

                        <Text style={styles.playlistName} numberOfLines={2}>{playlist.name}</Text>

                        <TouchableOpacity onPress={navigateToCreator} style={styles.creatorRow}>
                            <Text style={styles.creatorText}>by {playlist.creator_name || 'You'}</Text>
                        </TouchableOpacity>

                        <View style={styles.metaRow}>
                            <View style={styles.metaPill}>
                                <Ionicons name="musical-notes-outline" size={13} color={theme.colors.textSecondary} />
                                <Text style={styles.metaPillText}>{trackCount} {trackCount === 1 ? 'track' : 'tracks'}</Text>
                            </View>
                            <View style={styles.metaPill}>
                                <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
                                <Text style={styles.metaPillText}>{formatTotalDuration(getTotalDuration())}</Text>
                            </View>
                            {playlist.is_public && (
                                <View style={styles.metaPill}>
                                    <Ionicons name="globe-outline" size={13} color={theme.colors.textSecondary} />
                                    <Text style={styles.metaPillText}>Public</Text>
                                </View>
                            )}
                        </View>

                        {playlist.description ? (
                            <Text style={styles.description} numberOfLines={3}>
                                {playlist.description}
                            </Text>
                        ) : null}
                    </View>

                    {/* Play Buttons */}
                    <View style={styles.playActions}>
                        <TouchableOpacity
                            style={[styles.playButton, trackCount === 0 && styles.buttonDisabled]}
                            onPress={handlePlay}
                            disabled={trackCount === 0}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="play" size={20} color={theme.colors.background} />
                            <Text style={styles.playButtonText}>Play</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.shuffleButton, trackCount === 0 && styles.buttonDisabled]}
                            onPress={handleShuffle}
                            disabled={trackCount === 0}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="shuffle" size={20} color={theme.colors.primary} />
                            <Text style={styles.shuffleButtonText}>Shuffle</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tracks Section */}
                    <View style={styles.tracksSection}>
                        <View style={styles.tracksSectionHeader}>
                            <Ionicons name="list-outline" size={16} color={theme.colors.textMuted} />
                            <Text style={styles.tracksSectionTitle}>TRACKLIST</Text>
                        </View>

                        {isOwner && trackCount > 0 && (
                            <Text style={styles.swipeHint}>Swipe left on a track to remove it</Text>
                        )}

                        {(!playlist.tracks || playlist.tracks.length === 0) ? (
                            <View style={styles.emptyTracks}>
                                <View style={styles.emptyIconRing}>
                                    <Ionicons name="musical-notes-outline" size={40} color={theme.colors.textMuted} />
                                </View>
                                <Text style={styles.emptyText}>No tracks yet</Text>
                                <Text style={styles.emptySubtext}>
                                    Browse Discover to find tracks and add them to this playlist
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.tracksList}>
                                {playlist.tracks.map((track, index) => renderTrack(track, index))}
                            </View>
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

                        <ScrollView style={styles.editForm} showsVerticalScrollIndicator={false}>
                            {/* Cover Image Picker */}
                            <Text style={styles.inputLabel}>Cover Image</Text>
                            <TouchableOpacity style={styles.coverPicker} onPress={pickCoverImage} activeOpacity={0.7}>
                                {editCoverUri ? (
                                    <Image source={{ uri: editCoverUri }} style={styles.coverPickerImage} />
                                ) : getPlaylistCoverUrl() ? (
                                    <Image source={{ uri: getPlaylistCoverUrl()! }} style={styles.coverPickerImage} />
                                ) : (
                                    <View style={styles.coverPickerPlaceholder}>
                                        <Ionicons name="image-outline" size={32} color={theme.colors.textMuted} />
                                    </View>
                                )}
                                <View style={styles.coverPickerOverlay}>
                                    <View style={styles.coverPickerBadge}>
                                        <Ionicons name="camera" size={16} color="#fff" />
                                    </View>
                                </View>
                                {uploadingCover && (
                                    <View style={styles.coverPickerLoading}>
                                        <ActivityIndicator size="small" color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>
                            <Text style={styles.coverHint}>Tap to choose a cover photo</Text>

                            {/* Name */}
                            <Text style={styles.inputLabel}>Name</Text>
                            <TextInput
                                style={styles.input}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Playlist name"
                                placeholderTextColor={theme.colors.textMuted}
                            />

                            {/* Description */}
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={editDescription}
                                onChangeText={setEditDescription}
                                placeholder="What's this playlist about?"
                                placeholderTextColor={theme.colors.textMuted}
                                multiline
                                textAlignVertical="top"
                            />
                        </ScrollView>
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
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    editButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: theme.spacing.md,
        paddingBottom: 120,
    },
    // Hero section - centered artwork + info
    heroSection: {
        alignItems: 'center',
        paddingTop: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    coverContainer: {
        marginBottom: theme.spacing.lg,
    },
    playlistCover: {
        width: COVER_SIZE,
        height: COVER_SIZE,
        borderRadius: 16,
    },
    playlistCoverPlaceholder: {
        backgroundColor: 'rgba(27,31,43,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.06)',
    },
    coverShadow: {
        position: 'absolute',
        bottom: -8,
        left: 16,
        right: 16,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
        zIndex: -1,
    },
    artworkGrid: {
        width: COVER_SIZE,
        height: COVER_SIZE,
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderRadius: 16,
        overflow: 'hidden',
    },
    artworkGridItem: {
        width: COVER_SIZE / 2,
        height: COVER_SIZE / 2,
    },
    playlistName: {
        fontSize: 26,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 6,
        paddingHorizontal: theme.spacing.md,
    },
    creatorRow: {
        marginBottom: theme.spacing.sm,
    },
    creatorText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    metaRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.06)',
    },
    metaPillText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    description: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    // Play Actions
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
        paddingVertical: 14,
        borderRadius: 14,
        gap: theme.spacing.sm,
    },
    playButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.background,
    },
    shuffleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(27,31,43,0.6)',
        paddingVertical: 14,
        borderRadius: 14,
        gap: theme.spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.08)',
    },
    shuffleButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    buttonDisabled: {
        opacity: 0.35,
    },
    // Tracks Section
    tracksSection: {},
    tracksSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: theme.spacing.sm,
        marginLeft: theme.spacing.xs,
    },
    tracksSectionTitle: {
        fontSize: theme.fontSize.xs,
        fontWeight: '600',
        color: theme.colors.textMuted,
        letterSpacing: 1,
    },
    swipeHint: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.sm,
        marginLeft: theme.spacing.xs,
    },
    tracksList: {
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.06)',
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(192,200,214,0.04)',
    },
    trackItemActive: {
        backgroundColor: 'rgba(108,134,168,0.1)',
    },
    trackNumberContainer: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackNumber: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        fontWeight: '500',
    },
    trackNumberActive: {
        color: theme.colors.primary,
    },
    trackCover: {
        width: 48,
        height: 48,
        borderRadius: 8,
        marginLeft: theme.spacing.sm,
    },
    trackCoverPlaceholder: {
        backgroundColor: 'rgba(192,200,214,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackInfo: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    trackTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: '500',
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
        fontWeight: '500',
    },
    trackDurationActive: {
        color: theme.colors.primary,
    },
    deleteAction: {
        backgroundColor: theme.colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        gap: 2,
    },
    deleteActionText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '500',
    },
    emptyTracks: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.06)',
    },
    emptyIconRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(108,134,168,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    emptySubtext: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        marginTop: theme.spacing.xs,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.xl,
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
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.08)',
    },
    retryText: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(192,200,214,0.06)',
    },
    modalTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    cancelText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
    },
    saveText: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    saveTextDisabled: {
        opacity: 0.4,
    },
    editForm: {
        padding: theme.spacing.lg,
    },
    coverPicker: {
        width: 140,
        height: 140,
        borderRadius: 14,
        alignSelf: 'center',
        marginBottom: theme.spacing.xs,
        overflow: 'hidden',
    },
    coverPickerImage: {
        width: '100%',
        height: '100%',
    },
    coverPickerPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(27,31,43,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.08)',
        borderRadius: 14,
    },
    coverPickerOverlay: {
        position: 'absolute',
        bottom: 8,
        right: 8,
    },
    coverPickerBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverPickerLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverHint: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    inputLabel: {
        fontSize: theme.fontSize.xs,
        fontWeight: '600',
        color: theme.colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    input: {
        backgroundColor: 'rgba(27,31,43,0.6)',
        borderRadius: 12,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: 'rgba(192,200,214,0.08)',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
});
