import { RoleGate } from '@/components/RoleGate';
import { theme } from '@/constants/theme';
import { getArtistTracks } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

interface Track {
    id: number;
    title: string;
    genre: string;
    play_count: number;
    review_status: 'pending' | 'approved' | 'rejected';
    is_public: boolean;
    created_at: string;
}

// Gate: artist-only — no hooks fire before RoleGate resolves
export default function ArtistStudioPage() {
    return (
        <RoleGate allow={['artist']}>
            <ArtistStudioScreen />
        </RoleGate>
    );
}

function ArtistStudioScreen() {
    const { user } = useAuthStore();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchTracks = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            console.log('ArtistStudio: Fetching tracks for user ID:', user.id);
            const data = await getArtistTracks(user.id);

            // Handle various response formats
            let trackList: Track[] = [];
            if (Array.isArray(data)) {
                trackList = data;
            } else if (data?.tracks && Array.isArray(data.tracks)) {
                trackList = data.tracks;
            } else if (data?.data && Array.isArray(data.data)) {
                trackList = data.data;
            }

            console.log('ArtistStudio: Found', trackList.length, 'tracks');
            setTracks(trackList);
        } catch (error: any) {
            console.error('ArtistStudio: Failed to fetch tracks:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to load tracks';
            Toast.show({ type: 'error', text1: 'Error', text2: errorMessage });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    // Refresh tracks when screen is focused (e.g., after editing)
    useFocusEffect(
        useCallback(() => {
            fetchTracks();
        }, [fetchTracks])
    );

    const handleEditTrack = (track: Track) => {
        router.push(`/artist/track/${track.id}/edit` as any);
    };

    const renderTrackItem = ({ item }: { item: Track }) => (
        <TouchableOpacity style={styles.trackCard} onPress={() => handleEditTrack(item)}>
            <View style={styles.trackInfo}>
                <Text style={styles.trackTitle}>{item.title}</Text>
                <Text style={styles.trackMeta}>{item.genre || 'No genre'} • {item.play_count} plays</Text>
            </View>

            <View style={styles.statusContainer}>
                {item.review_status === 'pending' && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.warning }]}>
                        <Text style={styles.badgeText}>Pending</Text>
                    </View>
                )}
                {item.review_status === 'rejected' && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                        <Text style={styles.badgeText}>Rejected</Text>
                    </View>
                )}
                {item.review_status === 'approved' && (
                    <View style={[styles.badge, { backgroundColor: item.is_public ? theme.colors.success : theme.colors.textMuted }]}>
                        <Text style={styles.badgeText}>{item.is_public ? 'Public' : 'Private'}</Text>
                    </View>
                )}
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditTrack(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="pencil" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Artist Studio</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={tracks}
                    renderItem={renderTrackItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchTracks();
                            }}
                            tintColor={theme.colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="musical-notes-outline" size={48} color={theme.colors.textMuted} />
                            <Text style={styles.emptyText}>No tracks uploaded yet</Text>
                            <Text style={styles.emptySubtext}>Upload tracks via the web platform</Text>
                        </View>
                    }
                />
            )}
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
        marginTop: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    listContent: {
        padding: theme.spacing.md,
        flexGrow: 1,
    },
    trackCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    trackInfo: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    trackTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    trackMeta: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.textPrimary,
        fontWeight: 'bold',
        marginTop: theme.spacing.md,
    },
    emptySubtext: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
});
