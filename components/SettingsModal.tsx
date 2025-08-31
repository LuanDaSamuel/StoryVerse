import React, { useContext, useState } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { Theme, SpellcheckLang } from '../types';
import { THEME_CONFIG } from '../constants';
import { CloseIcon, DownloadIcon, TrashIcon, PlusIcon } from './Icons';
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
  const { projectData, theme, setProjectData, downloadProject, closeProject, themeClasses } = useContext(ProjectContext);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [customWord, setCustomWord] = useState('');

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

  const handleLanguageChange = (lang: SpellcheckLang) => {
    setProjectData(currentData => {
        if (!currentData) return null;
        return {
            ...currentData,
            settings: { ...currentData.settings, spellcheckLanguage: lang },
        };
    });
  };

  const handleAddCustomWord = () => {
      const wordToAdd = customWord.trim().toLowerCase();
      if (!wordToAdd) return;
      setProjectData(currentData => {
          if (!currentData || currentData.settings.customDictionary.includes(wordToAdd)) {
              setCustomWord('');
              return currentData;
          }
          return {
              ...currentData,
              settings: {
                  ...currentData.settings,
                  customDictionary: [...currentData.settings.customDictionary, wordToAdd].sort(),
              },
          };
      });
      setCustomWord('');
  };

  const handleRemoveCustomWord = (wordToRemove: string) => {
      setProjectData(currentData => {
          if (!currentData) return null;
          return {
              ...currentData,
              settings: {
                  ...currentData.settings,
                  customDictionary: currentData.settings.customDictionary.filter(w => w !== wordToRemove),
              },
          };
      });
  };


  const handleCloseProject = () => {
    onClose();
    closeProject();
  };

  // Logic to handle the 'book' theme's inverted text color on light backgrounds
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
        <div className={`p-8 rounded-lg shadow-2xl w-full max-w-lg m-4 ${themeClasses.bgSecondary} ${modalTextColor} border ${themeClasses.border} flex flex-col max-h-[90vh]`}>
          <div className="flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Settings</h2>
              <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}>
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
            <hr className={`mb-6 ${themeClasses.border}`} />
          </div>

          <div className="flex-grow overflow-y-auto pr-2 -mr-4">
            <div className="mb-8">
              <h3 className={`text-lg mb-2 ${subHeadingStyle}`}>Appearance</h3>
              <p className={`${descriptionColor} mb-4`}>Choose a color theme that suits your mood.</p>
              <div className="flex justify-center space-x-8">
                {themeOptions.map(opt => (
                  <div key={opt.name} className="text-center">
                    <button
                      onClick={() => handleThemeChange(opt.name)}
                      className={`w-16 h-12 md:w-20 md:h-14 rounded-lg flex items-center justify-center border-2 transition-all ${getActiveThemeBorderStyle(opt.name)}`}
                      style={{ backgroundColor: opt.colors[1] }}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden" style={{ backgroundColor: opt.colors[1] }}>
                          <div className="w-4 h-8" style={{backgroundColor: opt.colors[0]}}></div>
                          <div className="w-4 h-8" style={{backgroundColor: opt.colors[1]}}></div>
                      </div>
                    </button>
                    <span className={`mt-2 block text-sm ${themeClasses.textSecondary}`}>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className={`text-lg mb-2 ${subHeadingStyle}`}>Language & Spelling</h3>
              <p className={`${descriptionColor} mb-2`}>Select the primary language for spellchecking your work.</p>
              <select
                value={projectData.settings.spellcheckLanguage || 'en'}
                onChange={(e) => handleLanguageChange(e.target.value as SpellcheckLang)}
                className={`w-full px-3 py-2 rounded-md text-sm ${themeClasses.input} border ${themeClasses.border}`}
              >
                <option value="en">English</option>
                <option value="fi">Finnish (Suomi)</option>
                <option value="vi">Vietnamese (Tiếng Việt)</option>
                <option value="browser-default">Use Browser Default</option>
              </select>
            </div>
            
            <div className="mb-8">
              <h3 className={`text-lg mb-2 ${subHeadingStyle}`}>Custom Dictionary</h3>
              <p className={`${descriptionColor} mb-4`}>Add custom words (like character names or fantasy terms) to prevent them from being flagged as errors.</p>
              <div className="flex space-x-2">
                  <input
                      type="text"
                      value={customWord}
                      onChange={(e) => setCustomWord(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomWord()}
                      placeholder="Add a word..."
                      className={`flex-grow px-3 py-2 rounded-md text-sm ${themeClasses.input} border ${themeClasses.border}`}
                  />
                  <button onClick={handleAddCustomWord} className={`px-4 py-2 rounded-md ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}><PlusIcon className="w-5 h-5"/></button>
              </div>
              <div className={`mt-4 p-2 rounded-md border ${themeClasses.border} h-32 overflow-y-auto`}>
                  {projectData.settings.customDictionary.length > 0 ? (
                      projectData.settings.customDictionary.map(word => (
                          <div key={word} className="flex justify-between items-center px-2 py-1 rounded hover:bg-white/5">
                              <span>{word}</span>
                              <button onClick={() => handleRemoveCustomWord(word)} className="p-1 rounded-full text-red-500 hover:bg-red-500/10"><CloseIcon className="w-4 h-4"/></button>
                          </div>
                      ))
                  ) : (
                      <p className={`text-sm text-center py-4 ${themeClasses.textSecondary}`}>Your dictionary is empty.</p>
                  )}
              </div>
            </div>

            <div>
              <h3 className={`text-lg mb-2 ${subHeadingStyle}`}>Project Data</h3>
              <p className={`${descriptionColor} mb-4`}>
                Your work is auto-saved to your browser. You can download a project file to create a backup or move to another computer.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={downloadProject}
                  className={`flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80 transition-opacity`}
                >
                  <DownloadIcon className="w-5 h-5" />
                  <span>Download Project</span>
                </button>
                <button
                  onClick={() => setIsConfirmOpen(true)}
                  className={`flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80 transition-opacity`}
                >
                  <TrashIcon className="w-5 h-5" />
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
        message="Are you sure you want to close this project? This will clear it from the browser and return you to the welcome screen. Your downloaded project files will not be affected."
        confirmButtonClass={`px-6 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90 transition-opacity`}
      />
    </>
  );
};

export default SettingsModal;