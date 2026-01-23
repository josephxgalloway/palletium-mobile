import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image } from 'react-native';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/authStore';
import { useArtistNotifications, ArtistPlayNotification } from '@/hooks/useArtistNotifications';

const MAX_VISIBLE = 3;
const NOTIFICATION_DURATION = 5000; // 5 seconds
const SLIDE_DURATION = 300;

interface NotificationWithId extends ArtistPlayNotification {
  id: string;
  animValue: Animated.Value;
}

export function ArtistPlayToast() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationWithId[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id);
      if (notification) {
        // Animate out
        Animated.timing(notification.animValue, {
          toValue: 0,
          duration: SLIDE_DURATION,
          useNativeDriver: true,
        }).start(() => {
          setNotifications((current) => current.filter((n) => n.id !== id));
        });
      }
      return prev;
    });

    // Clear timeout
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const handleNotification = useCallback((notification: ArtistPlayNotification) => {
    const id = `${notification.timestamp}-${Math.random().toString(36).slice(2)}`;
    const animValue = new Animated.Value(0);

    const withId: NotificationWithId = { ...notification, id, animValue };

    setNotifications((prev) => {
      // Keep only MAX_VISIBLE - 1 to make room for new one
      const truncated = prev.slice(0, MAX_VISIBLE - 1);
      return [withId, ...truncated];
    });

    // Animate in
    Animated.timing(animValue, {
      toValue: 1,
      duration: SLIDE_DURATION,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss
    const timeout = setTimeout(() => {
      dismissNotification(id);
    }, NOTIFICATION_DURATION);

    timeoutRefs.current.set(id, timeout);
  }, [dismissNotification]);

  // Connect to WebSocket for notifications
  useArtistNotifications(handleNotification);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  // Only render for artists
  if (!user || user.type !== 'artist') {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {notifications.map((notification, index) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          index={index}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
    </View>
  );
}

interface NotificationCardProps {
  notification: NotificationWithId;
  index: number;
  onDismiss: () => void;
}

function NotificationCard({ notification, index, onDismiss }: NotificationCardProps) {
  const { isFirstListen, listenerName, trackTitle, payment, listenerProfileImage, animValue } = notification;

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        isFirstListen && styles.cardFirstListen,
        {
          transform: [{ translateX }],
          opacity,
          marginTop: index > 0 ? 8 : 0,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.cardContent}
        onPress={onDismiss}
        activeOpacity={0.9}
      >
        {/* Avatar */}
        {listenerProfileImage ? (
          <Image
            source={{ uri: listenerProfileImage }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {listenerName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.textContent}>
          <View style={styles.headerRow}>
            {isFirstListen && (
              <Text style={styles.sparkle}>✨</Text>
            )}
            <Text style={styles.listenerName} numberOfLines={1}>
              {listenerName}
            </Text>
          </View>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {isFirstListen ? 'discovered' : 'played'} "{trackTitle}"
          </Text>
        </View>

        {/* Payment */}
        <View style={styles.paymentContainer}>
          <Text style={styles.paymentAmount}>
            ${payment.toFixed(2)}
          </Text>
          <Text style={styles.paymentLabel}>
            {isFirstListen ? 'first listen' : 'repeat'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* First listen highlight bar */}
      {isFirstListen && <View style={styles.highlightBar} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 16,
    zIndex: 9999,
    maxWidth: 320,
  },
  card: {
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardFirstListen: {
    backgroundColor: 'rgba(5, 46, 22, 0.95)', // Dark emerald
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  textContent: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sparkle: {
    fontSize: 14,
  },
  listenerName: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  trackTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  paymentContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    color: '#34D399', // Emerald
    fontSize: 16,
    fontWeight: '700',
  },
  paymentLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
  },
  highlightBar: {
    height: 2,
    backgroundColor: '#34D399',
  },
});

export default ArtistPlayToast;
