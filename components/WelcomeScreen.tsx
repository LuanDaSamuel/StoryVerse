

import React from 'react';
import { AppLogoIcon, GoogleIcon, DocumentPlusIcon, FolderIcon } from './Icons';

interface WelcomeScreenProps {
  onGoogleSignIn: () => void;
  onCreateLocalProject: () => void;
  onOpenLocalProject: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoogleSignIn, onCreateLocalProject, onOpenLocalProject }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full p-4 bg-gradient-to-br from-slate-900 to-[#0F172A] text-slate-200">
      <div className="flex flex-col items-center text-center">
        <AppLogoIcon className="w-20 h-20 mb-4 text-indigo-400" />
        <h1 className="text-6xl font-bold text-white">StoryVerse</h1>
        <p className="mt-2 text-lg text-slate-400">
          Where your passion starts by words
        </p>
      </div>

      <div className="mt-12 w-full max-w-md p-8 rounded-xl shadow-2xl bg-slate-800/60 backdrop-blur-lg border border-slate-700">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Welcome, Creator!</h2>
            <p className="mt-4 text-slate-400">
              Sign in with Google to save your work to the cloud, or work with a local file on your computer.
            </p>
        </div>

        <div className="mt-8 flex flex-col space-y-4">
            <button
              onClick={onGoogleSignIn}
              className="flex items-center justify-center w-full px-6 py-4 text-lg font-semibold rounded-lg bg-white text-gray-800 hover:bg-gray-200 transition-colors shadow-lg"
            >
              <GoogleIcon className="w-6 h-6 mr-3" />
              Sign in with Google
            </button>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-600"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-sm">OR</span>
                <div className="flex-grow border-t border-slate-600"></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onCreateLocalProject}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors shadow"
                >
                  <DocumentPlusIcon className="w-5 h-5" />
                  Create New
                </button>
                <button
                  onClick={onOpenLocalProject}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors shadow"
                >
                  <FolderIcon className="w-5 h-5" />
                  Open Local File
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
