import React, { useMemo } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

interface WaveformSliderProps {
  position: number;
  duration: number;
  onSeek: (value: number) => void;
  isPlaying?: boolean;
  disabled?: boolean;
  /** Number of bars. Default: 50 */
  bars?: number;
  /** Bar area height in pixels. Default: 48 */
  height?: number;
}

/**
 * Waveform-style seek slider built with pure Views + Reanimated.
 *
 * Generates deterministic bar amplitudes seeded from track duration so
 * the same track always renders the same visual shape. Supports
 * tap-to-seek and pan-to-scrub via GestureHandler.
 */
export default function WaveformSlider({
  position,
  duration,
  onSeek,
  isPlaying = false,
  disabled = false,
  bars = 50,
  height = 48,
}: WaveformSliderProps) {
  const containerWidth = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const dragProgress = useSharedValue(0);

  const progress = duration > 0 ? position / duration : 0;

  // Deterministic amplitudes seeded from duration
  const amplitudes = useMemo(() => {
    const seed = Math.round(duration * 1000) || 42;
    return Array.from({ length: bars }, (_, i) => {
      const x = Math.sin(seed * 0.01 + i * 0.7) * 10000;
      const base = (x - Math.floor(x)) * 0.65 + 0.15;
      const envelope = 0.5 + 0.5 * Math.sin((i / bars) * Math.PI);
      return base * (0.4 + 0.6 * envelope);
    });
  }, [duration, bars]);

  const handleSeek = (ratio: number) => {
    onSeek(ratio * duration);
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin((e) => {
      isDragging.value = true;
      dragProgress.value = Math.max(0, Math.min(1, e.x / containerWidth.value));
    })
    .onUpdate((e) => {
      dragProgress.value = Math.max(0, Math.min(1, e.x / containerWidth.value));
    })
    .onEnd(() => {
      isDragging.value = false;
      runOnJS(handleSeek)(dragProgress.value);
    });

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((e) => {
      const ratio = Math.max(0, Math.min(1, e.x / containerWidth.value));
      runOnJS(handleSeek)(ratio);
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const handleLayout = (e: LayoutChangeEvent) => {
    containerWidth.value = e.nativeEvent.layout.width;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={[styles.barsContainer, { height }]} onLayout={handleLayout}>
          {amplitudes.map((amp, i) => (
            <WaveformBar
              key={i}
              index={i}
              amplitude={amp}
              totalBars={bars}
              height={height}
              progress={progress}
              isDragging={isDragging}
              dragProgress={dragProgress}
              isPlaying={isPlaying}
            />
          ))}
        </View>
      </GestureDetector>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

// ── Individual bar ──────────────────────────────────────────────────

interface WaveformBarProps {
  index: number;
  amplitude: number;
  totalBars: number;
  height: number;
  progress: number;
  isDragging: SharedValue<boolean>;
  dragProgress: SharedValue<number>;
  isPlaying: boolean;
}

const PLAYED_COLOR = 'rgba(192, 200, 214, 0.85)'; // accent-silver
const UNPLAYED_COLOR = 'rgba(101, 112, 138, 0.30)'; // palladium-500 dimmed
const DRAG_COLOR = 'rgba(192, 200, 214, 0.65)'; // slightly dimmer during drag

function WaveformBar({
  index,
  amplitude,
  totalBars,
  height,
  progress,
  isDragging,
  dragProgress,
  isPlaying,
}: WaveformBarProps) {
  const fraction = (index + 0.5) / totalBars;

  const animStyle = useAnimatedStyle(() => {
    const effectiveProgress = isDragging.value ? dragProgress.value : progress;
    const isPlayed = fraction <= effectiveProgress;

    const bgColor = isPlayed
      ? isDragging.value
        ? DRAG_COLOR
        : PLAYED_COLOR
      : UNPLAYED_COLOR;

    return {
      backgroundColor: bgColor,
    };
  });

  const barHeight = Math.max(4, height * amplitude);

  return (
    <Animated.View
      style={[
        styles.bar,
        animStyle,
        {
          height: barHeight,
        },
      ]}
    />
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
