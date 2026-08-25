
import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { enhancePlainText } from '../constants';
import { Novel, Chapter } from '../types';
import { BackIcon, BookOpenIcon, DownloadIcon, TrashIcon, UploadIcon, PlusIcon, TextIcon, CloseIcon } from '../components/Icons';
import ConfirmModal from '../components/ConfirmModal';
import NovelHistoryPage from '../components/NovelHistoryPage';
import ExportModal from '../components/ExportModal';
import { useTranslations } from '../hooks/useTranslations';
import { useTabTitle } from '../hooks/useTabTitle';
import * as mammoth from 'mammoth';
import { optimizeCoverImage } from '../utils/imageOptimizer';

interface ImportDocxModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (options: { overwriteChapters: boolean; overwriteDescription: boolean }) => void;
    fileName: string;
    chapters: { title: string; content: string; wordCount: number }[];
    preamble: string;
    themeClasses: any;
    t: any;
}

const ImportDocxModal = ({
    isOpen,
    onClose,
    onConfirm,
    fileName,
    chapters,
    preamble,
    themeClasses,
    t
}: ImportDocxModalProps) => {
    const [overwriteChapters, setOverwriteChapters] = React.useState(true);
    const [overwriteDescription, setOverwriteDescription] = React.useState(true);

    if (!isOpen) return null;

    // Get a text preview of the preamble
    const getPreambleText = () => {
        const temp = document.createElement('div');
        temp.innerHTML = preamble;
        const text = temp.textContent || temp.innerText || '';
        return text.trim();
    };

    const preambleText = getPreambleText();
    const cleanPreambleSnippet = preambleText.length > 120 
        ? preambleText.substring(0, 120) + '...' 
        : preambleText;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className={`p-6 rounded-lg shadow-xl w-full max-w-lg ${themeClasses.bgSecondary} ${themeClasses.text} border ${themeClasses.border} flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
                <h2 className={`text-2xl font-bold mb-2 ${themeClasses.accentText}`}>
                    {t.importFromDocx || 'Import from DOCX'}
                </h2>
                <p className={`text-sm mb-4 ${themeClasses.textSecondary}`}>
                    File: <span className="font-semibold text-emerald-500">{fileName}</span>
                </p>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-1">
                    {/* Chapter options */}
                    <div className={`p-4 rounded-lg border ${themeClasses.border} ${themeClasses.bgTertiary}`}>
                        <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={overwriteChapters}
                                onChange={(e) => setOverwriteChapters(e.target.checked)}
                                className="mt-1 accent-emerald-500 rounded cursor-pointer w-4 h-4"
                            />
                            <div>
                                <span className="font-bold text-sm">Replace existing chapters</span>
                                <p className={`text-xs mt-1 ${themeClasses.textSecondary}`}>
                                    If checked, this novel's current chapters will be fully replaced. If unchecked, the new chapters will be appended to the end of the book.
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Description options */}
                    {preambleText && (
                        <div className={`p-4 rounded-lg border ${themeClasses.border} ${themeClasses.bgTertiary}`}>
                            <label className="flex items-start space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={overwriteDescription}
                                    onChange={(e) => setOverwriteDescription(e.target.checked)}
                                    className="mt-1 accent-emerald-500 rounded cursor-pointer w-4 h-4"
                                />
                                <div>
                                    <span className="font-bold text-sm">Update novel description</span>
                                    <p className={`text-xs mt-1 mb-2 ${themeClasses.textSecondary}`}>
                                        Introductory text was detected before your first chapter heading. Check this to update the novel's main description with this text.
                                    </p>
                                    <div className={`p-2 rounded text-xs italic ${themeClasses.bgSecondary} border ${themeClasses.border} ${themeClasses.textSecondary}`}>
                                        "{cleanPreambleSnippet}"
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Detected chapters */}
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2">
                            Detected Chapters ({chapters.length})
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {chapters.map((ch, idx) => (
                                <div key={idx} className={`p-2.5 rounded-md border flex justify-between items-center text-sm ${themeClasses.bgTertiary} ${themeClasses.border}`}>
                                    <span className="font-semibold truncate pr-2">{ch.title}</span>
                                    <span className={`text-xs flex-shrink-0 px-2 py-0.5 rounded-full ${themeClasses.bgSecondary} ${themeClasses.textSecondary}`}>
                                        {ch.wordCount.toLocaleString()} words
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="flex space-x-3 justify-end pt-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg font-semibold border ${themeClasses.border} hover:opacity-85 transition-opacity`}
                    >
                        {t.cancel}
                    </button>
                    <button
                        onClick={() => onConfirm({ overwriteChapters, overwriteDescription })}
                        className={`px-4 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors`}
                    >
                        {t.confirm}
                    </button>
                </div>
            </div>
        </div>
    );
};

