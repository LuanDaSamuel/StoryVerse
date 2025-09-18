

import React, { useState, useContext } from 'react';
// FIX: Changed react-router-dom import to namespace import to fix module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { AppLogoIcon, HomeIcon, PlusIcon, SettingsIcon, LightbulbIcon, QuillPenIcon } from './Icons';
import SettingsModal from './SettingsModal';
import { ProjectContext } from '../contexts/ProjectContext';

interface SidebarProps {
    onLinkClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLinkClick = () => {} }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { theme, themeClasses, userProfile, signOut } = useContext(ProjectContext);

    const navLinkClasses = ({ isActive }: { isActive: boolean }): string => {
        const baseClasses = `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors`;
        const defaultText = theme === 'book' ? themeClasses.accentText : themeClasses.text;

        if (isActive) {
            // Special case for the 'book' theme to match the screenshot's active style
            if (theme === 'book') {
                return `${baseClasses} ${themeClasses.bg} ${themeClasses.text}`;
            }
            return `${baseClasses} ${themeClasses.accent} ${themeClasses.accentText}`;
        }
        return `${baseClasses} ${defaultText} hover:${themeClasses.bgTertiary}`;
    };
    
    // For the book theme, the text on the light sidebar should be dark.
    const sidebarTextColor = theme === 'book' ? themeClasses.accentText : themeClasses.text;

    return (
        <>
            <div className={`flex flex-col w-60 h-full ${themeClasses.bgSecondary} ${sidebarTextColor} border-r ${themeClasses.border}`}>
                <div className="flex items-center justify-center h-16 px-6 border-b border-inherit">
                    <AppLogoIcon className={`w-8 h-8 mr-3 ${themeClasses.logoColor}`} />
                    <span className="text-xl font-bold">StoryVerse</span>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <ReactRouterDOM.NavLink to="/" className={navLinkClasses} onClick={onLinkClick}>
                        <HomeIcon className="w-5 h-5" />
                        <span>Home page</span>
                    </ReactRouterDOM.NavLink>
                    <ReactRouterDOM.NavLink to="/create-novel" className={navLinkClasses} onClick={onLinkClick}>
                        <PlusIcon className="w-5 h-5" />
                        <span>Create Novel</span>
                    </ReactRouterDOM.NavLink>
                    <ReactRouterDOM.NavLink to="/demos" className={navLinkClasses} onClick={onLinkClick}>
                        <LightbulbIcon className="w-5 h-5" />
                        <span>Idea Box</span>
                    </ReactRouterDOM.NavLink>
                </nav>

                {userProfile && (
                     <div className={`px-4 pt-4 border-t border-inherit`}>
                        <div className="flex items-center space-x-3 p-2 rounded-lg bg-black/10">
                            <img src={userProfile.picture} alt={userProfile.name} className="w-10 h-10 rounded-full" />
                            <div>
                                <p className="font-semibold text-sm truncate">{userProfile.name}</p>
                                <p className={`text-xs truncate ${themeClasses.textSecondary}`}>{userProfile.email}</p>
                            </div>
                        </div>
                         <button onClick={signOut} className={`w-full text-center mt-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:${themeClasses.bgTertiary}`}>
                             Sign Out
                         </button>
                     </div>
                )}

                <div className="p-4 border-t border-inherit">
                    <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${sidebarTextColor} hover:${themeClasses.bgTertiary}`}>
                        <SettingsIcon className="w-5 h-5" />
                        <span>Settings</span>
                    </button>
                    <p className={`mt-6 text-xs text-center ${themeClasses.textSecondary}`}>
                        &copy; {new Date().getFullYear()} StoryVerse
                    </p>
                </div>
            </div>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
};

export default Sidebar;