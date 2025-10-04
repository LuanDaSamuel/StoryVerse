import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectStore, useThemeClasses } from '../store/projectStore';
import { BackIcon, ChevronLeftIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, TrashIcon, H1Icon, H2Icon, H3Icon, SearchIcon, LoadingIcon, CheckIcon, ExclamationTriangleIcon, CloseIcon } from '../components/Icons';
import { enhanceHtml, enhancePlainText, SKETCH_TAG_OPTIONS } from '../constants';
import { NovelSketch } from '../types';
import ConfirmModal from '../components/ConfirmModal';

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

const SketchEditorPage: React.FC = () => {
    const { novelId, sketchId } = useParams<{ novelId: string; sketchId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData } = useProjectStore();
    const themeClasses = useThemeClasses();
    const editorRef = useRef<HTMLDivElement>(null);
    const editorContentRef = useRef<string>("");

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const { novel, sketch, novelIndex, sketchIndex } = useMemo(() => {
        if (!projectData || !novelId || !sketchId) return { novel: null, sketch: null, novelIndex: -1, sketchIndex: -1 };
        const nIndex = projectData.novels.findIndex(n => n.id === novelId);
        if (nIndex === -1) return { novel: null, sketch: null, novelIndex: -1, sketchIndex: -1 };
        const sIndex = projectData.novels[nIndex].sketches.findIndex(s => s.id === sketchId);
        if (sIndex === -1) return { novel: projectData.novels[nIndex], sketch: null, novelIndex: nIndex, sketchIndex: -1 };
        return { novel: projectData.novels[nIndex], sketch: projectData.novels[nIndex].sketches[sIndex], novelIndex: nIndex, sketchIndex: sIndex };
    }, [projectData, novelId, sketchId]);

    const updateSketch = useCallback((updates: Partial<Omit<NovelSketch, 'id' | 'createdAt'>>) => {
        if (novelIndex === -1 || sketchIndex === -1) return;
        setProjectData(data => {
            if (!data) return null;
            const novels = [...data.novels];
            const novelToUpdate = { ...novels[novelIndex] };
            const sketches = [...novelToUpdate.sketches];
            sketches[sketchIndex] = { ...sketches[sketchIndex], ...updates, updatedAt: new Date().toISOString() };
            novelToUpdate.sketches = sketches;
            novels[novelIndex] = novelToUpdate;
            return { ...data, novels };
        });
    }, [novelIndex, sketchIndex, setProjectData]);

    const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
        const newHTML = e.currentTarget.innerHTML;
        editorContentRef.current = newHTML;
        updateSketch({ content: newHTML });
    };

    useEffect(() => {
        if (editorRef.current && sketch && sketch.content !== editorContentRef.current) {
            const initialContent = sketch.content || '<p><br></p>';
            editorRef.current.innerHTML = enhanceHtml(initialContent);
            editorContentRef.current = initialContent;
        }
    }, [sketch]);

    const applyCommand = (command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();
        handleEditorInput({ currentTarget: editorRef.current } as React.FormEvent<HTMLDivElement>);
    };

    const handleDelete = () => {
        if (!sketch) return;
        setProjectData(data => {
            if (!data) return null;
            const novels = [...data.novels];
            const novelToUpdate = { ...novels[novelIndex] };
            novelToUpdate.sketches = novelToUpdate.sketches.filter(s => s.id !== sketch.id);
            novels[novelIndex] = novelToUpdate;
            return { ...data, novels };
        });
        navigate('/sketches');
    };

    if (!sketch || !novel) return <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}><p>Loading sketch...</p></div>;
    
    return (
        <>
            <div className={`flex h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
                {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30" />}
                <div className="flex-1 overflow-y-auto relative">
                    <div className={`sticky top-0 z-10 px-8 md:px-16 pt-6 pb-4 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border} flex justify-between`}>
                        <button onClick={() => navigate('/sketches')} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                            <BackIcon className="w-5 h-5" /><span className="font-sans">To Sketches</span>
                        </button>
                        <SaveStatusIndicator />
                    </div>
                    <div className="px-8 md:px-16 pt-8 pb-48">
                        <input type="text" value={sketch.title} onChange={e => updateSketch({ title: e.target.value })} onBlur={e => updateSketch({ title: enhancePlainText(e.target.value)})} className="text-4xl font-bold bg-transparent outline-none w-full mb-8" />
                        <div ref={editorRef} contentEditable onInput={handleEditorInput} className="w-full outline-none story-content" style={{fontSize: `${projectData?.settings.baseFontSize}px`}} />
                    </div>
                </div>
                <div className={`fixed top-0 right-0 h-full z-40 transition-transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className={`w-80 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-l ${themeClasses.border} flex flex-col`}>
                        <div className={`px-4 py-3 flex justify-between items-center border-b ${themeClasses.border}`}>
                            <span className="font-bold text-base">SKETCH DETAILS</span>
                            <button onClick={() => setIsSidebarOpen(false)}><ChevronLeftIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <h3 className={`font-bold mb-2 ${themeClasses.textSecondary}`}>TAGS</h3>
                                <div className="flex flex-wrap gap-1.5">{SKETCH_TAG_OPTIONS.map(t => <button key={t} onClick={() => updateSketch({ tags: sketch.tags.includes(t) ? sketch.tags.filter(tag => tag !== t) : [...sketch.tags, t]})} className={`px-2 py-1 text-xs rounded-full ${sketch.tags.includes(t) ? `${themeClasses.accent} ${themeClasses.accentText}` : `${themeClasses.bgTertiary}`}`}>{t}</button>)}</div>
                            </div>
                             <div>
                                <h3 className={`font-bold mb-2 ${themeClasses.textSecondary}`}>ACTIONS</h3>
                                <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-2 px-3 py-2 rounded-md bg-red-700 text-red-100"><TrashIcon className="w-5 h-5"/><span>Delete Sketch</span></button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none">
                    <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm pointer-events-auto">
                        <button onClick={() => applyCommand('bold')} className="p-2 rounded-full text-white/70 hover:text-white"><BoldIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyCommand('italic')} className="p-2 rounded-full text-white/70 hover:text-white"><ItalicIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className={`fixed top-4 right-4 z-30 p-2 rounded-md ${themeClasses.bgSecondary} ${themeClasses.accentText} shadow-lg border ${themeClasses.border}`}><ChevronLeftIcon className="w-5 h-5" /></button>}
            <ConfirmModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title={`Delete "${sketch.title}"?`} message="This action is permanent." />
        </>
    );
};

export default SketchEditorPage;