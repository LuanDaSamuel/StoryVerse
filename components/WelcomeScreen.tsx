
import React, { useContext } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { AppLogoIcon, DocumentPlusIcon, FolderIcon } from './Icons';

interface WelcomeScreenProps {
  onCreate: () => void;
  onOpen: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onCreate, onOpen }) => {
  const { themeClasses } = useContext(ProjectContext);

  return (
    <div className={`flex flex-col items-center justify-center h-screen w-full p-4 ${themeClasses.bg} ${themeClasses.text}`}>
      <div className="flex flex-col items-center text-center">
        <AppLogoIcon className={`w-16 h-16 mb-4 ${themeClasses.text}`} />
        <h1 className="text-5xl font-bold">StoryVerse</h1>
        <p className={`mt-2 text-lg ${themeClasses.textSecondary}`}>
          Where passions come by words
        </p>
      </div>

      <div className={`mt-8 w-full max-w-md p-8 rounded-lg shadow-2xl ${themeClasses.bgSecondary}`}>
        <div className="text-center">
            <h2 className={`text-2xl font-bold ${themeClasses.logoColor}`}>Welcome, Creator!</h2>
            <p className={`mt-4 ${themeClasses.textSecondary}`}>
                Your work is saved directly to a project file on your computer. Create a new project or open an existing one to get started.
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
              className={`flex items-center justify-center w-full px-6 py-3 text-lg font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.text} hover:opacity-90 transition-opacity`}
            >
              <FolderIcon className="w-6 h-6 mr-3" />
              Open Project File
            </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;