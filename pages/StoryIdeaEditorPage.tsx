
import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
// FIX: Changed react-router-dom import to namespace import to fix module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, ChevronLeftIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, TrashIcon, H1Icon, H2Icon, H3Icon } from '../components/Icons';
import { enhanceHtml, enhancePlainText, SKETCH_TAG_OPTIONS, THEME_CONFIG } from '../constants';
import { StoryIdea, StoryIdeaStatus } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const StoryIdeaEditorPage: React.FC = () => {
    const { ideaId } = ReactRouterDOM.useParams<{ ideaId: string }>();
    const navigate = ReactRouterDOM.useNavigate();
    const { projectData, setProjectData, theme, themeClasses } = useContext(ProjectContext);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const saveTimeout = useRef<number | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const { idea, ideaIndex } = useMemo(() => {
        if (!projectData?.storyIdeas || !ideaId) return { idea: null, ideaIndex: -1 };
        const iIndex = projectData.storyIdeas.findIndex(i => i.id === ideaId);
        return iIndex === -1 ? { idea: null, ideaIndex: -1 } : { idea: projectData.storyIdeas[iIndex], ideaIndex: iIndex };
    }, [projectData, ideaId]);

    const [title, setTitle] = useState(idea?.title || '');
    const [synopsis, setSynopsis] = useState(idea?.synopsis || '');
    const [tags, setTags] = useState<string[]>(idea?.tags || []);
    const [status, setStatus] = useState<StoryIdeaStatus>(idea?.status || 'Seedling');
    const [wordCount, setWordCount] = useState(idea?.wordCount || 0);

    const [documentOutline, setDocumentOutline] = useState<{ id: string; text: string; level: number }[]>([]);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false, isUL: false, isOL: false, currentBlock: 'p' });

    useEffect(() => {
        if (idea) {
            setTitle(idea.title);
            setTags(idea.tags);
            setStatus(idea.status);
            setWordCount(idea.wordCount);
            // Only update editor content if it's different, to avoid resetting cursor
            if (editorRef.current && idea.synopsis !== editorRef.current.innerHTML) {
                const enhancedContent = enhanceHtml(idea.synopsis || '<p><br></p>');
                editorRef.current.innerHTML = enhancedContent;
                setSynopsis(enhancedContent); // Sync state with the DOM
            }
        }
    }, [idea]);

    useEffect(() => {
        if (!idea) return;
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
        saveTimeout.current = window.setTimeout(() => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = synopsis;
            const text = tempDiv.textContent || "";
            const currentWordCount = text.trim().split(/\s+/).filter(Boolean).length;
    
            setProjectData(currentData => {
                if (!currentData || ideaIndex === -1) return currentData;
                const updatedIdeas = [...currentData.storyIdeas];
                const currentIdea = updatedIdeas[ideaIndex];
                // Only update if there are actual changes to prevent unnecessary saves
                if (currentIdea.title !== title || currentIdea.synopsis !== synopsis || JSON.stringify(currentIdea.tags) !== JSON.stringify(tags) || currentIdea.status !== status) {
                    updatedIdeas[ideaIndex] = {
                        ...currentIdea,
                        title,
                        synopsis,
                        tags,
                        status,
                        wordCount: currentWordCount,
                        updatedAt: new Date().toISOString(),
                    };
                    return { ...currentData, storyIdeas: updatedIdeas };
                }
                return currentData;
            });
            setWordCount(currentWordCount);
        }, 1000);
    
        return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
    }, [title, synopsis, tags, status, idea, ideaIndex, setProjectData]);

    const updateDocumentOutline = useCallback(() => {
        if (!editorRef.current) return;
        const headings = Array.from(editorRef.current.querySelectorAll('h1, h2, h3'));
        const newOutline = headings.map((heading, index) => {
            const id = heading.id || `heading-idea-${index}`;
            heading.id = id;
            return { id, text: heading.textContent || 'Untitled Heading', level: parseInt(heading.tagName.substring(1), 10) };
        });
        setDocumentOutline(newOutline);
    }, []);

    const updateActiveFormats = useCallback(() => {
        const selection = window.getSelection();
        if (!selection?.rangeCount || !editorRef.current || !editorRef.current.contains(selection.anchorNode)) return;

        let element = selection.anchorNode;
        if (element?.nodeType === 3) element = element.parentNode;

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
    
    const handleSelectionChange = useCallback(() => {
        updateActiveFormats();
    }, [updateActiveFormats]);

    useEffect(() => {
        updateDocumentOutline();
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', handleSelectionChange);
        if (editorEl) {
            editorEl.addEventListener('keyup', handleSelectionChange);
            editorEl.addEventListener('mouseup', handleSelectionChange);
            editorEl.addEventListener('focus', handleSelectionChange);
        }
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            if(editorEl) {
                editorEl.removeEventListener('keyup', handleSelectionChange);
                editorEl.removeEventListener('mouseup', handleSelectionChange);
                editorEl.removeEventListener('focus', handleSelectionChange);
            }
        };
    }, [synopsis, updateDocumentOutline, handleSelectionChange]);

    const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
        setSynopsis(e.currentTarget.innerHTML);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === '"' || e.key === "'") {
            e.preventDefault();
            const quote = e.key === '"' ? '“' : '‘';
            document.execCommand('insertText', false, quote);
        }
        if (e.key === '-' && e.currentTarget.textContent.endsWith('-')) {
             e.preventDefault();
             document.execCommand('delete');
             document.execCommand('insertText', false, '—');
        }
        if (e.key === '.' && e.currentTarget.textContent.endsWith('..')) {
             e.preventDefault();
             document.execCommand('delete');
             document.execCommand('delete');
             document.execCommand('insertText', false, '…');
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;
        const htmlToInsert = text.split(/\r?\n/).map(line => `<p>${enhancePlainText(line) || '<br>'}</p>`).join('');
        document.execCommand('insertHTML', false, htmlToInsert);
    };

    const applyCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleEditorInput({ currentTarget: editorRef.current } as React.FormEvent<HTMLDivElement>);
    };

    const applyBlockFormat = (format: string) => {
        const formatToApply = activeFormats.currentBlock === format ? 'p' : format;
        applyCommand('formatBlock', formatToApply);
    };
    
    const handleTagClick = (tag: string) => { setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 6 ? [...prev, tag] : prev); };
    const handleDelete = () => { if (!idea) return; setProjectData(d => d ? { ...d, storyIdeas: d.storyIdeas.filter(i => i.id !== idea.id) } : null); navigate('/demos'); };
    const editorStyle = useMemo(() => (theme === 'book' ? { color: THEME_CONFIG.book.text.match(/\[(.*?)\]/)?.[1] || '#F5EADD' } : { color: 'inherit' }), [theme]);
    
    if (!idea) return <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}><p>Loading idea...</p></div>;

    return (
        <>
            <div className={`flex h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
                {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30" />}
                <div className="flex-1 overflow-y-auto relative">
                    <div className={`sticky top-0 z-10 px-8 md:px-16 lg:px-24 pt-6 pb-4 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border}`}>
                        <button onClick={() => navigate(`/demos`)} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                            <BackIcon className="w-5 h-5" /><span className="font-sans">Return to Idea Box</span>
                        </button>
                    </div>
                    <div className="px-8 md:px-16 lg:px-24 pt-8 pb-48">
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Idea Title" className="text-4xl font-bold bg-transparent outline-none w-full mb-8" />
                        <div ref={editorRef} contentEditable spellCheck={true} suppressContentEditableWarning onInput={handleEditorInput} onKeyDown={handleKeyDown} onPaste={handlePaste} className="w-full text-lg leading-relaxed outline-none story-content" style={editorStyle} />
                    </div>
                </div>
                <div className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className={`w-80 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-l ${themeClasses.border} flex flex-col`}>
                        <div className={`px-4 py-3 flex justify-between items-center border-b ${themeClasses.border}`}>
                            <span className="font-bold text-base">IDEA DETAILS</span><button onClick={() => setIsSidebarOpen(false)}><ChevronLeftIcon className="w-5 h-5"/></button>
                        </div>
                        <div className={`px-4 py-4 border-b ${themeClasses.border}`}>
                            <p className="text-3xl font-bold">{wordCount.toLocaleString()}</p><p className={themeClasses.textSecondary}>WORDS</p>
                        </div>
                        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Document Outline</h3>
                                {documentOutline.length > 0 ? (
                                    <ul className="space-y-1">{documentOutline.map(h => <li key={h.id}><button onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="w-full text-left px-2 py-1 rounded hover:bg-white/10" style={{ paddingLeft: `${h.level}rem` }}>{h.text}</button></li>)}</ul>
                                ) : <p className={`text-xs ${themeClasses.textSecondary}`}>No headings found.</p>}
                            </div>
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Status</h3>
                                <div className={`flex rounded-md overflow-hidden border ${themeClasses.border}`}>
                                    {(['Seedling', 'Developing', 'Archived'] as StoryIdeaStatus[]).map(o => <button key={o} onClick={() => setStatus(o)} className={`flex-1 py-2 text-sm font-semibold ${status === o ? `${themeClasses.accent} ${themeClasses.accentText}` : `hover:${themeClasses.bgTertiary}`}`}>{o}</button>)}
                                </div>
                            </div>
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Tags</h3>
                                <div className="flex flex-wrap gap-1.5">{SKETCH_TAG_OPTIONS.map(t => <button key={t} onClick={() => handleTagClick(t)} className={`px-2 py-1 text-xs rounded-full font-semibold ${tags.includes(t) ? `${themeClasses.accent} ${themeClasses.accentText}` : `${themeClasses.bgTertiary} hover:opacity-80`}`}>{t}</button>)}</div>
                            </div>
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Actions</h3>
                                <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold bg-red-700 text-red-100 hover:bg-red-800"><TrashIcon className="w-5 h-5"/><span>Delete Idea</span></button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none">
                    <div className="relative pointer-events-auto">
                        <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm" onMouseDown={e => e.preventDefault()}>
                            <button onClick={() => applyCommand('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isBold ? 'bg-white/20' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isItalic ? 'bg-white/20' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => applyBlockFormat('h1')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.currentBlock === 'h1' ? 'bg-white/20' : ''}`}><H1Icon className="w-5 h-5"/></button>
                            <button onClick={() => applyBlockFormat('h2')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.currentBlock === 'h2' ? 'bg-white/20' : ''}`}><H2Icon className="w-5 h-5"/></button>
                            <button onClick={() => applyBlockFormat('h3')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.currentBlock === 'h3' ? 'bg-white/20' : ''}`}><H3Icon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isUL ? 'bg-white/20' : ''}`}><ListBulletIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isOL ? 'bg-white/20' : ''}`}><OrderedListIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyBlockFormat('blockquote')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.currentBlock === 'blockquote' ? 'bg-white/20' : ''}`}><BlockquoteIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => applyCommand('undo')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><UndoIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('redo')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><RedoIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
            </div>
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className={`fixed top-4 right-4 z-30 p-2 rounded-md ${themeClasses.bgSecondary} ${themeClasses.accentText} hover:opacity-80 shadow-lg border ${themeClasses.border}`}><ChevronLeftIcon className="w-5 h-5" /></button>}
            <ConfirmModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title={`Delete "${idea.title}"?`} message="Are you sure you want to delete this story idea? This action is permanent." />
        </>
    );
};

export default StoryIdeaEditorPage;
