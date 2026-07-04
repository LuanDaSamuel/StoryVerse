import * as React from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { CloseIcon, SparklesIcon, BookOpenIcon, FolderIcon, QuillPenIcon, TextIcon } from './Icons';
import { useTranslations } from '../hooks/useTranslations';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsNewModal = ({ isOpen, onClose }: WhatsNewModalProps) => {
  const { themeClasses, theme } = React.useContext(ProjectContext);
  const t = useTranslations();

  if (!isOpen) return null;

  const features = [
    {
      title: 'Light Novel Mode (A5)',
      description: 'Experience a tactile, page-based writing flow. Chapters now form a continuous "Book Note" with realistic A5 proportions.',
      icon: <BookOpenIcon className="w-6 h-6" />,
    },
    {
      title: 'Idea Folders',
      description: 'Organize your story concepts effortlessly. Drag and drop ideas into folders to keep your creative space tidy.',
      icon: <FolderIcon className="w-6 h-6" />,
    },
    {
      title: 'Smart Typography',
      description: 'Your writing now automatically handles ellipses (... to …), em-dashes (-- to —), and context-aware smart quotes.',
      icon: <QuillPenIcon className="w-6 h-6" />,
    },
    {
      title: 'Advanced Formatting',
      description: 'New toolbar controls for line height, paragraph spacing, and indentation give you total control over your book\'s look.',
      icon: <TextIcon className="w-6 h-6" />,
    },
  ];

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4 font-sans" 
        onClick={onClose} 
        role="dialog" 
        aria-modal="true"
    >
      <div 
          className={`w-full max-w-2xl p-8 rounded-xl shadow-2xl ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border} overflow-hidden flex flex-col max-h-[90vh]`} 
          onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center mb-8 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${themeClasses.accent} ${themeClasses.accentText}`}>
                <SparklesIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">{t.whatsNewTitle}</h2>
          </div>
          <button onClick={onClose} className={`p-2 -m-2 rounded-full hover:${themeClasses.bgTertiary}`} aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto flex-grow pr-2 -mr-2">
          {features.map((feature, idx) => (
            <div key={idx} className={`flex items-start space-x-4 p-4 rounded-xl transition-colors hover:${themeClasses.bgTertiary} border border-transparent hover:${themeClasses.border}`}>
              <div className={`mt-1 flex-shrink-0 ${theme === 'book' ? 'text-amber-700' : 'text-indigo-400'}`}>
                {feature.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
                <p className={`${themeClasses.textSecondary} leading-relaxed text-sm`}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}

          <div className={`mt-8 p-4 rounded-lg ${themeClasses.bgTertiary} border ${themeClasses.border}`}>
             <p className="text-sm font-semibold mb-1 flex items-center space-x-2">
                <span className={theme === 'book' ? 'text-amber-800' : 'text-indigo-300'}>{t.proTip}</span>
             </p>
             <p className={`text-xs ${themeClasses.textSecondary}`}>
                {t.proTipMessage}
             </p>
          </div>
        </div>

        <footer className="mt-8 flex justify-center flex-shrink-0">
          <button 
            onClick={onClose} 
            className={`px-8 py-3 font-bold rounded-lg transition-colors ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90 shadow-lg`}
          >
            {t.confirm}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default WhatsNewModal;