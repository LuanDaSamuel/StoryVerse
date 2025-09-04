
import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, ChevronLeftIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, TrashIcon, H1Icon, H2Icon, H3Icon } from '../components/Icons';
import { enhanceHtml, SKETCH_TAG_OPTIONS, THEME_CONFIG } from '../constants';
import { StoryIdea, StoryIdeaStatus } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const StoryIdeaEditorPage: React.FC = () => {
    const { ideaId } = useParams<{ ideaId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, theme, themeClasses } = useContext(ProjectContext);
    
    const editorRef = useRef<HTMLDivElement>(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false, isUL: false, isOL: false, currentBlock: 'p' });
    
    const { idea, ideaIndex } = useMemo(() => {
        if (!projectData?.storyIdeas || !ideaId) return { idea: null, ideaIndex: -1 };
        
        const iIndex = projectData.storyIdeas.findIndex(i => i.id === ideaId);
        if (iIndex === -1) return { idea: null, ideaIndex: -1 };
        
        return { idea: projectData.storyIdeas[iIndex], ideaIndex: iIndex };
    }, [projectData, ideaId]);
    
    const updateIdea = useCallback((field: keyof StoryIdea, value: any) => {
        if (ideaIndex === -1) return;

        setProjectData(currentData => {
            if (!currentData) return currentData;
            
            const updatedIdeas = [...currentData.storyIdeas];
            const currentIdea = updatedIdeas[ideaIndex];

            const tempDiv = document.createElement('div');
            const newSynopsis = field === 'synopsis' ? value : currentIdea.synopsis;
            tempDiv.innerHTML = newSynopsis;
            const text = tempDiv.textContent || "";
            const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

            updatedIdeas[ideaIndex] = {
                ...currentIdea,
                [field]: value,
                wordCount: wordCount,
                updatedAt: new Date().toISOString(),
            };
            
            return { ...currentData, storyIdeas: updatedIdeas };
        });
    }, [ideaIndex, setProjectData]);
    
    // Set initial content
    useEffect(() => {
        if (editorRef.current && idea && idea.synopsis !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = enhanceHtml(idea.synopsis);
        }
    }, [idea]);

    const updateActiveFormats = useCallback(() => {
        let blockType = 'p';
        const selection = window.getSelection();
        if (selection?.rangeCount) {
            let element = selection.getRangeAt(0).startContainer;
            if (element.nodeType === 3) element = element.parentNode!;
            while (element && element !== editorRef.current) {
                const tag = (element as HTMLElement).tagName?.toLowerCase();
                if (['h1', 'h2', 'h3', 'blockquote'].includes(tag)) {
                    blockType = tag;
                    break;
                }
                element = element.parentNode!;
            }
        }
        setActiveFormats({
            isBold: document.queryCommandState('bold'),
            isItalic: document.queryCommandState('italic'),
            isUL: document.queryCommandState('insertUnorderedList'),
            isOL: document.queryCommandState('insertOrderedList'),
            currentBlock: blockType,
        });
    }, []);

    useEffect(() => {
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', updateActiveFormats);
        editorEl?.addEventListener('keyup', updateActiveFormats);
        editorEl?.addEventListener('mouseup', updateActiveFormats);
        return () => {
            document.removeEventListener('selectionchange', updateActiveFormats);
            editorEl?.removeEventListener('keyup', updateActiveFormats);
            editorEl?.removeEventListener('mouseup', updateActiveFormats);
        };
    }, [updateActiveFormats]);
    
    const handleTagClick = (tag: string) => {
        if (!idea) return;
        const newTags = idea.tags.includes(tag)
            ? idea.tags.filter(t => t !== tag)
            : idea.tags.length < 6 ? [...idea.tags, tag] : idea.tags;
        updateIdea('tags', newTags);
    };

    const handleDelete = () => {
        if (!idea) return;
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedIdeas = currentData.storyIdeas.filter(i => i.id !== idea.id);
            return { ...currentData, storyIdeas: updatedIdeas };
        });
        navigate('/demos');
    };

    const applyCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        editorRef.current?.focus();
    };

    const applyParagraphStyle = (style: string) => {
        const format = activeFormats.currentBlock === style ? 'p' : style;
        document.execCommand('formatBlock', false, format);
        editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        editorRef.current?.focus();
    };

    const editorStyle = useMemo(() => {
        if (theme === 'book') {
            const colorClass = THEME_CONFIG.book.text;
            const colorValue = colorClass.match(/\[(.*?)\]/)?.[1] || '#F5EADD';
            return { color: colorValue };
        }
        return { color: 'inherit' };
    }, [theme]);
    
    if (!idea) {
        return (
            <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}>
                <p>Loading idea...</p>
            </div>
        );
    }

    return (
        <>
            <div className={`flex h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
                {isSidebarOpen && (
                    <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30" aria-hidden="true" />
                )}
                
                <div className="flex-1 overflow-y-auto relative">
                     <div className={`sticky top-0 z-10 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border}`}>
                        <div className="px-8 md:px-16 lg:px-24 pt-6 pb-4">
                            <button onClick={() => navigate(`/demos`)} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                                <BackIcon className="w-5 h-5" />
                                <span className="font-sans">Return to Idea Box</span>
                            </button>
                        </div>
                        <div className="flex justify-center pb-2">
                             <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm" onMouseDown={(e) => e.preventDefault()}>
                                <button onClick={() => applyCommand('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.isBold ? 'bg-white/20' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                                <button onClick={() => applyCommand('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.isItalic ? 'bg-white/20' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                                <div className="w-px h-5 bg-white/20 mx-1"></div>
                                <button onClick={() => applyParagraphStyle('h1')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.currentBlock === 'h1' ? 'bg-white/20' : ''}`}><H1Icon className="w-5 h-5"/></button>
                                <button onClick={() => applyParagraphStyle('h2')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.currentBlock === 'h2' ? 'bg-white/20' : ''}`}><H2Icon className="w-5 h-5"/></button>
                                <button onClick={() => applyParagraphStyle('h3')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.currentBlock === 'h3' ? 'bg-white/20' : ''}`}><H3Icon className="w-5 h-5"/></button>
                                <div className="w-px h-5 bg-white/20 mx-1"></div>
                                <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isUL ? 'bg-white/20' : ''}`}><ListBulletIcon className="w-5 h-5"/></button>
                                <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isOL ? 'bg-white/20' : ''}`}><OrderedListIcon className="w-5 h-5"/></button>
                                <button onClick={() => applyParagraphStyle('blockquote')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.currentBlock === 'blockquote' ? 'bg-white/20' : ''}`}><BlockquoteIcon className="w-5 h-5"/></button>
                                <div className="w-px h-5 bg-white/20 mx-1"></div>
                                <button onClick={() => applyCommand('undo')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><UndoIcon className="w-5 h-5"/></button>
                                <button onClick={() => applyCommand('redo')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><RedoIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-8 md:px-16 lg:px-24 pt-8 pb-48">
                        <input
                            type="text"
                            value={idea.title}
                            onChange={(e) => updateIdea('title', e.target.value)}
                            placeholder="Idea Title"
                            className="text-4xl font-bold bg-transparent outline-none w-full mb-8"
                        />
                        <div
                            ref={editorRef}
                            contentEditable
                            spellCheck={true}
                            suppressContentEditableWarning
                            onInput={(e) => updateIdea('synopsis', e.currentTarget.innerHTML)}
                            className="w-full text-lg leading-relaxed outline-none story-content"
                            style={editorStyle}
                        />
                    </div>
                </div>
                
                <div className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className={`w-80 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-l ${themeClasses.border} flex flex-col`}>
                        <div className={`px-4 py-3 flex justify-between items-center border-b ${themeClasses.border}`}>
                            <span className="font-bold text-base">IDEA DETAILS</span>
                            <button onClick={() => setIsSidebarOpen(false)}><ChevronLeftIcon className="w-5 h-5"/></button>
                        </div>
                        <div className={`px-4 py-4 border-b ${themeClasses.border}`}>
                            <p className="text-3xl font-bold">{(idea.wordCount || 0).toLocaleString()}</p>
                            <p className={themeClasses.textSecondary}>WORDS</p>
                        </div>
                        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Status</h3>
                                <div className={`flex rounded-md overflow-hidden border ${themeClasses.border}`}>
                                    {(['Seedling', 'Developing', 'Archived'] as StoryIdeaStatus[]).map(option => (
                                        <button key={option} onClick={() => updateIdea('status', option)} className={`flex-1 py-2 text-sm font-semibold transition-colors ${idea.status === option ? `${themeClasses.accent} ${themeClasses.accentText}` : `hover:${themeClasses.bgTertiary}`}`}>
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Tags (up to 6)</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {SKETCH_TAG_OPTIONS.map(tag => (
                                        <button key={tag} onClick={() => handleTagClick(tag)} className={`px-2 py-1 text-xs rounded-full transition-colors font-semibold ${idea.tags.includes(tag) ? `${themeClasses.accent} ${themeClasses.accentText}` : `${themeClasses.bgTertiary} hover:opacity-80`}`}>
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Actions</h3>
                                <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold transition-colors bg-red-700 text-red-100 hover:bg-red-800">
                                    <TrashIcon className="w-5 h-5"/>
                                    <span>Delete Idea</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className={`fixed top-4 right-4 z-30 p-2 rounded-md ${themeClasses.bgSecondary} ${themeClasses.accentText} hover:opacity-80 shadow-lg border ${themeClasses.border}`} aria-label="Open idea details">
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
            )}

            <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
                title={`Delete "${idea.title}"?`}
                message="Are you sure you want to delete this story idea? This action is permanent."
            />
        </>
    );
};

export default StoryIdeaEditorPage;
