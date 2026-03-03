import { theme } from '@/constants/theme';
import { getUserEntitlements } from '@/lib/entitlements';
import api, { getArtistTracks } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { useNetworkStore } from '@/lib/store/networkStore';
import type { DashboardStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

// Lazy load ImagePicker - not available in Expo Go
let ImagePicker: typeof import('expo-image-picker') | null = null;
let isImagePickerAvailable = false;
try {
  ImagePicker = require('expo-image-picker');
  isImagePickerAvailable = true;
} catch (e) {
  console.warn('ImagePicker not available - running in Expo Go');
}
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const { isConnected } = useNetworkStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trackCount, setTrackCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleChangePhoto = () => {
    const options = ['Take Photo', 'Choose from Library', 'Cancel'];
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            await pickImage('camera');
          } else if (buttonIndex === 1) {
            await pickImage('library');
          }
        }
      );
    } else {
      Alert.alert('Change Profile Photo', 'Select an option', [
        { text: 'Take Photo', onPress: () => pickImage('camera') },
        { text: 'Choose from Library', onPress: () => pickImage('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const pickImage = async (source: 'camera' | 'library') => {
    if (!isImagePickerAvailable || !ImagePicker) {
      Toast.show({
        type: 'info',
        text1: 'Not available in Expo Go',
        text2: 'Use a development build to change your photo',
      });
      return;
    }

    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed to choose photos.');
          return;
        }
      }

      const options = {
        mediaTypes: 'images' as const,
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Toast.show({ type: 'error', text1: 'Failed to select image' });
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('profile_image', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await api.put('/users/me/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.profile_image_url) {
        updateUser({ profile_image: response.data.profile_image_url });
        Toast.show({ type: 'success', text1: 'Profile photo updated!' });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const message = error.response?.data?.error || 'Failed to upload photo';
      Toast.show({ type: 'error', text1: message });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const fetchDashboard = useCallback(async () => {
    if (!isAuthenticated || !isConnected) return;

    try {
      if (user?.type === 'artist' && user?.id) {
        try {
          const analyticsResponse = await api.get(`/analytics/artist/${user.id}/overview`);
          const analyticsData = analyticsResponse.data;

          const normalizedStats: DashboardStats = {
            total_earnings: analyticsData.totalEarnings || 0,
            pending_earnings: analyticsData.pendingEarnings || 0,
            total_plays: analyticsData.totalPlays || 0,
            unique_listeners: analyticsData.uniqueListeners || 0,
            track_count: analyticsData.totalTracks || 0,
            current_level: analyticsData.level || 1,
            monthly_revenue: analyticsData.monthlyEarnings || 0,
          };

          setStats(normalizedStats);

          try {
            const tracksData = await getArtistTracks(user.id);
            let tracks: any[] = [];
            if (Array.isArray(tracksData)) {
              tracks = tracksData;
            } else if (tracksData?.tracks && Array.isArray(tracksData.tracks)) {
              tracks = tracksData.tracks;
            } else if (tracksData?.data && Array.isArray(tracksData.data)) {
              tracks = tracksData.data;
            }
            setTrackCount(tracks.length);
          } catch (trackError) {
            console.error('Failed to fetch artist tracks:', trackError);
            setTrackCount(analyticsData.totalTracks || 0);
          }
          return;
        } catch (analyticsError) {
          console.log('Analytics endpoint not available, falling back to dashboard');
        }
      }

      const response = await api.get('/users/dashboard');
      const dashboardData = response.data?.stats || response.data;
      const rawEarnings = dashboardData.total_earnings ?? dashboardData.total_revenue ?? 0;
      const rawPending = dashboardData.pending_earnings ?? dashboardData.pending_revenue ?? 0;

      const normalizedStats: DashboardStats = {
        ...dashboardData,
        total_earnings: rawEarnings / 100,
        pending_earnings: rawPending / 100,
        track_count: dashboardData.track_count ?? dashboardData.total_tracks ?? 0,
      };

      setStats(normalizedStats);

      if (user?.type === 'artist' && user?.id) {
        try {
          const tracksData = await getArtistTracks(user.id);
          let tracks: any[] = [];
          if (Array.isArray(tracksData)) {
            tracks = tracksData;
          } else if (tracksData?.tracks && Array.isArray(tracksData.tracks)) {
            tracks = tracksData.tracks;
          } else if (tracksData?.data && Array.isArray(tracksData.data)) {
            tracks = tracksData.data;
          }
          setTrackCount(tracks.length);
        } catch (trackError) {
          console.error('Failed to fetch artist tracks:', trackError);
          if (response.data?.track_count !== undefined) {
            setTrackCount(response.data.track_count);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  }, [isAuthenticated, isConnected, user?.type, user?.id]);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      fetchDashboard().finally(() => setLoading(false));
    }
  }, [isAuthenticated, fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  const handleLogout = async () => {
    await logout();
  };

  const handleHelpSupport = () => {
    router.push('/settings' as any);
  };

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['rgba(108,134,168,0.15)', 'transparent']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.authPrompt}>
          <View style={styles.authIconRing}>
            <Ionicons name="person-circle-outline" size={60} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.authTitle}>Sign in to Palletium</Text>
          <Text style={styles.authSubtitle}>
            Track your earnings, rewards, and listening history
          </Text>
          <Pressable
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={['#c0c8d6', '#9ba8bc']}
              style={styles.signInGradient}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerText}>Create Account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isArtist = user.type === 'artist';
  const { roleLabel, isVerifiedArtist, isAdmin } = getUserEntitlements(user);

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient gradient */}
      <LinearGradient
        colors={['rgba(108,134,168,0.15)', 'transparent', 'rgba(108,134,168,0.06)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Offline Banner */}
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={16} color={theme.colors.warning} />
            <Text style={styles.offlineText}>You're offline</Text>
          </View>
        )}

        {/* Profile Header with Glow */}
        <View style={styles.header}>
          <Pressable onPress={handleChangePhoto} disabled={uploadingPhoto} style={styles.avatarContainer}>
            <View style={styles.avatarGlow}>
              {user.profile_image ? (
                <Image source={{ uri: user.profile_image }} style={styles.avatar} transition={300} />
              ) : (
                <LinearGradient
                  colors={['rgba(108,134,168,0.3)', 'rgba(192,200,214,0.2)']}
                  style={[styles.avatar, styles.avatarPlaceholder]}
                >
                  <Text style={styles.avatarText}>
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
            </View>
            {/* Camera icon overlay */}
            <View style={styles.cameraIconContainer}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </View>
          </Pressable>
          <Text style={styles.name}>{user.name || 'Palletium User'}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badge}>
            <Ionicons
              name={isArtist ? 'musical-notes' : 'headset'}
              size={14}
              color={theme.colors.accent}
            />
            <Text style={styles.badgeText}>{roleLabel}</Text>
            {isVerifiedArtist && (
              <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
            )}
          </View>
        </View>

        {/* Prominent Earnings/Rewards Button */}
        {!loading && !isAdmin && (
          <Pressable
            style={styles.earningsButton}
            onPress={() => router.push(isArtist ? '/stats/earnings' : '/(tabs)/rewards' as any)}
          >
            <LinearGradient
              colors={isArtist ? ['#6c86a8', '#4a6a8a'] : ['#6c86a8', '#4a6a8a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.earningsButtonGradient}
            >
              <View style={styles.earningsIconContainer}>
                <Ionicons name={isArtist ? 'cash' : 'gift'} size={28} color="#fff" />
              </View>
              <View style={styles.earningsTextContainer}>
                <Text style={styles.earningsLabel}>
                  {isArtist ? 'Your Earnings' : 'Your Rewards'}
                </Text>
                <Text style={styles.earningsValue}>
                  ${isArtist
                    ? (stats?.total_earnings || 0).toFixed(2)
                    : (stats?.total_rewards || 0).toFixed(2)
                  }
                </Text>
              </View>
              <View style={styles.earningsArrow}>
                <Text style={styles.viewDetailsText}>View Details</Text>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
            {/* Pending badge for artists */}
            {isArtist && (stats?.pending_earnings || 0) > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  ${(stats?.pending_earnings || 0).toFixed(2)} pending
                </Text>
              </View>
            )}
          </Pressable>
        )}

        {/* Payout Progress — Artist */}
        {isArtist && !isAdmin && !loading && (
          <View style={styles.payoutCard}>
            <LinearGradient
              colors={['rgba(27,31,43,0.6)', 'rgba(33,38,55,0.6)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.payoutHeader}>
              {isVerifiedArtist ? (
                <>
                  <Ionicons name="shield-checkmark" size={16} color={theme.colors.success} />
                  <Text style={styles.payoutTitle}>Verified — Dynasty Tier</Text>
                </>
              ) : (
                <>
                  <Ionicons name="alert-circle" size={16} color={theme.colors.warning} />
                  <Text style={styles.payoutTitle}>Unverified — AI Tier ($0.004/play)</Text>
                </>
              )}
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={['#6c86a8', '#c0c8d6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill,
                  { width: `${Math.min(((stats?.total_earnings || 0) / 50) * 100, 100)}%` },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressAmount}>
                ${(stats?.total_earnings || 0).toFixed(2)}
              </Text>
              <Text style={styles.progressTarget}>$50.00</Text>
            </View>
            <Text style={styles.progressNote}>
              {(stats?.total_earnings || 0) >= 50
                ? 'Eligible for monthly payout'
                : `${Math.min(Math.round(((stats?.total_earnings || 0) / 50) * 100), 100)}% toward next payout`}
            </Text>
          </View>
        )}

        {/* Stats Section */}
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : !isAdmin ? (
          isArtist ? (
            <View style={styles.statsGrid}>
              <GlassStatCard
                icon="play"
                label="Total Plays"
                value={formatNumber(stats?.total_plays || 0)}
                color={theme.colors.primary}
                gradientColors={['rgba(108,134,168,0.15)', 'rgba(108,134,168,0.05)']}
              />
              <GlassStatCard
                icon="people"
                label="Listeners"
                value={formatNumber(stats?.unique_listeners || 0)}
                color={theme.colors.accent}
                gradientColors={['rgba(192,200,214,0.12)', 'rgba(192,200,214,0.04)']}
              />
              <GlassStatCard
                icon="musical-note"
                label="Tracks"
                value={trackCount > 0 ? trackCount.toString() : (stats?.track_count?.toString() || '0')}
                color={theme.colors.primary}
                gradientColors={['rgba(108,134,168,0.15)', 'rgba(108,134,168,0.05)']}
              />
            </View>
          ) : (
            <View style={styles.heroCard}>
              <LinearGradient
                colors={['rgba(108,134,168,0.1)', 'rgba(27,31,43,0.6)']}
                style={StyleSheet.absoluteFill}
              />
              {/* Hero stat — Discoveries */}
              <View style={styles.heroMain}>
                <View style={styles.heroIconRing}>
                  <Ionicons name="compass" size={28} color={theme.colors.accent} />
                </View>
                <View>
                  <Text style={styles.heroValue}>
                    {formatNumber(stats?.discovery_count || 0)}
                  </Text>
                  <Text style={styles.heroLabel}>Discoveries</Text>
                </View>
              </View>
              {/* Secondary stats */}
              <View style={styles.heroRow}>
                <View style={styles.heroStat}>
                  <Ionicons name="gift" size={16} color="#4ade80" />
                  <Text style={styles.heroStatValue}>
                    ${(stats?.total_rewards || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.heroStatLabel}>Rewards</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Ionicons name="play" size={16} color={theme.colors.primary} />
                  <Text style={styles.heroStatValue}>
                    {formatNumber(stats?.play_count || 0)}
                  </Text>
                  <Text style={styles.heroStatLabel}>Plays</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Ionicons name="trophy" size={16} color="#fbbf24" />
                  <Text style={styles.heroStatValue}>
                    {stats?.current_tier || 'Bronze'}
                  </Text>
                  <Text style={styles.heroStatLabel}>Tier</Text>
                </View>
              </View>
              {/* Canonical copy */}
              <Text style={styles.heroFooter}>
                Rewards accrue from first listens on verified artists.
              </Text>
            </View>
          )
        ) : null}

        {/* Analytics Section */}
        {!isArtist && !isAdmin && !loading && (
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/insights/taste' as any)}
          >
            <LinearGradient
              colors={['rgba(27,31,43,0.6)', 'rgba(33,38,55,0.6)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.actionContent}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="trending-up" size={24} color={theme.colors.accent} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Taste Evolution</Text>
                <Text style={styles.actionSubtitle}>See how your music taste has changed</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </View>
          </Pressable>
        )}

        {/* Upload Music CTA for listeners */}
        {!isArtist && !isAdmin && !loading && (
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/upload' as any)}
          >
            <LinearGradient
              colors={['rgba(27,31,43,0.6)', 'rgba(33,38,55,0.6)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(184, 134, 11, 0.15)' }]}>
                <Ionicons name="cloud-upload" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Upload Music</Text>
                <Text style={styles.actionSubtitle}>Start sharing your own tracks</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </View>
          </Pressable>
        )}

        {/* Admin Dashboard */}
        {(user.is_admin || user.type === 'admin') && !loading && (
          <Pressable
            style={styles.adminButton}
            onPress={() => router.push('/admin' as any)}
          >
            <LinearGradient
              colors={['#DC2626', '#991B1B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.adminGradient}
            >
              <View style={styles.adminIconContainer}>
                <Ionicons name="shield-checkmark" size={24} color="#fff" />
              </View>
              <View style={styles.adminTextContainer}>
                <Text style={styles.adminButtonTitle}>Admin Dashboard</Text>
                <Text style={styles.adminButtonSubtitle}>
                  Platform stats & management
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}

        {/* Frosted Glass Menu */}
        <View style={styles.menu}>
          <MenuItem
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push('/settings' as any)}
          />
          {!isAdmin && (
            <MenuItem
              icon="card-outline"
              label="Subscription"
              sublabel={user.subscription_status === 'active' ? 'Premium' : 'Free'}
              onPress={() => router.push('/settings/subscription' as any)}
            />
          )}
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={handleHelpSupport}
          />
          <MenuItem
            icon="information-circle-outline"
            label="About"
            onPress={() => router.push({ pathname: '/settings/legal', params: { type: 'terms' } } as any)}
            isLast
          />
        </View>

        {/* Sign Out */}
        <Pressable style={styles.signOutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* Version */}
        <Text style={styles.version}>Palletium v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Glass Stat Card Component
function GlassStatCard({ icon, label, value, color, gradientColors, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  gradientColors: [string, string];
  onPress?: () => void;
}) {
  const Content = (
    <>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.statIconRing}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.statCard} onPress={onPress}>
        {Content}
      </Pressable>
    );
  }

  return (
    <View style={styles.statCard}>
      {Content}
    </View>
  );
}

function MenuItem({ icon, label, sublabel, onPress, isLast }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable style={[styles.menuItem, !isLast && styles.menuItemBorder]} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
      </View>
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemLabel}>{label}</Text>
        {sublabel && <Text style={styles.menuItemSublabel}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.08)',
    padding: theme.spacing.sm,
    borderRadius: 10,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
  },
  offlineText: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
  },
  // Auth Screen
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  authIconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(108,134,168,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.1)',
  },
  authTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  authSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  signInButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  signInGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderRadius: 14,
  },
  signInText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  registerButton: {
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  registerText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
  // Profile Header
  header: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGlow: {
    shadowColor: '#6c86a8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(192,200,214,0.15)',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
    backgroundColor: '#6c86a8',
  },
  name: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    letterSpacing: 0.2,
  },
  email: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108,134,168,0.12)',
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
    marginTop: theme.spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.1)',
  },
  badgeText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  loader: {
    marginVertical: theme.spacing.xl,
  },
  // Glass Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statCard: {
    width: '31%',
    borderRadius: 14,
    padding: theme.spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
  },
  statIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(192,200,214,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // Discovery Hero Card (Listener)
  heroCard: {
    marginTop: theme.spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
    padding: theme.spacing.lg,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  heroIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(192,200,214,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.08)',
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(192,200,214,0.06)',
  },
  heroStat: {
    alignItems: 'center',
    gap: 4,
  },
  heroStatValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  heroStatLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  heroDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(192,200,214,0.08)',
  },
  heroFooter: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    letterSpacing: 0.2,
  },
  // Payout Progress (Artist)
  payoutCard: {
    marginTop: theme.spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.06)',
    padding: theme.spacing.md,
  },
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  payoutTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(192,200,214,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressAmount: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  progressTarget: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  progressNote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  // Action Cards
  actionCard: {
    marginTop: theme.spacing.lg,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.06)',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(192,200,214,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
  actionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  // Earnings Button
  earningsButton: {
    marginTop: theme.spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#6c86a8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  earningsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  earningsIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  earningsTextContainer: {
    flex: 1,
  },
  earningsLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  earningsValue: {
    color: '#fff',
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    marginTop: 2,
  },
  earningsArrow: {
    alignItems: 'flex-end',
  },
  viewDetailsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: theme.fontSize.xs,
    marginBottom: 2,
  },
  pendingBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  // Admin Button
  adminButton: {
    marginTop: theme.spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
  },
  adminGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  adminIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminTextContainer: {
    flex: 1,
  },
  adminButtonTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  adminButtonSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  // Frosted Glass Menu
  menu: {
    marginTop: theme.spacing.xl,
    backgroundColor: 'rgba(27,31,43,0.6)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,200,214,0.06)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(192,200,214,0.06)',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(192,200,214,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  menuItemSublabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  signOutText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
});
