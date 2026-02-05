import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Share, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useTrackProgress } from '@/hooks/useTrackProgress';
import { theme } from '@/constants/theme';
import { getArtistName, getCoverUrl } from '@/types';
import { useState, useEffect } from 'react';
import { likeTrack, unlikeTrack, getTrackInteraction } from '@/lib/api/client';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/lib/store/authStore';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = width - 80;

export default function PlayerScreen() {
  const { currentTrack, pause, resume, seekTo, skipNext, skipPrevious, queue } = usePlayerStore();
  const { position, duration, isPlaying, isBuffering } = useTrackProgress();
  const { isAuthenticated } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Fetch like status when track changes
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
        message: `Check out "${currentTrack.title}" by ${getArtistName(currentTrack)} on Palletium! 🎵`,
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
      Toast.show({ type: 'error', text1: 'Artist not found', text2: 'Unable to load artist profile' });
      return;
    }

    // Close the player modal first, then navigate
    router.back();
    setTimeout(() => {
      router.push(`/artist/${artistId}` as any);
    }, 100);
  };

  const showMenu = () => {
    const options = ['Share Track', 'View Artist', 'Add to Playlist', 'Cancel'];
    const cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) handleShare();
          if (buttonIndex === 1) handleViewArtist();
          if (buttonIndex === 2) {
            Toast.show({ type: 'info', text1: 'Coming soon', text2: 'Add to playlist from Library' });
          }
        }
      );
    } else {
      // Android - simple menu
      handleShare();
    }
  };

  const toggleShuffle = () => {
    setIsShuffleOn(!isShuffleOn);
    Toast.show({
      type: 'info',
      text1: isShuffleOn ? 'Shuffle Off' : 'Shuffle On',
      visibilityTime: 1500,
    });
  };

  const toggleRepeat = () => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);

    const messages = { off: 'Repeat Off', all: 'Repeat All', one: 'Repeat One' };
    Toast.show({ type: 'info', text1: messages[nextMode], visibilityTime: 1500 });
  };

  const handleSkipNext = async () => {
    if (queue.length === 0) {
      Toast.show({ type: 'info', text1: 'No more tracks in queue' });
      return;
    }
    await skipNext();
  };

  const handleSkipPrevious = async () => {
    // If position > 3 seconds, restart current track
    if (position > 3) {
      await seekTo(0);
      return;
    }
    await skipPrevious();
  };

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No track playing</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = async (value: number) => {
    await seekTo(value);
  };

  const coverUrl = getCoverUrl(currentTrack);
  const artistName = getArtistName(currentTrack);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="chevron-down" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity style={styles.menuButton} onPress={showMenu}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Artwork */}
      <View style={styles.artworkContainer}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={styles.artwork}
          />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Ionicons name="musical-note" size={80} color={theme.colors.textMuted} />
          </View>
        )}
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{artistName}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={position}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{formatTime(position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Like Button Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={isLiked ? theme.colors.error : theme.colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={26} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.secondaryControl} onPress={toggleShuffle}>
          <Ionicons
            name="shuffle"
            size={24}
            color={isShuffleOn ? theme.colors.primary : theme.colors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipControl} onPress={handleSkipPrevious}>
          <Ionicons name="play-skip-back" size={32} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playControl}
          onPress={isPlaying ? pause : resume}
        >
          {isBuffering ? (
            <Ionicons name="hourglass" size={36} color={theme.colors.background} />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={36}
              color={theme.colors.background}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipControl} onPress={handleSkipNext}>
          <Ionicons name="play-skip-forward" size={32} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryControl} onPress={toggleRepeat}>
          <Ionicons
            name={repeatMode === 'one' ? 'repeat' : 'repeat'}
            size={24}
            color={repeatMode !== 'off' ? theme.colors.primary : theme.colors.textMuted}
          />
          {repeatMode === 'one' && (
            <Text style={styles.repeatOneIndicator}>1</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Payment indicator */}
      <View style={styles.paymentInfo}>
        <Ionicons name="cash" size={16} color={theme.colors.success} />
        <Text style={styles.paymentText}>
          Payment triggers after 30 seconds
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: theme.borderRadius.lg,
  },
  artworkPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  artist: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  actionButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
  },
  time: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  secondaryControl: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  repeatOneIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  skipControl: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playControl: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
  },
  paymentText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
  },
});
