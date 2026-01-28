
import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { enhancePlainText } from '../constants';
import { Novel, Chapter } from '../types';
import { BackIcon, BookOpenIcon, DownloadIcon, TrashIcon, UploadIcon, PlusIcon, TextIcon, CloseIcon, LoadingIcon } from '../components/Icons';
import ConfirmModal from '../components/ConfirmModal';
import NovelHistoryPage from '../components/NovelHistoryPage';
import ExportModal from '../components/ExportModal';
import * as pdfjsLib from 'pdfjs-dist';
import { useTranslations } from '../hooks/useTranslations';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

const NovelDetailPage = () => {
    const { novelId } = useParams<{ novelId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, themeClasses } = React.useContext(ProjectContext);
    const t = useTranslations();
    const coverImageInputRef = React.useRef<HTMLInputElement>(null);
    const pdfInputRef = React.useRef<HTMLInputElement>(null);
    const descriptionTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const tagInputRef = React.useRef<HTMLInputElement>(null);

    const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
    const [chapterToDelete, setChapterToDelete] = React.useState<Chapter | null>(null);
    const [activeTab, setActiveTab] = React.useState<'Details' | 'History'>('Details');
    const [isPdfConfirmOpen, setIsPdfConfirmOpen] = React.useState(false);
    const [pendingFiles, setPendingFiles] = React.useState<FileList | null>(null);
    const [isImporting, setIsImporting] = React.useState(false);
    const [isAddingTag, setIsAddingTag] = React.useState(false);
    const [newTag, setNewTag] = React.useState('');

    const { novel, novelIndex } = React.useMemo(() => {
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
    
    const updateNovelDetails = (details: Partial<Pick<Novel, 'title' | 'description'>>) => {
        if (novelIndex === -1) return;
        setProjectData(currentData => {
            if (!currentData || !currentData.novels[novelIndex]) return currentData;
            const updatedNovels = [...currentData.novels];
            updatedNovels[novelIndex] = {
                ...updatedNovels[novelIndex],
                ...details,
            };
            return { ...currentData, novels: updatedNovels };
        });
    };

    React.useEffect(() => {
        if (descriptionTextareaRef.current) {
            const textarea = descriptionTextareaRef.current;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [novel?.description]);
    
    React.useEffect(() => {
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
    
    React.useEffect(() => {
        if (isAddingTag) {
            tagInputRef.current?.focus();
        }
    }, [isAddingTag]);

    const handleFileSelectForPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setPendingFiles(files);
            setIsPdfConfirmOpen(true);
        }
        e.target.value = '';
    };

    const handlePdfImport = async () => {
        if (!pendingFiles || novelIndex === -1) return;
        setIsPdfConfirmOpen(false);
        setIsImporting(true);

        const sortedFiles: File[] = (Array.from(pendingFiles) as File[]).sort((a: File, b: File) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );

        let allNewChapters: Chapter[] = [];

        const createChapter = (title: string, content: string): Chapter => {
            const now = new Date().toISOString();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            const text = tempDiv.textContent || "";
            const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

            return {
                id: crypto.randomUUID(),
                title: enhancePlainText(title),
                content: content,
                wordCount: wordCount,
                createdAt: now,
                updatedAt: now,
                history: [],
            };
        };

        for (const file of sortedFiles) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let fullText = '';

                // Extract text from all pages
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    // Simple text extraction: join items with space. 
                    // To improve paragraph detection, we can check vertical position differences, 
                    // but simple join is safer for now.
                    const pageText = textContent.items
                        .map((item: any) => item.str)
                        .join(' ');
                    
                    fullText += pageText + '\n\n';
                }

                // Clean up text
                fullText = fullText.replace(/\s+/g, ' ').trim();

                // Split by regex for "Chapter X" or similar patterns.
                // Regex looks for "Chapter" followed by numbers or roman numerals, case insensitive.
                // It captures the title to use as heading.
                const chapterSplitRegex = /(?:^|\s)(Chapter\s+(?:\d+|[IVX]+)|Prologue|Epilogue)(?:[:\.\s]|$)/gi;
                
                // We will use a simpler split strategy: 
                // 1. Find all matches.
                // 2. Slice text between matches.
                
                const matches = [...fullText.matchAll(chapterSplitRegex)];
                
                if (matches.length === 0) {
                    // No chapters detected, treat whole file as one chapter
                    const filenameTitle = file.name.replace(/\.pdf$/i, '');
                    // Convert newlines to paragraphs for HTML content
                    const htmlContent = `<p>${fullText.replace(/\n\n/g, '</p><p>')}</p>`;
                    allNewChapters.push(createChapter(filenameTitle, htmlContent));
                } else {
                    let lastIndex = 0;
                    // Handle preamble if any
                    if (matches[0].index && matches[0].index > 0) {
                        const preamble = fullText.slice(0, matches[0].index).trim();
                        if (preamble.length > 50) { // arbitrary threshold to ignore noise
                             const htmlContent = `<p>${preamble.replace(/\n\n/g, '</p><p>')}</p>`;
                             allNewChapters.push(createChapter('Prologue', htmlContent));
                        }
                    }

                    for (let i = 0; i < matches.length; i++) {
                        const match = matches[i];
                        const title = match[1]; // The captured group "Chapter 1"
                        const startIndex = (match.index || 0) + match[0].length;
                        const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : fullText.length;
                        
                        const content = fullText.slice(startIndex, endIndex).trim();
                        // Basic paragraph formation: treat double spaces/newlines as paragraph breaks?
                        // Since we flattened newlines earlier, we rely on the extraction logic.
                        // Actually, simplified extraction above just joins with space.
                        // Let's assume the text is a blob and wrap it in a p.
                        // Ideally, we'd preserve newlines from PDF, but PDF extraction is tricky.
                        // For this implementation, we will just wrap the content.
                        const htmlContent = `<p>${content}</p>`;
                        
                        allNewChapters.push(createChapter(title, htmlContent));
                    }
                }

            } catch (error: any) {
                console.error(`Error processing file ${file.name}:`, error);
                alert(`Failed to process ${file.name}. Error: ${error.message || 'Unknown error'}`);
            }
        }

        if (allNewChapters.length > 0) {
            setProjectData(currentData => {
                if (!currentData) return null;
                const updatedNovels = [...currentData.novels];
                if (novelIndex >= updatedNovels.length) return currentData;
                
                // Strictly REPLACE existing chapters with the imported ones
                const updatedNovel = { 
                    ...updatedNovels[novelIndex], 
                    chapters: allNewChapters 
                };
                
                updatedNovels[novelIndex] = updatedNovel;
                return { ...currentData, novels: updatedNovels };
            });
        } else {
            alert("No content could be extracted from the file(s). Please check the file formatting.");
        }

        setPendingFiles(null);
        setIsImporting(false);
    };

    if (!projectData || !novel) {
        return (
            <div className={`flex items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                {t.novelNotFound}
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

    const handleAddTag = () => {
        if (novelIndex === -1) return;
        const trimmedTag = newTag.trim();
        if (trimmedTag && !novel.tags.includes(trimmedTag) && novel.tags.length < 6) {
            setProjectData(currentData => {
                if (!currentData) return null;
                const updatedNovels = [...currentData.novels];
                const currentNovel = updatedNovels[novelIndex];
                updatedNovels[novelIndex] = { ...currentNovel, tags: [...currentNovel.tags, trimmedTag] };
                return { ...currentData, novels: updatedNovels };
            });
        }
        setNewTag('');
        setIsAddingTag(false);
    };
    
    const handleRemoveTag = (tagToRemove: string) => {
        if (novelIndex === -1) return;
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedNovels = [...currentData.novels];
            const currentNovel = updatedNovels[novelIndex];
            updatedNovels[novelIndex] = { ...currentNovel, tags: currentNovel.tags.filter(t => t !== tagToRemove) };
            return { ...currentData, novels: updatedNovels };
        });
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setNewTag('');
            setIsAddingTag(false);
        }
    };

    const handleTagInputBlur = () => {
        handleAddTag();
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
                    <h3 className={`font-bold mb-2 ${themeClasses.accentText}`}>{t.tags}</h3>
                    <p className={`text-sm mb-4 ${themeClasses.textSecondary}`}>{t.tagsHint}</p>
                    <div className="flex flex-wrap gap-2 items-center min-h-[2.5rem]">
                        {novel.tags.map(tag => (
                            <div key={tag} className={`flex items-center space-x-2 px-3 py-1 text-sm rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>
                                <span>{tag}</span>
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    className="-mr-1 p-0.5 rounded-full hover:bg-black/10"
                                    aria-label={t.removeTag(tag)}
                                >
                                    <CloseIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {novel.tags.length < 6 && (
                            isAddingTag ? (
                                <input
                                    ref={tagInputRef}
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={handleTagInputKeyDown}
                                    onBlur={handleTagInputBlur}
                                    placeholder={t.addTagPlaceholder}
                                    className={`text-sm px-3 py-1 rounded-full ${themeClasses.input} border ${themeClasses.border} outline-none`}
                                />
                            ) : (
                                <button
                                    onClick={() => setIsAddingTag(true)}
                                    className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-full transition-colors ${themeClasses.bgSecondary} ${themeClasses.accentText} hover:opacity-80`}
                                >
                                    <span>{t.addTag}</span>
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            )
                        )}
                    </div>
                </div>

                <div className={`p-6 -m-6 mt-8 rounded-lg ${themeClasses.bgSecondary}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className={`text-xl font-bold ${themeClasses.accentText}`}>{t.chapters}</h2>
                        <input
                            type="file"
                            ref={pdfInputRef}
                            onChange={handleFileSelectForPdf}
                            className="hidden"
                            accept=".pdf,application/pdf"
                            multiple
                        />
                        <button
                            onClick={() => pdfInputRef.current?.click()}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80 disabled:opacity-50`}
                            disabled={isImporting}
                        >
                            {isImporting ? <LoadingIcon className="w-4 h-4 animate-spin" /> : null}
                            {isImporting ? 'Importing...' : t.importFromDocx}
                        </button>
                    </div>
                    
                    <button onClick={handleAddChapter} className={`w-full flex items-center justify-center space-x-2 p-4 rounded-lg border-2 border-dashed transition-colors ${themeClasses.border} ${themeClasses.textSecondary} hover:border-opacity-70 hover:text-opacity-70 mb-4`}>
                        <PlusIcon className="w-5 h-5"/>
                        <span>{t.addNewChapter}</span>
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
                                            <span>{(chapter.wordCount || 0).toLocaleString()} {t.wordsCount}</span>
                                        </div>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => setChapterToDelete(chapter)}
                                    className={`flex-shrink-0 p-2 -mr-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10`}
                                    aria-label={t.deleteChapterTitle(chapter.title)}
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
                <span>{t.backTo} {t.homePage}</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-8">
                    <div className={`p-6 rounded-lg ${themeClasses.bgSecondary}`}>
                        <h2 className={`text-xl font-bold mb-4 ${themeClasses.accentText}`}>{t.coverImage}</h2>
                        <div className="relative w-full aspect-[3/4]">
                            {novel.coverImage ? (
                                <img src={novel.coverImage} alt="Cover" className="w-full h-full object-cover rounded-md" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center rounded-md ${themeClasses.bgTertiary}`}>
                                    <span className={themeClasses.textSecondary}>{t.noCover}</span>
                                </div>
                            )}
                        </div>
                         <input type="file" ref={coverImageInputRef} onChange={handleCoverImageChange} className="hidden" accept="image/*" />
                        <button onClick={() => coverImageInputRef.current?.click()} className={`w-full mt-4 py-2 px-4 rounded-lg font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}>
                            {t.uploadFile}
                        </button>
                    </div>

                    <div className={`p-6 rounded-lg ${themeClasses.bgSecondary}`}>
                         <h2 className={`text-xl font-bold mb-4 ${themeClasses.accentText}`}>{t.actions}</h2>
                         <div className="space-y-3">
                            <button 
                                onClick={() => navigate(`/novel/${novelId}/read`)} 
                                disabled={novel.chapters.length === 0}
                                className={`w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <BookOpenIcon className="w-5 h-5"/>
                                <span>{t.readNovel}</span>
                            </button>
                            <button 
                                onClick={() => setIsExportModalOpen(true)} 
                                className={`w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}
                            >
                                <DownloadIcon className="w-5 h-5"/>
                                <span>{t.exportNovel}</span>
                            </button>
                            <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold transition-colors bg-red-700 text-red-100 hover:bg-red-800">
                                <TrashIcon className="w-5 h-5"/>
                                <span>{t.deleteStory}</span>
                            </button>
                         </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-8">
                    <div className={`p-6 rounded-lg ${themeClasses.bgSecondary}`}>
                        <input
                            type="text"
                            value={novel.title}
                            onChange={(e) => updateNovelDetails({ title: e.target.value })}
                            onBlur={(e) => {
                                const enhanced = enhancePlainText(e.target.value);
                                if (enhanced !== e.target.value) {
                                    updateNovelDetails({ title: enhanced });
                                }
                            }}
                            placeholder={t.novelTitlePlaceholder}
                            className={`text-5xl font-bold bg-transparent outline-none w-full ${themeClasses.accentText}`}
                        />
                        <textarea
                            ref={descriptionTextareaRef}
                            value={novel.description}
                            onChange={(e) => updateNovelDetails({ description: e.target.value })}
                            onBlur={(e) => {
                                const enhanced = enhancePlainText(e.target.value);
                                if (enhanced !== e.target.value) {
                                    updateNovelDetails({ description: enhanced });
                                }
                            }}
                            placeholder={t.novelDescriptionPlaceholder}
                            className={`text-lg mt-1 bg-transparent outline-none w-full resize-none min-h-[7rem] max-h-96 ${themeClasses.textSecondary}`}
                        />
                    </div>
                    <div className={`rounded-lg ${themeClasses.bgSecondary}`}>
                        <div className={`px-6 border-b ${themeClasses.border}`}>
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button
                                    onClick={() => setActiveTab('Details')}
                                    className={`whitespace-nowrap py-3 px-1 text-base font-semibold ${activeTab === 'Details' ? `border-b-2 ${themeClasses.accentBorder} ${themeClasses.accentText}` : `border-transparent ${themeClasses.textSecondary} hover:text-opacity-80`}`}
                                >
                                    {t.details}
                                </button>
                                <button
                                    onClick={() => setActiveTab('History')}
                                    className={`whitespace-nowrap py-3 px-1 text-base font-semibold ${activeTab === 'History' ? `border-b-2 ${themeClasses.accentBorder} ${themeClasses.accentText}` : `border-transparent ${themeClasses.textSecondary} hover:text-opacity-80`}`}
                                >
                                    {t.history}
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
                title={t.deleteNovelTitle(novel.title)}
                message={t.deleteNovelMessage}
            />
            <ConfirmModal
                isOpen={!!chapterToDelete}
                onClose={() => setChapterToDelete(null)}
                onConfirm={handleDeleteChapter}
                title={t.deleteChapterTitle(chapterToDelete?.title || '')}
                message={t.deleteChapterMessage}
            />
            <ConfirmModal
                isOpen={isPdfConfirmOpen}
                onClose={() => { setIsPdfConfirmOpen(false); setPendingFiles(null); }}
                onConfirm={handlePdfImport}
                title={t.importDocxTitle(pendingFiles?.length || 0, pendingFiles?.item(0)?.name || '')}
                message={t.importDocxMessage}
                confirmButtonClass={`px-6 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
            />
        </div>
    );
};

export default NovelDetailPage;
