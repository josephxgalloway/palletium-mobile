import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface DividendPayment {
  id: string;
  trackId: string;
  trackTitle: string;
  artistName: string;
  amount: number;
  tierMultiplier: number;
  isDiscovery: boolean;
  timestamp: string;
}

interface PaymentHistoryState {
  payments: DividendPayment[];
  totalEarned: number;
  todayEarned: number;

  // Actions
  addPayment: (payment: Omit<DividendPayment, 'id'>) => void;
  clearHistory: () => void;
  getTodayTotal: () => number;
}

const STORAGE_KEY = 'palletium-payment-history';

export const usePaymentHistoryStore = create<PaymentHistoryState>()(
  persist(
    (set, get) => ({
      payments: [],
      totalEarned: 0,
      todayEarned: 0,

      addPayment: (payment) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const newPayment: DividendPayment = { ...payment, id };

        set((state) => {
          const newPayments = [newPayment, ...state.payments].slice(0, 100); // Keep last 100
          const newTotal = state.totalEarned + payment.amount;

          // Calculate today's earnings
          const today = new Date().toDateString();
          const todayPayments = newPayments.filter(
            (p) => new Date(p.timestamp).toDateString() === today
          );
          const newTodayEarned = todayPayments.reduce((sum, p) => sum + p.amount, 0);

          return {
            payments: newPayments,
            totalEarned: newTotal,
            todayEarned: newTodayEarned,
          };
        });
      },

      clearHistory: () => {
        set({ payments: [], totalEarned: 0, todayEarned: 0 });
      },

      getTodayTotal: () => {
        const today = new Date().toDateString();
        const todayPayments = get().payments.filter(
          (p) => new Date(p.timestamp).toDateString() === today
        );
        return todayPayments.reduce((sum, p) => sum + p.amount, 0);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
