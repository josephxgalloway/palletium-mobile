import { View, Text, StyleSheet, Pressable, Dimensions, Share, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useTrackProgress } from '@/hooks/useTrackProgress';
import { theme } from '@/constants/theme';
import { getArtistName, getCoverUrl } from '@/types';
import { useState, useEffect } from 'react';
import { likeTrack, unlikeTrack, getTrackInteraction } from '@/lib/api/client';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/lib/store/authStore';
import { useFloat, useGlow, usePressScale } from '@/hooks/usePlayerAnimations';
import WaveformSlider from '@/components/player/WaveformSlider';
import EarningsTicker from '@/components/player/EarningsTicker';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = width - 56;

export default function PlayerScreen() {
  const { currentTrack, pause, resume, seekTo, skipNext, skipPrevious, queue, isPreviewMode } = usePlayerStore();
  const { position, duration, isPlaying, isBuffering } = useTrackProgress();
  const { isAuthenticated } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Animation hooks
  const floatStyle = useFloat(isPlaying);
  const glowStyle = useGlow(isPlaying);
  const playPress = usePressScale(Haptics.ImpactFeedbackStyle.Medium);
  const skipPrevPress = usePressScale();
  const skipNextPress = usePressScale();
  const likePress = usePressScale();
  const sharePress = usePressScale();

  useEffect(() => {
    if (currentTrack && isAuthenticated) {
      getTrackInteraction(currentTrack.id)
        .then((data) => setIsLiked(data?.is_liked || false))
        .catch(() => setIsLiked(false));
    }
  }, [currentTrack?.id, isAuthenticated]);

  const handleLike = async () => {
    if (!currentTrack || !isAuthenticated) {
      Toast.show({ type: 'info', text1: 'Sign in to like tracks' });
      return;
    }
    try {
      if (isLiked) {
        await unlikeTrack(currentTrack.id);
        setIsLiked(false);
        Toast.show({ type: 'success', text1: 'Removed from Liked' });
      } else {
        await likeTrack(currentTrack.id);
        setIsLiked(true);
        Toast.show({ type: 'success', text1: 'Added to Liked' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to update' });
    }
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    try {
      await Share.share({
        message: `Check out "${currentTrack.title}" by ${getArtistName(currentTrack)} on Palletium!`,
        url: `https://palletium.com/track/${currentTrack.id}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleViewArtist = () => {
    if (!currentTrack) return;
    const artistId = currentTrack.artist_id;
    if (!artistId) {
      Toast.show({ type: 'error', text1: 'Artist not found' });
      return;
    }
    router.back();
    setTimeout(() => {
      router.push(`/artist/${artistId}` as any);
    }, 100);
  };

  const showMenu = () => {
    const options = ['Share Track', 'View Artist', 'Add to Playlist', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3 },
        (buttonIndex) => {
          if (buttonIndex === 0) handleShare();
          if (buttonIndex === 1) handleViewArtist();
          if (buttonIndex === 2) {
            Toast.show({ type: 'info', text1: 'Coming soon', text2: 'Add to playlist from Library' });
          }
        }
      );
    } else {
      handleShare();
    }
  };

  const toggleShuffle = () => {
    setIsShuffleOn(!isShuffleOn);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Toast.show({ type: 'info', text1: isShuffleOn ? 'Shuffle Off' : 'Shuffle On', visibilityTime: 1500 });
  };

  const toggleRepeat = () => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    setRepeatMode(nextMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Toast.show({ type: 'info', text1: { off: 'Repeat Off', all: 'Repeat All', one: 'Repeat One' }[nextMode], visibilityTime: 1500 });
  };

  const handleSkipNext = async () => {
    if (queue.length === 0) {
      Toast.show({ type: 'info', text1: 'No more tracks in queue' });
      return;
    }
    await skipNext();
  };

  const handleSkipPrevious = async () => {
    if (position > 3) {
      await seekTo(0);
      return;
    }
    await skipPrevious();
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['rgba(108, 134, 168, 0.15)', 'transparent', 'rgba(108, 134, 168, 0.08)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-down" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>No track playing</Text>
        </View>
      </SafeAreaView>
    );
  }

  const coverUrl = getCoverUrl(currentTrack);
  const artistName = getArtistName(currentTrack);

  return (
    <SafeAreaView style={styles.container}>
      {/* Layered ambient gradient background */}
      <LinearGradient
        colors={['rgba(108, 134, 168, 0.15)', 'transparent', 'rgba(108, 134, 168, 0.08)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top vignette for header readability */}
      <LinearGradient
        colors={['rgba(22, 25, 34, 0.8)', 'transparent']}
        style={styles.topVignette}
      />

      {/* Header — drag pill + close/menu */}
      <View style={styles.dragPillContainer}>
        <View style={styles.dragPill} />
      </View>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-down" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.headerButton} onPress={showMenu}>
          <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      {/* Floating artwork */}
      <View style={styles.artworkContainer}>
        <Animated.View style={[styles.artworkShadow, floatStyle]}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.artwork}
              transition={300}
            />
          ) : (
            <View style={[styles.artwork, styles.artworkPlaceholder]}>
              <Ionicons name="musical-note" size={80} color={theme.colors.textMuted} />
            </View>
          )}
        </Animated.View>
      </View>

      {/* Track info */}
      <View style={styles.trackInfo}>
        <Text style={styles.title} numberOfLines={2}>{currentTrack.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{artistName}</Text>
      </View>

      {/* Earnings ticker — appears when 30s settlement fires */}
      <EarningsTicker />

      {/* Like / Share row */}
      <View style={styles.actionRow}>
        <Animated.View style={likePress.animStyle}>
          <Pressable
            style={styles.actionButton}
            onPress={handleLike}
            onPressIn={likePress.onPressIn}
            onPressOut={likePress.onPressOut}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? '#F87171' : theme.colors.textSecondary}
            />
          </Pressable>
        </Animated.View>
        <Animated.View style={sharePress.animStyle}>
          <Pressable
            style={styles.actionButton}
            onPress={handleShare}
            onPressIn={sharePress.onPressIn}
            onPressOut={sharePress.onPressOut}
          >
            <Ionicons name="share-outline" size={22} color={theme.colors.textSecondary} />
          </Pressable>
        </Animated.View>
      </View>

      {/* Waveform seek bar */}
      <WaveformSlider
        position={position}
        duration={duration}
        onSeek={seekTo}
        isPlaying={isPlaying}
        disabled={isPreviewMode}
      />

      {/* Glass control panel */}
      <View style={styles.controlsPanelContainer}>
        <BlurView intensity={40} tint="dark" style={styles.controlsPanel}>
          <LinearGradient
            colors={['rgba(33, 38, 55, 0.4)', 'rgba(27, 31, 43, 0.4)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.controls}>
            {/* Shuffle */}
            <Pressable style={styles.secondaryControl} onPress={toggleShuffle}>
              <Ionicons
                name="shuffle"
                size={22}
                color={isShuffleOn ? theme.colors.primary : 'rgba(101, 112, 138, 0.6)'}
              />
              {isShuffleOn && <View style={styles.activeIndicator} />}
            </Pressable>

            {/* Skip Previous */}
            <Animated.View style={skipPrevPress.animStyle}>
              <Pressable
                style={styles.skipControl}
                onPress={handleSkipPrevious}
                onPressIn={skipPrevPress.onPressIn}
                onPressOut={skipPrevPress.onPressOut}
              >
                <Ionicons name="play-skip-back" size={28} color={theme.colors.textPrimary} />
              </Pressable>
            </Animated.View>

            {/* Play/Pause — gradient circle with glow */}
            <Animated.View style={[styles.playControlOuter, glowStyle]}>
              <Animated.View style={playPress.animStyle}>
                <Pressable
                  onPress={handlePlayPause}
                  onPressIn={playPress.onPressIn}
                  onPressOut={playPress.onPressOut}
                >
                  <LinearGradient
                    colors={['#c0c8d6', '#9ba8bc']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.playControl}
                  >
                    {isBuffering ? (
                      <Ionicons name="hourglass" size={34} color={theme.colors.background} />
                    ) : (
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={34}
                        color={theme.colors.background}
                      />
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            </Animated.View>

            {/* Skip Next */}
            <Animated.View style={skipNextPress.animStyle}>
              <Pressable
                style={styles.skipControl}
                onPress={handleSkipNext}
                onPressIn={skipNextPress.onPressIn}
                onPressOut={skipNextPress.onPressOut}
              >
                <Ionicons name="play-skip-forward" size={28} color={theme.colors.textPrimary} />
              </Pressable>
            </Animated.View>

            {/* Repeat */}
            <Pressable style={styles.secondaryControl} onPress={toggleRepeat}>
              <Ionicons
                name="repeat"
                size={22}
                color={repeatMode !== 'off' ? theme.colors.primary : 'rgba(101, 112, 138, 0.6)'}
              />
              {repeatMode === 'one' && <Text style={styles.repeatOneIndicator}>1</Text>}
              {repeatMode !== 'off' && <View style={styles.activeIndicator} />}
            </Pressable>
          </View>
        </BlurView>
      </View>

      <View style={{ flex: 1 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 1,
  },
  dragPillContainer: {
    alignItems: 'center',
    paddingTop: 8,
    zIndex: 2,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(192, 200, 214, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    zIndex: 2,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  artworkShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(192, 200, 214, 0.08)',
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 16,
  },
  artworkPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  artist: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    marginBottom: 20,
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsPanelContainer: {
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192, 200, 214, 0.06)',
  },
  controlsPanel: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 16,
  },
  secondaryControl: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  repeatOneIndicator: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  skipControl: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playControlOuter: {
    shadowColor: '#c0c8d6',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderRadius: 36,
  },
  playControl: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
});
