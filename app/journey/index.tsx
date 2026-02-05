import { theme } from '@/constants/theme';
import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { useGamificationStore } from '@/lib/store/gamificationStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type TabId = 'progress' | 'milestones' | 'impact';

interface TierInfo {
  name: string;
  minXp: number;
  maxXp: number;
  multiplier: number;
  color: readonly [string, string];
}

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  earned_at?: string;
  is_earned: boolean;
}

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  total_xp: number;
  badge_count: number;
  is_current_user: boolean;
}

const LISTENER_TIERS: TierInfo[] = [
  { name: 'Bronze', minXp: 0, maxXp: 999, multiplier: 1.0, color: ['#CD7F32', '#8B5A2B'] },
  { name: 'Silver', minXp: 1000, maxXp: 4999, multiplier: 1.1, color: ['#C0C0C0', '#808080'] },
  { name: 'Gold', minXp: 5000, maxXp: 14999, multiplier: 1.25, color: ['#FFD700', '#B8860B'] },
  { name: 'Platinum', minXp: 15000, maxXp: 49999, multiplier: 1.5, color: ['#E5E4E2', '#A9A9A9'] },
  { name: 'Diamond', minXp: 50000, maxXp: Infinity, multiplier: 2.0, color: ['#B9F2FF', '#4169E1'] },
];

const ARTIST_LEVELS = [
  { level: 1, name: 'Rising', minPlays: 0, commission: 30 },
  { level: 2, name: 'Emerging', minPlays: 1000, commission: 25 },
  { level: 3, name: 'Established', minPlays: 10000, commission: 20 },
  { level: 4, name: 'Star', minPlays: 100000, commission: 15 },
  { level: 5, name: 'Legend', minPlays: 1000000, commission: 10 },
];

