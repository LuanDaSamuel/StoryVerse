import React, { useState, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AppLogoIcon, HomeIcon, PlusIcon, SettingsIcon, LightbulbIcon, EyeIcon } from './Icons';
import SettingsModal from './SettingsModal';
import { ProjectContext } from '../contexts/ProjectContext';

const Sidebar: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { theme, themeClasses } = useContext(ProjectContext);

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
    const placeholderLinkClasses = `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors`;
    const defaultText = theme === 'book' ? themeClasses.accentText : themeClasses.text;

    return (
        <>
            <div className={`flex flex-col w-60 h-full ${themeClasses.bgSecondary} ${sidebarTextColor} border-r ${themeClasses.border}`}>
                <div className="flex items-center justify-center h-16 px-6 border-b border-inherit">
                    <AppLogoIcon className={`w-8 h-8 mr-3 ${themeClasses.logoColor}`} />
                    <span className="text-xl font-bold">StoryVerse</span>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <NavLink to="/" className={navLinkClasses}>
                        <HomeIcon className="w-5 h-5" />
                        <span>Home page</span>
                    </NavLink>
                    <NavLink to="/create-novel" className={navLinkClasses}>
                        <PlusIcon className="w-5 h-5" />
                        <span>Create Novel</span>
                    </NavLink>
                    <NavLink to="/demos" className={navLinkClasses}>
                        <LightbulbIcon className="w-5 h-5" />
                        <span>Demos</span>
                    </NavLink>
                    <div className={`${placeholderLinkClasses} ${defaultText} hover:${themeClasses.bgTertiary}`}>
                        <EyeIcon className="w-5 h-5" />
                        <span>Image to Text</span>
                    </div>
                </nav>
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