import * as React from 'react';
import { TabContext } from '../contexts/TabContext';
import { ProjectContext } from '../contexts/ProjectContext';
import SettingsModal from './SettingsModal';
import {
    HomeIcon,
    PencilIcon,
    QuillPenIcon,
    LightbulbIcon,
    BookOpenIcon,
    PlusIcon,
    CloseIcon,
    WindowPopoutIcon,
    WindowAttachIcon,
    WindowIcon,
    CheckIcon,
    LoadingIcon,
    ExclamationTriangleIcon,
    AppLogoIcon,
    DocumentPlusIcon,
    Bars3Icon,
    SettingsIcon,
    FolderIcon,
    RefreshIcon,
    CloudIcon
} from './Icons';
import { TabIconType } from '../types';
import { useTranslations } from '../hooks/useTranslations';

const getTabIcon = (iconType?: TabIconType) => {
    switch (iconType) {
        case 'home':
            return <HomeIcon className="w-4 h-4 flex-shrink-0" />;
        case 'editor':
        case 'novel':
            return <PencilIcon className="w-4 h-4 flex-shrink-0" />;
        case 'sketch':
            return <QuillPenIcon className="w-4 h-4 flex-shrink-0" />;
        case 'idea':
        case 'demo':
            return <LightbulbIcon className="w-4 h-4 flex-shrink-0" />;
        case 'reader':
        case 'model':
            return <BookOpenIcon className="w-4 h-4 flex-shrink-0" />;
        case 'create':
            return <DocumentPlusIcon className="w-4 h-4 flex-shrink-0" />;
        default:
            return <HomeIcon className="w-4 h-4 flex-shrink-0" />;
    }
};

