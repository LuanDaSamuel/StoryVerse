import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjectStore, useThemeClasses } from '../store/projectStore';
import { StoryIdea } from '../types';
import { PlusIcon, UploadIcon, BackIcon, TrashIcon } from '../components/Icons';
import ConfirmModal from '../components/ConfirmModal';
import { enhancePlainText } from '../constants';
import * as mammoth from 'mammoth';

const DemosPage = () => {
    const { projectData, setProjectData } = useProjectStore();
    const themeClasses = useThemeClasses();
    const navigate = useNavigate();
    const [isDocxConfirmOpen, setIsDocxConfirmOpen] = useState(false);
    const [pendingImportData, setPendingImportData] = useState<{ title: string; synopsisHtml: string; originalFilename: string } | null>(null);
    const docxInputRef = useRef<HTMLInputElement>(null);
    const [ideaToDelete, setIdeaToDelete] = useState<StoryIdea | null>(null);

    const storyIdeas = useMemo(() => {
        return [...(projectData?.storyIdeas || [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [projectData?.storyIdeas]);

    const handleNewIdea = () => {
        const now = new Date().toISOString();
        const newIdea: StoryIdea = {
            id: crypto.randomUUID(), title: 'Untitled Idea', synopsis: '<p><br></p>',
            wordCount: 0, tags: [], status: 'Seedling', createdAt: now, updatedAt: now,
        };

        setProjectData(data => data ? { ...data, storyIdeas: [newIdea, ...data.storyIdeas] } : null);
        navigate(`/idea/${newIdea.id}/edit`);
    };
    
    const handleFileSelectForDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const { value: html } = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name*='Heading 1'] => h2:fresh", "p[style-name*='Heading 2'] => h3:fresh"] });
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '').trim();
            
            let ideaTitle = file.name.replace(/\.docx$/, '');
            const firstHeading = tempDiv.querySelector('h1, h2, h3');
            if (firstHeading?.textContent) ideaTitle = firstHeading.textContent.trim();
            
            setPendingImportData({ title: ideaTitle, synopsisHtml: tempDiv.innerHTML, originalFilename: file.name });
            setIsDocxConfirmOpen(true);
        } catch (error) {
            alert(`Failed to process ${file.name}. It might be corrupted.`);
        } finally {
            e.target.value = '';
        }
    };

    const handleDocxImport = async () => {
        if (!pendingImportData) return;
        setIsDocxConfirmOpen(false);

        const now = new Date().toISOString();
        const newIdea: StoryIdea = {
            id: crypto.randomUUID(), title: pendingImportData.title, synopsis: pendingImportData.synopsisHtml,
            wordCount: 0, tags: [], status: 'Seedling', createdAt: now, updatedAt: now,
        };
        setProjectData(data => data ? { ...data, storyIdeas: [newIdea, ...data.storyIdeas] } : null);
        setPendingImportData(null);
    };

    const handleDeleteIdea = () => {
        if (!ideaToDelete) return;
        setProjectData(data => data ? { ...data, storyIdeas: data.storyIdeas.filter(i => i.id !== ideaToDelete.id) } : null);
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
        <div className={`p-4 sm:p-8 md:p-12 ${themeClasses.bg} h-full overflow-y-auto`}>
            <div className="flex justify-between items-center mb-8">
                <h1 className={`text-3xl font-bold ${themeClasses.text}`}>Idea Box</h1>
                <div className="flex items-center space-x-2">
                    <input
                        type="file" ref={docxInputRef} onChange={handleFileSelectForDocx} className="hidden"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                    <button
                        onClick={() => docxInputRef.current?.click()}
                        className={`flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-90`}
                    >
                        <UploadIcon className="w-5 h-5" />
                        <span>Import DOCX</span>
                    </button>
                    <button
                        onClick={handleNewIdea}
                        className={`flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>New Idea</span>
                    </button>
                </div>
            </div>

            {storyIdeas.length === 0 ? (
                <div className={`p-8 md:p-12 h-full flex flex-col items-center justify-center -mt-16`}>
                    <div className={`w-full max-w-3xl p-8 text-center rounded-lg ${themeClasses.bgSecondary}`}>
                        <h2 className={`text-2xl font-bold mb-2 ${themeClasses.accentText}`}>Your Idea Box is empty.</h2>
                        <p className={`${themeClasses.accentText} opacity-80`}>Click 'New Idea' to capture your first story concept.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {storyIdeas.map(idea => (
                        <div
                            key={idea.id}
                            className={`group relative p-5 rounded-lg flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${themeClasses.bgSecondary}`}
                            onClick={() => navigate(`/idea/${idea.id}/edit`)}
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
                            <button
                                onClick={(e) => { e.stopPropagation(); setIdeaToDelete(idea); }}
                                className={`absolute top-3 right-3 p-2 rounded-full text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity`}
                                aria-label={`Delete idea: ${enhancePlainText(idea.title)}`}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={isDocxConfirmOpen}
                onClose={() => setIsDocxConfirmOpen(false)}
                onConfirm={handleDocxImport}
                title={`Import from "${pendingImportData?.originalFilename}"?`}
                message={pendingImportData ? <div><p className="mb-4">This will create a new story idea with the following content:</p><div className={`p-3 rounded-lg border ${themeClasses.border} ${themeClasses.bgTertiary}`}><p className="font-semibold text-sm">TITLE</p><p className={`mb-2 ${themeClasses.accentText}`}>{enhancePlainText(pendingImportData.title)}</p><p className="font-semibold text-sm">PREVIEW</p><p className={`text-sm italic ${themeClasses.textSecondary}`}>{getSnippet(pendingImportData.synopsisHtml)}</p></div></div> : null}
            />
             <ConfirmModal
                isOpen={!!ideaToDelete}
                onClose={() => setIdeaToDelete(null)}
                onConfirm={handleDeleteIdea}
                title={`Delete "${ideaToDelete?.title}"?`}
                message="Are you sure? This action is permanent."
            />
        </div>
    );
};

export default DemosPage;