import { theme } from '@/constants/theme';
import { createCommunityPost, getCommunityPosts } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

interface Post {
    id: number;
    user_name: string;
    tier_id?: number;
    content: string;
    created_at: string;
    track_title?: string;
    track_artist?: string;
    likes_count?: number; // Future proofing
}

export default function CommunityScreen() {
    const { user } = useAuthStore();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Create Post State
    const [isModalVisible, setModalVisible] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [posting, setPosting] = useState(false);

    const fetchPosts = useCallback(async () => {
        try {
            const response = await getCommunityPosts();
            setPosts(response.data.posts);
        } catch (error) {
            console.error('Failed to fetch posts:', error);
            Toast.show({
                type: 'error',
                text1: 'Failed to load community feed',
            });
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchPosts();
            setLoading(false);
        };
        init();
    }, [fetchPosts]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPosts();
        setRefreshing(false);
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;

        setPosting(true);
        try {
            await createCommunityPost(newPostContent);
            setNewPostContent('');
            setModalVisible(false);
            Toast.show({
                type: 'success',
                text1: 'Post created!',
            });
            // Refresh feed
            onRefresh();
        } catch (error) {
            console.error('Failed to create post:', error);
            Toast.show({
                type: 'error',
                text1: 'Failed to create post',
                text2: 'Please try again later'
            });
        } finally {
            setPosting(false);
        }
    };

    const renderPost = ({ item }: { item: Post }) => (
        <View style={styles.postCard}>
            <View style={styles.postHeader}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {item.user_name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.userName}>{item.user_name}</Text>
                    <Text style={styles.timestamp}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
                {item.tier_id && item.tier_id > 1 && (
                    <View style={styles.tierBadge}>
                        <Ionicons name="star" size={12} color={theme.colors.accent} />
                    </View>
                )}
            </View>

            <Text style={styles.postContent}>{item.content}</Text>

            {item.track_title && (
                <View style={styles.trackAttachment}>
                    <Ionicons name="musical-note" size={20} color={theme.colors.primary} />
                    <View>
                        <Text style={styles.trackTitle}>{item.track_title}</Text>
                        <Text style={styles.trackArtist}>{item.track_artist}</Text>
                    </View>
                </View>
            )}

            <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="heart-outline" size={20} color={theme.colors.textMuted} />
                    <Text style={styles.actionText}>Like</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textMuted} />
                    <Text style={styles.actionText}>Reply</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Community</Text>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.feed}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={64} color={theme.colors.textMuted} />
                            <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
                        </View>
                    }
                />
            )}

            {/* Create Post Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>New Post</Text>
                        <TouchableOpacity
                            onPress={handleCreatePost}
                            disabled={posting || !newPostContent.trim()}
                            style={[styles.postButton, (!newPostContent.trim() || posting) && styles.disabledButton]}
                        >
                            {posting ? (
                                <ActivityIndicator size="small" color={theme.colors.background} />
                            ) : (
                                <Text style={styles.postButtonText}>Post</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="What's on your mind?"
                        placeholderTextColor={theme.colors.textMuted}
                        multiline
                        autoFocus
                        value={newPostContent}
                        onChangeText={setNewPostContent}
                    />
                </KeyboardAvoidingView>
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
    headerTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    createButton: {
        padding: theme.spacing.xs,
    },
    feed: {
        padding: theme.spacing.md,
    },
    postCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.sm,
    },
    avatarText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: theme.fontSize.md,
    },
    headerInfo: {
        flex: 1,
    },
    userName: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
        fontSize: theme.fontSize.md,
    },
    timestamp: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
    tierBadge: {
        padding: 4,
    },
    postContent: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.md,
        lineHeight: 22,
        marginBottom: theme.spacing.md,
    },
    trackAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    trackTitle: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
        fontSize: theme.fontSize.sm,
    },
    trackArtist: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
    postActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.sm,
        gap: theme.spacing.xl,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        color: theme.colors.textMuted,
        marginTop: theme.spacing.md,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
    },
    cancelText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.md,
    },
    postButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.full,
    },
    disabledButton: {
        backgroundColor: theme.colors.surfaceElevated,
        opacity: 0.5,
    },
    postButtonText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: theme.fontSize.md,
    },
    input: {
        flex: 1,
        padding: theme.spacing.md,
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.lg,
        textAlignVertical: 'top',
    },
});
