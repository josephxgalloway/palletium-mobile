import { RoleGate } from '@/components/RoleGate';
import { theme } from '@/constants/theme';
import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Gate: artist-only — no hooks fire before RoleGate resolves
export default function ArtistEarningsPage() {
    return (
        <RoleGate allow={['artist']}>
            <ArtistEarningsScreen />
        </RoleGate>
    );
}

interface EarningsSummary {
    total_earnings: number;
    pending_earnings: number;
    paid_earnings: number;
    first_listen_earnings: number;
    repeat_listen_earnings: number;
    total_plays: number;
    first_listens: number;
    repeat_listens: number;
    unique_listeners: number;
}

interface EarningsTransaction {
    id: string;
    type: 'first_listen' | 'repeat_listen' | 'payout';
    amount_cents: number;
    track_title?: string;
    listener_name?: string;
    status: 'pending' | 'completed';
    created_at: string;
}

function ArtistEarningsScreen() {
    const { user } = useAuthStore();
    const [summary, setSummary] = useState<EarningsSummary | null>(null);
    const [transactions, setTransactions] = useState<EarningsTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user?.id) return;

        try {
            // Use the same analytics endpoint as the web platform for accurate data
            // This endpoint returns totalEarnings already in dollars
            let analyticsData: any = null;
            try {
                const analyticsResponse = await api.get(`/analytics/artist/${user.id}/overview`);
                analyticsData = analyticsResponse.data;
                console.log('Earnings - Analytics response:', JSON.stringify(analyticsData, null, 2));
            } catch (analyticsError) {
                console.log('Analytics endpoint not available, falling back to dashboard');
            }

            // Fallback to dashboard if analytics fails
            let dashboardData: any = null;
            if (!analyticsData) {
                const dashboardResponse = await api.get('/users/dashboard');
                dashboardData = dashboardResponse.data?.stats || dashboardResponse.data;
                console.log('Earnings - Dashboard response:', JSON.stringify(dashboardData, null, 2));
            }

            // Build summary from analytics (preferred) or dashboard (fallback)
            // Analytics returns values in DOLLARS, dashboard may return in CENTS
            let detailedSummary: EarningsSummary;

            if (analyticsData) {
                // Analytics endpoint returns values in dollars - convert to cents for internal consistency
                detailedSummary = {
                    total_earnings: (analyticsData.totalEarnings || 0) * 100,
                    pending_earnings: (analyticsData.pendingEarnings || 0) * 100,
                    paid_earnings: ((analyticsData.totalEarnings || 0) - (analyticsData.pendingEarnings || 0)) * 100,
                    first_listen_earnings: (analyticsData.firstListenEarnings || 0) * 100,
                    repeat_listen_earnings: (analyticsData.repeatListenEarnings || 0) * 100,
                    total_plays: analyticsData.totalPlays || 0,
                    first_listens: analyticsData.firstListens || analyticsData.discoveries || 0,
                    repeat_listens: (analyticsData.totalPlays || 0) - (analyticsData.firstListens || 0),
                    unique_listeners: analyticsData.uniqueListeners || 0,
                };
            } else {
                // Dashboard data - assume values are in cents
                detailedSummary = {
                    total_earnings: dashboardData.total_revenue || dashboardData.total_earnings || 0,
                    pending_earnings: dashboardData.pending_revenue || dashboardData.pending_earnings || 0,
                    paid_earnings: (dashboardData.total_revenue || 0) - (dashboardData.pending_revenue || 0),
                    first_listen_earnings: dashboardData.first_listen_revenue || 0,
                    repeat_listen_earnings: dashboardData.repeat_listen_revenue || 0,
                    total_plays: dashboardData.total_plays || 0,
                    first_listens: dashboardData.first_listens || dashboardData.discovery_count || 0,
                    repeat_listens: (dashboardData.total_plays || 0) - (dashboardData.first_listens || 0),
                    unique_listeners: dashboardData.unique_listeners || 0,
                };
            }

            setSummary(detailedSummary);

            // Try to fetch transaction history
            try {
                const txResponse = await api.get('/artist/earnings/transactions?page=1&limit=20');
                if (txResponse.data?.transactions) {
                    setTransactions(txResponse.data.transactions);
                    setHasMore(txResponse.data.pagination?.hasNext || false);
                }
            } catch {
                // Transactions endpoint may not exist
                console.log('Earnings transactions endpoint not available');
                setTransactions([]);
                setHasMore(false);
            }

            setPage(1);
        } catch (error) {
            console.error('Failed to fetch earnings:', error);
        }
    }, [user?.id]);

    const loadMore = async () => {
        if (!hasMore || loading) return;

        try {
            const nextPage = page + 1;
            const response = await api.get(`/artist/earnings/transactions?page=${nextPage}&limit=20`);
            if (response.data?.transactions) {
                setTransactions(prev => [...prev, ...response.data.transactions]);
                setHasMore(response.data.pagination?.hasNext || false);
                setPage(nextPage);
            }
        } catch (error) {
            console.error('Failed to load more transactions:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);
        };
        init();
    }, [fetchData]);

    const formatCurrency = (cents: number) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    if (loading && !summary) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const renderHeader = () => (
        <View style={styles.headerContent}>
            {/* Main earnings cards */}
            <View style={styles.mainCardsRow}>
                <View style={[styles.mainCard, styles.earningsCard]}>
                    <Ionicons name="cash" size={24} color={theme.colors.success} style={styles.cardIconTop} />
                    <Text style={styles.mainCardLabel}>Total Earnings</Text>
                    <Text style={[styles.mainCardValue, { color: theme.colors.success }]}>
                        ${((summary?.total_earnings || 0) / 100).toFixed(2)}
                    </Text>
                </View>

                <View style={[styles.mainCard, styles.pendingCard]}>
                    <Ionicons name="hourglass" size={24} color={theme.colors.warning} style={styles.cardIconTop} />
                    <Text style={styles.mainCardLabel}>Pending</Text>
                    <Text style={[styles.mainCardValue, { color: theme.colors.warning }]}>
                        ${((summary?.pending_earnings || 0) / 100).toFixed(2)}
                    </Text>
                </View>
            </View>

            {/* Breakdown section */}
            <View style={styles.breakdownSection}>
                <Text style={styles.sectionTitle}>Revenue Breakdown</Text>

                <View style={styles.breakdownCard}>
                    <View style={styles.breakdownRow}>
                        <View style={styles.breakdownItem}>
                            <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
                            <View>
                                <Text style={styles.breakdownLabel}>First Listens</Text>
                                <Text style={styles.breakdownSubtext}>$1.00 per play from subscribed listeners</Text>
                            </View>
                        </View>
                        <View style={styles.breakdownValues}>
                            <Text style={styles.breakdownCount}>{formatNumber(summary?.first_listens || 0)}</Text>
                            <Text style={styles.breakdownAmount}>
                                ${((summary?.first_listen_earnings || 0) / 100).toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.breakdownDivider} />

                    <View style={styles.breakdownRow}>
                        <View style={styles.breakdownItem}>
                            <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
                            <View>
                                <Text style={styles.breakdownLabel}>Repeat Listens</Text>
                                <Text style={styles.breakdownSubtext}>$0.01 per play</Text>
                            </View>
                        </View>
                        <View style={styles.breakdownValues}>
                            <Text style={styles.breakdownCount}>{formatNumber(summary?.repeat_listens || 0)}</Text>
                            <Text style={styles.breakdownAmount}>
                                ${((summary?.repeat_listen_earnings || 0) / 100).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Ionicons name="play" size={20} color={theme.colors.primary} />
                    <Text style={styles.statValue}>{formatNumber(summary?.total_plays || 0)}</Text>
                    <Text style={styles.statLabel}>Total Plays</Text>
                </View>
                <View style={styles.statBox}>
                    <Ionicons name="people" size={20} color={theme.colors.accent} />
                    <Text style={styles.statValue}>{formatNumber(summary?.unique_listeners || 0)}</Text>
                    <Text style={styles.statLabel}>Listeners</Text>
                </View>
                <View style={styles.statBox}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    <Text style={styles.statValue}>${((summary?.paid_earnings || 0) / 100).toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Paid Out</Text>
                </View>
            </View>

            {/* Payout info */}
            <View style={styles.payoutInfo}>
                <Ionicons name="information-circle" size={18} color={theme.colors.textMuted} />
                <Text style={styles.payoutText}>
                    Payouts are processed monthly when your balance exceeds $50
                </Text>
            </View>

            {transactions.length > 0 && (
                <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>
                    Recent Activity
                </Text>
            )}
        </View>
    );

    const renderTransaction = ({ item }: { item: EarningsTransaction }) => (
        <View style={styles.transactionItem}>
            <View style={styles.transactionLeft}>
                <View style={[
                    styles.transactionIcon,
                    {
                        backgroundColor: item.type === 'first_listen'
                            ? theme.colors.success + '20'
                            : item.type === 'payout'
                                ? theme.colors.primary + '20'
                                : theme.colors.accent + '20'
                    }
                ]}>
                    <Ionicons
                        name={
                            item.type === 'first_listen'
                                ? 'star'
                                : item.type === 'payout'
                                    ? 'wallet'
                                    : 'play'
                        }
                        size={18}
                        color={
                            item.type === 'first_listen'
                                ? theme.colors.success
                                : item.type === 'payout'
                                    ? theme.colors.primary
                                    : theme.colors.accent
                        }
                    />
                </View>
                <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>
                        {item.type === 'first_listen'
                            ? 'First Listen'
                            : item.type === 'payout'
                                ? 'Payout'
                                : 'Repeat Listen'}
                    </Text>
                    <Text style={styles.transactionSubtitle} numberOfLines={1}>
                        {item.track_title || new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            <View style={styles.transactionRight}>
                <Text style={[
                    styles.transactionAmount,
                    item.type === 'payout' && { color: theme.colors.primary }
                ]}>
                    {item.type === 'payout' ? '-' : '+'}${(item.amount_cents / 100).toFixed(2)}
                </Text>
                <Text style={[
                    styles.transactionStatus,
                    { color: item.status === 'completed' ? theme.colors.success : theme.colors.warning }
                ]}>
                    {item.status}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Earnings</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={transactions}
                renderItem={renderTransaction}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                    />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    transactions.length === 0 && !loading ? (
                        <View style={styles.emptyTransactions}>
                            <Ionicons name="receipt-outline" size={32} color={theme.colors.textMuted} />
                            <Text style={styles.emptyText}>No transaction history available</Text>
                            <Text style={styles.emptySubtext}>
                                Detailed transactions will appear here as you earn
                            </Text>
                        </View>
                    ) : null
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
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    listContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
    },
    headerContent: {
        marginBottom: theme.spacing.md,
    },
    mainCardsRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    mainCard: {
        flex: 1,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        position: 'relative',
    },
    earningsCard: {
        backgroundColor: theme.colors.success + '15',
        borderWidth: 1,
        borderColor: theme.colors.success + '30',
    },
    pendingCard: {
        backgroundColor: theme.colors.warning + '15',
        borderWidth: 1,
        borderColor: theme.colors.warning + '30',
    },
    cardIconTop: {
        marginBottom: theme.spacing.sm,
    },
    mainCardLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    mainCardValue: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
    },
    breakdownSection: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    breakdownCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
    },
    breakdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    breakdownLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textPrimary,
        fontWeight: '500',
    },
    breakdownSubtext: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
    },
    breakdownValues: {
        alignItems: 'flex-end',
    },
    breakdownCount: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    breakdownAmount: {
        fontSize: theme.fontSize.md,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    breakdownDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.xs,
    },
    statsRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    statBox: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    statValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.xs,
    },
    statLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    payoutInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.sm,
    },
    payoutText: {
        flex: 1,
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        flex: 1,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionInfo: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    transactionSubtitle: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: theme.fontSize.md,
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    transactionStatus: {
        fontSize: theme.fontSize.xs,
        textTransform: 'capitalize',
    },
    emptyTransactions: {
        alignItems: 'center',
        padding: theme.spacing.xl,
        marginTop: theme.spacing.md,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
    },
    emptySubtext: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginTop: theme.spacing.xs,
    },
});
