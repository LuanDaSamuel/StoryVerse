import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProjectStore, useThemeClasses } from '../store/projectStore';
import { TAG_OPTIONS, enhancePlainText } from '../constants';
import { Novel, Chapter } from '../types';
import { BackIcon, BookOpenIcon, DownloadIcon, TrashIcon, PlusIcon, TextIcon } from '../components/Icons';
import ConfirmModal from '../components/ConfirmModal';
import NovelHistoryPage from '../components/NovelHistoryPage';
import ExportModal from '../components/ExportModal';
import * as mammoth from 'mammoth';

const NovelDetailPage: React.FC = () => {
    const { novelId } = useParams<{ novelId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, downloadProject } = useProjectStore();
    const themeClasses = useThemeClasses();
    
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
    const [activeTab, setActiveTab] = useState<'Details' | 'History'>('Details');

    const { novel, novelIndex } = useMemo(() => {
        const novels = projectData?.novels;
        if (!novels || !novelId) return { novel: null, novelIndex: -1 };
        const index = novels.findIndex(n => n.id === novelId);
        return { novel: index > -1 ? novels[index] : null, novelIndex: index };
    }, [projectData, novelId]);

    const updateNovel = (updates: Partial<Novel>) => {
        if (novelIndex === -1) return;
        setProjectData(data => {
            if (!data) return null;
            const novels = [...data.novels];
            novels[novelIndex] = { ...novels[novelIndex], ...updates };
            return { ...data, novels };
        });
    };

    useEffect(() => {
        // Recalculate word counts on load if missing
        if (novel && novel.chapters.some(c => !c.wordCount)) {
            const tempDiv = document.createElement('div');
            const updatedChapters = novel.chapters.map(c => {
                if (!c.wordCount) {
                    tempDiv.innerHTML = c.content;
                    const wordCount = (tempDiv.textContent || "").trim().split(/\s+/).filter(Boolean).length;
                    return { ...c, wordCount };
                }
                return c;
            });
            updateNovel({ chapters: updatedChapters });
        }
    }, [novel]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!novel) return <div className={`flex items-center justify-center h-screen ${themeClasses.bg}`}>Novel not found.</div>;

    const handleAddChapter = () => {
        const newChapterId = crypto.randomUUID();
        const now = new Date().toISOString();
        const newChapter: Chapter = { id: newChapterId, title: `Chapter ${novel.chapters.length + 1}`, content: '', wordCount: 0, createdAt: now, updatedAt: now, history: [] };
        updateNovel({ chapters: [...novel.chapters, newChapter] });
        navigate(`/novel/${novelId}/edit/${newChapterId}`);
    };

    const handleDeleteChapter = () => {
        if (!chapterToDelete) return;
        updateNovel({ chapters: novel.chapters.filter(c => c.id !== chapterToDelete.id) });
        setChapterToDelete(null);
    };

    const confirmDeleteNovel = () => {
        setProjectData(data => data ? { ...data, novels: data.novels.filter(n => n.id !== novelId) } : null);
        navigate('/');
    };
    
    return (
        <div className={`p-4 sm:p-8 md:p-12 ${themeClasses.bg} min-h-screen overflow-y-auto`}>
            <button onClick={() => navigate('/')} className={`flex items-center space-x-2 mb-8 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                <BackIcon className="w-5 h-5" />
                <span>Back to Home page</span>
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <div className={`p-6 rounded-lg ${themeClasses.bgSecondary}`}>
                         <h2 className={`text-xl font-bold mb-4 ${themeClasses.accentText}`}>Actions</h2>
                         <div className="space-y-3">
                            <button onClick={() => navigate(`/novel/${novelId}/read`)} disabled={novel.chapters.length === 0} className={`w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80 disabled:opacity-50`}>
                                <BookOpenIcon className="w-5 h-5"/><span>Read Novel</span>
                            </button>
                            <button onClick={() => setIsExportModalOpen(true)} className={`w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}>
                                <DownloadIcon className="w-5 h-5"/><span>Export Novel</span>
                            </button>
                            <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold bg-red-700 text-red-100 hover:bg-red-800">
                                <TrashIcon className="w-5 h-5"/><span>Delete Story</span>
                            </button>
                         </div>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-8">
                    <div className={`p-6 rounded-lg ${themeClasses.bgSecondary}`}>
                        <input type="text" value={novel.title} onChange={(e) => updateNovel({ title: e.target.value })} onBlur={(e) => updateNovel({ title: enhancePlainText(e.target.value)})} placeholder="Novel Title" className={`text-5xl font-bold bg-transparent outline-none w-full ${themeClasses.accentText}`} />
                        <textarea value={novel.description} onChange={(e) => updateNovel({ description: e.target.value })} onBlur={(e) => updateNovel({ description: enhancePlainText(e.target.value) })} placeholder="A short, captivating description..." className={`text-lg mt-1 bg-transparent outline-none w-full resize-none min-h-[7rem] ${themeClasses.textSecondary}`} />
                    </div>
                    <div className={`rounded-lg ${themeClasses.bgSecondary}`}>
                        <div className="p-6">
                            <h3 className={`font-bold mb-4 ${themeClasses.accentText}`}>Chapters</h3>
                            <button onClick={handleAddChapter} className={`w-full flex items-center justify-center space-x-2 p-4 rounded-lg border-2 border-dashed ${themeClasses.border} ${themeClasses.textSecondary} hover:border-opacity-70 mb-4`}>
                                <PlusIcon className="w-5 h-5"/><span>Add New Chapter</span>
                            </button>
                            <div className="space-y-3">
                                {novel.chapters.map((chapter) => (
                                     <div key={chapter.id} className={`group flex items-center justify-between p-4 rounded-lg ${themeClasses.bgTertiary}`}>
                                        <Link to={`/novel/${novelId}/edit/${chapter.id}`} className="flex-grow pr-4">
                                            <p className={`${themeClasses.accentText} font-semibold`}>{enhancePlainText(chapter.title || `Untitled`)}</p>
                                            <div className={`flex items-center space-x-2 text-sm ${themeClasses.textSecondary}`}><TextIcon className="w-4 h-4" /><span>{chapter.wordCount.toLocaleString()} words</span></div>
                                        </Link>
                                        <button onClick={() => setChapterToDelete(chapter)} className={`flex-shrink-0 p-2 -mr-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10`}><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} novel={novel} />
            <ConfirmModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={confirmDeleteNovel} title={`Delete "${novel.title}"?`} message="This will permanently delete the entire novel. This action cannot be undone." />
            <ConfirmModal isOpen={!!chapterToDelete} onClose={() => setChapterToDelete(null)} onConfirm={handleDeleteChapter} title={`Delete chapter "${chapterToDelete?.title}"?`} message="This cannot be undone." />
        </div>
    );
};

export default NovelDetailPage;