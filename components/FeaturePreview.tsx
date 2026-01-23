import { theme } from '@/constants/theme';
import { FEATURE_GATES, FeatureGate } from '@/config/featureGates';
import { api } from '@/lib/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface PlatformStats {
    totalUsers: number;
    totalArtists: number;
    totalTracks: number;
    monthlyActiveUsers: number;
}

interface FeaturePreviewProps {
    featureKey: string;
    children: React.ReactNode;
    showWaitlist?: boolean;
}

export function FeaturePreview({ featureKey, children, showWaitlist = true }: FeaturePreviewProps) {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [waitlistJoined, setWaitlistJoined] = useState(false);
    const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
    const [joining, setJoining] = useState(false);

    const gate = FEATURE_GATES.find(g => g.key === featureKey);

    const fetchStats = useCallback(async () => {
        try {
            const response = await api.get('/stats/platform');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch platform stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const checkFeatureAvailability = useCallback((): { isAvailable: boolean; isPreview: boolean } => {
        if (!gate || !stats) {
            return { isAvailable: false, isPreview: false };
        }

        if (gate.status === 'active') {
            return { isAvailable: true, isPreview: false };
        }

        if (gate.status === 'hidden') {
            return { isAvailable: false, isPreview: false };
        }

        // Check thresholds for preview features
        const userCheck = gate.requiredUsers ? stats.totalUsers >= gate.requiredUsers : true;
        const artistCheck = gate.requiredArtists ? stats.totalArtists >= gate.requiredArtists : true;
        const trackCheck = gate.requiredTracks ? stats.totalTracks >= gate.requiredTracks : true;

        const isAvailable = userCheck && artistCheck && trackCheck;
        return { isAvailable, isPreview: gate.status === 'preview' };
    }, [gate, stats]);

    const { isAvailable, isPreview } = checkFeatureAvailability();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    if (isAvailable) {
        return <>{children}</>;
    }

    if (!isPreview || !gate) {
        return null; // Hidden features return nothing
    }

    const handleJoinWaitlist = async () => {
        setJoining(true);
        try {
            const response = await api.post(`/features/${featureKey}/waitlist`);
            setWaitlistJoined(true);
            setWaitlistCount(response.data.totalWaitlist);
        } catch (error) {
            console.error('Failed to join waitlist:', error);
        } finally {
            setJoining(false);
        }
    };

    // Calculate progress
    const threshold = gate.requiredUsers || gate.requiredArtists || gate.requiredTracks || 0;
    const current = gate.requiredUsers
        ? stats?.totalUsers || 0
        : gate.requiredArtists
            ? stats?.totalArtists || 0
            : stats?.totalTracks || 0;
    const progressPercent = threshold > 0 ? Math.min(100, Math.round((current / threshold) * 100)) : 0;

    const thresholdLabel = gate.requiredArtists
        ? 'artists'
        : gate.requiredTracks
            ? 'tracks'
            : 'users';

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons name="rocket-outline" size={32} color={theme.colors.background} />
                </View>

                {/* Title */}
                <Text style={styles.title}>{gate.name}</Text>

                {/* Threshold message */}
                {threshold > 0 && (
                    <Text style={styles.thresholdText}>
                        Launching at {threshold.toLocaleString()} {thresholdLabel}
                    </Text>
                )}

                {/* Progress bar */}
                {threshold > 0 && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                        </View>
                        <Text style={styles.progressText}>
                            {current.toLocaleString()} / {threshold.toLocaleString()} {thresholdLabel}
                        </Text>
                    </View>
                )}

                {/* Additional conditions */}
                {gate.additionalConditions && (
                    <Text style={styles.conditionsText}>
                        Additional requirement: {gate.additionalConditions}
                    </Text>
                )}

                {/* Waitlist button */}
                {showWaitlist && (
                    <>
                        {waitlistJoined ? (
                            <View style={styles.joinedContainer}>
                                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                                <Text style={styles.joinedText}>You're on the waitlist!</Text>
                                {waitlistCount && (
                                    <Text style={styles.waitlistCountText}>
                                        ({waitlistCount.toLocaleString()} waiting)
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.waitlistButton}
                                onPress={handleJoinWaitlist}
                                disabled={joining}
                            >
                                {joining ? (
                                    <ActivityIndicator size="small" color={theme.colors.background} />
                                ) : (
                                    <>
                                        <Ionicons name="notifications-outline" size={20} color={theme.colors.background} />
                                        <Text style={styles.waitlistButtonText}>Notify Me When Available</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}

/**
 * Inline preview banner for partial feature visibility
 */
export function FeaturePreviewBanner({ featureKey }: { featureKey: string }) {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [waitlistJoined, setWaitlistJoined] = useState(false);
    const [joining, setJoining] = useState(false);

    const gate = FEATURE_GATES.find(g => g.key === featureKey);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/stats/platform');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch platform stats:', error);
            }
        };
        fetchStats();
    }, []);

    if (!gate || !stats) return null;

    // Check if feature is available
    if (gate.status === 'active') return null;
    if (gate.status === 'hidden') return null;

    const userCheck = gate.requiredUsers ? stats.totalUsers >= gate.requiredUsers : true;
    const artistCheck = gate.requiredArtists ? stats.totalArtists >= gate.requiredArtists : true;
    const trackCheck = gate.requiredTracks ? stats.totalTracks >= gate.requiredTracks : true;

    if (userCheck && artistCheck && trackCheck) return null;

    const handleJoinWaitlist = async () => {
        setJoining(true);
        try {
            await api.post(`/features/${featureKey}/waitlist`);
            setWaitlistJoined(true);
        } catch (error) {
            console.error('Failed to join waitlist:', error);
        } finally {
            setJoining(false);
        }
    };

    const threshold = gate.requiredUsers || gate.requiredArtists || gate.requiredTracks || 0;
    const current = gate.requiredUsers
        ? stats.totalUsers
        : gate.requiredArtists
            ? stats.totalArtists
            : stats.totalTracks;

    return (
        <View style={styles.bannerContainer}>
            <View style={styles.bannerContent}>
                <Ionicons name="rocket-outline" size={20} color={theme.colors.accent} />
                <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>{gate.name} - Coming Soon</Text>
                    <Text style={styles.bannerSubtitle}>
                        {current.toLocaleString()} / {threshold.toLocaleString()} to unlock
                    </Text>
                </View>
            </View>
            {waitlistJoined ? (
                <View style={styles.bannerJoined}>
                    <Ionicons name="checkmark" size={16} color={theme.colors.success} />
                    <Text style={styles.bannerJoinedText}>Joined</Text>
                </View>
            ) : (
                <TouchableOpacity onPress={handleJoinWaitlist} disabled={joining}>
                    <Text style={styles.bannerNotifyText}>
                        {joining ? 'Joining...' : 'Notify Me'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: theme.colors.textMuted,
        marginTop: theme.spacing.md,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    thresholdText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.md,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    progressContainer: {
        width: '100%',
        marginBottom: theme.spacing.lg,
    },
    progressBar: {
        height: 8,
        backgroundColor: theme.colors.surfaceElevated,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 4,
    },
    progressText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm,
        marginTop: theme.spacing.xs,
        textAlign: 'center',
    },
    conditionsText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    joinedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    joinedText: {
        color: theme.colors.success,
        fontWeight: '600',
    },
    waitlistCountText: {
        color: theme.colors.textMuted,
        marginLeft: theme.spacing.xs,
    },
    waitlistButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.sm,
    },
    waitlistButtonText: {
        color: theme.colors.background,
        fontWeight: '600',
        fontSize: theme.fontSize.md,
    },
    // Banner styles
    bannerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(192, 192, 192, 0.1)',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(192, 192, 192, 0.3)',
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: theme.spacing.sm,
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
        fontSize: theme.fontSize.sm,
    },
    bannerSubtitle: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
    bannerJoined: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    bannerJoinedText: {
        color: theme.colors.success,
        fontSize: theme.fontSize.sm,
    },
    bannerNotifyText: {
        color: theme.colors.accent,
        fontSize: theme.fontSize.sm,
    },
});
