import { useEffect, useRef, useCallback, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/lib/store/authStore';

// Lazy load socket.io-client - app works without it, just no real-time notifications
let io: any = null;
try {
  io = require('socket.io-client').io;
} catch (e) {
  console.warn('[WebSocket] socket.io-client not installed - artist notifications disabled');
}

const WS_URL = 'https://palletium.com';

export interface ArtistPlayNotification {
  type: 'NEW_PLAY';
  trackId: string;
  trackTitle: string;
  listenerId: string;
  listenerName: string;
  listenerProfileImage?: string;
  payment: number;
  isFirstListen: boolean;
  timestamp: string;
}

type NotificationCallback = (notification: ArtistPlayNotification) => void;

export function useArtistNotifications(onNotification: NotificationCallback) {
  const { user, isAuthenticated } = useAuthStore();
  const socketRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    // Only connect for authenticated artists with socket.io available
    if (!io || !isAuthenticated || !user || user.type !== 'artist') {
      return;
    }

    // Already connected
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        console.log('[WebSocket] No auth token, skipping connection');
        return;
      }

      console.log('[WebSocket] Connecting to', WS_URL);

      socketRef.current = io(WS_URL, {
        path: '/user-socket',
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', (reason: string) => {
        console.log('[WebSocket] Disconnected:', reason);
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error: Error) => {
        console.warn('[WebSocket] Connection error:', error.message);
        setIsConnected(false);
      });

      // Listen for artist play notifications
      socketRef.current.on('artist:new-play', (data: ArtistPlayNotification) => {
        console.log('[WebSocket] Received artist:new-play:', data);
        onNotification(data);
      });

    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
    }
  }, [isAuthenticated, user, onNotification]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[WebSocket] Disconnecting');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Reconnect when auth state changes
  useEffect(() => {
    if (isAuthenticated && user?.type === 'artist') {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, user?.type, connect, disconnect]);

  return { isConnected };
}

export default useArtistNotifications;
