import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { AppLogoIcon, HomeIcon, PlusIcon, SettingsIcon, LightbulbIcon, QuillPenIcon, LoadingIcon, CheckIcon, ExclamationTriangleIcon, SparklesIcon } from './Icons';
import SettingsModal from './SettingsModal';
import { ProjectContext } from '../contexts/ProjectContext';
import WhatsNewModal from './WhatsNewModal';

interface SidebarProps {
    onLinkClick?: () => void;
}

const SaveStatusIndicator = () => {
    const { theme, saveStatus } = React.useContext(ProjectContext);

    const baseClasses = 'flex items-center space-x-2 text-xs font-semibold';

    switch (saveStatus) {
        case 'unsaved':
            const unsavedColor = theme === 'dark' ? 'text-amber-400' : 'text-amber-600';
            return <div className={`${baseClasses} ${unsavedColor}`}><span>Unsaved changes</span></div>;
        case 'saving':
            const savingColor = theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
            return <div className={`${baseClasses} ${savingColor}`}><LoadingIcon className="w-4 h-4 animate-spin" /><span>Saving...</span></div>;
        case 'saved':
            const savedColor = theme === 'dark' ? 'text-green-400' : 'text-green-600';
            return <div className={`${baseClasses} ${savedColor}`}><CheckIcon className="w-4 h-4" /><span>Saved!</span></div>;
        case 'error':
            const errorColor = theme === 'dark' ? 'text-red-400' : 'text-red-600';
            return <div className={`${baseClasses} ${errorColor}`}><ExclamationTriangleIcon className="w-4 h-4" /><span>Error saving</span></div>;
        default:
            return null; // 'idle'
    }
};

const Sidebar = ({ onLinkClick = () => {} }: SidebarProps) => {
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [isWhatsNewOpen, setIsWhatsNewOpen] = React.useState(false);
    const { theme, themeClasses, userProfile, signOut } = React.useContext(ProjectContext);

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
                    <NavLink to="/" className={navLinkClasses} onClick={onLinkClick}>
                        <HomeIcon className="w-5 h-5" />
                        <span>Home page</span>
                    </NavLink>
                    <NavLink to="/create-novel" className={navLinkClasses} onClick={onLinkClick}>
                        <PlusIcon className="w-5 h-5" />
                        <span>Create Novel</span>
                    </NavLink>
                    <NavLink to="/demos" className={navLinkClasses} onClick={onLinkClick}>
                        <LightbulbIcon className="w-5 h-5" />
                        <span>Idea Box</span>
                    </NavLink>
                    <NavLink to="/sketches" className={navLinkClasses} onClick={onLinkClick}>
                        <QuillPenIcon className="w-5 h-5" />
                        <span>Sketches</span>
                    </NavLink>
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
                    <div className="h-6 mb-2">
                        <SaveStatusIndicator />
                    </div>
                    <button onClick={() => setIsWhatsNewOpen(true)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${sidebarTextColor} hover:${themeClasses.bgTertiary}`}>
                        <SparklesIcon className="w-5 h-5" />
                        <span>What's New</span>
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className={`mt-2 w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${sidebarTextColor} hover:${themeClasses.bgTertiary}`}>
                        <SettingsIcon className="w-5 h-5" />
                        <span>Settings</span>
                    </button>
                    <p className={`mt-4 text-xs text-center ${themeClasses.textSecondary}`}>
                        &copy; {new Date().getFullYear()} StoryVerse
                    </p>
                </div>
            </div>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <WhatsNewModal isOpen={isWhatsNewOpen} onClose={() => setIsWhatsNewOpen(false)} />
        </>
    );
};

export default Sidebar;