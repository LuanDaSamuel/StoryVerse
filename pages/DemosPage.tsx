import React, { useContext, useState, useMemo } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { StoryIdea } from '../types';
import { PlusIcon, TrashIcon } from '../components/Icons';
import StoryIdeaEditorModal from '../components/StoryIdeaEditorModal';
import ConfirmModal from '../components/ConfirmModal';
import { enhancePlainText } from '../constants';

const DemosPage: React.FC = () => {
    const { projectData, setProjectData, themeClasses } = useContext(ProjectContext);
    const [editingIdea, setEditingIdea] = useState<StoryIdea | 'new' | null>(null);
    const [ideaToDelete, setIdeaToDelete] = useState<StoryIdea | null>(null);

    const storyIdeas = useMemo(() => {
        return [...(projectData?.storyIdeas || [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [projectData?.storyIdeas]);

    const handleSaveIdea = (savedIdea: StoryIdea) => {
        setProjectData(currentData => {
            if (!currentData) return null;
            const ideaIndex = currentData.storyIdeas.findIndex(i => i.id === savedIdea.id);
            const updatedIdeas = [...currentData.storyIdeas];
            if (ideaIndex > -1) {
                updatedIdeas[ideaIndex] = savedIdea;
            } else {
                updatedIdeas.unshift(savedIdea);
            }
            return { ...currentData, storyIdeas: updatedIdeas };
        });
        setEditingIdea(null);
    };

    const handleDeleteIdea = () => {
        if (!ideaToDelete) return;
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedIdeas = currentData.storyIdeas.filter(i => i.id !== ideaToDelete.id);
            return { ...currentData, storyIdeas: updatedIdeas };
        });
        setIdeaToDelete(null);
    };

    const getSnippet = (html: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const text = tempDiv.textContent || '';
        if (!text.trim()) return 'No synopsis yet.';
        return text.trim().substring(0, 150) + (text.length > 150 ? '...' : '');
    };

    const statusStyles: { [key: string]: string } = {
        Seedling: 'bg-green-200 text-green-800',
        Developing: 'bg-blue-200 text-blue-800',
        Archived: 'bg-gray-300 text-gray-700',
    };

    return (
        <div className={`p-8 md:p-12 ${themeClasses.bg} h-full overflow-y-auto`}>
            <div className="flex justify-between items-center mb-8">
                <h1 className={`text-3xl font-bold ${themeClasses.text}`}>Idea Box</h1>
                <button
                    onClick={() => setEditingIdea('new')}
                    className={`flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>New Idea</span>
                </button>
            </div>

            {storyIdeas.length === 0 ? (
                <div className={`p-8 md:p-12 h-full flex flex-col items-center justify-center -mt-16`}>
                    <div className={`w-full max-w-3xl p-8 text-center rounded-lg ${themeClasses.bgSecondary}`}>
                        <h2 className={`text-2xl font-bold mb-2 ${themeClasses.accentText}`}>Your Idea Box is empty.</h2>
                        <p className={`${themeClasses.accentText} opacity-80`}>
                            Click 'New Idea' to capture your first story concept!
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {storyIdeas.map(idea => (
                        <div
                            key={idea.id}
                            className={`group relative p-5 rounded-lg flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${themeClasses.bgSecondary}`}
                            onClick={() => setEditingIdea(idea)}
                        >
                            <div className="flex-grow">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-xl ${themeClasses.accentText}`}>{enhancePlainText(idea.title) || 'Untitled Idea'}</h3>
                                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${statusStyles[idea.status]}`}>{idea.status}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 my-2">
                                    {idea.tags.map(tag => (
                                        <span key={tag} className={`px-2 py-0.5 text-xs rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>{tag}</span>
                                    ))}
                                </div>
                                <p className={`text-sm mt-3 ${themeClasses.textSecondary}`}>
                                    {getSnippet(idea.synopsis)}
                                </p>
                            </div>
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setIdeaToDelete(idea); }} className="p-2 rounded-full text-red-500 hover:bg-red-500/10"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingIdea && (
                <StoryIdeaEditorModal
                    idea={editingIdea === 'new' ? null : editingIdea}
                    onClose={() => setEditingIdea(null)}
                    onSave={handleSaveIdea}
                />
            )}
            <ConfirmModal
                isOpen={!!ideaToDelete}
                onClose={() => setIdeaToDelete(null)}
                onConfirm={handleDeleteIdea}
                title={`Delete idea "${ideaToDelete?.title}"?`}
                message="Are you sure you want to delete this story idea? This action is permanent and cannot be undone."
            />
        </div>
    );
};

export default DemosPage;