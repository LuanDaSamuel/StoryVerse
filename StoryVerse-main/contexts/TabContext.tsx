import * as React from 'react';
import { TabItem, TabIconType } from '../types';

export interface TabContextType {
    tabs: TabItem[];
    activeTabId: string;
    isPopoutWindow: boolean;
    popoutTabId: string | null;
    openTab: (options: { path: string; title: string; iconType?: TabIconType; select?: boolean }) => string;
    closeTab: (tabId: string) => void;
    selectTab: (tabId: string) => void;
    updateTabInfo: (path: string, info: { title?: string; iconType?: TabIconType }) => void;
    popOutTab: (tabId: string) => void;
    reattachTab: (tabId: string) => void;
    reorderTabs: (startIndex: number, endIndex: number) => void;
}

const DEFAULT_TAB: TabItem = {
    id: 'tab-home',
    title: 'Home',
    path: '/',
    iconType: 'home'
};

const TAB_STORAGE_KEY = 'storyverse_tabs_session';
const ACTIVE_TAB_STORAGE_KEY = 'storyverse_active_tab_session';

export const TabContext = React.createContext<TabContextType>({
    tabs: [DEFAULT_TAB],
    activeTabId: DEFAULT_TAB.id,
    isPopoutWindow: false,
    popoutTabId: null,
    openTab: () => '',
    closeTab: () => {},
    selectTab: () => {},
    updateTabInfo: () => {},
    popOutTab: () => {},
    reattachTab: () => {},
    reorderTabs: () => {}
});

