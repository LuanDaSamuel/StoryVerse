const CACHE_CLEARED_TIMESTAMP_KEY = 'storyverse-last-cache-clear';
const UNLOAD_BACKUP_TIMESTAMP_KEY = 'storyverse-unload-backup-timestamp';
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

/**
 * Performs cache cleanup.
 * @param force If true, clears the caches immediately without checking if 30 minutes have elapsed.
 */
export async function clearAppCaches(force = false): Promise<boolean> {
  try {
    const now = Date.now();
    const lastClearStr = localStorage.getItem(CACHE_CLEARED_TIMESTAMP_KEY);
    const lastClear = lastClearStr ? parseInt(lastClearStr, 10) : 0;

    // Only proceed if 30 minutes have passed, or if forced
    if (!force && lastClear && (now - lastClear < THIRTY_MINUTES_MS)) {
      console.log(`Cache cleared recently. Next clear in ${Math.round((THIRTY_MINUTES_MS - (now - lastClear)) / 60000)} minutes.`);
      return false;
    }

    console.log("Initiating StoryVerse cache cleanup...");

    // 1. Clear Cache Storage API caches
    if ('caches' in window) {
      try {
        const cacheNames = await window.caches.keys();
        for (const cacheName of cacheNames) {
          await window.caches.delete(cacheName);
          console.log(`Successfully cleared browser cache storage: ${cacheName}`);
        }
      } catch (cacheError) {
        console.warn("Failed to clear window.caches:", cacheError);
      }
    }

    // 2. Unregister Service Workers to clean up caching
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log("Successfully unregistered a stale service worker during cleanup.");
        }
      } catch (swError) {
        console.warn("Failed to unregister service workers:", swError);
      }
    }

    // 3. Clear stale temporary emergency backup if older than 30 minutes
    const unloadBackupTimeStr = localStorage.getItem(UNLOAD_BACKUP_TIMESTAMP_KEY);
    const unloadBackupTime = unloadBackupTimeStr ? parseInt(unloadBackupTimeStr, 10) : 0;
    if (unloadBackupTime && (now - unloadBackupTime > THIRTY_MINUTES_MS)) {
      localStorage.removeItem('storyverse-unload-backup');
      localStorage.removeItem(UNLOAD_BACKUP_TIMESTAMP_KEY);
      console.log("Stale emergency backup older than 30 minutes was successfully cleared.");
    }

    // 4. Record the timestamp of this cache clear
    localStorage.setItem(CACHE_CLEARED_TIMESTAMP_KEY, now.toString());
    console.log("StoryVerse cache cleanup completed successfully.");
    return true;
  } catch (err) {
    console.error("An error occurred during StoryVerse cache cleanup:", err);
    return false;
  }
}

/**
 * Sets up a periodic interval to clear app caches after 30 minutes of usage.
 */
export function startPeriodicCacheCleanup(): () => void {
  // Clear on app launch if the 30-minute threshold has been reached
  clearAppCaches().catch(console.error);

  // Check every 1 minute if cache needs to be cleared (since last clear was > 30 mins ago)
  const intervalId = window.setInterval(() => {
    clearAppCaches().catch(console.error);
  }, 60000); // 1 minute interval

  return () => {
    window.clearInterval(intervalId);
  };
}