const NovelDetailPage = () => {
    const { novelId } = useParams<{ novelId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, themeClasses } = React.useContext(ProjectContext);
    const t = useTranslations();
    const coverImageInputRef = React.useRef<HTMLInputElement>(null);
    const descriptionTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const tagInputRef = React.useRef<HTMLInputElement>(null);
    const docxInputRef = React.useRef<HTMLInputElement>(null);

    const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
    const [pendingImport, setPendingImport] = React.useState<{
        fileName: string;
        chapters: { title: string; content: string; wordCount: number }[];
        preamble: string;
    } | null>(null);
    const [chapterToDelete, setChapterToDelete] = React.useState<Chapter | null>(null);
    const [activeTab, setActiveTab] = React.useState<'Details' | 'History'>('Details');
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

    useTabTitle(novel ? novel.title : 'Novel Details', 'novel');

    
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

        setProjectData(currentData => {
            if (!currentData) return null;
            const currentNovel = currentData.novels[novelIndex];
            if (!currentNovel) return currentData;

            const updatedChapters = currentNovel.chapters.map(chapter => {
                if (chapter.content && (!chapter.wordCount || chapter.wordCount === 0)) {
                    const plainText = chapter.content.replace(/<[^>]*>/g, ' ');
                    let wordCount = 0;
                    const regex = /\S+/g;
                    while (regex.exec(plainText) !== null) {
                        wordCount++;
                    }
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

    if (!projectData || !novel) {
        return (
            <div className={`flex items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                {t.novelNotFound}
            </div>
        );
    }
    
    const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && novelIndex !== -1) {
            try {
                const optimizedBase64 = await optimizeCoverImage(file);
                if (optimizedBase64) {
                    setProjectData(currentData => {
                        if (!currentData) return null;
                        const updatedNovels = [...currentData.novels];
                        if (novelIndex >= updatedNovels.length) return currentData;
                        updatedNovels[novelIndex].coverImage = optimizedBase64;
                        return { ...currentData, novels: updatedNovels };
                    });
                }
            } catch (err: any) {
                console.error("Failed to optimize cover image:", err);
                alert(err?.message || "Failed to process image. Please try a different image.");
            }
        }
    };

    const handleFileSelectForDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            
            // Safe Mammoth Resolution
            // @ts-ignore
            const mammothLib = mammoth.default || mammoth;
             
            if (!mammothLib || typeof mammothLib.convertToHtml !== 'function') {
                 throw new Error("The DOCX processing library could not be loaded.");
            }

            const styleMap = [
                "p[style-name='Title'] => h1:fresh",
                "p[style-name='Subtitle'] => h2:fresh",
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "p[style-name='Heading 4'] => h4:fresh",
                "p[style-name='Heading 5'] => h5:fresh",
                "p[style-name='Heading 6'] => h6:fresh",
            ];
            const { value: html } = await mammothLib.convertToHtml({ arrayBuffer }, { styleMap });
            
            const tempDiv = document.createElement('div');
            // Clean up empty paragraphs
            tempDiv.innerHTML = html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '').trim();
            
            const formatTextNodes = (node: Node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    if (node.textContent) {
                        let text = node.textContent;
                        text = text.replace(/\.{3}/g, '…');
                        text = text.replace(/--/g, '—');
                        
                        text = text.replace(/(^|\W)"/g, '$1“'); 
                        text = text.replace(/"/g, '”');
                        text = text.replace(/(^|\W)'/g, '$1‘');
                        text = text.replace(/'/g, '’');
                        
                        node.textContent = text;
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    node.childNodes.forEach(formatTextNodes);
                }
            };
            formatTextNodes(tempDiv);

            // Parse headings and split into chapters
            const parsedChapters: { title: string; content: string; wordCount: number }[] = [];
            let preambleHtml = '';
            let currentChapter: { title: string; content: string; wordCount: number } | null = null;

            const children = Array.from(tempDiv.childNodes);
            children.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const el = node as HTMLElement;
                    const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName);
                    if (isHeading) {
                        const titleText = el.textContent?.trim() || '';
                        currentChapter = {
                            title: titleText || `Chapter ${parsedChapters.length + 1}`,
                            content: '',
                            wordCount: 0
                        };
                        parsedChapters.push(currentChapter);
                    } else {
                        if (currentChapter) {
                            currentChapter.content += el.outerHTML;
                        } else {
                            preambleHtml += el.outerHTML;
                        }
                    }
                } else if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent || '';
                    if (text.trim()) {
                        if (currentChapter) {
                            currentChapter.content += text;
                        } else {
                            preambleHtml += text;
                        }
                    }
                }
            });

            // If no headings were found, put everything under one chapter
            if (parsedChapters.length === 0) {
                const titleText = file.name.replace(/\.docx$/i, '');
                const contentHtml = preambleHtml || tempDiv.innerHTML || '<p><br></p>';
                parsedChapters.push({
                    title: titleText,
                    content: contentHtml,
                    wordCount: 0
                });
                preambleHtml = '';
            }

            // Calculate word count for each parsed chapter
            parsedChapters.forEach(ch => {
                const plainText = ch.content.replace(/<[^>]*>/g, ' ');
                let wordCount = 0;
                const regex = /\S+/g;
                while (regex.exec(plainText) !== null) {
                    wordCount++;
                }
                ch.wordCount = wordCount;
            });

            setPendingImport({
                fileName: file.name,
                chapters: parsedChapters,
                preamble: preambleHtml
            });
            setIsImportModalOpen(true);
        } catch (error: any) {
            console.error(`Error processing file ${file.name}:`, error);
            alert(`Failed to process ${file.name}. Error: ${error.message || 'Unknown error'}`);
        } finally {
            e.target.value = '';
        }
    };

    const handleConfirmImport = (options: { overwriteChapters: boolean; overwriteDescription: boolean }) => {
        if (!pendingImport || novelIndex === -1) return;

        const now = new Date().toISOString();
        const newChapters: Chapter[] = pendingImport.chapters.map((ch) => ({
            id: crypto.randomUUID(),
            title: ch.title,
            content: ch.content,
            wordCount: ch.wordCount,
            createdAt: now,
            updatedAt: now,
            history: []
        }));

        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedNovels = [...currentData.novels];
            if (novelIndex >= updatedNovels.length) return currentData;
            
            const currentNovel = updatedNovels[novelIndex];
            
            // Set chapters
            const finalChapters = options.overwriteChapters
                ? newChapters
                : [...currentNovel.chapters, ...newChapters];

            // Set description
            let finalDescription = currentNovel.description;
            if (options.overwriteDescription && pendingImport.preamble) {
                const tempEl = document.createElement('div');
                tempEl.innerHTML = pendingImport.preamble;
                finalDescription = tempEl.textContent || tempEl.innerText || '';
            }

            updatedNovels[novelIndex] = {
                ...currentNovel,
                chapters: finalChapters,
                description: finalDescription
            };

            return { ...currentData, novels: updatedNovels };
        });

        setIsImportModalOpen(false);
        setPendingImport(null);
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
                    </div>

                    <input
                        type="file"
                        ref={docxInputRef}
                        onChange={handleFileSelectForDocx}
                        className="hidden"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <button onClick={handleAddChapter} className={`flex items-center justify-center space-x-2 p-4 rounded-lg border-2 border-dashed transition-colors ${themeClasses.border} ${themeClasses.textSecondary} hover:border-opacity-70 hover:text-opacity-70`}>
                            <PlusIcon className="w-5 h-5"/>
                            <span>{t.addNewChapter}</span>
                        </button>
                        
                        <button onClick={() => docxInputRef.current?.click()} className={`flex items-center justify-center space-x-2 p-4 rounded-lg border-2 border-dashed transition-colors ${themeClasses.border} ${themeClasses.textSecondary} hover:border-opacity-70 hover:text-opacity-70`}>
                            <UploadIcon className="w-5 h-5"/>
                            <span>{t.importFromDocx || 'Import from DOCX'}</span>
                        </button>
                    </div>
                    
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
        <div className={`p-4 sm:p-8 md:p-12 ${themeClasses.bg} min-h-full`}>
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
            {pendingImport && (
                <ImportDocxModal
                    isOpen={isImportModalOpen}
                    onClose={() => {
                        setIsImportModalOpen(false);
                        setPendingImport(null);
                    }}
                    onConfirm={handleConfirmImport}
                    fileName={pendingImport.fileName}
                    chapters={pendingImport.chapters}
                    preamble={pendingImport.preamble}
                    themeClasses={themeClasses}
                    t={t}
                />
            )}
        </div>
    );
};

export default NovelDetailPage;