export default function JourneyScreen() {
  const { user } = useAuthStore();
  const { stats, fetchStats } = useGamificationStore();
  const [activeTab, setActiveTab] = useState<TabId>('progress');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const isArtist = user?.type === 'artist';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchBadges(),
        fetchLeaderboard(),
      ]);
    } catch (error) {
      console.error('Failed to load journey data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBadges = async () => {
    try {
      const response = await api.get('/gamification/badges');
      setBadges(response.data.badges || []);
    } catch (error) {
      // Silently fail - milestones feature may not be available yet
      setBadges([]);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/gamification/leaderboard?limit=20');
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      // Silently fail - community feature may not be available yet
      setLeaderboard([]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getCurrentTier = (): TierInfo => {
    const xp = stats?.total_xp || 0;
    return LISTENER_TIERS.find(tier => xp >= tier.minXp && xp <= tier.maxXp) || LISTENER_TIERS[0];
  };

  const getNextTier = (): TierInfo | null => {
    const currentIndex = LISTENER_TIERS.findIndex(tier => tier.name === getCurrentTier().name);
    return currentIndex < LISTENER_TIERS.length - 1 ? LISTENER_TIERS[currentIndex + 1] : null;
  };

  const getCurrentArtistLevel = () => {
    const plays = stats?.total_plays || 0;
    let currentLevel = ARTIST_LEVELS[0];
    for (const level of ARTIST_LEVELS) {
      if (plays >= level.minPlays) {
        currentLevel = level;
      }
    }
    return currentLevel;
  };

  const getNextArtistLevel = () => {
    const currentLevel = getCurrentArtistLevel();
    const index = ARTIST_LEVELS.findIndex(l => l.level === currentLevel.level);
    return index < ARTIST_LEVELS.length - 1 ? ARTIST_LEVELS[index + 1] : null;
  };

  const renderProgressTab = () => {
    // Artists see Artist Levels, listeners see Listener Tiers
    if (isArtist) {
      const currentLevel = getCurrentArtistLevel();
      const nextLevel = getNextArtistLevel();
      const plays = stats?.total_plays || 0;
      const progress = nextLevel
        ? ((plays - currentLevel.minPlays) / (nextLevel.minPlays - currentLevel.minPlays)) * 100
        : 100;

      return (
        <View style={styles.progressContainer}>
          {/* Current Level Card */}
          <LinearGradient
            colors={['#1A472A', '#0D2818']}
            style={styles.levelCard}
          >
            <View style={styles.levelHeader}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNumber}>{currentLevel.level}</Text>
              </View>
              <View style={styles.levelInfo}>
                <Text style={styles.levelName}>{currentLevel.name}</Text>
                <Text style={styles.levelSubtitle}>Artist Level</Text>
              </View>
              <View style={styles.commissionBadge}>
                <Text style={styles.commissionText}>{100 - currentLevel.commission}%</Text>
                <Text style={styles.commissionLabel}>Revenue</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="play" size={20} color={theme.colors.success} />
                <Text style={styles.statValue}>{formatNumber(plays)}</Text>
                <Text style={styles.statLabel}>Total Plays</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="people" size={20} color={theme.colors.accent} />
                <Text style={styles.statValue}>{formatNumber(stats?.unique_listeners || 0)}</Text>
                <Text style={styles.statLabel}>Listeners</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cash" size={20} color={theme.colors.success} />
                <Text style={styles.statValue}>${stats?.total_earnings?.toFixed(2) || '0.00'}</Text>
                <Text style={styles.statLabel}>Earnings</Text>
              </View>
            </View>

            {nextLevel && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Next: {nextLevel.name}</Text>
                  <Text style={styles.progressValue}>
                    {formatNumber(nextLevel.minPlays - plays)} plays to go
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
                </View>
              </View>
            )}
          </LinearGradient>

          {/* All Levels */}
          <Text style={styles.sectionTitle}>Artist Levels</Text>
          {ARTIST_LEVELS.map((level) => {
            const isCurrentLevel = level.level === currentLevel.level;
            const isUnlocked = plays >= level.minPlays;

            return (
              <View
                key={level.level}
                style={[
                  styles.tierRow,
                  isCurrentLevel && styles.tierRowCurrent,
                  !isUnlocked && styles.tierRowLocked,
                ]}
              >
                <View style={styles.tierIconContainer}>
                  <Ionicons
                    name={isUnlocked ? 'checkmark-circle' : 'lock-closed'}
                    size={24}
                    color={isUnlocked ? theme.colors.success : theme.colors.textMuted}
                  />
                </View>
                <View style={styles.tierDetails}>
                  <Text style={[styles.tierName, !isUnlocked && styles.tierNameLocked]}>
                    Level {level.level}: {level.name}
                  </Text>
                  <Text style={styles.tierRequirement}>
                    {formatNumber(level.minPlays)} plays • {100 - level.commission}% revenue
                  </Text>
                </View>
                {isCurrentLevel && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>CURRENT</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      );
    }

    // Listener Progress
    const currentTier = getCurrentTier();
    const nextTier = getNextTier();
    const xp = stats?.total_xp || 0;
    const progress = nextTier
      ? ((xp - currentTier.minXp) / (nextTier.minXp - currentTier.minXp)) * 100
      : 100;

    return (
      <View style={styles.progressContainer}>
        {/* Current Tier Card */}
        <LinearGradient
          colors={currentTier.color}
          style={styles.tierCard}
        >
          <View style={styles.tierHeader}>
            <Text style={styles.tierTitle}>{currentTier.name}</Text>
            <Text style={styles.tierSubtitle}>Listener Tier</Text>
          </View>

          <View style={styles.xpDisplay}>
            <Text style={styles.xpAmount}>{formatNumber(xp)}</Text>
            <Text style={styles.xpLabel}>Total XP</Text>
          </View>

          <View style={styles.multiplierBadge}>
            <Ionicons name="flash" size={16} color={theme.colors.background} />
            <Text style={styles.multiplierText}>{currentTier.multiplier}× Rewards</Text>
          </View>

          {nextTier && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Next: {nextTier.name}</Text>
                <Text style={styles.progressValue}>
                  {formatNumber(nextTier.minXp - xp)} XP to go
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
              </View>
            </View>
          )}
        </LinearGradient>

        {/* All Tiers */}
        <Text style={styles.sectionTitle}>Listener Tiers</Text>
        {LISTENER_TIERS.map((tier) => {
          const isCurrentTier = tier.name === currentTier.name;
          const isUnlocked = xp >= tier.minXp;

          return (
            <View
              key={tier.name}
              style={[
                styles.tierRow,
                isCurrentTier && styles.tierRowCurrent,
                !isUnlocked && styles.tierRowLocked,
              ]}
            >
              <LinearGradient
                colors={isUnlocked ? tier.color : ['#333', '#222'] as const}
                style={styles.tierIconGradient}
              >
                <Ionicons
                  name={isUnlocked ? 'diamond' : 'lock-closed'}
                  size={16}
                  color={isUnlocked ? '#fff' : theme.colors.textMuted}
                />
              </LinearGradient>
              <View style={styles.tierDetails}>
                <Text style={[styles.tierName, !isUnlocked && styles.tierNameLocked]}>
                  {tier.name}
                </Text>
                <Text style={styles.tierRequirement}>
                  {formatNumber(tier.minXp)} XP • {tier.multiplier}× rewards
                </Text>
              </View>
              {isCurrentTier && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>CURRENT</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderMilestonesTab = () => {
    const earnedBadges = badges.filter(b => b.is_earned);
    const unearnedBadges = badges.filter(b => !b.is_earned);

    return (
      <View style={styles.milestonesContainer}>
        {earnedBadges.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Earned ({earnedBadges.length})</Text>
            <View style={styles.badgesGrid}>
              {earnedBadges.map((badge) => (
                <View key={badge.id} style={styles.badgeCard}>
                  <View style={styles.badgeIconEarned}>
                    <Ionicons name={getBadgeIcon(badge.icon)} size={28} color={theme.colors.accent} />
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeXp}>+{badge.xp_reward} XP</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {unearnedBadges.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Locked ({unearnedBadges.length})</Text>
            <View style={styles.badgesGrid}>
              {unearnedBadges.map((badge) => (
                <View key={badge.id} style={[styles.badgeCard, styles.badgeCardLocked]}>
                  <View style={styles.badgeIconLocked}>
                    <Ionicons name="lock-closed" size={24} color={theme.colors.textMuted} />
                  </View>
                  <Text style={[styles.badgeName, styles.badgeNameLocked]}>{badge.name}</Text>
                  <Text style={styles.badgeDescription} numberOfLines={2}>{badge.description}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {badges.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>Milestones coming soon</Text>
            <Text style={styles.emptySubtext}>Track your achievements as you grow</Text>
          </View>
        )}
      </View>
    );
  };

  const renderImpactTab = () => {
    return (
      <View style={styles.communityContainer}>
        <Text style={styles.sectionTitle}>Top Listeners</Text>

        {leaderboard.length > 0 ? (
          leaderboard.map((entry, index) => (
            <View
              key={entry.user_id}
              style={[
                styles.leaderboardRow,
                entry.is_current_user && styles.leaderboardRowCurrent,
              ]}
            >
              <View style={styles.rankContainer}>
                {index < 3 ? (
                  <Ionicons
                    name="medal"
                    size={24}
                    color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}
                  />
                ) : (
                  <Text style={styles.rankNumber}>{entry.rank}</Text>
                )}
              </View>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName}>
                  {entry.name} {entry.is_current_user && '(You)'}
                </Text>
                <Text style={styles.leaderboardStats}>
                  {formatNumber(entry.total_xp)} XP • {entry.badge_count} badges
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>Community coming soon</Text>
            <Text style={styles.emptySubtext}>Connect with other music lovers</Text>
          </View>
        )}
      </View>
    );
  };

  const tabs: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'progress', label: 'Progress', icon: 'compass' },
    { id: 'milestones', label: 'Milestones', icon: 'star' },
    { id: 'impact', label: 'Impact', icon: 'trending-up' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Journey</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'progress' && renderProgressTab()}
        {activeTab === 'milestones' && renderMilestonesTab()}
        {activeTab === 'impact' && renderImpactTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function getBadgeIcon(icon: string): keyof typeof Ionicons.glyphMap {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    'star': 'star',
    'trophy': 'trophy',
    'medal': 'medal',
    'fire': 'flame',
    'music': 'musical-notes',
    'heart': 'heart',
    'rocket': 'rocket',
    'diamond': 'diamond',
  };
  return iconMap[icon] || 'star';
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  tabActive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  tabLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabLabelActive: {
    color: theme.colors.accent,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  progressContainer: {},
  tierCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  levelCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  tierHeader: {
    marginBottom: theme.spacing.md,
  },
  tierTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  tierSubtitle: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  levelSubtitle: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  commissionBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  commissionText: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: '#10B981',
  },
  commissionLabel: {
    fontSize: theme.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  xpDisplay: {
    marginBottom: theme.spacing.md,
  },
  xpAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  xpLabel: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  multiplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  multiplierText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  progressSection: {
    marginTop: theme.spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  progressLabel: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  progressValue: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  tierRowCurrent: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  tierRowLocked: {
    opacity: 0.6,
  },
  tierIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierDetails: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  tierName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tierNameLocked: {
    color: theme.colors.textMuted,
  },
  tierRequirement: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  currentBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.background,
  },
  milestonesContainer: {},
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  badgeCard: {
    width: (width - theme.spacing.md * 2 - theme.spacing.sm * 2) / 3,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  badgeCardLocked: {
    opacity: 0.6,
  },
  badgeIconEarned: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(184, 134, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  badgeIconLocked: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  badgeName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: theme.colors.textMuted,
  },
  badgeXp: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
    marginTop: 2,
  },
  badgeDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  communityContainer: {},
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  leaderboardRowCurrent: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  leaderboardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  leaderboardStats: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
    opacity: 0.7,
  },
});
