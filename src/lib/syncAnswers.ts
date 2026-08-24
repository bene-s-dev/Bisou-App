import { supabase } from './supabase';

const FAILED_SYNC_KEY = 'failed_sync_answers';
export const EVENT_ANSWERS_SYNCED = 'bisou-answers-synced';
export const EVENT_OFFLINE_ANSWERS_UPDATED = 'failed_sync_answers_updated';

export interface PendingAnswer {
  dayKey: string;
  choiceStr: string;
  timestamp?: number;
  attempts?: number;
}

let isSyncing = false;
let retryIntervalTimer: ReturnType<typeof setInterval> | null = null;
let isAutoSyncStarted = false;
let activePartnerId: string | undefined = undefined;

export function getPendingAnswers(): PendingAnswer | null {
  try {
    const saved = localStorage.getItem(FAILED_SYNC_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (e) {
    return null;
  }
}

export function savePendingAnswers(data: { dayKey: string; choiceStr: string }) {
  try {
    const payload = {
      ...data,
      timestamp: Date.now(),
      attempts: 0
    };
    localStorage.setItem(FAILED_SYNC_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event(EVENT_OFFLINE_ANSWERS_UPDATED));
  } catch (e) {
    console.error('Error saving pending answers to localStorage:', e);
  }
}

export function clearPendingAnswers() {
  try {
    localStorage.removeItem(FAILED_SYNC_KEY);
    window.dispatchEvent(new Event(EVENT_OFFLINE_ANSWERS_UPDATED));
  } catch (e) {
    console.error('Error clearing pending answers:', e);
  }
}

/**
 * Attempts to sync any pending offline answers stored in localStorage.
 * Returns true if sync succeeded or if there was nothing to sync.
 */
export async function syncPendingAnswers(partnerId?: string): Promise<boolean> {
  const pending = getPendingAnswers();
  if (!pending || !pending.dayKey || !pending.choiceStr) {
    stopRetryTimer();
    return true;
  }

  if (isSyncing) return false;
  isSyncing = true;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session) {
      isSyncing = false;
      return false;
    }

    const userId = session.user.id;

    // First attempt to delete any previous record for user on that day (or upsert directly)
    const { error: deleteError } = await supabase
      .from('answers')
      .delete()
      .eq('user_id', userId)
      .eq('day_key', pending.dayKey);

    if (deleteError) {
      console.warn('Delete prior answer attempt returned error (continuing with upsert):', deleteError);
    }

    const { error } = await supabase
      .from('answers')
      .upsert([
        {
          user_id: userId,
          choice: pending.choiceStr,
          day_key: pending.dayKey
        }
      ], { onConflict: 'user_id,day_key' });

    if (error && error.code !== '23505') {
      throw error;
    }

    // Success! Clear pending storage
    clearPendingAnswers();

    // Send push notification to partner if partnerId exists or can be fetched
    let pId = partnerId || activePartnerId;
    if (!pId) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('partner_id')
          .eq('id', userId)
          .maybeSingle();
        pId = prof?.partner_id;
      } catch (e) {}
    }

    if (pId) {
      supabase.functions.invoke('send-push-notification', {
        body: { user_id: userId, partner_id: pId, type: 'answer_submitted' }
      }).catch(err => console.warn('Push notification failed (non-critical):', err));
    }

    // Stop retry timer since pending answer has succeeded
    stopRetryTimer();

    // Dispatch event so UI components (Dashboard, App) update state automatically
    window.dispatchEvent(new CustomEvent(EVENT_ANSWERS_SYNCED, { detail: pending }));
    
    isSyncing = false;
    return true;
  } catch (err) {
    console.warn('Sync pending answers failed (will retry later when online or reopened):', err);
    
    // Increment attempts count in localStorage
    try {
      const current = getPendingAnswers();
      if (current) {
        current.attempts = (current.attempts || 0) + 1;
        localStorage.setItem(FAILED_SYNC_KEY, JSON.stringify(current));
      }
    } catch (e) {}
    
    isSyncing = false;
    return false;
  }
}

function stopRetryTimer() {
  if (retryIntervalTimer) {
    clearInterval(retryIntervalTimer);
    retryIntervalTimer = null;
  }
}

function ensureRetryTimer() {
  if (!retryIntervalTimer && getPendingAnswers()) {
    retryIntervalTimer = setInterval(() => {
      const pending = getPendingAnswers();
      if (pending) {
        syncPendingAnswers(activePartnerId);
      } else {
        stopRetryTimer();
      }
    }, 12000); // Retry every 12 seconds while app is open
  }
}

/**
 * Starts auto-syncing background manager.
 * Listens for online, focus, visibilitychange events and sets up retry intervals while open.
 */
export function startAutoSyncManager(partnerId?: string) {
  if (partnerId) {
    activePartnerId = partnerId;
  }

  // Attempt sync immediately if there are pending answers
  if (getPendingAnswers()) {
    syncPendingAnswers(activePartnerId);
    ensureRetryTimer();
  }

  if (isAutoSyncStarted) return;
  isAutoSyncStarted = true;

  const trySync = () => {
    if (getPendingAnswers()) {
      syncPendingAnswers(activePartnerId);
      ensureRetryTimer();
    }
  };

  // Re-sync when internet connection comes back online
  window.addEventListener('online', trySync);

  // Re-sync when app becomes visible (e.g. app reopened or tab switched back)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      trySync();
    }
  });

  // Re-sync when app window gains focus
  window.addEventListener('focus', trySync);
}

/**
 * Helper to submit answers directly or queue them for automatic retry if network fails.
 */
export async function submitOrQueueAnswers(params: {
  userId: string;
  dayKey: string;
  choiceStr: string;
  partnerId?: string;
}): Promise<{ success: boolean; queued: boolean; error?: any }> {
  const { userId, dayKey, choiceStr, partnerId } = params;
  if (partnerId) {
    activePartnerId = partnerId;
  }

  try {
    // Attempt direct submission
    const { error } = await supabase.from('answers').upsert([
      {
        user_id: userId,
        choice: choiceStr,
        day_key: dayKey
      }
    ], { onConflict: 'user_id,day_key' });

    if (error && error.code !== '23505') {
      throw error;
    }

    // Direct submit succeeded! Clear any pending answers
    clearPendingAnswers();

    if (partnerId) {
      supabase.functions.invoke('send-push-notification', {
        body: { user_id: userId, partner_id: partnerId, type: 'answer_submitted' }
      }).catch(err => console.warn('Push notification failed (non-critical):', err));
    }

    window.dispatchEvent(new CustomEvent(EVENT_ANSWERS_SYNCED, { detail: { dayKey, choiceStr } }));

    return { success: true, queued: false };
  } catch (err: any) {
    console.warn("Direct submission failed due to network/error, saving locally and queuing auto-retries:", err);

    // Save locally
    savePendingAnswers({ dayKey, choiceStr });

    // Start auto-retry manager immediately
    startAutoSyncManager(partnerId);

    return { success: false, queued: true, error: err };
  }
}