const HeaderSaveStatusBadge = () => {
    const {
        theme,
        saveStatus,
        userProfile,
        storageMode,
        projectName,
        diskSyncState,
        isNativePickerAvailable,
        openLocalProject,
        resumeDiskSync,
        linkLocalDiskFile
    } = React.useContext(ProjectContext);
    const t = useTranslations();

    const isDark = theme === 'dark';

    return (
        <div className="flex items-center space-x-1.5 text-xs shrink-0">
            {/* Account / Linked File Badge */}
            {storageMode === 'drive' ? (
                <div className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 ${
                    isDark ? 'bg-white/5 border-white/10 text-white/80' : 'bg-black/5 border-black/10 text-slate-700'
                }`}>
                    <CloudIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="truncate max-w-[140px]">
                        {userProfile?.email || 'Google Drive'}
                    </span>
                </div>
            ) : (
                <>
                    {/* Linked Filename Pill/Badge */}
                    <div
                        className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 ${
                            isDark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-amber-100/70 border-amber-300/60 text-amber-950'
                        }`}
                        title={projectName || 'StoryVerse-Project.json'}
                    >
                        <FolderIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-amber-700'}`} />
                        <span className="truncate max-w-[150px]">
                            {projectName || 'StoryVerse-Project.json'}
                        </span>
                    </div>

                    {/* Disk Sync State / Reconnect Control */}
                    {diskSyncState === 'needs-permission' && (
                        <button
                            onClick={() => { void resumeDiskSync(); }}
                            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                isDark
                                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30'
                                    : 'bg-amber-200/80 border-amber-400 text-amber-950 hover:bg-amber-300/80'
                            }`}
                            title={t.resumeDiskSync}
                        >
                            <RefreshIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{t.resumeDiskSync}</span>
                        </button>
                    )}

                    {diskSyncState === 'disk-error' && (
                        <button
                            onClick={() => {
                                if (isNativePickerAvailable) {
                                    void linkLocalDiskFile();
                                } else {
                                    void openLocalProject();
                                }
                            }}
                            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                isDark
                                    ? 'bg-rose-500/20 border-rose-400/40 text-rose-300 hover:bg-rose-500/30'
                                    : 'bg-rose-100 border-rose-300 text-rose-900 hover:bg-rose-200'
                            }`}
                            title={isNativePickerAvailable ? t.relinkDiskFile : t.diskErrorLabel}
                        >
                            <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{isNativePickerAvailable ? t.relinkDiskFile : t.diskErrorLabel}</span>
                        </button>
                    )}

                    {diskSyncState === 'browser-local' && isNativePickerAvailable && (
                        <button
                            onClick={() => { void linkLocalDiskFile(); }}
                            className={`hidden sm:flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                isDark
                                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                                    : 'bg-amber-100/60 border-amber-300/60 text-amber-900 hover:bg-amber-200/80'
                            }`}
                            title={t.linkDiskFile}
                        >
                            <RefreshIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{t.linkDiskFile}</span>
                        </button>
                    )}

                    {diskSyncState === 'browser-local' && !isNativePickerAvailable && (
                        <div className={`hidden lg:flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 ${
                            isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}>
                            <CheckIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{t.browserAutoSaveLabel}</span>
                        </div>
                    )}

                    {diskSyncState === 'disk-synced' && (
                        <div className={`hidden lg:flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 ${
                            isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}>
                            <CheckIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{t.diskSyncedLabel}</span>
                        </div>
                    )}

                    {/* Quick Open / Switch Local File Button */}
                    <button
                        onClick={() => { void openLocalProject(); }}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
                                : 'bg-amber-100/60 border-amber-300/60 text-amber-900 hover:bg-amber-200/80'
                        }`}
                        title={t.switchFile}
                    >
                        <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="hidden sm:inline">{t.openFile}</span>
                    </button>
                </>
            )}

            {/* Save Status Indicator */}
            {saveStatus === 'saving' && (
                <div className="flex items-center space-x-1 text-blue-500 font-medium whitespace-nowrap shrink-0">
                    <LoadingIcon className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    <span className="hidden xl:inline">{t.savingStatus}</span>
                </div>
            )}
            {saveStatus === 'unsaved' && (
                <div className="flex items-center space-x-1 text-amber-500 font-medium whitespace-nowrap shrink-0">
                    <PencilIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="hidden xl:inline">{t.unsavedStatus}</span>
                </div>
            )}
            {saveStatus === 'saved' && (
                <div className="flex items-center space-x-1 text-emerald-500 font-medium whitespace-nowrap shrink-0">
                    <CheckIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="hidden xl:inline">{t.savedStatus}</span>
                </div>
            )}
            {saveStatus === 'error' && (
                <div className="flex items-center space-x-1 text-rose-500 font-medium whitespace-nowrap shrink-0">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="hidden xl:inline">{t.saveErrorStatus}</span>
                </div>
            )}
        </div>
    );
};

interface TabBarProps {
    onToggleSidebar?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ onToggleSidebar }) => {
    const {
        tabs,
        activeTabId,
        selectTab,
        closeTab,
        openTab,
        popOutTab,
        reattachTab,
        isPopoutWindow,
        popoutTabId
    } = React.useContext(TabContext);

    const { theme, themeClasses } = React.useContext(ProjectContext);
    const tabsContainerRef = React.useRef<HTMLDivElement>(null);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

    const isDark = theme === 'dark';

    const handleGoHome = React.useCallback(() => {
        const homeTab = tabs.find(t => t.path === '/');
        if (homeTab) {
            selectTab(homeTab.id);
        } else {
            openTab({ path: '/', title: 'Home', iconType: 'home', select: true });
        }
    }, [tabs, selectTab, openTab]);

    // If inside a popped-out window, render a specialized window header
    if (isPopoutWindow) {
        const activeTab = tabs.find(t => t.id === popoutTabId) || tabs.find(t => t.id === activeTabId) || tabs[0];

        return (
            <div className={`sticky top-0 z-30 flex items-center justify-between px-4 py-2 border-b select-none ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                {/* Left: Window branding & tab title */}
                <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-500/20">
                        <WindowIcon className="w-4 h-4" />
                        <span>Popped-Out Window</span>
                    </div>
                    <span className="text-sm font-semibold truncate max-w-[280px] dark:text-slate-200 text-slate-800">
                        {activeTab?.title || 'StoryVerse Window'}
                    </span>
                </div>

                {/* Center: Save status */}
                <HeaderSaveStatusBadge />

                {/* Right: Re-attach button */}
                <button
                    onClick={() => activeTab && reattachTab(activeTab.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap shrink-0"
                    title="Re-attach window back into main StoryVerse tab workspace"
                >
                    <WindowAttachIcon className="w-4 h-4" />
                    <span>Re-attach to Main Workspace</span>
                </button>
            </div>
        );
    }

    return (
        <div className={`sticky top-0 z-20 flex items-center justify-between px-2 pt-1 border-b select-none ${themeClasses.bgSecondary} ${themeClasses.border} shadow-xs`}>
            {/* Menu Toggle & Logo / Brand Indicator */}
            <div className="flex items-center space-x-1 px-1 py-1 mr-1">
                {onToggleSidebar && (
                    <button
                        onClick={onToggleSidebar}
                        className={`p-1.5 rounded-lg transition-colors text-slate-600 dark:text-slate-300 ${
                            isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-amber-100/70 hover:text-amber-950'
                        }`}
                        title="Toggle navigation sidebar menu"
                    >
                        <Bars3Icon className="w-5 h-5" />
                    </button>
                )}
                <button
                    onClick={handleGoHome}
                    className={`flex items-center space-x-2 px-2 py-1 font-bold text-sm text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-slate-800' : 'hover:bg-amber-100/70'
                    }`}
                    title="Go to Home"
                >
                    <AppLogoIcon className={`w-5 h-5 ${themeClasses.logoColor}`} />
                    <span className="tracking-tight hidden md:inline">StoryVerse</span>
                </button>
            </div>

            {/* Scrollable Tabs Bar */}
            <div
                ref={tabsContainerRef}
                className="flex-1 flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5 px-1 min-w-0"
            >
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;

                    return (
                        <div
                            key={tab.id}
                            onClick={() => selectTab(tab.id)}
                            className={`group relative flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all duration-150 cursor-pointer max-w-[200px] border-t border-x ${
                                isActive
                                    ? isDark
                                        ? 'bg-slate-900 text-amber-400 border-slate-700 shadow-xs'
                                        : 'bg-amber-50/90 text-amber-950 border-amber-300/80 shadow-xs'
                                    : isDark
                                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border-transparent'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-amber-100/50 border-transparent'
                            }`}
                        >
                            {/* Icon */}
                            {getTabIcon(tab.iconType)}

                            {/* Title */}
                            <span className="truncate flex-1 font-semibold">
                                {tab.title}
                            </span>

                            {/* Popped Out Badge / Button */}
                            {tab.isPoppedOut ? (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        reattachTab(tab.id);
                                    }}
                                    className="px-1.5 py-0.5 text-[10px] uppercase font-extrabold rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30"
                                    title="Tab is currently open in a secondary window. Click to re-attach."
                                >
                                    Popped Out
                                </span>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        popOutTab(tab.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity"
                                    title="Pull out as a separate window"
                                >
                                    <WindowPopoutIcon className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                }}
                                className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Close tab"
                            >
                                <CloseIcon className="w-3.5 h-3.5" />
                            </button>

                            {/* Bottom active indicator bar */}
                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500 rounded-t-full" />
                            )}
                        </div>
                    );
                })}

                {/* New Tab Button */}
                <button
                    onClick={() => openTab({ path: '/', title: 'Home', iconType: 'home', select: true })}
                    className={`p-1.5 rounded-lg transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ${
                        isDark ? 'hover:bg-slate-800' : 'hover:bg-amber-100/60'
                    }`}
                    title="Open new tab (Home)"
                >
                    <PlusIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Right Status Actions */}
            <div className="flex items-center space-x-2 pl-2 shrink-0">
                <HeaderSaveStatusBadge />

                {/* Pop out current tab shortcut */}
                <button
                    onClick={() => popOutTab(activeTabId)}
                    className={`hidden sm:flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                            : 'bg-amber-100/60 border-amber-300/60 text-amber-900 hover:bg-amber-200/80'
                    }`}
                    title="Pop out current active tab into its own secondary window"
                >
                    <WindowPopoutIcon className="w-3.5 h-3.5" />
                    <span>Pop Out</span>
                </button>

                {/* Floating Settings button */}
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 text-slate-600 dark:text-slate-300 ${
                        isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-amber-100/70 hover:text-amber-950'
                    }`}
                    title="Open Settings"
                >
                    <SettingsIcon className="w-5 h-5" />
                </button>
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};
