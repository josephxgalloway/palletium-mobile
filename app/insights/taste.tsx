import { theme } from '@/constants/theme';
import { getTasteEvolution } from '@/lib/api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TasteEvolutionScreen() {
    const [evolution, setEvolution] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [months, setMonths] = useState(6);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const response = await getTasteEvolution(months);
            const data = response?.data || response;
            setEvolution(data);
        } catch (err: any) {
            // Silently handle - this endpoint may not be implemented yet
            const status = err.response?.status;
            if (status === 404 || status === 500) {
                setError('Taste Evolution is coming soon! Keep listening to build your music profile.');
            } else {
                setError('Unable to load taste data. Please try again later.');
            }
            setEvolution(null);
        }
    }, [months]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);
        };
        init();
    }, [fetchData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const getTrendIcon = (trend: string) => {
        if (trend?.includes('Expanding')) return "trending-up";
        if (trend?.includes('niche')) return "trending-down";
        return "remove";
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: false
            }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Taste Evolution</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* Time Range Selector */}
                <View style={styles.timeFilterContainer}>
                    {[3, 6, 12].map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.timeFilterButton, months === m && styles.timeFilterActive]}
                            onPress={() => setMonths(m)}
                        >
                            <Text style={[styles.timeFilterText, months === m && styles.timeFilterTextActive]}>
                                {m} Months
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {error && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {evolution && (
                    <>
                        {/* Overall Trend Card */}
                        <LinearGradient
                            colors={[theme.colors.surfaceElevated, theme.colors.surface]}
                            style={styles.trendCard}
                        >
                            <View style={styles.trendHeader}>
                                <Ionicons name={getTrendIcon(evolution.overallTrend)} size={32} color={theme.colors.accent} />
                                <View style={styles.trendTextContainer}>
                                    <Text style={styles.trendTitle}>{evolution.overallTrend}</Text>
                                    <Text style={styles.trendSubtitle}>Based on your listening history</Text>
                                </View>
                            </View>
                        </LinearGradient>

                        {/* Significant Changes */}
                        {evolution.significantChanges?.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Significant Changes</Text>
                                <View style={styles.changesGrid}>
                                    {evolution.significantChanges.map((change: any, index: number) => (
                                        <View key={index} style={styles.changeCard}>
                                            <View style={styles.changeHeader}>
                                                <Ionicons
                                                    name={change.type.includes('rise') ? 'arrow-up' : 'arrow-down'}
                                                    size={16}
                                                    color={change.type.includes('rise') ? theme.colors.success : theme.colors.error}
                                                />
                                                <Text style={styles.changeGenre}>{change.genre}</Text>
                                            </View>
                                            <Text style={styles.changeDesc}>{change.description}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Monthly Breakdown */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
                            {evolution.periods?.map((period: any, index: number) => (
                                <View key={index} style={styles.periodCard}>
                                    <View style={styles.periodHeader}>
                                        <Text style={styles.periodLabel}>{period.periodLabel}</Text>
                                        <Text style={styles.periodMeta}>
                                            {(period.diversityScore * 100).toFixed(0)}% Diversity
                                        </Text>
                                    </View>

                                    {/* Genre Bars */}
                                    <View style={styles.genreBarsContainer}>
                                        {period.genres.slice(0, 3).map((genre: any, gIndex: number) => (
                                            <View key={gIndex} style={styles.genreRow}>
                                                <Text style={styles.genreName}>{genre.genre}</Text>
                                                <View style={styles.barBackground}>
                                                    <View
                                                        style={[
                                                            styles.barFill,
                                                            {
                                                                width: `${genre.percentage}%`,
                                                                backgroundColor: gIndex === 0 ? theme.colors.primary : theme.colors.textMuted
                                                            }
                                                        ]}
                                                    />
                                                </View>
                                                <Text style={styles.genrePercent}>{genre.percentage.toFixed(0)}%</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    content: {
        padding: theme.spacing.md,
    },
    timeFilterContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        padding: 4,
        borderRadius: theme.borderRadius.md,
    },
    timeFilterButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.sm,
    },
    timeFilterActive: {
        backgroundColor: theme.colors.surfaceElevated,
    },
    timeFilterText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
    },
    timeFilterTextActive: {
        color: theme.colors.primary,
    },
    trendCard: {
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.xl,
    },
    trendHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    trendTextContainer: {
        flex: 1,
    },
    trendTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    trendSubtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    changesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    changeCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    changeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    changeGenre: {
        color: theme.colors.textPrimary,
        fontWeight: 'bold',
        fontSize: theme.fontSize.md,
        textTransform: 'capitalize',
    },
    changeDesc: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
    periodCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
    },
    periodHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    periodLabel: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
        fontSize: theme.fontSize.md,
    },
    periodMeta: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
    genreBarsContainer: {
        gap: 8,
    },
    genreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    genreName: {
        width: 80,
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.xs,
        textTransform: 'capitalize',
    },
    barBackground: {
        flex: 1,
        height: 6,
        backgroundColor: theme.colors.surfaceElevated,
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 3,
    },
    genrePercent: {
        width: 30,
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
        textAlign: 'right',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    errorText: {
        flex: 1,
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
    },
});
