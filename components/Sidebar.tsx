import React, { useState, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AppLogoIcon, HomeIcon, LightbulbIcon, CheckCircleIcon, LoadingIcon, FolderIcon, ChevronDownIcon } from './Icons';
import ProjectSwitcherModal from './ProjectSwitcherModal';
import { ProjectContext } from '../contexts/ProjectContext';
import { enhancePlainText } from '../constants';

const SaveStatusIndicator: React.FC = () => {
    const { saveStatus, themeClasses } = useContext(ProjectContext);

    const baseClasses = `flex items-center space-x-2 text-xs ${themeClasses.textSecondary}`;

    if (saveStatus === 'saved') {
        return (
            <div className={`${baseClasses} text-green-500`}>
                <CheckCircleIcon className="w-4 h-4" />
                <span>All changes saved</span>
            </div>
        );
    }

    if (saveStatus === 'saving') {
        return (
            <div className={baseClasses}>
                <LoadingIcon className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
            </div>
        );
    }
    
    // 'unsaved'
    return (
        <div className={baseClasses}>
            <span className="w-4 h-4 text-center">●</span>
            <span>Unsaved changes</span>
        </div>
    );
};


const Sidebar: React.FC = () => {
    const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
    const { theme, themeClasses, projects, activeProjectId } = useContext(ProjectContext);
    
    const activeProject = projects.find(p => p.id === activeProjectId);

    const navLinkClasses = ({ isActive }: { isActive: boolean }): string => {
        const baseClasses = `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors`;
        const defaultText = theme === 'book' ? themeClasses.accentText : themeClasses.text;

        if (isActive) {
            if (theme === 'book') {
                return `${baseClasses} ${themeClasses.bg} ${themeClasses.text}`;
            }
            return `${baseClasses} ${themeClasses.accent} ${themeClasses.accentText}`;
        }
        return `${baseClasses} ${defaultText} hover:${themeClasses.bgTertiary}`;
    };
    
    const sidebarTextColor = theme === 'book' ? themeClasses.accentText : themeClasses.text;

    return (
        <>
            <div className={`flex flex-col w-60 h-full ${themeClasses.bgSecondary} ${sidebarTextColor} border-r ${themeClasses.border}`}>
                <div className="flex items-center justify-center h-16 px-6 border-b border-inherit">
                    <AppLogoIcon className={`w-8 h-8 mr-3 ${themeClasses.logoColor}`} />
                    <span className="text-xl font-bold">StoryVerse</span>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                     <button 
                        onClick={() => setIsProjectSwitcherOpen(true)} 
                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-90 mb-4`}
                     >
                        <div className="flex items-center space-x-2 truncate">
                           <FolderIcon className="w-5 h-5 flex-shrink-0" />
                           <span className="truncate">{activeProject ? enhancePlainText(activeProject.name) : 'No Project'}</span>
                        </div>
                         <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
                     </button>
                    <NavLink to="/" className={navLinkClasses}>
                        <HomeIcon className="w-5 h-5" />
                        <span>Home page</span>
                    </NavLink>
                    <NavLink to="/demos" className={navLinkClasses}>
                        <LightbulbIcon className="w-5 h-5" />
                        <span>Demos</span>
                    </NavLink>
                </nav>
                <div className="p-4 border-t border-inherit">
                    <div className="text-center">
                      <SaveStatusIndicator />
                    </div>
                    <p className={`mt-4 text-xs text-center ${themeClasses.textSecondary}`}>
                        &copy; {new Date().getFullYear()} StoryVerse
                    </p>
                </div>
            </div>
            <ProjectSwitcherModal 
                isOpen={isProjectSwitcherOpen} 
                onClose={() => setIsProjectSwitcherOpen(false)} 
            />
        </>
    );
};

export default Sidebar;