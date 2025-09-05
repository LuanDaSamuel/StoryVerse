
import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
// FIX: Changed react-router-dom import to namespace import to fix module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, ChevronLeftIcon, TextIcon, SearchIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, TrashIcon, H1Icon, H2Icon, H3Icon } from '../components/Icons';
import { enhanceHtml, SKETCH_TAG_OPTIONS, THEME_CONFIG } from '../constants';
import { StoryIdea, StoryIdeaStatus } from '../types';
import ConfirmModal from '../components/ConfirmModal';

// This new page provides a full-screen, auto-saving editor for Story Ideas,
// matching the feature set and UI of the Chapter Editor for a consistent experience.

const StoryIdeaEditorPage: React.FC = () => {
    const { ideaId } = ReactRouterDOM.useParams<{ ideaId: string }>();
    const navigate = ReactRouterDOM.useNavigate();
    const { projectData, setProjectData, theme, themeClasses } = useContext(ProjectContext);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const saveTimeout = useRef<number | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const { idea, ideaIndex } = useMemo(() => {
        if (!projectData?.storyIdeas || !ideaId) return { idea: null, ideaIndex: -1 };
        
        const iIndex = projectData.storyIdeas.findIndex(i => i.id === ideaId);
        if (iIndex === -1) return { idea: null, ideaIndex: -1 };
        
        return { idea: projectData.storyIdeas[iIndex], ideaIndex: iIndex };
    }, [projectData, ideaId]);

    const [title, setTitle] = useState(idea?.title || '');
    const [synopsis, setSynopsis] = useState(idea?.synopsis || '');
    const [tags, setTags] = useState<string[]>(idea?.tags || []);
    const [status, setStatus] = useState<StoryIdeaStatus>(idea?.status || 'Seedling');
    const [wordCount, setWordCount] = useState(idea?.wordCount || 0);

    const [documentOutline, setDocumentOutline] = useState<{ id: string; text: string; level: number }[]>([]);
    const [currentBlockFormat, setCurrentBlockFormat] = useState('p');
    
    // Load data from project when the idea changes
    useEffect(() => {
        if (idea) {
            setTitle(idea.title);
            setSynopsis(idea.synopsis);
            setTags(idea.tags);
            setStatus(idea.status);
            setWordCount(idea.wordCount);
            if (editorRef.current && idea.synopsis !== editorRef.current.innerHTML) {
                editorRef.current.innerHTML = enhanceHtml(idea.synopsis);
            }
        }
    }, [idea]);

    // Auto-save logic
    useEffect(() => {
        if (!idea) return; // Don't save if there's no idea loaded
    
        if (saveTimeout.current) {
            clearTimeout(saveTimeout.current);
        }
    
        saveTimeout.current = window.setTimeout(() => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = synopsis;
            const text = tempDiv.textContent || "";
            const currentWordCount = text.trim().split(/\s+/).filter(Boolean).length;
    
            setProjectData(currentData => {
                if (!currentData || ideaIndex === -1) return currentData;
    
                const updatedIdeas = [...currentData.storyIdeas];
                updatedIdeas[ideaIndex] = {
                    ...updatedIdeas[ideaIndex],
                    title,
                    synopsis,
                    tags,
                    status,
                    wordCount: currentWordCount,
                    updatedAt: new Date().toISOString(),
                };
    
                return { ...currentData, storyIdeas: updatedIdeas };
            });
            setWordCount(currentWordCount); // Update local word count state after save
        }, 1000); // 1-second debounce
    
        return () => {
            if (saveTimeout.current) {
                clearTimeout(saveTimeout.current);
            }
        };
    }, [title, synopsis, tags, status, idea, ideaIndex, setProjectData]);

    const updateDocumentOutline = useCallback(() => {
        if (!editorRef.current) return;
        const headings = Array.from(editorRef.current.querySelectorAll('h1, h2, h3'));
        const newOutline = headings.map((heading, index) => {
            const id = heading.id || `heading-${index}`;
            heading.id = id; // Ensure heading has an id for scrolling
            return {
                id,
                text: heading.textContent || 'Untitled Heading',
                level: parseInt(heading.tagName.substring(1), 10),
            };
        });
        setDocumentOutline(newOutline);
    }, []);

    const updateCurrentFormat = useCallback(() => {
        const selection = window.getSelection();
        if (!selection?.rangeCount || !editorRef.current || !editorRef.current.contains(selection.anchorNode)) return;
        
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
        setCurrentBlockFormat(blockType);
    }, []);

    useEffect(() => {
        updateDocumentOutline();
        
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', updateCurrentFormat);
        editorEl?.addEventListener('keyup', updateCurrentFormat);
        editorEl?.addEventListener('mouseup', updateCurrentFormat);
        editorEl?.addEventListener('focus', updateCurrentFormat);

        return () => {
            document.removeEventListener('selectionchange', updateCurrentFormat);
            editorEl?.removeEventListener('keyup', updateCurrentFormat);
            editorEl?.removeEventListener('mouseup', updateCurrentFormat);
            editorEl?.removeEventListener('focus', updateCurrentFormat);
        };
    }, [synopsis, updateDocumentOutline, updateCurrentFormat]);
    
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

    const handleDelete = () => {
        if (!idea) return;
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedIdeas = currentData.storyIdeas.filter(i => i.id !== idea.id);
            return { ...currentData, storyIdeas: updatedIdeas };
        });
        navigate('/demos');
    };

    const applyInlineFormat = (command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();
    };

    const applyBlockFormat = (format: string) => {
        const formatToApply = currentBlockFormat === format ? 'p' : format;
        document.execCommand('formatBlock', false, formatToApply);
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
                    <div className={`sticky top-0 z-10 px-8 md:px-16 lg:px-24 pt-6 pb-4 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border}`}>
                        <button onClick={() => navigate(`/demos`)} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                            <BackIcon className="w-5 h-5" />
                            <span className="font-sans">Return to Idea Box</span>
                        </button>
                    </div>
                    
                    <div className="px-8 md:px-16 lg:px-24 pt-8 pb-48">
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Idea Title"
                            className="text-4xl font-bold bg-transparent outline-none w-full mb-8"
                        />
                        <div
                            ref={editorRef}
                            contentEditable
                            spellCheck={true}
                            suppressContentEditableWarning
                            onInput={(e) => setSynopsis(e.currentTarget.innerHTML)}
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
                            <p className="text-3xl font-bold">{wordCount.toLocaleString()}</p>
                            <p className={themeClasses.textSecondary}>WORDS</p>
                        </div>
                        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Document Outline</h3>
                                {documentOutline.length > 0 ? (
                                    <ul className="space-y-1">
                                        {documentOutline.map(heading => (
                                            <li key={heading.id}>
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById(heading.id);
                                                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    }}
                                                    className="w-full text-left px-2 py-1 rounded hover:bg-white/10 transition-colors"
                                                    style={{ paddingLeft: `${heading.level}rem` }}
                                                >
                                                    {heading.text}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className={`text-xs ${themeClasses.textSecondary}`}>No headings found. Use H1, H2, or H3 to create an outline.</p>
                                )}
                            </div>
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Status</h3>
                                <div className={`flex rounded-md overflow-hidden border ${themeClasses.border}`}>
                                    {(['Seedling', 'Developing', 'Archived'] as StoryIdeaStatus[]).map(option => (
                                        <button key={option} onClick={() => setStatus(option)} className={`flex-1 py-2 text-sm font-semibold transition-colors ${status === option ? `${themeClasses.accent} ${themeClasses.accentText}` : `hover:${themeClasses.bgTertiary}`}`}>
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Tags (up to 6)</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {SKETCH_TAG_OPTIONS.map(tag => (
                                        <button key={tag} onClick={() => handleTagClick(tag)} className={`px-2 py-1 text-xs rounded-full transition-colors font-semibold ${tags.includes(tag) ? `${themeClasses.accent} ${themeClasses.accentText}` : `${themeClasses.bgTertiary} hover:opacity-80`}`}>
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

                <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none">
                    <div className="relative pointer-events-auto">
                        <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm" onMouseDown={(e) => e.preventDefault()}>
                            <button onClick={() => applyInlineFormat('bold')} className="p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors"><BoldIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyInlineFormat('italic')} className="p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors"><ItalicIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <button onClick={() => applyBlockFormat('h1')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${currentBlockFormat === 'h1' ? 'bg-white/20' : ''}`}><H1Icon className="w-5 h-5"/></button>
                            <button onClick={() => applyBlockFormat('h2')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${currentBlockFormat === 'h2' ? 'bg-white/20' : ''}`}><H2Icon className="w-5 h-5"/></button>
                            <button onClick={() => applyBlockFormat('h3')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${currentBlockFormat === 'h3' ? 'bg-white/20' : ''}`}><H3Icon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <button onClick={() => applyInlineFormat('insertUnorderedList')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><ListBulletIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyInlineFormat('insertOrderedList')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><OrderedListIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyBlockFormat('blockquote')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${currentBlockFormat === 'blockquote' ? 'bg-white/20' : ''}`}><BlockquoteIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <button onClick={() => applyInlineFormat('undo')} className="p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors"><UndoIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyInlineFormat('redo')} className="p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors"><RedoIcon className="w-5 h-5"/></button>
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
