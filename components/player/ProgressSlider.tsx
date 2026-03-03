import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';

interface ProgressSliderProps {
  position: number;
  duration: number;
  onSeek: (value: number) => void;
  disabled?: boolean;
}

export default function ProgressSlider({ position, duration, onSeek, disabled }: ProgressSliderProps) {
  const trackWidth = useSharedValue(0);
  const thumbScale = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const dragProgress = useSharedValue(0);

  const progress = duration > 0 ? position / duration : 0;

  const handleSeek = (ratio: number) => {
    onSeek(ratio * duration);
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin((e) => {
      isDragging.value = true;
      thumbScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      dragProgress.value = Math.max(0, Math.min(1, e.x / trackWidth.value));
    })
    .onUpdate((e) => {
      dragProgress.value = Math.max(0, Math.min(1, e.x / trackWidth.value));
    })
    .onEnd(() => {
      isDragging.value = false;
      thumbScale.value = withTiming(0, { duration: 800 });
      runOnJS(handleSeek)(dragProgress.value);
    });

  // Also handle tap-to-seek
  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((e) => {
      const ratio = Math.max(0, Math.min(1, e.x / trackWidth.value));
      runOnJS(handleSeek)(ratio);
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const fillStyle = useAnimatedStyle(() => {
    const width = isDragging.value
      ? `${dragProgress.value * 100}%`
      : `${progress * 100}%`;
    return { width } as any;
  });

  const thumbStyle = useAnimatedStyle(() => {
    const left = isDragging.value
      ? dragProgress.value * trackWidth.value
      : progress * trackWidth.value;
    return {
      transform: [
        { translateX: left - 7 },
        { scale: thumbScale.value },
      ],
      opacity: thumbScale.value,
    };
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View
          style={styles.trackContainer}
          onLayout={(e) => {
            trackWidth.value = e.nativeEvent.layout.width;
          }}
        >
          {/* Track background */}
          <View style={styles.track} />

          {/* Fill with gradient + glow */}
          <Animated.View style={[styles.fillContainer, fillStyle]}>
            <LinearGradient
              colors={['#6c86a8', '#c0c8d6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fill}
            />
            <View style={styles.fillGlow} />
          </Animated.View>

          {/* Thumb */}
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>

      {/* Time labels */}
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
  },
  trackContainer: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    backgroundColor: 'rgba(192, 200, 214, 0.1)',
    borderRadius: 2,
  },
  fillContainer: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    borderRadius: 2,
  },
  fillGlow: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    bottom: -2,
    borderRadius: 4,
    shadowColor: '#6c86a8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#c0c8d6',
    top: 7,
    shadowColor: '#c0c8d6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 0,
  },
  timeText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
