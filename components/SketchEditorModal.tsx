
import React, { useState, useContext, useEffect, useRef } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { NovelSketch } from '../types';
import { SKETCH_TAG_OPTIONS, enhancePlainText } from '../constants';
import { CloseIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from './Icons';

interface SketchEditorModalProps {
  sketch: NovelSketch | null;
  onClose: () => void;
  onSave: (sketch: NovelSketch, novelId: string) => void;
  novels?: { id: string, title: string }[];
  novelId?: string;
}

const SketchEditorModal: React.FC<SketchEditorModalProps> = ({ sketch, onClose, onSave, novels, novelId: contextualNovelId }) => {
    const { theme, themeClasses } = useContext(ProjectContext);
    const isNew = sketch === null;
    
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [selectedNovelId, setSelectedNovelId] = useState<string>('');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (sketch) {
            setTitle(sketch.title);
            setContent(sketch.content);
            setTags(sketch.tags);
            if (editorRef.current) {
                editorRef.current.innerHTML = sketch.content;
            }
        } else {
            setTitle('Untitled Sketch');
            setContent('<p><br></p>');
            setTags([]);
            if (editorRef.current) {
                editorRef.current.innerHTML = '<p><br></p>';
            }
        }

        if (contextualNovelId) {
            setSelectedNovelId(contextualNovelId);
        } else if (novels && novels.length > 0) {
            setSelectedNovelId(novels[0].id);
        }

    }, [sketch, contextualNovelId, novels]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isFullScreen) {
                event.preventDefault();
                setIsFullScreen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFullScreen]);

    const handleTagClick = (tag: string) => {
        setTags(prev => {
            if (prev.includes(tag)) {
                return prev.filter(t => t !== tag);
            }
            if (prev.length < 6) {
                return [...prev, tag];
            }
            return prev;
        });
    };

    const handleSave = () => {
        if (isNew && novels && !selectedNovelId) {
            alert('Please select a novel to associate this sketch with.');
            return;
        }
        const now = new Date().toISOString();
        const editorContent = editorRef.current?.innerHTML || '';
        
        const finalSketch: NovelSketch = {
            id: sketch?.id || crypto.randomUUID(),
            title: title || 'Untitled Sketch',
            content: editorContent,
            tags,
            createdAt: sketch?.createdAt || now,
            updatedAt: now,
        };
        onSave(finalSketch, selectedNovelId);
    };
    
    const modalTextColor = theme === 'book' ? themeClasses.accentText : themeClasses.text;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center" onClick={onClose} role="dialog" aria-modal="true">
            <div 
                className={`
                    flex flex-col shadow-xl transition-all duration-300
                    ${themeClasses.bgSecondary} ${modalTextColor} border ${themeClasses.border}
                    ${isFullScreen 
                        ? 'w-screen h-screen max-w-full max-h-full rounded-none' 
                        : 'w-full max-w-2xl rounded-lg max-h-[90vh] m-4'
                    }
                `} 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 pb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold">{isNew ? 'Create Sketch' : 'Edit Sketch'}</h2>
                     <div className="flex items-center space-x-2">
                        <button onClick={() => setIsFullScreen(p => !p)} title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}>
                            {isFullScreen ? <ArrowsPointingInIcon className="w-6 h-6" /> : <ArrowsPointingOutIcon className="w-6 h-6" />}
                        </button>
                        <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}>
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className={`space-y-4 overflow-y-auto px-6 ${isFullScreen ? 'flex-grow' : ''}`}>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Sketch Title"
                        className={`w-full text-2xl font-bold bg-transparent outline-none p-2 -mx-2 rounded-md focus:ring-1 ${themeClasses.accentBorder} ${themeClasses.accentText}`}
                    />
                    
                    {isNew && novels && novels.length > 0 && (
                        <div>
                            <h3 className={`font-bold mb-2 text-sm ${themeClasses.textSecondary}`}>Novel</h3>
                            <select
                                value={selectedNovelId}
                                onChange={e => setSelectedNovelId(e.target.value)}
                                className={`w-full p-3 rounded-md border ${themeClasses.border} ${themeClasses.input}`}
                            >
                                {novels.map(n => (
                                    <option key={n.id} value={n.id}>{enhancePlainText(n.title)}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <h3 className={`font-bold mb-2 text-sm ${themeClasses.textSecondary}`}>Tags (up to 6)</h3>
                        <div className="flex flex-wrap gap-2">
                            {SKETCH_TAG_OPTIONS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => handleTagClick(tag)}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors font-semibold ${
                                        tags.includes(tag)
                                            ? `${themeClasses.accent} ${themeClasses.accentText}`
                                            : `${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        className={`
                            w-full p-3 rounded-md outline-none border ${themeClasses.border} ${themeClasses.input} story-content
                            transition-all duration-300
                            ${isFullScreen ? 'min-h-[60vh] h-full' : 'min-h-[200px]'}
                        `}
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </div>

                <div className="flex justify-end space-x-4 p-6 pt-4 flex-shrink-0">
                    <button onClick={onClose} className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} hover:opacity-80 transition-opacity`}>
                        Cancel
                    </button>
                    <button onClick={handleSave} className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90 transition-opacity`}>
                        Save Sketch
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SketchEditorModal;
