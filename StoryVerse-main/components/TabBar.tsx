import * as React from 'react';
import { TabContext } from '../contexts/TabContext';
import { ProjectContext } from '../contexts/ProjectContext';
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
    Bars3Icon
} from './Icons';
import { TabIconType } from '../types';

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
    const { theme, saveStatus, userProfile, storageMode } = React.useContext(ProjectContext);

    const isDark = theme === 'dark';

    return (
        <div className="flex items-center space-x-2 text-xs">
            {/* Account / Storage Badge */}
            <div className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
                isDark ? 'bg-white/5 border-white/10 text-white/80' : 'bg-black/5 border-black/10 text-slate-700'
            }`}>
                <span className={`w-2 h-2 rounded-full ${storageMode === 'drive' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="truncate max-w-[140px]">
                    {storageMode === 'drive' ? (userProfile?.email || 'Google Drive') : 'Local Storage'}
                </span>
            </div>

            {/* Save Status Indicator */}
            {saveStatus === 'saving' && (
                <div className="flex items-center space-x-1 text-blue-500 font-medium">
                    <LoadingIcon className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden md:inline">Saving...</span>
                </div>
            )}
            {saveStatus === 'unsaved' && (
                <div className="flex items-center space-x-1 text-amber-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="hidden md:inline">Unsaved</span>
                </div>
            )}
            {saveStatus === 'saved' && (
                <div className="flex items-center space-x-1 text-emerald-500 font-medium">
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Saved</span>
                </div>
            )}
            {saveStatus === 'error' && (
                <div className="flex items-center space-x-1 text-rose-500 font-medium">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Save Error</span>
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

    const isDark = theme === 'dark';

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
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
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
                <div className="hidden sm:flex items-center space-x-2 px-2 py-1 font-bold text-sm text-slate-700 dark:text-slate-200">
                    <AppLogoIcon className={`w-5 h-5 ${themeClasses.logoColor}`} />
                    <span className="tracking-tight hidden md:inline">StoryVerse</span>
                </div>
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
            <div className="flex items-center space-x-2 pl-2">
                <HeaderSaveStatusBadge />

                {/* Pop out current tab shortcut */}
                <button
                    onClick={() => popOutTab(activeTabId)}
                    className={`hidden sm:flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                        isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                            : 'bg-amber-100/60 border-amber-300/60 text-amber-900 hover:bg-amber-200/80'
                    }`}
                    title="Pop out current active tab into its own secondary window"
                >
                    <WindowPopoutIcon className="w-3.5 h-3.5" />
                    <span>Pop Out</span>
                </button>
            </div>
        </div>
    );
};
