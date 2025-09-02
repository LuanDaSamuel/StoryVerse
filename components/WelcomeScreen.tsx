

import React from 'react';
import { AppLogoIcon, DocumentPlusIcon, FolderIcon } from './Icons';

interface WelcomeScreenProps {
  onCreate: () => void;
  onOpen: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onCreate, onOpen }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full p-4 bg-gradient-to-br from-slate-900 to-[#0F172A] text-slate-200">
      <div className="flex flex-col items-center text-center">
        <AppLogoIcon className="w-20 h-20 mb-4 text-indigo-400" />
        <h1 className="text-6xl font-bold text-white">StoryVerse</h1>
        <p className="mt-2 text-lg text-slate-400">
          Where passions come by words
        </p>
      </div>

      <div className="mt-12 w-full max-w-md p-8 rounded-xl shadow-2xl bg-slate-800/60 backdrop-blur-lg border border-slate-700">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Welcome, Creator!</h2>
            <p className="mt-4 text-slate-400">
                Your work is saved directly to a project file on your computer. Create a new project or open an existing one to get started.
            </p>
        </div>

        <div className="mt-8 flex flex-col space-y-4">
            <button
              onClick={onCreate}
              className="flex items-center justify-center w-full px-6 py-4 text-lg font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30"
            >
              <DocumentPlusIcon className="w-6 h-6 mr-3" />
              Create New Project
            </button>
            <button
              onClick={onOpen}
              className="flex items-center justify-center w-full px-6 py-4 text-lg font-semibold rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
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