import { useEffect, useRef } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/lib/store/playerStore';
import { theme } from '@/constants/theme';

type SettlementType = 'first_listen' | 'repeat_listen' | 'ai_tier' | 'self_play';

const COLORS: Record<SettlementType, {
  bg: [string, string];
  border: string;
  text: string;
}> = {
  first_listen: {
    bg: ['rgba(74,222,128,0.12)', 'rgba(34,197,94,0.06)'],
    border: 'rgba(74,222,128,0.2)',
    text: '#4ade80',
  },
  repeat_listen: {
    bg: ['rgba(192,200,214,0.12)', 'rgba(192,200,214,0.06)'],
    border: 'rgba(192,200,214,0.15)',
    text: '#c0c8d6',
  },
  ai_tier: {
    bg: ['rgba(251,191,36,0.12)', 'rgba(245,158,11,0.06)'],
    border: 'rgba(251,191,36,0.15)',
    text: '#fbbf24',
  },
  self_play: {
    bg: ['rgba(101,112,138,0.08)', 'rgba(101,112,138,0.04)'],
    border: 'rgba(101,112,138,0.1)',
    text: '#65708a',
  },
};

export default function EarningsTicker() {
  const lastSettlement = usePlayerStore(s => s.lastSettlement);
  const prevTimestamp = useRef<number>(0);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);

  useEffect(() => {
    if (!lastSettlement || lastSettlement.timestamp === prevTimestamp.current) return;
    prevTimestamp.current = lastSettlement.timestamp;

    // Haptic feedback — gentle success tap
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate: fade in (300ms) → hold (3s) → fade out (600ms)
    opacity.value = withSequence(
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withDelay(3000, withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) }))
    );
    translateY.value = withSequence(
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withDelay(3000, withTiming(4, { duration: 600, easing: Easing.in(Easing.cubic) }))
    );
  }, [lastSettlement?.timestamp]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!lastSettlement) return null;

  const type = (lastSettlement.paymentType || 'repeat_listen') as SettlementType;
  const colors = COLORS[type] || COLORS.repeat_listen;
  const isDiscovery = lastSettlement.isFirstListen;
  const dividend = lastSettlement.listenerDividend;
  const hasDividend = dividend > 0;
  const multiplier = lastSettlement.tierMultiplier;

  // Don't show for self-plays
  if (type === 'self_play') return null;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <LinearGradient
        colors={colors.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.pill, { borderColor: colors.border }]}
      >
        <Ionicons
          name={isDiscovery ? 'sparkles' : 'flash'}
          size={13}
          color={colors.text}
        />
        <Text style={[styles.text, { color: colors.text }]}>
          {isDiscovery ? 'Discovery! ' : ''}
          {hasDividend ? `+$${dividend.toFixed(3)}` : 'Settled'}
        </Text>
        {multiplier > 1 && hasDividend && (
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>{multiplier}x</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  multiplierBadge: {
    backgroundColor: 'rgba(192,200,214,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 2,
  },
  multiplierText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
});
