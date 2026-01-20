import { theme } from '@/constants/theme';
import { getDividendHistory, getDividendSummary } from '@/lib/api/client';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DividendsScreen() {
    const [summary, setSummary] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [summaryData, historyData] = await Promise.all([
                getDividendSummary(),
                getDividendHistory(1)
            ]);
            setSummary(summaryData.data);
            setHistory(historyData.data.items);
            setHasMore(historyData.data.pagination.hasNext);
            setPage(1);
        } catch (error) {
            console.error('Failed to fetch dividends:', error);
        }
    }, []);

    const loadMore = async () => {
        if (!hasMore || loading) return;
        try {
            const nextPage = page + 1;
            const data = await getDividendHistory(nextPage);
            setHistory(prev => [...prev, ...data.data.items]);
            setHasMore(data.data.pagination.hasNext);
            setPage(nextPage);
        } catch (error) {
            console.error('Failed to load more dividends:', error);
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

    if (loading && !refreshing && !summary) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const renderHeader = () => (
        <View style={styles.header}>
            {summary && (
                <View style={styles.cardsContainer}>
                    <View style={[styles.card, { backgroundColor: theme.colors.surfaceElevated }]}>
                        <Text style={styles.cardLabel}>Lifetime Earnings</Text>
                        <Text style={[styles.cardValue, { color: theme.colors.success }]}>
                            ${(summary.lifetime.grossCents / 100).toFixed(2)}
                        </Text>
                        <Ionicons name="trending-up" size={20} color={theme.colors.success} style={styles.cardIcon} />
                    </View>

                    <View style={[styles.card, { backgroundColor: theme.colors.surfaceElevated }]}>
                        <Text style={styles.cardLabel}>Pending Payout</Text>
                        <Text style={[styles.cardValue, { color: theme.colors.warning }]}>
                            ${(summary.byStatus.pending.totalCents / 100).toFixed(2)}
                        </Text>
                        <Ionicons name="hourglass-outline" size={20} color={theme.colors.warning} style={styles.cardIcon} />
                    </View>
                </View>
            )}
            <Text style={styles.sectionTitle}>Transaction History</Text>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.transactionItem}>
            <View style={styles.transactionLeft}>
                <View style={[styles.iconContainer, {
                    backgroundColor: item.status === 'completed' ? theme.colors.success + '20' : theme.colors.warning + '20'
                }]}>
                    <Ionicons
                        name={item.status === 'completed' ? "checkmark-circle" : "time"}
                        size={20}
                        color={item.status === 'completed' ? theme.colors.success : theme.colors.warning}
                    />
                </View>
                <View>
                    <Text style={styles.transactionDate}>
                        {new Date(item.periodStart).toLocaleDateString()}
                    </Text>
                    <Text style={styles.transactionSubtext}>
                        {item.discoveries} discoveries
                    </Text>
                </View>
            </View>
            <View style={styles.transactionRight}>
                <Text style={styles.transactionAmount}>
                    ${(item.cents / 100).toFixed(2)}
                </Text>
                <Text style={[styles.transactionStatus, {
                    color: item.status === 'completed' ? theme.colors.success : theme.colors.warning
                }]}>
                    {item.status}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerTitle: 'Earnings & Dividends',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.textPrimary,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                ),
            }} />

            <FlatList
                data={history}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No transactions found</Text>
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
        backgroundColor: theme.colors.background,
    },
    listContent: {
        padding: theme.spacing.md,
        paddingBottom: 40,
    },
    header: {
        marginBottom: theme.spacing.lg,
    },
    cardsContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    card: {
        flex: 1,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        position: 'relative',
        height: 100,
        justifyContent: 'center',
    },
    cardLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    cardValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
    },
    cardIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
        opacity: 0.8,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surface,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionDate: {
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.md,
        fontWeight: '500',
    },
    transactionSubtext: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.md,
        fontWeight: 'bold',
    },
    transactionStatus: {
        fontSize: theme.fontSize.xs,
        textTransform: 'capitalize',
    },
    emptyContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textMuted,
    },
});
