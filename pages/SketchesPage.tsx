import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { NovelSketch, AggregatedSketch } from '../types';
import { enhancePlainText } from '../constants';
import { PlusIcon } from '../components/Icons';
import ConfirmModal from '../components/ConfirmModal';
import SelectNovelModal from '../components/SelectNovelModal';

const SketchesPage: React.FC = () => {
    const { projectData, setProjectData, themeClasses } = useContext(ProjectContext);
    const navigate = useNavigate();
    
    const [isCreatingSketch, setIsCreatingSketch] = useState(false);
    const [sketchToDelete, setSketchToDelete] = useState<AggregatedSketch | null>(null);

    const novels = useMemo(() => projectData?.novels || [], [projectData]);
    
    const allSketches: AggregatedSketch[] = useMemo(() => {
        return novels.flatMap(novel => 
            novel.sketches.map(sketch => ({
                ...sketch,
                novelId: novel.id,
                novelTitle: novel.title
            }))
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [novels]);

    const novelsForDropdown = useMemo(() => novels.map(n => ({ id: n.id, title: n.title })), [novels]);

    const handleCreateSketch = (selectedNovelId: string) => {
        if (!selectedNovelId) return;
    
        const now = new Date().toISOString();
        const newSketch: NovelSketch = {
            id: crypto.randomUUID(),
            title: 'Untitled Sketch',
            content: '<p><br></p>',
            tags: [],
            createdAt: now,
            updatedAt: now,
        };
    
        setProjectData(currentData => {
            if (!currentData) return null;
            const novelIndex = currentData.novels.findIndex(n => n.id === selectedNovelId);
            if (novelIndex === -1) return currentData;
    
            const updatedNovels = [...currentData.novels];
            const novelToUpdate = { ...updatedNovels[novelIndex] };
            
            novelToUpdate.sketches = [newSketch, ...novelToUpdate.sketches];
            updatedNovels[novelIndex] = novelToUpdate;
            
            return { ...currentData, novels: updatedNovels };
        });
    
        setIsCreatingSketch(false);
        navigate(`/novel/${selectedNovelId}/sketch/${newSketch.id}/edit`);
    };

    const handleDeleteSketch = () => {
        if (!sketchToDelete) return;
        setProjectData(currentData => {
            if (!currentData) return null;
            const novelIndex = currentData.novels.findIndex(n => n.id === sketchToDelete.novelId);
            if (novelIndex === -1) return currentData;

            const updatedNovels = [...currentData.novels];
            const currentNovel = { ...updatedNovels[novelIndex] };
            currentNovel.sketches = currentNovel.sketches.filter(s => s.id !== sketchToDelete.id);
            updatedNovels[novelIndex] = currentNovel;
            return { ...currentData, novels: updatedNovels };
        });
        setSketchToDelete(null);
    };
    
    const getSnippet = (html: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const text = tempDiv.textContent || '';
        if (!text.trim()) return 'Empty sketch.';
        return text.trim().substring(0, 100) + (text.length > 100 ? '...' : '');
    };

    return (
        <div className={`p-8 md:p-12 ${themeClasses.bg} h-full overflow-y-auto`}>
            <div className="flex justify-between items-center mb-8">
                <h1 className={`text-3xl font-bold ${themeClasses.text}`}>Sketches</h1>
                <button 
                    onClick={() => setIsCreatingSketch(true)} 
                    className={`flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90 disabled:opacity-50`}
                    disabled={novels.length === 0}
                    title={novels.length === 0 ? "You must create a novel first" : "Create a new sketch"}
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>New Sketch</span>
                </button>
            </div>
            
            {allSketches.length === 0 ? (
                 <div className={`p-8 md:p-12 h-full flex flex-col items-center justify-center -mt-16`}>
                    <div className={`w-full max-w-3xl p-8 text-center rounded-lg ${themeClasses.bgSecondary}`}>
                        <h2 className={`text-2xl font-bold mb-2 ${themeClasses.accentText}`}>You don't have any sketches yet.</h2>
                        <p className={`${themeClasses.accentText} opacity-80`}>
                            {novels.length === 0 ? "Create a novel to start adding sketches." : "Click 'New Sketch' to capture your first idea!"}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allSketches.map(sketch => (
                        <div 
                            key={sketch.id} 
                            className={`group relative p-4 rounded-lg flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${themeClasses.bgSecondary}`}
                            onClick={() => navigate(`/novel/${sketch.novelId}/sketch/${sketch.id}/edit`)}
                        >
                            <div className="flex-grow">
                                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${themeClasses.textSecondary}`}>{enhancePlainText(sketch.novelTitle)}</p>
                                <h3 className={`font-bold text-xl mb-2 ${themeClasses.accentText}`}>{enhancePlainText(sketch.title) || 'Untitled Sketch'}</h3>
                                <div className="flex flex-wrap gap-1.5 my-2">
                                    {sketch.tags.map(tag => (
                                        <span key={tag} className={`px-2 py-0.5 text-xs rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>{tag}</span>
                                    ))}
                                </div>
                                <p className={`text-sm mt-3 ${themeClasses.textSecondary}`}>
                                    {getSnippet(sketch.content)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <SelectNovelModal
                isOpen={isCreatingSketch}
                onClose={() => setIsCreatingSketch(false)}
                onConfirm={handleCreateSketch}
                novels={novelsForDropdown}
            />
            <ConfirmModal
                isOpen={!!sketchToDelete}
                onClose={() => setSketchToDelete(null)}
                onConfirm={handleDeleteSketch}
                title={`Delete sketch "${sketchToDelete?.title}"?`}
                message="Are you sure you want to delete this sketch? This action is permanent and cannot be undone."
            />
        </div>
    );
};

export default SketchesPage;