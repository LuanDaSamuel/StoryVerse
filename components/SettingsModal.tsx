
import React, { useContext, useState } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { Theme } from '../types';
import { THEME_CONFIG } from '../constants';
import { CloseIcon, DownloadIcon, TrashIcon } from './Icons';
import ConfirmModal from './ConfirmModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const themeOptions: { name: Theme; label: string; colors: string[] }[] = [
  { name: 'dark', label: 'Dark', colors: ['#4F46E5', '#1F2937'] },
  { name: 'book', label: 'Book', colors: ['#A0522D', '#FDF6E3'] },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
      projectData, theme, setProjectData, downloadProject, closeProject, themeClasses, 
      projectName
  } = useContext(ProjectContext);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (!isOpen || !projectData) return null;

  const handleThemeChange = (newTheme: Theme) => {
    setProjectData(currentData => {
        if (!currentData) return null;
        return {
            ...currentData,
            settings: { ...currentData.settings, theme: newTheme },
        };
    });
  };

  const handleCloseProject = async () => {
    await closeProject();
  };

  const modalTextColor = theme === 'book' ? themeClasses.accentText : themeClasses.text;
  const descriptionColor = theme === 'book' ? 'text-amber-900' : themeClasses.textSecondary;
  const subHeadingStyle = theme === 'book' ? 'font-normal text-amber-800 opacity-60' : 'font-semibold';
  
  const getActiveThemeBorderStyle = (themeName: Theme) => {
    if (theme === themeName) {
      return theme === 'book' ? 'border-stone-600' : THEME_CONFIG[themeName].accentBorder;
    }
    return themeClasses.border;
  };
  
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 font-sans" onClick={onClose} role="dialog" aria-modal="true">
        <div 
            className={`w-full max-w-lg p-6 rounded-lg shadow-xl ${themeClasses.bgSecondary} ${modalTextColor} border ${themeClasses.border}`} 
            onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${modalTextColor}`}>Settings</h2>
            <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Theme selection */}
            <div>
              <h3 className={`text-lg mb-3 ${subHeadingStyle}`}>Theme</h3>
              <div className="grid grid-cols-2 gap-4">
                {themeOptions.map(option => (
                  <button 
                    key={option.name} 
                    onClick={() => handleThemeChange(option.name)} 
                    className={`p-4 rounded-lg border-2 transition-all ${getActiveThemeBorderStyle(option.name)}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${modalTextColor}`}>{option.label}</span>
                      <div className="flex -space-x-2">
                        {option.colors.map(color => <div key={color} className="w-6 h-6 rounded-full border-2 border-white" style={{ backgroundColor: color }} />)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Project management */}
            <div>
              <h3 className={`text-lg mb-3 ${subHeadingStyle}`}>Project Data</h3>
               <div className={`p-3 rounded-lg ${themeClasses.bgTertiary} mb-3`}>
                  <p className={`text-sm ${descriptionColor}`}>
                    Your project is being saved to: <span className="font-semibold">{projectName}</span>
                  </p>
              </div>
              <div className="space-y-3">
                <button onClick={downloadProject} className={`w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold transition-colors ${themeClasses.bgTertiary} hover:opacity-80`}>
                  <DownloadIcon className="w-5 h-5"/>
                  <span>Save a Copy...</span>
                </button>
                <button onClick={() => setIsConfirmOpen(true)} className="w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold transition-colors bg-red-700 text-red-100 hover:bg-red-800">
                  <TrashIcon className="w-5 h-5"/>
                  <span>Close Project</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleCloseProject}
        title="Close Project?"
        message="Are you sure you want to close this project? Any unsaved changes will be saved to your file before closing. You can open it again later."
      />
    </>
  );
};

export default SettingsModal;
