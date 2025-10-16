import * as React from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { CloseIcon, SparklesIcon } from './Icons';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsNewModal = ({ isOpen, onClose }: WhatsNewModalProps) => {
    const { theme, themeClasses } = React.useContext(ProjectContext);

    const updates = [
        {
            date: 'October 9, 2025',
            items: [
                "**Stability Fix**: Improved the Google Drive auto-login feature. The app now proactively checks and refreshes your session, preventing save errors when you return after a long break.",
                "**Bug Fixes**: Resolved minor bugs in the editor toolbars and DOCX file import to ensure smoother operation."
            ]
        },
        {
            date: 'October 8, 2025',
            items: [
                "Hello world!",
                "**UI Update**: Changed the 'What's New' panel to a floating modal for better visibility."
            ]
        },
        {
            date: 'October 7, 2025',
            items: [
                "**New Feature**: Added the 'What's New' panel to the sidebar to keep you informed about app updates.",
            ]
        },
        {
            date: 'October 5, 2025',
            items: [
                "**Enhancement**: Made the auto-login process faster and more stable.",
            ]
        },
        {
            date: 'October 3, 2025',
            items: [
                "**New Feature**: Implemented auto-login for a smoother experience when you return to the app.",
            ]
        },
        {
            date: 'September 28, 2025',
            items: [
                "**Initial Release**: Welcome to StoryVerse! We're excited to have you.",
            ]
        }
    ];

    // Simple markdown-to-HTML for bolding
    const renderUpdateText = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 font-sans" onClick={onClose} role="dialog" aria-modal="true">
            <div 
                className={`w-full max-w-lg p-6 rounded-lg shadow-xl ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-2xl font-bold flex items-center space-x-3`}>
                        <SparklesIcon className="w-6 h-6" />
                        <span>What's New</span>
                    </h2>
                    <button onClick={onClose} className={`p-1 -m-1 rounded-full hover:${themeClasses.bgTertiary}`} aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto pr-4 -mr-4 space-y-4">
                    {updates.map(update => (
                         <div key={update.date}>
                            <p className={`font-bold mb-1 ${themeClasses.accentText}`}>{update.date}</p>
                            <ul className={`space-y-1 list-disc list-inside ${themeClasses.textSecondary}`}>
                                {update.items.map((item, index) => (
                                    <li key={index}>{renderUpdateText(item)}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    <div className={`mt-3 p-3 rounded-md ${theme === 'book' ? 'bg-amber-100 text-amber-800' : 'bg-slate-700 text-slate-300'}`}>
                        <p>
                            <strong className="font-semibold">Pro Tip:</strong> If you see an 'Error saving' message, a quick reload of the app usually fixes the issue.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsNewModal;
