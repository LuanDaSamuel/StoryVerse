/**
 * TabLeaderManager
 * Provides browser tab coordination and single-leader election for StoryVerse.
 * Ensures only ONE tab performs cloud operations (Google Drive sync, polling),
 * prevents out-of-memory errors from duplicated background processing, and coordinates
 * lightweight cross-tab state syncing via IndexedDB.
 */

export interface TabLeaderListener {
    (isLeader: boolean): void;
}

class TabLeaderManager {
    public readonly tabId: string;
    private _isLeader: boolean = false;
    private listeners: Set<TabLeaderListener> = new Set();
    private lockAbortController: AbortController | null = null;
    private fallbackHeartbeatTimer: number | null = null;
    private static LOCK_NAME = 'storyverse_cloud_sync_leader_lock';
    private static FALLBACK_KEY = 'storyverse_leader_tab_id';
    private static FALLBACK_PING_KEY = 'storyverse_leader_ping_time';

    constructor() {
        this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        this.initElection();
    }

    public isCurrentTabLeader(): boolean {
        return this._isLeader;
    }

    public onLeaderChange(listener: TabLeaderListener): () => void {
        this.listeners.add(listener);
        // Call immediately with current state
        listener(this._isLeader);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(isLeader: boolean) {
        if (this._isLeader === isLeader) return;
        this._isLeader = isLeader;
        console.log(`[TabLeaderManager] Tab ${this.tabId} is now ${isLeader ? 'LEADER (Cloud Sync active)' : 'FOLLOWER (Passive memory mode)'}`);
        this.listeners.forEach(cb => {
            try {
                cb(isLeader);
            } catch (err) {
                console.error("[TabLeaderManager] Error in leader change listener:", err);
            }
        });
    }

    private initElection() {
        // Preferred modern mechanism: Web Locks API (Standard across Chrome, Safari, Firefox, Edge)
        if (typeof navigator !== 'undefined' && 'locks' in navigator && typeof navigator.locks?.request === 'function') {
            this.initWebLocksElection();
        } else {
            // Robust fallback for environments without Web Locks API
            this.initFallbackElection();
        }
    }

    private initWebLocksElection() {
        this.lockAbortController = new AbortController();

        navigator.locks.request(
            TabLeaderManager.LOCK_NAME,
            { signal: this.lockAbortController.signal },
            async () => {
                // Lock acquired: this tab is the leader!
                this.notifyListeners(true);

                // Keep the lock held until the tab/window is unloaded
                await new Promise<void>((resolve) => {
                    const release = () => {
                        window.removeEventListener('pagehide', release);
                        window.removeEventListener('beforeunload', release);
                        resolve();
                    };
                    window.addEventListener('pagehide', release, { once: true });
                    window.addEventListener('beforeunload', release, { once: true });
                });

                this.notifyListeners(false);
            }
        ).catch((err) => {
            if (err.name !== 'AbortError') {
                console.warn("[TabLeaderManager] Web Locks request failed, falling back to local election:", err);
                this.initFallbackElection();
            }
        });
    }

    private initFallbackElection() {
        const checkLeadership = () => {
            try {
                const now = Date.now();
                const currentLeader = localStorage.getItem(TabLeaderManager.FALLBACK_KEY);
                const lastPing = parseInt(localStorage.getItem(TabLeaderManager.FALLBACK_PING_KEY) || '0', 10);

                if (!currentLeader || currentLeader === this.tabId || (now - lastPing > 6000)) {
                    // Claim leadership
                    localStorage.setItem(TabLeaderManager.FALLBACK_KEY, this.tabId);
                    localStorage.setItem(TabLeaderManager.FALLBACK_PING_KEY, now.toString());
                    this.notifyListeners(true);
                } else {
                    this.notifyListeners(false);
                }
            } catch (e) {
                // If localStorage is unavailable, assume standalone leader
                this.notifyListeners(true);
            }
        };

        checkLeadership();
        this.fallbackHeartbeatTimer = window.setInterval(checkLeadership, 3000);

        window.addEventListener('beforeunload', () => {
            try {
                if (localStorage.getItem(TabLeaderManager.FALLBACK_KEY) === this.tabId) {
                    localStorage.removeItem(TabLeaderManager.FALLBACK_KEY);
                    localStorage.removeItem(TabLeaderManager.FALLBACK_PING_KEY);
                }
            } catch (e) {}
        }, { once: true });
    }

    public cleanup() {
        if (this.lockAbortController) {
            try {
                this.lockAbortController.abort();
            } catch (e) {}
        }
        if (this.fallbackHeartbeatTimer) {
            clearInterval(this.fallbackHeartbeatTimer);
        }
        this.listeners.clear();
    }
}

export const tabLeaderManager = new TabLeaderManager();
