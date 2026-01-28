
import * as React from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { Theme, Language } from '../types';
import { THEME_CONFIG } from '../constants';
import { CloseIcon, DownloadIcon, TrashIcon, GoogleIcon } from './Icons';
import ConfirmModal from './ConfirmModal';
import { useTranslations } from '../hooks/useTranslations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const themeOptions: { name: Theme; label: string; colors: string[] }[] = [
  { name: 'dark', label: 'Dark', colors: ['#4F46E5', '#1F2937'] },
  { name: 'book', label: 'Book', colors: ['#A0522D', '#FDF6E3'] },
];

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { 
      projectData, theme, setProjectData, downloadProject, closeProject, 
      themeClasses, projectName, storageMode, signOut, connectLocalToDrive
  } = React.useContext(ProjectContext);
  const t = useTranslations();
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as Language;
    setProjectData(currentData => {
        if (!currentData) return null;
        return {
            ...currentData,
            settings: { ...currentData.settings, language: newLang },
        };
    });
  };

  const handleBaseFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setProjectData(currentData => {
        if (!currentData) return null;
        return {
            ...currentData,
            settings: { ...currentData.settings, baseFontSize: newSize },
        };
    });
  };

  const handleCloseOrSignOut = async () => {
    if (storageMode === 'drive') {
      await signOut();
    } else {
      await closeProject();
    }
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
  
  const storageLocation = storageMode === 'drive' ? 'Google Drive' : 'a local file';
  const closeButtonText = storageMode === 'drive' ? t.signOutAndClose : t.closeProject;
  const confirmTitle = storageMode === 'drive' ? t.signOutTitle : t.closeProjectTitle;
  const confirmMessage = storageMode === 'drive' ? t.signOutMessage : t.closeProjectMessage;


  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 font-sans" onClick={onClose} role="dialog" aria-modal="true">
        <div 
            className={`w-full max-w-lg p-6 rounded-lg shadow-xl ${themeClasses.bgSecondary} ${modalTextColor} border ${themeClasses.border}`} 
            onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${modalTextColor}`}>{t.settings}</h2>
            <button onClick={onClose} className={`p-1 -m-1 rounded-full hover:${themeClasses.bgTertiary}`} aria-label="Close">
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="language-select" className="block font-semibold mb-2">{t.language}</label>
              <select
                id="language-select"
                value={projectData.settings.language}
                onChange={handleLanguageChange}
                className={`w-full p-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`}
              >
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
                <option value="fi">Suomi</option>
                <option value="sv">Svenska</option>
              </select>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">{t.theme}</h3>
              <div className="grid grid-cols-2 gap-4">
                {themeOptions.map(option => (
                  <button key={option.name} onClick={() => handleThemeChange(option.name)} className={`p-3 rounded-lg border-2 transition-all ${getActiveThemeBorderStyle(option.name)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{option.label}</span>
                      <div className="flex -space-x-2">
                        {option.colors.map(color => (
                          <div key={color} className="w-5 h-5 rounded-full border border-gray-400/50" style={{ backgroundColor: color }}></div>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="base-font-size" className="block font-semibold mb-2">{t.readingFontSize}</label>
              <select
                id="base-font-size"
                value={projectData.settings.baseFontSize}
                onChange={handleBaseFontSizeChange}
                className={`w-full p-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`}
              >
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px (Default)</option>
                <option value="20">20px</option>
                <option value="22">22px</option>
              </select>
            </div>

            <div>
              <h3 className={`font-semibold mb-2 ${subHeadingStyle}`}>{t.projectManagement}</h3>
              <div className={`p-4 rounded-lg ${themeClasses.bgTertiary}`}>
                <p className="font-semibold">{t.projectName}</p>
                <p className={`${descriptionColor} text-sm break-words`}>{projectName}</p>
                <p className="font-semibold mt-3">{t.storageLocation}</p>
                <p className={`${descriptionColor} text-sm`}>{t.storageLocationText(storageLocation)}</p>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  {storageMode === 'local' && (
                    <button onClick={connectLocalToDrive} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-white text-gray-800 hover:bg-gray-200">
                      <GoogleIcon className="w-4 h-4" />
                      <span>{t.connectToGDrive}</span>
                    </button>
                  )}
                  <button onClick={downloadProject} className={`w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${themeClasses.bgSecondary} ${themeClasses.accentText} hover:opacity-80`}>
                    <DownloadIcon className="w-4 h-4" />
                    <span>{t.downloadACopy}</span>
                  </button>
                  <button onClick={() => setIsConfirmOpen(true)} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-red-700 text-red-100 hover:bg-red-800">
                    <TrashIcon className="w-4 h-4" />
                    <span>{closeButtonText}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleCloseOrSignOut}
        title={confirmTitle}
        message={confirmMessage}
      />
    </>
  );
};

export default SettingsModal;
