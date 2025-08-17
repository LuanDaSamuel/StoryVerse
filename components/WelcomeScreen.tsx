
import React, { useContext } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { AppLogoIcon, DocumentPlusIcon, FolderIcon } from './Icons';

interface WelcomeScreenProps {
  onCreate: () => void;
  onOpen: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onCreate, onOpen }) => {
  const { theme, themeClasses } = useContext(ProjectContext);

  const openButtonBg = 'bg-[#8b7b71]';

  return (
    <div className={`flex flex-col items-center justify-center h-screen w-full p-4 ${themeClasses.bg} ${themeClasses.text}`}>
      <div className="flex flex-col items-center text-center">
        <AppLogoIcon className={`w-16 h-16 mb-4 ${themeClasses.text}`} />
        <h1 className="text-5xl font-bold">StoryVerse</h1>
        <p className={`mt-2 text-lg ${theme === 'book' ? 'text-opacity-80' : themeClasses.textSecondary}`}>
          Where your stories come to life
        </p>
      </div>

      <div className={`mt-8 w-full max-w-md p-8 rounded-lg shadow-2xl ${themeClasses.bgSecondary}`}>
        <div className="text-center">
            <h2 className={`text-2xl font-bold ${themeClasses.accentText}`}>Welcome, Creator!</h2>
            <p className={`mt-4 ${themeClasses.textSecondary}`}>
                To get started, create a new project or import an existing one. Your work is automatically saved in your browser, and you can download a backup from the settings menu.
            </p>
        </div>

        <div className="mt-8 flex flex-col space-y-4">
            <button
              onClick={onCreate}
              className={`flex items-center justify-center w-full px-6 py-3 text-lg font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90 transition-opacity`}
            >
              <DocumentPlusIcon className="w-6 h-6 mr-3" />
              Create New Project
            </button>
            <button
              onClick={onOpen}
              className={`flex items-center justify-center w-full px-6 py-3 text-lg font-semibold rounded-lg ${openButtonBg} ${themeClasses.text} hover:opacity-90 transition-opacity`}
            >
              <FolderIcon className="w-6 h-6 mr-3" />
              Import Project File
            </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;