import React, { useContext, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { StoryIdea } from '../types';
import { PlusIcon, UploadIcon, BackIcon } from '../components/Icons';
import ConfirmModal from '../components/ConfirmModal';
import { enhancePlainText } from '../constants';
import * as mammoth from 'mammoth';

const DemosPage: React.FC = () => {
    const { projectData, setProjectData, themeClasses } = useContext(ProjectContext);
    const navigate = useNavigate();
    const [isDocxConfirmOpen, setIsDocxConfirmOpen] = React.useState(false);
    const [pendingFile, setPendingFile] = React.useState<File | null>(null);
    const docxInputRef = useRef<HTMLInputElement>(null);

    const storyIdeas = useMemo(() => {
        return [...(projectData?.storyIdeas || [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [projectData?.storyIdeas]);

    const handleNewIdea = () => {
        const now = new Date().toISOString();
        const newIdea: StoryIdea = {
            id: crypto.randomUUID(),
            title: 'Untitled Idea',
            synopsis: '<p><br></p>',
            wordCount: 0,
            tags: [],
            status: 'Seedling',
            createdAt: now,
            updatedAt: now,
        };

        setProjectData(currentData => {
            if (!currentData) return null;
            return {
                ...currentData,
                storyIdeas: [newIdea, ...(currentData.storyIdeas || [])],
            };
        });

        navigate(`/idea/${newIdea.id}/edit`);
    };
    
    const handleFileSelectForDocx = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPendingFile(file);
            setIsDocxConfirmOpen(true);
        }
        e.target.value = ''; // Reset file input
    };

    const handleDocxImport = async () => {
        if (!pendingFile) return;
        setIsDocxConfirmOpen(false);

        try {
            const arrayBuffer = await pendingFile.arrayBuffer();
            const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
            
            // Clean the HTML by removing empty paragraphs which can mess with styling.
            const cleanedHtml = html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');

            const now = new Date().toISOString();
            const newIdea: StoryIdea = {
                id: crypto.randomUUID(),
                title: pendingFile.name.replace(/\.docx$/, ''),
                synopsis: cleanedHtml,
                wordCount: 0, // Will be calculated in editor
                tags: [],
                status: 'Seedling',
                createdAt: now,
                updatedAt: now,
            };

            setProjectData(currentData => {
                if (!currentData) return null;
                return {
                    ...currentData,
                    storyIdeas: [newIdea, ...currentData.storyIdeas],
                };
            });

        } catch (error) {
            console.error(`Error processing file ${pendingFile.name}:`, error);
            alert(`Failed to process ${pendingFile.name}. It might be corrupted or not a valid .docx file.`);
        } finally {
            setPendingFile(null);
        }
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
                <div className="flex items-center space-x-2">
                    <input
                        type="file"
                        ref={docxInputRef}
                        onChange={handleFileSelectForDocx}
                        className="hidden"
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
                        <p className={`${themeClasses.accentText} opacity-80 mb-6`}>
                            Click 'New Idea' to capture your first story concept, or import an idea from a DOCX file.
                        </p>
                        <Link to="/" className={`inline-flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}>
                            <BackIcon className="w-5 h-5" />
                            <span>Go to Home page</span>
                        </Link>
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
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={isDocxConfirmOpen}
                onClose={() => { setIsDocxConfirmOpen(false); setPendingFile(null); }}
                onConfirm={handleDocxImport}
                title={`Import "${pendingFile?.name}"?`}
                message="This will create a new story idea from the selected DOCX file. The filename will be used as the title."
                confirmButtonClass={`px-6 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
            />
        </div>
    );
};

export default DemosPage;