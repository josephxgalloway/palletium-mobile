import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface AnimatedSplashProps {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Let GIF play for 3s, then fade out
    opacity.value = withDelay(
      3000,
      withTiming(0, { duration: 700 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Image
        source={require('../assets/images/splash-animated.gif')}
        style={styles.gif}
        contentFit="contain"
        autoplay
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  gif: {
    width: width * 0.6,
    height: width * 0.6,
  },
});
