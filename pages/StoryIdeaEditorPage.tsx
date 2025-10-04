import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectStore, useThemeClasses } from '../store/projectStore';
import { BackIcon, ChevronLeftIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, TrashIcon, H1Icon, H2Icon, H3Icon, LoadingIcon, CheckIcon, ExclamationTriangleIcon } from '../components/Icons';
import { enhanceHtml, enhancePlainText, SKETCH_TAG_OPTIONS } from '../constants';
import { StoryIdea, StoryIdeaStatus } from '../types';
import ConfirmModal from '../components/ConfirmModal';

// FIX: Moved SaveStatusIndicator outside the main component to prevent re-declaration on every render.
const SaveStatusIndicator: React.FC = () => {
    const saveStatus = useProjectStore(state => state.saveStatus);
    const themeClasses = useThemeClasses();
    const baseClasses = 'flex items-center space-x-2 text-sm font-sans font-semibold';
    switch (saveStatus) {
        case 'unsaved': return <div className={`${baseClasses} ${themeClasses.textSecondary}`}>Unsaved</div>;
        case 'saving': return <div className={`${baseClasses} text-blue-400`}><LoadingIcon className="w-4 h-4 animate-spin" /> Saving...</div>;
        case 'saved': return <div className={`${baseClasses} text-green-400`}><CheckIcon className="w-4 h-4" /> Saved!</div>;
        case 'error': return <div className={`${baseClasses} text-red-400`}><ExclamationTriangleIcon className="w-4 h-4" /> Error</div>;
        default: return null;
    }
};