export const TabProvider: React.FC<{ children: React.ReactNode; navigate: (path: string) => void; currentPath: string }> = ({
    children,
    navigate,
    currentPath
}) => {
    // Detect if current window is a popped out secondary window
    const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const isPopoutWindow = searchParams.get('popout') === 'true' || window.name.startsWith('StoryVersePopout_');
    const popoutTabId = searchParams.get('tabId');

    // Load initial tabs from sessionStorage or default
    const [tabs, setTabs] = React.useState<TabItem[]>(() => {
        try {
            const saved = sessionStorage.getItem(TAB_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn("Failed to load saved tabs:", e);
        }
        return [DEFAULT_TAB];
    });

    const [activeTabId, setActiveTabId] = React.useState<string>(() => {
        try {
            const savedActive = sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
            if (savedActive) return savedActive;
        } catch (e) {}
        return DEFAULT_TAB.id;
    });

    // Save tabs to sessionStorage
    React.useEffect(() => {
        try {
            sessionStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(tabs));
            sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
        } catch (e) {}
    }, [tabs, activeTabId]);

    // Setup BroadcastChannel for cross-window tab sync
    React.useEffect(() => {
        let channel: BroadcastChannel | null = null;
        if ('BroadcastChannel' in window) {
            channel = new BroadcastChannel('storyverse_tab_sync_channel');
            channel.onmessage = (event) => {
                const { type, payload } = event.data || {};
                if (type === 'POPOUT_STATUS_CHANGED') {
                    setTabs(prev => prev.map(t => t.id === payload.tabId ? { ...t, isPoppedOut: payload.isPoppedOut } : t));
                } else if (type === 'REATTACH_TAB') {
                    setTabs(prev => prev.map(t => t.id === payload.tabId ? { ...t, isPoppedOut: false } : t));
                    if (!isPopoutWindow) {
                        setActiveTabId(payload.tabId);
                        if (payload.path) navigate(payload.path);
                    }
                }
            };
        }
        return () => {
            channel?.close();
        };
    }, [isPopoutWindow, navigate]);

    // Keep active tab's path in sync when navigation occurs within the main window
    React.useEffect(() => {
        if (!isPopoutWindow && currentPath) {
            setTabs(prevTabs => {
                const currentTab = prevTabs.find(t => t.id === activeTabId);
                if (currentTab && currentTab.path !== currentPath) {
                    return prevTabs.map(t => t.id === activeTabId ? { ...t, path: currentPath } : t);
                }
                return prevTabs;
            });
        }
    }, [currentPath, activeTabId, isPopoutWindow]);

    const selectTab = React.useCallback((tabId: string) => {
        const targetTab = tabs.find(t => t.id === tabId);
        if (targetTab) {
            setActiveTabId(tabId);
            navigate(targetTab.path);
        }
    }, [tabs, navigate]);

    const MAX_ACTIVE_TABS = 10;

    const openTab = React.useCallback(({ path, title, iconType = 'home', select = true }: { path: string; title: string; iconType?: TabIconType; select?: boolean }): string => {
        // If a tab with this path already exists, focus it instead of duplicating
        const existingTab = tabs.find(t => t.path === path);
        if (existingTab) {
            if (select) {
                setActiveTabId(existingTab.id);
                navigate(path);
            }
            return existingTab.id;
        }

        const newTab: TabItem = {
            id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title,
            path,
            iconType,
            isPoppedOut: false
        };

        setTabs(prev => {
            const nextTabs = [...prev, newTab];
            // If open tabs exceed maximum ceiling, evict oldest inactive, non-home, non-popped-out tab
            if (nextTabs.length > MAX_ACTIVE_TABS) {
                const evictIdx = nextTabs.findIndex(t => t.id !== 'tab-home' && t.id !== activeTabId && t.id !== newTab.id && !t.isPoppedOut);
                if (evictIdx !== -1) {
                    nextTabs.splice(evictIdx, 1);
                }
            }
            return nextTabs;
        });

        if (select) {
            setActiveTabId(newTab.id);
            navigate(path);
        }
        return newTab.id;
    }, [tabs, activeTabId, navigate]);

    const closeTab = React.useCallback((tabId: string) => {
        setTabs(prevTabs => {
            if (prevTabs.length <= 1) {
                // If closing the last tab, reset to home
                const homeTab: TabItem = { id: `tab-home-${Date.now()}`, title: 'Home', path: '/', iconType: 'home' };
                setActiveTabId(homeTab.id);
                navigate('/');
                return [homeTab];
            }

            const index = prevTabs.findIndex(t => t.id === tabId);
            const newTabs = prevTabs.filter(t => t.id !== tabId);

            if (tabId === activeTabId) {
                const nextTab = newTabs[Math.max(0, index - 1)];
                if (nextTab) {
                    setActiveTabId(nextTab.id);
                    navigate(nextTab.path);
                }
            }
            return newTabs;
        });
    }, [activeTabId, navigate]);

    const updateTabInfo = React.useCallback((path: string, info: { title?: string; iconType?: TabIconType }) => {
        setTabs(prev => prev.map(t => {
            if (t.id === activeTabId) {
                return {
                    ...t,
                    path: path || t.path,
                    title: info.title || t.title,
                    iconType: info.iconType || t.iconType
                };
            }
            return t;
        }));
    }, [activeTabId]);

    const popOutTab = React.useCallback((tabId: string) => {
        const targetTab = tabs.find(t => t.id === tabId);
        if (!targetTab) return;

        // Mark as popped out
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, isPoppedOut: true } : t));

        // Send broadcast
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel('storyverse_tab_sync_channel');
            channel.postMessage({
                type: 'POPOUT_STATUS_CHANGED',
                payload: { tabId, isPoppedOut: true }
            });
            channel.close();
        }

        // Calculate position for popout window
        const width = 1100;
        const height = 750;
        const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2 + 30);
        const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2 + 30);

        const popoutUrl = `${window.location.origin}${window.location.pathname}#${targetTab.path}${targetTab.path.includes('?') ? '&' : '?'}popout=true&tabId=${tabId}`;

        const newWin = window.open(
            popoutUrl,
            `StoryVersePopout_${tabId}`,
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no`
        );

        if (newWin) {
            newWin.focus();
        }
    }, [tabs]);

    const reattachTab = React.useCallback((tabId: string) => {
        const targetTab = tabs.find(t => t.id === tabId) || { id: tabId, path: '/' };

        // Broadcast reattach event
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel('storyverse_tab_sync_channel');
            channel.postMessage({
                type: 'REATTACH_TAB',
                payload: { tabId, path: targetTab.path }
            });
            channel.close();
        }

        if (isPopoutWindow) {
            window.close();
        } else {
            setTabs(prev => prev.map(t => t.id === tabId ? { ...t, isPoppedOut: false } : t));
            setActiveTabId(tabId);
            if (targetTab.path) navigate(targetTab.path);
        }
    }, [tabs, isPopoutWindow, navigate]);

    const reorderTabs = React.useCallback((startIndex: number, endIndex: number) => {
        if (startIndex === endIndex) return;
        setTabs(prev => {
            if (startIndex < 0 || startIndex >= prev.length || endIndex < 0 || endIndex >= prev.length) return prev;
            const newTabs = Array.from(prev);
            const [moved] = newTabs.splice(startIndex, 1);
            newTabs.splice(endIndex, 0, moved);
            return newTabs;
        });
    }, []);

    return (
        <TabContext.Provider value={{
            tabs,
            activeTabId,
            isPopoutWindow,
            popoutTabId,
            openTab,
            closeTab,
            selectTab,
            updateTabInfo,
            popOutTab,
            reattachTab,
            reorderTabs
        }}>
            {children}
        </TabContext.Provider>
    );
};
