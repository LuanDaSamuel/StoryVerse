import * as React from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { NovelSketch } from '../types';
import { SKETCH_TAG_OPTIONS, enhancePlainText, enhanceHtml } from '../constants';
import { CloseIcon, BoldIcon, ItalicIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, H1Icon, H2Icon, H3Icon } from './Icons';

interface ToolbarButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isActive: boolean;
  children: React.ReactNode;
}

// FIX: Moved ToolbarButton outside of the SketchEditorModal component.
// This prevents the component from being redefined on every render, which can cause state issues and confuse TypeScript's type inference.
const ToolbarButton = ({
  onClick,
  isActive,
  children,
}: ToolbarButtonProps) => {
    const activeClass = `bg-white/20 text-white`;
    const inactiveClass = `hover:bg-white/10 text-gray-300`;

    return (
        <button
            onMouseDown={onClick}
            className={`p-2 rounded-md transition-colors ${isActive ? activeClass : inactiveClass}`}
        >
            {children}
        </button>
    );
};

interface SketchEditorModalProps {
  sketch: NovelSketch | null;
  onClose: () => void;
  onSave: (sketch: NovelSketch, novelId: string) => void;
  novels?: { id: string, title: string }[];
  novelId?: string;
}

const SketchEditorModal = ({ sketch, onClose, onSave, novels, novelId: contextualNovelId }: SketchEditorModalProps) => {
    const { themeClasses, projectData } = React.useContext(ProjectContext);
    const isNew = sketch === null;
    
    const [title, setTitle] = React.useState('');
    const [content, setContent] = React.useState('');
    const [tags, setTags] = React.useState<string[]>([]);
    const [selectedNovelId, setSelectedNovelId] = React.useState<string>('');
    const [activeFormats, setActiveFormats] = React.useState({ isBold: false, isItalic: false, isUL: false, isOL: false, currentBlock: 'p' });
    
    const editorRef = React.useRef<HTMLDivElement>(null);
    const baseFontSize = projectData?.settings?.baseFontSize || 18;

    React.useEffect(() => {
        if (sketch) {
            setTitle(sketch.title);
            setContent(sketch.content);
            setTags(sketch.tags);
        } else {
            setTitle('Untitled Sketch');
            setContent('<p><br></p>');
            setTags([]);
        }

        if (contextualNovelId) {
            setSelectedNovelId(contextualNovelId);
        } else if (novels && novels.length > 0) {
            setSelectedNovelId(novels[0].id);
        }
    }, [sketch, contextualNovelId, novels]);
    
    React.useEffect(() => {
        if (editorRef.current && content !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = enhanceHtml(content);
        }
    }, [content]);

    const updateActiveFormats = React.useCallback(() => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        
        let element = selection.anchorNode;
        if (element?.nodeType === 3) {
            element = element.parentNode;
        }

        let blockType = 'p';
        let parent = element as HTMLElement | null;
        while(parent && parent !== editorRef.current) {
            const tag = parent.tagName.toLowerCase();
            if(['h1','h2','h3','blockquote'].includes(tag)) {
                blockType = tag;
                break;
            }
            parent = parent.parentElement;
        }

        setActiveFormats({
            isBold: document.queryCommandState('bold'),
            isItalic: document.queryCommandState('italic'),
            isUL: document.queryCommandState('insertUnorderedList'),
            isOL: document.queryCommandState('insertOrderedList'),
            currentBlock: blockType,
        });
    }, []);

    React.useEffect(() => {
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', updateActiveFormats);
        editorEl?.addEventListener('keyup', updateActiveFormats);
        editorEl?.addEventListener('mouseup', updateActiveFormats);
        editorEl?.addEventListener('focus', updateActiveFormats);
        return () => {
            document.removeEventListener('selectionchange', updateActiveFormats);
            editorEl?.removeEventListener('keyup', updateActiveFormats);
            editorEl?.removeEventListener('mouseup', updateActiveFormats);
            editorEl?.removeEventListener('focus', updateActiveFormats);
        };
    }, [updateActiveFormats]);


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
        // FIX: Calculate wordCount from the editor's content.
        const contentHtml = editorRef.current?.innerHTML || '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentHtml;
        const textContent = tempDiv.textContent || '';
        const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
        
        const finalSketch: NovelSketch = {
            id: sketch?.id || crypto.randomUUID(),
            title: title || 'Untitled Sketch',
            content: contentHtml,
            wordCount,
            tags,
            createdAt: sketch?.createdAt || now,
            updatedAt: now,
        };
        onSave(finalSketch, selectedNovelId);
    };

    const applyCommand = (e: React.MouseEvent<HTMLButtonElement>, command: string, value?: string) => {
        e.preventDefault();
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        updateActiveFormats();
    };

    const applyBlockFormat = (e: React.MouseEvent<HTMLButtonElement>, format: string) => {
        e.preventDefault();
        const currentBlock = activeFormats.currentBlock;
        const formatToApply = currentBlock === format ? 'p' : format;
        document.execCommand('formatBlock', false, formatToApply);
        editorRef.current?.focus();
        updateActiveFormats();
    };
    
    const modalTextColor = themeClasses.accentText;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div 
                className={`flex flex-col shadow-xl transition-all duration-300 w-full max-w-4xl rounded-lg max-h-[90vh] ${themeClasses.bgSecondary} ${modalTextColor} border ${themeClasses.border}`} 
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-inherit flex-shrink-0">
                    <h2 className="text-xl font-bold">{isNew ? 'Create Sketch' : 'Edit Sketch'}</h2>
                    <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-grow flex flex-col md:flex-row overflow-hidden">
                    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Sketch Title"
                            className={`w-full text-3xl font-bold bg-transparent outline-none mb-4 ${themeClasses.accentText}`}
                        />
                        <div className="sticky top-0 z-10 bg-gray-800 p-2 rounded-md mb-4 flex items-center space-x-1">
                            {/* FIX: Added icon components as children to ToolbarButton. */}
                            <ToolbarButton onClick={(e) => applyCommand(e, 'bold')} isActive={activeFormats.isBold}><BoldIcon className="w-5 h-5"/></ToolbarButton>
                            {/* FIX: Added icon components as children to ToolbarButton. */}
                            <ToolbarButton onClick={(e) => applyCommand(e, 'italic')} isActive={activeFormats.isItalic}><ItalicIcon className="w-5 h-5"/></ToolbarButton>
                            <div className="w-px h-5 bg-gray-600 mx-1"></div>
                            {/* FIX: Added icon components as children to ToolbarButton. */}
                            <ToolbarButton onClick={(e) => applyBlockFormat(e, 'h1')} isActive={activeFormats.currentBlock === 'h1'}><H1Icon className="w-5 h-5"/></ToolbarButton>
                            {/* FIX: Added icon components as children to ToolbarButton. */}
                            <ToolbarButton onClick={(e) => applyBlockFormat(e, 'h2')} isActive={activeFormats.currentBlock === 'h2'}><H2Icon className="w-5 h-5"/></ToolbarButton>
                            {/* FIX: Added icon components as children to ToolbarButton. */}
                            <ToolbarButton onClick={(e) => applyBlockFormat(e, 'h3')} isActive={activeFormats.currentBlock === 'h3'}><H3Icon className="w-5 h-5"/></ToolbarButton>
                            <div className="w-px h-5 bg-gray-600 mx-1"></div>
                            {/* FIX: Added icon components as children to ToolbarButton. */}
                            <ToolbarButton onClick={(e) => applyCommand(e, 'insertUnorderedList')} isActive={activeFormats.isUL}><ListBulletIcon className="w-5 h-5"/></ToolbarButton>
                            {/* FIX: Added icon components as children to ToolbarButton. */}
                            <ToolbarButton onClick={(e) => applyCommand(e, 'insertOrderedList')} isActive={activeFormats.isOL}><OrderedListIcon className="w-5 h-5"/></ToolbarButton>
                            {/* FIX: Added icon components as children to ToolbarButton. */}
                            <ToolbarButton onClick={(e) => applyBlockFormat(e, 'blockquote')} isActive={activeFormats.currentBlock === 'blockquote'}><BlockquoteIcon className="w-5 h-5"/></ToolbarButton>
                        </div>
                        <div
                            ref={editorRef}
                            contentEditable
                            className={`flex-grow outline-none prose-styles story-content leading-relaxed ${modalTextColor}`}
                            style={{minHeight: '200px', fontSize: `${baseFontSize}px`}}
                        />
                    </div>
                    <aside className={`w-full md:w-72 border-t md:border-t-0 md:border-l ${themeClasses.border} flex-shrink-0 flex flex-col`}>
                        <div className="flex-grow p-4 space-y-6 overflow-y-auto">
                            {isNew && novels && novels.length > 0 && (
                                <div>
                                    <h3 className={`font-bold mb-2 text-sm ${themeClasses.textSecondary}`}>NOVEL</h3>
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
                                <h3 className={`font-bold mb-2 text-sm ${themeClasses.textSecondary}`}>TAGS (UP TO 6)</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {SKETCH_TAG_OPTIONS.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => handleTagClick(tag)}
                                            className={`px-2 py-1 text-xs rounded-full transition-colors font-semibold ${
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
                        </div>
                    </aside>
                </main>

                <footer className="flex justify-end space-x-4 p-4 border-t border-inherit flex-shrink-0">
                    <button onClick={onClose} className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} hover:opacity-80 transition-opacity`}>
                        Cancel
                    </button>
                    <button onClick={handleSave} className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90 transition-opacity`}>
                        Save Sketch
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SketchEditorModal;