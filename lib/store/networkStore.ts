import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;

  initialize: () => () => void;
  checkConnection: () => Promise<boolean>;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isConnected: true,
  isInternetReachable: true,
  connectionType: null,

  initialize: () => {
    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = get().isConnected;
      const isNowConnected = state.isConnected ?? false;

      set({
        isConnected: isNowConnected,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });

      // Show toast on connection change
      if (wasConnected && !isNowConnected) {
        Toast.show({
          type: 'offline',
          text1: 'No Internet Connection',
          text2: 'Some features may be unavailable',
          position: 'top',
          visibilityTime: 4000,
        });
      } else if (!wasConnected && isNowConnected) {
        Toast.show({
          type: 'success',
          text1: 'Back Online',
          text2: 'Connection restored',
          position: 'top',
          visibilityTime: 2000,
        });
      }
    });

    return unsubscribe;
  },

  checkConnection: async () => {
    const state = await NetInfo.fetch();
    set({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      connectionType: state.type,
    });
    return state.isConnected ?? false;
  },
}));
