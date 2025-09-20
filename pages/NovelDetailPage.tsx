import React, { useState, useContext, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { TAG_OPTIONS, enhancePlainText, enhanceHtml } from '../constants';
import { Novel, Chapter } from '../types';
import { BackIcon, BookOpenIcon, DownloadIcon, TrashIcon, UploadIcon, PlusIcon, TextIcon } from '../components/Icons';
import ConfirmModal from '../components/ConfirmModal';
import NovelHistoryPage from '../components/NovelHistoryPage';
import ExportModal from '../components/ExportModal';
import * as mammoth from 'mammoth';

const NovelDetailPage: React.FC = () => {
    const { novelId } = useParams<{ novelId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, themeClasses } = useContext(ProjectContext);
    const coverImageInputRef = useRef<HTMLInputElement>(null);
    const docxInputRef = useRef<HTMLInputElement>(null);
    const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
    const [activeTab, setActiveTab] = useState<'Details' | 'History'>('Details');
    const [isDocxConfirmOpen, setIsDocxConfirmOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);

    const { novel, novelIndex } = useMemo(() => {
        const novels = projectData?.novels;
        if (!novels || !novelId) {
            return { novel: null, novelIndex: -1 };
        }
        const index = novels.findIndex(n => n.id === novelId);
        return {
            novel: index > -1 ? novels[index] : null,
            novelIndex: index,
        };
    }, [projectData, novelId]);
    
    const [editableTitle, setEditableTitle] = useState(novel?.title || '');
    const [editableDescription, setEditableDescription] = useState(novel?.description || '');
    const saveTimeout = useRef<number | null>(null);

    // Sync local state when the novel ID changes to handle navigation between different novels.
    useEffect(() => {
        if (novel) {
            setEditableTitle(novel.title);
            setEditableDescription(novel.description);
        }
    }, [novel?.id]);

    // Debounced save effect for title and description
    useEffect(() => {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);

        saveTimeout.current = window.setTimeout(() => {
            if (novelIndex === -1 || !projectData) return;

            const currentNovelInState = projectData.novels[novelIndex];
            if (currentNovelInState.title !== editableTitle || currentNovelInState.description !== editableDescription) {
                 setProjectData(currentData => {
                    if (!currentData || !currentData.novels[novelIndex]) return currentData;
                    const updatedNovels = [...currentData.novels];
                    updatedNovels[novelIndex] = {
                        ...updatedNovels[novelIndex],
                        title: editableTitle,
                        description: editableDescription,
                    };
                    return { ...currentData, novels: updatedNovels };
                });
            }
        }, 1000);

        return () => {
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
        };
    }, [editableTitle, editableDescription, novelIndex, projectData, setProjectData]);

    // Auto-resize the description textarea to fit its content.
    useEffect(() => {
        if (descriptionTextareaRef.current) {
            const textarea = descriptionTextareaRef.current;
            textarea.style.height = 'auto'; // Reset height to allow shrinking
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [editableDescription]);
    
    useEffect(() => {
        if (novelIndex === -1) return;

        let needsUpdate = false;
        const tempDiv = document.createElement('div');

        setProjectData(currentData => {
            if (!currentData) return null;
            const currentNovel = currentData.novels[novelIndex];
            if (!currentNovel) return currentData;

            const updatedChapters = currentNovel.chapters.map(chapter => {
                if (chapter.content && (!chapter.wordCount || chapter.wordCount === 0)) {
                    tempDiv.innerHTML = chapter.content;
                    const text = tempDiv.textContent || "";
                    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
                    if (wordCount > 0) {
                        needsUpdate = true;
                        return { ...chapter, wordCount };
                    }
                }
                return chapter;
            });

            if (needsUpdate) {
                const updatedNovels = [...currentData.novels];
                updatedNovels[novelIndex] = { ...currentNovel, chapters: updatedChapters };
                return { ...currentData, novels: updatedNovels };
            }

            return currentData;
        });
    }, [novelIndex, setProjectData]);

    const handleFileSelectForDocx = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setPendingFiles(files);
            setIsDocxConfirmOpen(true);
        }
        e.target.value = ''; // Reset file input to allow selecting same file(s) again
    };

    const handleDocxImport = async () => {
        if (!pendingFiles || novelIndex === -1) return;
        setIsDocxConfirmOpen(false);

        const sortedFiles = Array.from(pendingFiles).sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );

        let allNewChapters: Chapter[] = [];

        const styleMap = [
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Heading 1'] => h2:fresh",
            "p[style-name='Heading 2'] => h3:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
        ];

        for (const file of sortedFiles) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const { value: html } = await mammoth.convertToHtml({ arrayBuffer }, { styleMap });
                
                // Clean the HTML by removing empty paragraphs which can mess with styling.
                const cleanedHtml = html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');

                const headingRegex = /<h[123][^>]*>.*?<\/h[123]>/g;
                const matches = [...cleanedHtml.matchAll(headingRegex)];

                if (matches.length === 0) {
                    // No headings found, treat the whole file as one chapter
                    const now = new Date().toISOString();
                    allNewChapters.push({
                        id: crypto.randomUUID(),
                        title: file.name.replace(/\.docx$/, ''),
                        content: cleanedHtml,
                        wordCount: 0,
                        createdAt: now,
                        updatedAt: now,
                        history: [],
                    });
                } else {
                    // Headings found, split into chapters
                    let lastIndex = 0;
                    // Handle content before the first heading
                    if (matches[0].index && matches[0].index > 0) {
                        const preContent = cleanedHtml.substring(0, matches[0].index).trim();
                        if (preContent) {
                            const now = new Date().toISOString();
                            allNewChapters.push({
                                id: crypto.randomUUID(),
                                title: 'Prologue',
                                content: preContent,
                                wordCount: 0,
                                createdAt: now,
                                updatedAt: now,
                                history: [],
                            });
                        }
                    }

                    matches.forEach((match, i) => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = match[0];
                        const chapterTitle = tempDiv.textContent?.trim() || `Chapter ${allNewChapters.length + 1}`;
                        
                        const startIndex = match.index || 0;
                        const endIndex = (i + 1 < matches.length) ? (matches[i + 1].index || cleanedHtml.length) : cleanedHtml.length;
                        const content = cleanedHtml.substring(startIndex, endIndex);

                        const now = new Date().toISOString();
                        allNewChapters.push({
                            id: crypto.randomUUID(),
                            title: chapterTitle,
                            content: content.trim(),
                            wordCount: 0,
                            createdAt: now,
                            updatedAt: now,
                            history: [],
                        });
                    });
                }
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
                alert(`Failed to process ${file.name}. It might be corrupted or not a valid .docx file.`);
            }
        }

        if (allNewChapters.length > 0) {
            const tempDiv = document.createElement('div');
            allNewChapters.forEach(chapter => {
                tempDiv.innerHTML = chapter.content;
                const text = tempDiv.textContent || "";
                chapter.wordCount = text.trim().split(/\s+/).filter(Boolean).length;
            });

            setProjectData(currentData => {
                if (!currentData) return null;
                const updatedNovels = [...currentData.novels];
                if (novelIndex >= updatedNovels.length) return currentData;
                const currentNovel = updatedNovels[novelIndex];
                
                // Replace all existing chapters with the newly imported ones
                const updatedNovel = { ...currentNovel, chapters: allNewChapters };
                updatedNovels[novelIndex] = updatedNovel;

                return { ...currentData, novels: updatedNovels };
            });
        }

        setPendingFiles(null);
    };

    if (!projectData || !novel) {
        return (
            <div className={`flex items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                Novel not found.
            </div>
        );
    }
    
    const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && novelIndex !== -1) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProjectData(currentData => {
                    if (!currentData) return null;
                    const updatedNovels = [...currentData.novels];
                    if (novelIndex >= updatedNovels.length) return currentData;
                    updatedNovels[novelIndex].coverImage = reader.result as string;
                    return { ...currentData, novels: updatedNovels };
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTagClick = (tag: string) => {
        if (novelIndex === -1) return;
        
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedNovels = [...currentData.novels];
            if (novelIndex >= updatedNovels.length) return currentData;
            
            const currentNovel = updatedNovels[novelIndex];
            const currentTags = currentNovel.tags;
            let newTags;

            if (currentTags.includes(tag)) {
                newTags = currentTags.filter(t => t !== tag);
            } else if (currentTags.length < 6) {
                newTags = [...currentTags, tag];
            } else {
                return currentData; // No change
            }
            
            updatedNovels[novelIndex] = { ...currentNovel, tags: newTags };
            return { ...currentData, novels: updatedNovels };
        });
    };

    const confirmDeleteNovel = () => {
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedNovels = currentData.novels.filter(n => n.id !== novelId);
            return { ...currentData, novels: updatedNovels };
        });
        navigate('/');
    };

    const handleAddChapter = () => {
        if (novelIndex === -1) return;
        
        const newChapterId = crypto.randomUUID();
        const now = new Date().toISOString();
        const newChapter: Chapter = {
            id: newChapterId,
            title: `Chapter ${novel.chapters.length + 1}`,
            content: '',
            wordCount: 0,
            createdAt: now,
            updatedAt: now,
            history: [],
        };

        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedNovels = [...currentData.novels];
            if (novelIndex >= updatedNovels.length) return currentData;
            updatedNovels[novelIndex].chapters.push(newChapter);
            return { ...currentData, novels: updatedNovels };
        });
        
        navigate(`/novel/${novelId}/edit/${newChapterId}`);
    };

    const handleDeleteChapter = () => {
        if (!chapterToDelete || novelIndex === -1) return;
        
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedNovels = [...currentData.novels];
            if (novelIndex >= updatedNovels.length) return currentData;
            const currentNovel = updatedNovels[novelIndex];
            const updatedChapters = currentNovel.chapters.filter(c => c.id !== chapterToDelete.id);
            updatedNovels[novelIndex] = { ...currentNovel, chapters: updatedChapters };
            return { ...currentData, novels: updatedNovels };
        });

        setChapterToDelete(null);
    };

    const renderTabContent = () => {
        if (activeTab === 'History') {
            return <NovelHistoryPage novel={novel} />;
        }

        return (
            <>
                <div className="pt-4">
                    <h3 className={`font-bold mb-4 ${themeClasses.accentText}`}>Tags (up to 6)</h3>
                    <div className="flex flex-wrap gap-2">
                        {TAG_OPTIONS.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleTagClick(tag)}
                                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                    novel.tags.includes(tag)
                                        ? `${themeClasses.accent} ${themeClasses.accentText}`
                                        : `${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`p-6 -m-6 mt-8 rounded-lg ${themeClasses.bgSecondary}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className={`text-xl font-bold ${themeClasses.accentText}`}>Chapters</h2>
                        <input
                            type="file"
                            ref={docxInputRef}
                            onChange={handleFileSelectForDocx}
                            className="hidden"
                            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            multiple
                        />
                        <button
                            onClick={() => docxInputRef.current?.click()}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}
                        >
                            Import from DOCX
                        </button>
                    </div>
                    
                    <button onClick={handleAddChapter} className={`w-full flex items-center justify-center space-x-2 p-4 rounded-lg border-2 border-dashed transition-colors ${themeClasses.border} ${themeClasses.textSecondary} hover:border-opacity-70 hover:text-opacity-70 mb-4`}>
                        <PlusIcon className="w-5 h-5"/>
                        <span>Add New Chapter</span>
                    </button>
                    
                    <div className="space-y-3">
                        {novel.chapters.map((chapter) => (
                             <div
                                key={chapter.id}
                                className={`group flex items-center justify-between p-4 rounded-lg transition-colors ${themeClasses.bgTertiary}`}
                            >
                                <Link to={`/novel/${novelId}/edit/${chapter.id}`} className="flex-grow pr-4">
                                    <div>
                                        <p className={`${themeClasses.accentText} font-semibold`}>
                                            {enhancePlainText(chapter.title || `Untitled Chapter`)}
                                        </p>
                                        <div className={`flex items-center space-x-2 text-sm ${themeClasses.textSecondary}`}>
                                            <TextIcon className="w-4 h-4" />
                                            <span>{(chapter.wordCount || 0).toLocaleString()} words</span>
                                        </div>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => setChapterToDelete(chapter)}
                                    className={`flex-shrink-0 p-2 -mr-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10`}
                                    aria-label={`Delete chapter ${chapter.title}`}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className={`p-4 sm:p-8 md:p-12 ${themeClasses.bg} min-h-screen overflow-y-auto`}>
            <button onClick={() => navigate('/')} className={`flex items-center space-x-2 mb-8 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                <BackIcon className="w-5 h-5" />
                <span>Back to Home page</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-8">
                    <div className={`p-6 rounded-lg ${themeClasses.bgSecondary}`}>
                        <h2 className={`text-xl font-bold mb-4 ${themeClasses.accentText}`}>Cover Image</h2>
                        <div className="relative w-full aspect-[3/4]">
                            {novel.coverImage ? (
                                <img src={novel.coverImage} alt="Cover" className="w-full h-full object-cover rounded-md" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center rounded-md ${themeClasses.bgTertiary}`}>
                                    <span className={themeClasses.textSecondary}>No Cover</span>
                                </div>
                            )}
                        </div>
                         <input type="file" ref={coverImageInputRef} onChange={handleCoverImageChange} className="hidden" accept="image/*" />
                        <button onClick={() => coverImageInputRef.current?.click()} className={`w-full mt-4 py-2 px-4 rounded-lg font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}>
                            Upload File
                        </button>
                    </div>

                    <div className={`p-6 rounded-lg ${themeClasses.bgSecondary}`}>
                         <h2 className={`text-xl font-bold mb-4 ${themeClasses.accentText}`}>Actions</h2>
                         <div className="space-y-3">
                            <button 
                                onClick={() => navigate(`/novel/${novelId}/read`)} 
                                disabled={novel.chapters.length === 0}
                                className={`w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <BookOpenIcon className="w-5 h-5"/>
                                <span>Read Novel</span>
                            </button>
                            <button 
                                onClick={() => setIsExportModalOpen(true)} 
                                className={`w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}
                            >
                                <DownloadIcon className="w-5 h-5"/>
                                <span>Export Novel</span>
                            </button>
                            <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold transition-colors bg-red-700 text-red-100 hover:bg-red-800">
                                <TrashIcon className="w-5 h-5"/>
                                <span>Delete Story</span>
                            </button>
                         </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-8">
                    <div className={`p-6 rounded-lg ${themeClasses.bgSecondary}`}>
                        <input
                            type="text"
                            value={editableTitle}
                            onChange={(e) => setEditableTitle(e.target.value)}
                            onBlur={() => {
                                const enhanced = enhancePlainText(editableTitle);
                                if (enhanced !== editableTitle) {
                                    setEditableTitle(enhanced);
                                }
                            }}
                            placeholder="Novel Title"
                            className={`text-5xl font-bold bg-transparent outline-none w-full ${themeClasses.accentText}`}
                        />
                        <textarea
                            ref={descriptionTextareaRef}
                            value={editableDescription}
                            onChange={(e) => {
                                setEditableDescription(e.target.value);
                            }}
                            onBlur={() => {
                                const enhanced = enhancePlainText(editableDescription);
                                if (enhanced !== editableDescription) {
                                    setEditableDescription(enhanced);
                                }
                            }}
                            placeholder="A short, captivating description of your novel..."
                            className={`text-lg mt-1 bg-transparent outline-none w-full resize-none min-h-[7rem] ${themeClasses.textSecondary}`}
                        />
                    </div>
                    <div className={`rounded-lg ${themeClasses.bgSecondary}`}>
                        <div className={`px-6 border-b ${themeClasses.border}`}>
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button
                                    onClick={() => setActiveTab('Details')}
                                    className={`whitespace-nowrap py-3 px-1 text-base font-semibold ${activeTab === 'Details' ? `border-b-2 ${themeClasses.accentBorder} ${themeClasses.accentText}` : `border-transparent ${themeClasses.textSecondary} hover:text-opacity-80`}`}
                                >
                                    Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('History')}
                                    className={`whitespace-nowrap py-3 px-1 text-base font-semibold ${activeTab === 'History' ? `border-b-2 ${themeClasses.accentBorder} ${themeClasses.accentText}` : `border-transparent ${themeClasses.textSecondary} hover:text-opacity-80`}`}
                                >
                                    History
                                </button>
                            </nav>
                        </div>
                        <div className="p-6">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                novel={novel}
            />
            <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={confirmDeleteNovel}
                title={`Delete "${novel.title}"?`}
                message="Are you sure? This will permanently delete the entire novel and all its chapters. This action cannot be undone."
            />
            <ConfirmModal
                isOpen={!!chapterToDelete}
                onClose={() => setChapterToDelete(null)}
                onConfirm={handleDeleteChapter}
                title={`Delete chapter "${chapterToDelete?.title}"?`}
                message="Are you sure you want to delete this chapter? This cannot be undone."
            />
            <ConfirmModal
                isOpen={isDocxConfirmOpen}
                onClose={() => { setIsDocxConfirmOpen(false); setPendingFiles(null); }}
                onConfirm={handleDocxImport}
                title={`Import from ${pendingFiles?.length === 1 ? `"${pendingFiles[0].name}"` : `${pendingFiles?.length || 0} files`}?`}
                message="This will replace all existing chapters in this novel with the content from the selected DOCX file(s). This action cannot be undone."
                confirmButtonClass={`px-6 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
            />
        </div>
    );
};

export default NovelDetailPage;
