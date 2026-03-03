import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

/**
 * Breathing pulse animation — scale 1.0 ↔ 1.08 over 1.2s.
 * Used on the MiniPlayer play button while playing.
 */
export function usePulse(isActive: boolean) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(scale);
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return animStyle;
}

/**
 * Gentle vertical float — translateY 0 ↔ -4px over 3s.
 * Used on the full player artwork while playing.
 */
export function useFloat(isActive: boolean) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      translateY.value = withRepeat(
        withTiming(-4, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(translateY);
      translateY.value = withTiming(0, { duration: 600 });
    }
    return () => cancelAnimation(translateY);
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return animStyle;
}

/**
 * Breathing glow — shadow opacity pulses 0.2 ↔ 0.5 over 2s.
 * Used on the full player play button while playing.
 */
export function useGlow(isActive: boolean) {
  const glowOpacity = useSharedValue(0.2);

  useEffect(() => {
    if (isActive) {
      glowOpacity.value = withRepeat(
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(glowOpacity);
      glowOpacity.value = withTiming(0.2, { duration: 400 });
    }
    return () => cancelAnimation(glowOpacity);
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return animStyle;
}

/**
 * Press-scale feedback — spring to 0.9 on press, 1.0 on release + haptic.
 * Used on all player buttons.
 */
export function usePressScale(
  hapticStyle: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
) {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 200 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 150 });
    Haptics.impactAsync(hapticStyle);
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animStyle };
}
