/**
 * Inactivity Timer Module
 *
 * Tracks user activity and enforces a 15-minute inactivity timeout.
 * In-memory timestamp is authoritative while the process is alive.
 * SecureStore persistence survives app kill/restart (flushed on background transition).
 *
 * Security posture: UX-level inactivity, independent of token refresh.
 */

import * as SecureStore from 'expo-secure-store';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const SECURE_STORE_KEY = 'lastActivityTimestamp';

// In-memory timestamp — authoritative while process is alive
let lastActivity = Date.now();

// In-memory flag for login screen toast
let wasAutoLoggedOut = false;

/**
 * Reset the inactivity timer. Called on every touch start.
 * In-memory only — SecureStore flush happens on background transition.
 */
export function resetInactivityTimer(): void {
  lastActivity = Date.now();
}

/**
 * Check if the user has been inactive for 15+ minutes.
 * Uses in-memory timestamp (authoritative while alive).
 */
export function isInactive(): boolean {
  return Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS;
}

/**
 * Flush the current in-memory timestamp to SecureStore.
 * Called once when the app transitions to background.
 * Best-effort — errors are silently ignored.
 */
export async function flushToSecureStore(): Promise<void> {
  try {
    await SecureStore.setItemAsync(SECURE_STORE_KEY, String(lastActivity));
  } catch {
    // Best-effort — if SecureStore write fails, in-memory is still authoritative
  }
}

/**
 * Initialize inactivity timer from SecureStore on cold start.
 * Returns true if the persisted timestamp is stale (15+ minutes old),
 * meaning the user should be logged out.
 * Does NOT navigate — the caller (layout) handles that.
 */
export async function initInactivityTimer(): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (stored) {
      const storedTimestamp = parseInt(stored, 10);
      if (!isNaN(storedTimestamp)) {
        lastActivity = storedTimestamp;
        return Date.now() - storedTimestamp >= INACTIVITY_TIMEOUT_MS;
      }
    }
  } catch {
    // SecureStore read failed — treat as fresh session
  }
  // No persisted timestamp or parse error — treat as fresh
  lastActivity = Date.now();
  return false;
}

/**
 * Mark that an auto-logout occurred (for login screen toast).
 */
export function setAutoLoggedOut(): void {
  wasAutoLoggedOut = true;
}

/**
 * Consume the auto-logout flag (one-time read, then resets).
 * Returns true if the user was auto-logged out due to inactivity.
 */
export function consumeAutoLoggedOut(): boolean {
  const val = wasAutoLoggedOut;
  wasAutoLoggedOut = false;
  return val;
}
