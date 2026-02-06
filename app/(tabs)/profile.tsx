import { theme } from '@/constants/theme';
import { getUserEntitlements } from '@/lib/entitlements';
import api, { getArtistTracks } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { useNetworkStore } from '@/lib/store/networkStore';
import type { DashboardStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
      // Android - show alert with options
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
      // Request permissions
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
      // Create form data for upload
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

      // Update local user state with new image URL
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
      // For artists, use the same analytics endpoint as the web platform
      // This ensures data consistency - analytics returns values in DOLLARS
      if (user?.type === 'artist' && user?.id) {
        try {
          const analyticsResponse = await api.get(`/analytics/artist/${user.id}/overview`);
          const analyticsData = analyticsResponse.data;
          console.log('Profile - Artist analytics response:', JSON.stringify(analyticsData, null, 2));

          // Analytics endpoint returns values in DOLLARS
          const normalizedStats: DashboardStats = {
            total_earnings: analyticsData.totalEarnings || 0,
            pending_earnings: analyticsData.pendingEarnings || 0,
            total_plays: analyticsData.totalPlays || 0,
            unique_listeners: analyticsData.uniqueListeners || 0,
            track_count: analyticsData.totalTracks || 0,
            current_level: analyticsData.level || 1,
            monthly_revenue: analyticsData.monthlyEarnings || 0,
          };

          console.log('Profile - Normalized artist stats:', JSON.stringify(normalizedStats, null, 2));
          setStats(normalizedStats);

          // Also fetch track count for accurate display
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

      // Fallback: fetch from dashboard (for listeners and if analytics fails)
      const response = await api.get('/users/dashboard');
      console.log('Profile - Dashboard response:', JSON.stringify(response.data, null, 2));

      // Handle wrapped response: { stats: {...} } or direct {...}
      const dashboardData = response.data?.stats || response.data;

      // Dashboard may return values in cents for revenue - convert to dollars
      // Check if values look like cents (> 100 for typical earnings)
      const rawEarnings = dashboardData.total_earnings ?? dashboardData.total_revenue ?? 0;
      const rawPending = dashboardData.pending_earnings ?? dashboardData.pending_revenue ?? 0;

      // If values are large (likely cents), convert to dollars
      const isCents = rawEarnings > 1000 || rawPending > 1000;

      const normalizedStats: DashboardStats = {
        ...dashboardData,
        total_earnings: isCents ? rawEarnings / 100 : rawEarnings,
        pending_earnings: isCents ? rawPending / 100 : rawPending,
        track_count: dashboardData.track_count ?? dashboardData.total_tracks ?? 0,
      };

      console.log('Profile - Normalized stats:', JSON.stringify(normalizedStats, null, 2));
      setStats(normalizedStats);

      // For artists fallback, fetch track count
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
    // Navigate to settings page - support/FAQ available there
    router.push('/settings' as any);
  };

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Ionicons name="person-circle-outline" size={80} color={theme.colors.textMuted} />
          <Text style={styles.authTitle}>Sign in to Palletium</Text>
          <Text style={styles.authSubtitle}>
            Track your earnings, rewards, and listening history
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isArtist = user.type === 'artist';
  const { roleLabel, isVerifiedArtist, isAdmin } = getUserEntitlements(user);

  return (
    <SafeAreaView style={styles.container}>
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

        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto} style={styles.avatarContainer}>
            {user.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {/* Camera icon overlay */}
            <View style={styles.cameraIconContainer}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={theme.colors.textPrimary} />
              ) : (
                <Ionicons name="camera" size={16} color={theme.colors.textPrimary} />
              )}
            </View>
          </TouchableOpacity>
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

        {/* Prominent Earnings/Rewards Button (hidden for admins) */}
            {!loading && !isAdmin && (
              <TouchableOpacity
                style={styles.earningsButton}
                onPress={() => router.push(isArtist ? '/stats/earnings' : '/stats/dividends' as any)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[theme.colors.success, '#228B22']}
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
              </TouchableOpacity>
            )}

            {/* Stats Grid (hidden for admins) */}
            {loading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
            ) : !isAdmin ? (
              <View style={styles.statsGrid}>
                {isArtist ? (
                  <>
                    <StatCard
                      icon="play"
                      label="Total Plays"
                      value={formatNumber(stats?.total_plays || 0)}
                      color={theme.colors.primary}
                    />
                    <StatCard
                      icon="people"
                      label="Listeners"
                      value={formatNumber(stats?.unique_listeners || 0)}
                      color={theme.colors.accent}
                    />
                    <StatCard
                      icon="musical-note"
                      label="Tracks"
                      value={trackCount > 0 ? trackCount.toString() : (stats?.track_count?.toString() || '0')}
                      color={theme.colors.primary}
                    />
                  </>
                ) : (
                  <>
                    <StatCard
                      icon="compass"
                      label="Discoveries"
                      value={formatNumber(stats?.discovery_count || 0)}
                      color={theme.colors.accent}
                    />
                    <StatCard
                      icon="play"
                      label="Plays"
                      value={formatNumber(stats?.play_count || 0)}
                      color={theme.colors.primary}
                    />
                    <StatCard
                      icon="trophy"
                      label="Tier"
                      value={stats?.current_tier || 'Bronze'}
                      color={theme.colors.accent}
                    />
                    {/* XP is gated at 500 users - hidden until Season Pass unlocks */}
                  </>
                )}
              </View>
            ) : null}

            {/* Analytics Section (hidden for admins) */}
            {!isArtist && !isAdmin && !loading && (
              <TouchableOpacity
                style={styles.analyticsButton}
                onPress={() => router.push('/insights/taste' as any)}
              >
                <View style={styles.analyticsContent}>
                  <View style={styles.analyticsIconContainer}>
                    <Ionicons name="trending-up" size={24} color={theme.colors.accent} />
                  </View>
                  <View style={styles.analyticsTextContainer}>
                    <Text style={styles.analyticsTitle}>Taste Evolution</Text>
                    <Text style={styles.analyticsSubtitle}>See how your music taste has changed</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </View>
              </TouchableOpacity>
            )}

            {/* Upload Music CTA for listeners (hidden for admins) */}
            {!isArtist && !isAdmin && !loading && (
              <TouchableOpacity
                style={styles.analyticsButton}
                onPress={() => router.push('/upload' as any)}
              >
                <View style={styles.analyticsContent}>
                  <View style={[styles.analyticsIconContainer, { backgroundColor: 'rgba(184, 134, 11, 0.15)' }]}>
                    <Ionicons name="cloud-upload" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.analyticsTextContainer}>
                    <Text style={styles.analyticsTitle}>Upload Music</Text>
                    <Text style={styles.analyticsSubtitle}>Start sharing your own tracks</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </View>
              </TouchableOpacity>
            )}

            {/* Admin Dashboard (Admin only) */}
            {(user.is_admin || user.type === 'admin') && !loading && (
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => router.push('/admin' as any)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#DC2626', '#991B1B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.journeyButtonGradient}
                >
                  <View style={[styles.journeyIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="shield-checkmark" size={24} color="#fff" />
                  </View>
                  <View style={styles.journeyTextContainer}>
                    <Text style={[styles.journeyButtonTitle, { color: '#fff' }]}>Admin Dashboard</Text>
                    <Text style={[styles.journeyButtonSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                      Platform stats & management
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Menu Items */}
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
              />
            </View>

            {/* Sign Out */}
            <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Palletium v1.0.0</Text>
      </ScrollView>
    </SafeAreaView >
  );
}

// Helper Components
function StatCard({ icon, label, value, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  const Content = (
    <>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.statCard} onPress={onPress}>
        {Content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.statCard}>
      {Content}
    </View>
  );
}

function MenuItem({ icon, label, sublabel, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={theme.colors.textSecondary} />
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemLabel}>{label}</Text>
        {sublabel && <Text style={styles.menuItemSublabel}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
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
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  offlineText: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  authTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
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
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.borderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  signInText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  registerButton: {
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  registerText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
  },
  header: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  name: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  email: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  badgeText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  loader: {
    marginVertical: theme.spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statCard: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  analyticsButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  analyticsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsTextContainer: {
    flex: 1,
  },
  analyticsTitle: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: theme.fontSize.md,
  },
  analyticsSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  journeyButton: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  journeyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  journeyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyTextContainer: {
    flex: 1,
  },
  journeyButtonTitle: {
    color: theme.colors.background,
    fontWeight: 'bold',
    fontSize: theme.fontSize.md,
  },
  journeyButtonSubtitle: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: theme.fontSize.xs,
  },
  adminButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  menu: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  menuItemLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  menuItemSublabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
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
    fontWeight: theme.fontWeight.medium,
  },
  version: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  // Earnings button styles
  earningsButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsTextContainer: {
    flex: 1,
  },
  earningsLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  earningsValue: {
    color: '#fff',
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
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
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  pendingBadgeText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
});
