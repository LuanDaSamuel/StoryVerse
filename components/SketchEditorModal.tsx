import React, { useState, useContext, useEffect, useRef } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { NovelSketch } from '../types';
import { SKETCH_TAG_OPTIONS, enhanceHtml, enhancePlainText } from '../constants';
import { CloseIcon } from './Icons';

interface SketchEditorModalProps {
  sketch: NovelSketch | null;
  onClose: () => void;
  onSave: (sketch: NovelSketch) => void;
}

const SketchEditorModal: React.FC<SketchEditorModalProps> = ({ sketch, onClose, onSave }) => {
    const { themeClasses } = useContext(ProjectContext);
    const isNew = sketch === null;
    
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
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
    }, [sketch]);

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
        onSave(finalSketch);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className={`w-full max-w-2xl p-6 rounded-lg shadow-xl ${themeClasses.bgSecondary} ${themeClasses.text} border ${themeClasses.border} flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold">{isNew ? 'Create Sketch' : 'Edit Sketch'}</h2>
                    <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4 overflow-y-auto pr-2 -mr-2">
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Sketch Title"
                        className={`w-full text-2xl font-bold bg-transparent outline-none p-2 -mx-2 rounded-md focus:ring-1 ${themeClasses.accentBorder} ${themeClasses.accentText}`}
                    />
                    
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
                        className={`w-full min-h-[200px] p-3 rounded-md outline-none border ${themeClasses.border} ${themeClasses.input} story-content`}
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </div>

                <div className="flex justify-end space-x-4 mt-6 flex-shrink-0">
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
