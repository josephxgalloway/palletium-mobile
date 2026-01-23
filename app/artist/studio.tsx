import { theme } from '@/constants/theme';
import { getMyTracks, updateTrack } from '@/lib/api/client';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

export default function ArtistStudioScreen() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);

    // Edit Form State
    const [editTitle, setEditTitle] = useState('');
    const [editGenre, setEditGenre] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTracks();
    }, []);

    const fetchTracks = async () => {
        try {
            const data = await getMyTracks();
            setTracks(data.tracks);
        } catch (error) {
            console.error('Failed to fetch tracks:', error);
            Toast.show({ type: 'error', text1: 'Failed to load tracks' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleEdit = (track: Track) => {
        setSelectedTrack(track);
        setEditTitle(track.title);
        setEditGenre(track.genre);
        setEditIsPublic(track.is_public);
        setEditModalVisible(true);
    };

    const saveChanges = async () => {
        if (!selectedTrack) return;
        setSaving(true);
        try {
            await updateTrack(selectedTrack.id, {
                title: editTitle,
                genre: editGenre,
                is_public: editIsPublic
            });

            Toast.show({ type: 'success', text1: 'Track updated' });
            setEditModalVisible(false);
            fetchTracks(); // Refresh list
        } catch (error) {
            Alert.alert('Error', 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const renderTrackItem = ({ item }: { item: Track }) => (
        <TouchableOpacity style={styles.trackCard} onPress={() => handleEdit(item)}>
            <View style={styles.trackInfo}>
                <Text style={styles.trackTitle}>{item.title}</Text>
                <Text style={styles.trackMeta}>{item.genre} • {item.play_count} plays</Text>
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
                <Ionicons name="create-outline" size={20} color={theme.colors.textMuted} style={{ marginLeft: 8 }} />
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTracks(); }} tintColor={theme.colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No tracks uploaded yet.</Text>
                            <Text style={styles.emptySubtext}>Upload tracks via the web platform.</Text>
                        </View>
                    }
                />
            )}

            {/* Edit Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Track</Text>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            value={editTitle}
                            onChangeText={setEditTitle}
                            placeholderTextColor={theme.colors.textMuted}
                        />

                        <Text style={styles.label}>Genre</Text>
                        <TextInput
                            style={styles.input}
                            value={editGenre}
                            onChangeText={setEditGenre}
                            placeholderTextColor={theme.colors.textMuted}
                        />

                        <View style={styles.switchRow}>
                            <Text style={styles.label}>Public Visibility</Text>
                            <TouchableOpacity
                                onPress={() => setEditIsPublic(!editIsPublic)}
                                style={[styles.toggle, editIsPublic && styles.toggleActive]}
                            >
                                <View style={[styles.thumb, editIsPublic && styles.thumbActive]} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={saveChanges}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                        </TouchableOpacity>
                    </View>
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
    emptyText: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.textPrimary,
        fontWeight: 'bold',
    },
    emptySubtext: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: 8,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    cancelText: {
        color: theme.colors.primary,
        fontSize: 16,
    },
    form: {
        gap: theme.spacing.lg,
    },
    label: {
        fontSize: theme.fontSize.sm,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    input: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        color: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    toggle: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: theme.colors.surfaceElevated,
        padding: 2,
    },
    toggleActive: {
        backgroundColor: theme.colors.success,
    },
    thumb: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#fff',
    },
    thumbActive: {
        transform: [{ translateX: 20 }],
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