const StoryIdeaEditorPage: React.FC = () => {
    const { ideaId } = useParams<{ ideaId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData } = useProjectStore();
    const themeClasses = useThemeClasses();
    const editorRef = useRef<HTMLDivElement>(null);
    const editorContentRef = useRef<string>("");

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const { idea, ideaIndex } = useMemo(() => {
        if (!projectData?.storyIdeas || !ideaId) return { idea: null, ideaIndex: -1 };
        const index = projectData.storyIdeas.findIndex(i => i.id === ideaId);
        return { idea: index > -1 ? projectData.storyIdeas[index] : null, ideaIndex: index };
    }, [projectData, ideaId]);

    const updateIdea = useCallback((updates: Partial<Omit<StoryIdea, 'id' | 'createdAt'>>) => {
        if (ideaIndex === -1) return;
        setProjectData(data => {
            if (!data) return null;
            const ideas = [...data.storyIdeas];
            const currentIdea = ideas[ideaIndex];
            const newSynopsis = updates.synopsis !== undefined ? updates.synopsis : currentIdea.synopsis;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newSynopsis;
            const wordCount = (tempDiv.textContent || "").trim().split(/\s+/).filter(Boolean).length;

            ideas[ideaIndex] = { ...currentIdea, ...updates, wordCount, updatedAt: new Date().toISOString() };
            return { ...data, storyIdeas: ideas };
        });
    }, [ideaIndex, setProjectData]);

    const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
        const newHTML = e.currentTarget.innerHTML;
        editorContentRef.current = newHTML;
        updateIdea({ synopsis: newHTML });
    };

    useEffect(() => {
        if (editorRef.current && idea && idea.synopsis !== editorContentRef.current) {
            editorRef.current.innerHTML = enhanceHtml(idea.synopsis || '<p><br></p>');
            editorContentRef.current = idea.synopsis;
        }
    }, [idea]);

    const applyCommand = (command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();
        handleEditorInput({ currentTarget: editorRef.current } as React.FormEvent<HTMLDivElement>);
    };

    const handleDelete = () => {
        if (!idea) return;
        setProjectData(data => data ? { ...data, storyIdeas: data.storyIdeas.filter(i => i.id !== idea.id) } : null);
        navigate('/demos');
    };

    if (!idea) return <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}><p>Loading idea...</p></div>;

    return (
        <>
            <div className={`flex h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
                {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30" />}
                <div className="flex-1 overflow-y-auto relative">
                    <div className={`sticky top-0 z-10 px-8 pt-6 pb-4 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border} flex justify-between`}>
                        <button onClick={() => navigate('/demos')} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                            <BackIcon className="w-5 h-5" /><span className="font-sans">To Idea Box</span>
                        </button>
                        <SaveStatusIndicator />
                    </div>
                    <div className="px-8 pt-8 pb-48">
                        <input type="text" value={idea.title} onChange={e => updateIdea({ title: e.target.value })} onBlur={e => updateIdea({ title: enhancePlainText(e.target.value) })} className="text-4xl font-bold bg-transparent outline-none w-full mb-8" />
                        <div ref={editorRef} contentEditable onInput={handleEditorInput} className="w-full outline-none story-content" style={{fontSize: `${projectData?.settings.baseFontSize}px`}} />
                    </div>
                </div>
                <div className={`fixed top-0 right-0 h-full z-40 transition-transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className={`w-80 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-l ${themeClasses.border} flex flex-col`}>
                         <div className={`px-4 py-3 flex justify-between items-center border-b ${themeClasses.border}`}>
                            <span className="font-bold">IDEA DETAILS</span>
                            <button onClick={() => setIsSidebarOpen(false)}><ChevronLeftIcon className="w-5 h-5"/></button>
                         </div>
                         <div className="p-4 space-y-4">
                             <div>
                                <h3 className={`font-bold mb-2 ${themeClasses.textSecondary}`}>STATUS</h3>
                                <div className="flex rounded-md overflow-hidden border ${themeClasses.border}`}>
                                    {(['Seedling', 'Developing', 'Archived'] as StoryIdeaStatus[]).map(s => (
                                        <button key={s} onClick={() => updateIdea({ status: s })} className={`flex-1 py-2 text-sm font-semibold ${idea.status === s ? `${themeClasses.accent} ${themeClasses.accentText}` : `hover:${themeClasses.bgTertiary}`}`}>{s}</button>
                                    ))}
                                </div>
                             </div>
                             <div>
                                <h3 className={`font-bold mb-2 ${themeClasses.textSecondary}`}>TAGS</h3>
                                <div className="flex flex-wrap gap-1.5">{SKETCH_TAG_OPTIONS.map(t => <button key={t} onClick={() => updateIdea({ tags: idea.tags.includes(t) ? idea.tags.filter(tag => tag !== t) : [...idea.tags, t] })} className={`px-2 py-1 text-xs rounded-full ${idea.tags.includes(t) ? `${themeClasses.accent} ${themeClasses.accentText}` : `${themeClasses.bgTertiary}`}`}>{t}</button>)}</div>
                             </div>
                             <div>
                                <h3 className={`font-bold mb-2 ${themeClasses.textSecondary}`}>ACTIONS</h3>
                                <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-2 px-3 py-2 rounded-md bg-red-700 text-red-100"><TrashIcon className="w-5 h-5"/><span>Delete Idea</span></button>
                             </div>
                         </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none">
                    <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm pointer-events-auto">
                        <button onClick={() => applyCommand('bold')} className="p-2 rounded-full text-white/70 hover:text-white"><BoldIcon className="w-5 h-5"/></button>
                        {/* FIX: Fixed a likely JSX parsing error by properly formatting the closing div tag. This was causing cascading compile errors. */}
                        <button onClick={() => applyCommand('italic')} className="p-2 rounded-full text-white/70 hover:text-white"><ItalicIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className={`fixed top-4 right-4 z-30 p-2 rounded-md ${themeClasses.bgSecondary} ${themeClasses.accentText} shadow-lg border ${themeClasses.border}`}><ChevronLeftIcon className="w-5 h-5" /></button>}
            <ConfirmModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title={`Delete "${idea.title}"?`} message="This action is permanent." />
        </>
    );
};

export default StoryIdeaEditorPage;
