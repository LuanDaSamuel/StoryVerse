import * as React from 'react';
import { AggregatedSketch } from '../types';
import { ProjectContext } from '../contexts/ProjectContext';
import { CloseIcon } from './Icons';
import { enhancePlainText, enhanceHtml } from '../constants';

interface SketchViewerModalProps {
  sketch: AggregatedSketch | null;
  onClose: () => void;
}

const SketchViewerModal = ({ sketch, onClose }: SketchViewerModalProps) => {
    const { themeClasses, projectData } = React.useContext(ProjectContext);
    const baseFontSize = projectData?.settings?.baseFontSize || 18;

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    if (!sketch) return null;
    
    const textColor = themeClasses.accentText;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" onClick={onClose}>
            <div 
                className={`flex flex-col shadow-xl w-full max-w-3xl rounded-lg my-8 ${themeClasses.bgSecondary} ${textColor} border ${themeClasses.border}`}
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-start p-6 border-b border-inherit flex-shrink-0">
                    <div className="flex-1">
                        <div className={`text-sm font-semibold uppercase tracking-wider ${themeClasses.textSecondary}`}>{enhancePlainText(sketch.novelTitle)}</div>
                        <h1 className={`text-3xl font-bold mt-1 ${themeClasses.accentText}`}>{enhancePlainText(sketch.title)}</h1>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {sketch.tags.map(tag => (
                                <span key={tag} className={`px-3 py-1 text-xs rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>{tag}</span>
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 -m-2 rounded-full hover:${themeClasses.bgTertiary} transition-colors ${textColor}`}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <main 
                    className="flex-1 overflow-y-auto p-6"
                    style={{ fontSize: `${baseFontSize}px` }}
                >
                    <div 
                        className="prose-styles story-content"
                        dangerouslySetInnerHTML={{ __html: enhanceHtml(sketch.content) }}
                    />
                </main>
            </div>
        </div>
    );
};

export default SketchViewerModal;