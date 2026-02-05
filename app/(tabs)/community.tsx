import { theme } from '@/constants/theme';
import { FEATURE_GATES, FeatureGate } from '@/config/featureGates';
import { createCommunityPost, getCommunityPosts, api } from '@/lib/api/client';
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
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

interface PlatformStats {
    totalUsers: number;
    totalArtists: number;
    totalTracks: number;
    monthlyActiveUsers: number;
}

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

type TabType = 'feed' | 'roadmap';

export default function CommunityScreen() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<TabType>('feed');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Platform stats for roadmap
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [joinedWaitlists, setJoinedWaitlists] = useState<Set<string>>(new Set());

    // Create Post State
    const [isModalVisible, setModalVisible] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [posting, setPosting] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const response = await api.get('/stats/platform');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch platform stats:', error);
        } finally {
            setStatsLoading(false);
        }
    }, []);

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
            await Promise.all([fetchPosts(), fetchStats()]);
            setLoading(false);
        };
        init();
    }, [fetchPosts, fetchStats]);

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

    const handleJoinWaitlist = async (featureKey: string) => {
        try {
            await api.post(`/features/${featureKey}/waitlist`);
            setJoinedWaitlists(prev => new Set([...prev, featureKey]));
            Toast.show({
                type: 'success',
                text1: 'You\'re on the waitlist!',
            });
        } catch (error) {
            console.error('Failed to join waitlist:', error);
            Toast.show({
                type: 'error',
                text1: 'Failed to join waitlist',
            });
        }
    };

    const getFeatureProgress = (gate: FeatureGate) => {
        if (!stats) return { current: 0, threshold: 0, percent: 0, label: 'users' };

        const threshold = gate.requiredUsers || gate.requiredArtists || gate.requiredTracks || 0;
        const current = gate.requiredUsers
            ? stats.totalUsers
            : gate.requiredArtists
                ? stats.totalArtists
                : stats.totalTracks;
        const percent = threshold > 0 ? Math.min(100, Math.round((current / threshold) * 100)) : 0;
        const label = gate.requiredArtists ? 'artists' : gate.requiredTracks ? 'tracks' : 'users';

        return { current, threshold, percent, label };
    };

    const isFeatureUnlocked = (gate: FeatureGate): boolean => {
        if (!stats) return false;
        if (gate.status === 'active') return true;

        const userCheck = gate.requiredUsers ? stats.totalUsers >= gate.requiredUsers : true;
        const artistCheck = gate.requiredArtists ? stats.totalArtists >= gate.requiredArtists : true;
        const trackCheck = gate.requiredTracks ? stats.totalTracks >= gate.requiredTracks : true;

        return userCheck && artistCheck && trackCheck;
    };

    const renderRoadmap = () => {
        const previewFeatures = FEATURE_GATES.filter(g => g.status === 'preview');

        if (statsLoading) {
            return (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            );
        }

        return (
            <ScrollView style={styles.roadmapContainer} contentContainerStyle={styles.roadmapContent}>
                {/* Stats Overview - Admin only */}
                {user?.type === 'admin' && (
                    <View style={styles.statsOverview}>
                        <Text style={styles.sectionTitle}>Platform Growth</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Ionicons name="people" size={24} color={theme.colors.accent} />
                                <Text style={styles.statValue}>{stats?.totalUsers.toLocaleString() || 0}</Text>
                                <Text style={styles.statLabel}>Users</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Ionicons name="mic" size={24} color={theme.colors.accent} />
                                <Text style={styles.statValue}>{stats?.totalArtists.toLocaleString() || 0}</Text>
                                <Text style={styles.statLabel}>Artists</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Ionicons name="musical-notes" size={24} color={theme.colors.accent} />
                                <Text style={styles.statValue}>{stats?.totalTracks.toLocaleString() || 0}</Text>
                                <Text style={styles.statLabel}>Tracks</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Feature Roadmap */}
                <Text style={styles.sectionTitle}>Feature Roadmap</Text>
                <Text style={styles.sectionDescription}>
                    Features unlock as our community grows. Join the waitlist to be notified!
                </Text>

                {previewFeatures.map(gate => {
                    const progress = getFeatureProgress(gate);
                    const unlocked = isFeatureUnlocked(gate);
                    const onWaitlist = joinedWaitlists.has(gate.key);

                    return (
                        <View key={gate.key} style={[styles.featureCard, unlocked && styles.featureCardUnlocked]}>
                            <View style={styles.featureHeader}>
                                <View style={styles.featureIconContainer}>
                                    <Ionicons
                                        name={unlocked ? 'checkmark-circle' : 'lock-closed'}
                                        size={20}
                                        color={unlocked ? theme.colors.success : theme.colors.textMuted}
                                    />
                                </View>
                                <View style={styles.featureInfo}>
                                    <Text style={styles.featureName}>{gate.name}</Text>
                                    {!unlocked && progress.threshold > 0 && (
                                        <Text style={styles.featureThreshold}>
                                            {progress.current.toLocaleString()} / {progress.threshold.toLocaleString()} {progress.label}
                                        </Text>
                                    )}
                                    {unlocked && (
                                        <Text style={styles.featureUnlockedText}>Unlocked!</Text>
                                    )}
                                </View>
                                {!unlocked && (
                                    onWaitlist ? (
                                        <View style={styles.onWaitlistBadge}>
                                            <Ionicons name="checkmark" size={14} color={theme.colors.success} />
                                            <Text style={styles.onWaitlistText}>Joined</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.notifyButton}
                                            onPress={() => handleJoinWaitlist(gate.key)}
                                        >
                                            <Text style={styles.notifyButtonText}>Notify Me</Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>

                            {!unlocked && progress.threshold > 0 && (
                                <View style={styles.progressBarContainer}>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
                                    </View>
                                </View>
                            )}

                            {gate.additionalConditions && (
                                <Text style={styles.additionalConditions}>
                                    + {gate.additionalConditions}
                                </Text>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        );
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
                <View>
                    <Text style={styles.title}>Community</Text>
                    <Text style={styles.subtitle}>Connect with fellow music lovers</Text>
                </View>
                {activeTab === 'feed' && (
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
                    onPress={() => setActiveTab('feed')}
                >
                    <Ionicons
                        name="chatbubbles-outline"
                        size={18}
                        color={activeTab === 'feed' ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>Feed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'roadmap' && styles.activeTab]}
                    onPress={() => setActiveTab('roadmap')}
                >
                    <Ionicons
                        name="rocket-outline"
                        size={18}
                        color={activeTab === 'roadmap' ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={[styles.tabText, activeTab === 'roadmap' && styles.activeTabText]}>Roadmap</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'roadmap' ? (
                renderRoadmap()
            ) : loading ? (
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
        alignItems: 'flex-start',
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
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
    // Tab Styles
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.primary,
    },
    tabText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm,
        fontWeight: '500',
    },
    activeTabText: {
        color: theme.colors.primary,
    },
    // Roadmap Styles
    roadmapContainer: {
        flex: 1,
    },
    roadmapContent: {
        padding: theme.spacing.md,
    },
    statsOverview: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    sectionDescription: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm,
        marginBottom: theme.spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    statItem: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    statValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.xs,
    },
    statLabel: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
    featureCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    featureCardUnlocked: {
        borderColor: theme.colors.success,
        backgroundColor: 'rgba(74, 222, 128, 0.05)',
    },
    featureHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.sm,
    },
    featureInfo: {
        flex: 1,
    },
    featureName: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
        fontSize: theme.fontSize.md,
    },
    featureThreshold: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
    featureUnlockedText: {
        color: theme.colors.success,
        fontSize: theme.fontSize.xs,
    },
    notifyButton: {
        backgroundColor: theme.colors.accent,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
    },
    notifyButtonText: {
        color: theme.colors.background,
        fontSize: theme.fontSize.xs,
        fontWeight: '600',
    },
    onWaitlistBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    onWaitlistText: {
        color: theme.colors.success,
        fontSize: theme.fontSize.xs,
    },
    progressBarContainer: {
        marginTop: theme.spacing.sm,
    },
    progressBar: {
        height: 4,
        backgroundColor: theme.colors.surfaceElevated,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 2,
    },
    additionalConditions: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
        marginTop: theme.spacing.xs,
        fontStyle: 'italic',
    },
});
