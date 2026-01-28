
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { StoryIdea, IdeaFolder } from '../types';
import { PlusIcon, UploadIcon, BackIcon, TrashIcon, FolderIcon, PencilIcon, ChevronLeftIcon } from '../components/Icons';
import ConfirmModal from '../components/ConfirmModal';
import { enhancePlainText } from '../constants';
import * as mammoth from 'mammoth';
import { useTranslations } from '../hooks/useTranslations';

const CreateFolderModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: (name: string) => void }) => {
    const { themeClasses } = React.useContext(ProjectContext);
    const t = useTranslations();
    const [name, setName] = React.useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className={`p-6 rounded-lg shadow-xl w-full max-w-sm ${themeClasses.bgSecondary} ${themeClasses.text} border ${themeClasses.border}`} onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">{t.createFolder}</h2>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t.folderName}
                    autoFocus
                    className={`w-full p-2 rounded-md mb-6 ${themeClasses.input} border ${themeClasses.border}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()); }}
                />
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className={`px-4 py-2 rounded-lg font-semibold ${themeClasses.bgTertiary} hover:opacity-80`}>{t.cancel}</button>
                    <button onClick={() => name.trim() && onConfirm(name.trim())} disabled={!name.trim()} className={`px-4 py-2 rounded-lg font-semibold ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90 disabled:opacity-50`}>{t.confirm}</button>
                </div>
            </div>
        </div>
    );
};

const RenameFolderModal = ({ isOpen, onClose, onConfirm, initialName }: { isOpen: boolean, onClose: () => void, onConfirm: (name: string) => void, initialName: string }) => {
    const { themeClasses } = React.useContext(ProjectContext);
    const t = useTranslations();
    const [name, setName] = React.useState(initialName);

    React.useEffect(() => setName(initialName), [initialName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className={`p-6 rounded-lg shadow-xl w-full max-w-sm ${themeClasses.bgSecondary} ${themeClasses.text} border ${themeClasses.border}`} onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">{t.renameFolder}</h2>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t.folderName}
                    autoFocus
                    className={`w-full p-2 rounded-md mb-6 ${themeClasses.input} border ${themeClasses.border}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()); }}
                />
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className={`px-4 py-2 rounded-lg font-semibold ${themeClasses.bgTertiary} hover:opacity-80`}>{t.cancel}</button>
                    <button onClick={() => name.trim() && onConfirm(name.trim())} disabled={!name.trim()} className={`px-4 py-2 rounded-lg font-semibold ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90 disabled:opacity-50`}>{t.confirm}</button>
                </div>
            </div>
        </div>
    );
};

const MoveIdeaModal = ({ isOpen, onClose, onConfirm, folders }: { isOpen: boolean, onClose: () => void, onConfirm: (folderId: string | null) => void, folders: IdeaFolder[] }) => {
    const { themeClasses } = React.useContext(ProjectContext);
    const t = useTranslations();
    const [selectedFolderId, setSelectedFolderId] = React.useState<string>('root');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className={`p-6 rounded-lg shadow-xl w-full max-w-sm ${themeClasses.bgSecondary} ${themeClasses.text} border ${themeClasses.border}`} onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">{t.moveIdea}</h2>
                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">{t.selectFolder}</label>
                    <select
                        value={selectedFolderId}
                        onChange={(e) => setSelectedFolderId(e.target.value)}
                        className={`w-full p-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`}
                    >
                        <option value="root">{t.noFolder}</option>
                        {folders.map(f => (
                            <option key={f.id} value={f.id}>{enhancePlainText(f.name)}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className={`px-4 py-2 rounded-lg font-semibold ${themeClasses.bgTertiary} hover:opacity-80`}>{t.cancel}</button>
                    <button onClick={() => onConfirm(selectedFolderId === 'root' ? null : selectedFolderId)} className={`px-4 py-2 rounded-lg font-semibold ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}>{t.move}</button>
                </div>
            </div>
        </div>
    );
};

const DemosPage = () => {
    const { projectData, setProjectData, themeClasses, theme } = React.useContext(ProjectContext);
    const t = useTranslations();
    const navigate = useNavigate();
    const [isDocxConfirmOpen, setIsDocxConfirmOpen] = React.useState(false);
    const [pendingImportData, setPendingImportData] = React.useState<{ title: string; synopsisHtml: string; originalFilename: string } | null>(null);
    const docxInputRef = React.useRef<HTMLInputElement>(null);
    const [ideaToDelete, setIdeaToDelete] = React.useState<StoryIdea | null>(null);
    const [viewFolderId, setViewFolderId] = React.useState<string | null>(null);
    
    // Folder Management State
    const [isCreateFolderOpen, setIsCreateFolderOpen] = React.useState(false);
    const [folderToRename, setFolderToRename] = React.useState<IdeaFolder | null>(null);
    const [folderToDelete, setFolderToDelete] = React.useState<IdeaFolder | null>(null);
    const [ideaToMove, setIdeaToMove] = React.useState<StoryIdea | null>(null);

    // Drag and Drop State
    const [draggedIdeaId, setDraggedIdeaId] = React.useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = React.useState<string | null>(null);

    const folders = React.useMemo(() => {
        return [...(projectData?.ideaFolders || [])].sort((a, b) => a.name.localeCompare(b.name));
    }, [projectData?.ideaFolders]);

    const currentFolder = folders.find(f => f.id === viewFolderId);

    const storyIdeas = React.useMemo(() => {
        const allIdeas = [...(projectData?.storyIdeas || [])];
        return allIdeas.filter(idea => {
            if (viewFolderId === null) {
                // In root view, show ideas with no folderId
                return !idea.folderId;
            }
            return idea.folderId === viewFolderId;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [projectData?.storyIdeas, viewFolderId]);

    const handleNewIdea = () => {
        const now = new Date().toISOString();
        const newIdea: StoryIdea = {
            id: crypto.randomUUID(),
            title: 'Untitled Idea',
            synopsis: '<p><br></p>',
            wordCount: 0,
            tags: [],
            status: 'Seedling',
            folderId: viewFolderId || undefined, // Assign to current folder
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
        navigate(`/idea/${newIdea.id}/edit`);
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
                "p[style-name='Heading 1'] => h2:fresh",
                "p[style-name='Heading 2'] => h3:fresh",
                "p[style-name='Heading 3'] => h4:fresh",
                "p[style-name='Heading 4'] => h5:fresh",
                "p[style-name='Heading 5'] => h6:fresh",
            ];
            const { value: html } = await mammothLib.convertToHtml({ arrayBuffer }, { styleMap });
            
            const tempDiv = document.createElement('div');
            // Clean up empty paragraphs
            tempDiv.innerHTML = html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '').trim();
            
            // Use filename as title, replacing .docx case-insensitively
            let ideaTitle = file.name.replace(/\.docx$/i, '');
            
            // Extract Outline from the generated HTML
            const headings = Array.from(tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6'));
            let outlineHtml = '';
            
            if (headings.length > 0) {
                outlineHtml += '<p><strong>Outline:</strong></p><ul>';
                headings.forEach(heading => {
                    const text = heading.textContent?.trim();
                    if (text) {
                        const tagName = heading.tagName.toUpperCase();
                        let indent = '0';
                        if (tagName === 'H3') indent = '1.5em'; // H1(Title) -> H2(Heading1) -> H3(Heading2)
                        if (tagName === 'H4') indent = '3em';
                        if (tagName === 'H5') indent = '4.5em';
                        if (tagName === 'H6') indent = '6em';
                        
                        outlineHtml += `<li style="margin-left: ${indent}; list-style-type: disc;">${text}</li>`;
                    }
                });
                outlineHtml += '</ul><hr/><br/>';
            }
            
            // Combine outline + content
            const synopsisHtml = outlineHtml + tempDiv.innerHTML;
            
            setPendingImportData({
                title: ideaTitle,
                synopsisHtml: synopsisHtml,
                originalFilename: file.name,
            });
            setIsDocxConfirmOpen(true);
        } catch (error: any) {
            console.error(`Error processing file ${file.name}:`, error);
            alert(`Failed to process ${file.name}. Error: ${error.message || 'Unknown error'}`);
        } finally {
            e.target.value = '';
        }
    };

    const handleDocxImport = async () => {
        if (!pendingImportData) return;
        setIsDocxConfirmOpen(false);

        try {
            const now = new Date().toISOString();
            const newIdea: StoryIdea = {
                id: crypto.randomUUID(),
                title: pendingImportData.title,
                synopsis: pendingImportData.synopsisHtml,
                wordCount: 0, 
                tags: [],
                status: 'Seedling',
                folderId: viewFolderId || undefined, // Import into current folder
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
            console.error(`Error importing file:`, error);
            alert(`Failed to import the story idea.`);
        } finally {
            setPendingImportData(null);
        }
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

    const handleCreateFolder = (name: string) => {
        const newFolder: IdeaFolder = {
            id: crypto.randomUUID(),
            name,
            createdAt: new Date().toISOString()
        };
        setProjectData(data => {
            if (!data) return null;
            return {
                ...data,
                ideaFolders: [...(data.ideaFolders || []), newFolder]
            };
        });
        setIsCreateFolderOpen(false);
    };

    const handleRenameFolder = (name: string) => {
        if (!folderToRename) return;
        setProjectData(data => {
            if (!data) return null;
            return {
                ...data,
                ideaFolders: data.ideaFolders.map(f => f.id === folderToRename.id ? { ...f, name } : f)
            };
        });
        setFolderToRename(null);
    };

    const handleDeleteFolder = () => {
        if (!folderToDelete) return;
        setProjectData(data => {
            if (!data) return null;
            // Move ideas in this folder to root
            const updatedIdeas = data.storyIdeas.map(idea => 
                idea.folderId === folderToDelete.id ? { ...idea, folderId: undefined } : idea
            );
            const updatedFolders = data.ideaFolders.filter(f => f.id !== folderToDelete.id);
            return {
                ...data,
                storyIdeas: updatedIdeas,
                ideaFolders: updatedFolders
            };
        });
        setFolderToDelete(null);
    };

    const handleMoveIdea = (folderId: string | null) => {
        if (!ideaToMove) return;
        setProjectData(data => {
            if (!data) return null;
            return {
                ...data,
                storyIdeas: data.storyIdeas.map(i => i.id === ideaToMove.id ? { ...i, folderId: folderId || undefined } : i)
            };
        });
        setIdeaToMove(null);
    };

    // --- Drag and Drop Logic ---

    const handleDragStart = (e: React.DragEvent, ideaId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        // Set drag image optionally, or let browser handle it
        setDraggedIdeaId(ideaId);
    };

    const handleDragOverFolder = (e: React.DragEvent, folderId: string) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        if (dragOverFolderId !== folderId) {
            setDragOverFolderId(folderId);
        }
    };

    const handleDragLeaveFolder = (e: React.DragEvent) => {
        setDragOverFolderId(null);
    };

    const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
        e.preventDefault();
        setDragOverFolderId(null);
        
        if (draggedIdeaId) {
            setProjectData(data => {
                if (!data) return null;
                return {
                    ...data,
                    storyIdeas: data.storyIdeas.map(i => 
                        i.id === draggedIdeaId ? { ...i, folderId: folderId } : i
                    )
                };
            });
            setDraggedIdeaId(null);
        }
    };

    const handleDragEnd = () => {
        setDraggedIdeaId(null);
        setDragOverFolderId(null);
    };


    const getSnippet = (html: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const text = tempDiv.textContent || '';
        if (!text.trim()) return t.noSynopsis;
        return text.trim().substring(0, 150) + (text.length > 150 ? '...' : '');
    };

    const statusStyles: { [key: string]: string } = {
        Seedling: 'bg-green-200 text-green-800',
        Developing: 'bg-blue-200 text-blue-800',
        Archived: 'bg-gray-300 text-gray-700',
    };

    const isEmpty = storyIdeas.length === 0 && (viewFolderId !== null || folders.length === 0);

    return (
        <div className={`p-4 sm:p-8 md:p-12 ${themeClasses.bg} h-full overflow-y-auto`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div className="flex items-center space-x-2">
                    {viewFolderId ? (
                         <button onClick={() => setViewFolderId(null)} className={`p-2 rounded-full hover:${themeClasses.bgTertiary} transition-colors ${themeClasses.text}`}>
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                    ) : null}
                    <h1 className={`text-3xl font-bold ${themeClasses.text}`}>
                        {viewFolderId && currentFolder ? enhancePlainText(currentFolder.name) : t.ideaBox}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="file"
                        ref={docxInputRef}
                        onChange={handleFileSelectForDocx}
                        className="hidden"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                    
                    {/* Only show New Folder in root view */}
                    {!viewFolderId && (
                        <button
                            onClick={() => setIsCreateFolderOpen(true)}
                            className={`flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-90`}
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>{t.newFolder}</span>
                        </button>
                    )}

                    <button
                        onClick={() => docxInputRef.current?.click()}
                        className={`flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-90`}
                    >
                        <UploadIcon className="w-5 h-5" />
                        <span>{t.importFromDocx}</span>
                    </button>
                    <button
                        onClick={handleNewIdea}
                        className={`flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>{t.newIdea}</span>
                    </button>
                </div>
            </div>

            {/* FOLDERS GRID (Only in Root) */}
            {!viewFolderId && folders.length > 0 && (
                <div className="mb-8">
                     <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 ${themeClasses.textSecondary}`}>{t.folders}</h2>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {folders.map(folder => {
                            const count = (projectData?.storyIdeas || []).filter(i => i.folderId === folder.id).length;
                            const isDragOver = dragOverFolderId === folder.id;
                            
                            // Determine folder style based on drag state
                            let containerClass = `${themeClasses.bgSecondary}`;
                            if (isDragOver) {
                                containerClass = theme === 'dark' ? 'bg-indigo-900 ring-2 ring-indigo-500 scale-[1.02]' : 'bg-amber-100 ring-2 ring-amber-500 scale-[1.02]';
                            } else {
                                containerClass += ` hover:${themeClasses.bgTertiary}`;
                            }

                            return (
                                <div 
                                    key={folder.id}
                                    className={`group flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-200 ${containerClass}`}
                                    onClick={() => setViewFolderId(folder.id)}
                                    onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                                    onDragLeave={handleDragLeaveFolder}
                                    onDrop={(e) => handleDropOnFolder(e, folder.id)}
                                >
                                    <div className="flex items-center space-x-3 overflow-hidden pointer-events-none">
                                        <FolderIcon className={`w-8 h-8 flex-shrink-0 ${isDragOver ? 'text-white' : 'text-amber-500'}`} />
                                        <div className="overflow-hidden">
                                            <p className={`font-semibold truncate ${themeClasses.accentText}`}>{enhancePlainText(folder.name)}</p>
                                            <p className={`text-xs ${themeClasses.textSecondary}`}>{count} ideas</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        <button 
                                            onClick={() => setFolderToRename(folder)}
                                            className={`p-1.5 rounded-full hover:bg-black/10 ${themeClasses.textSecondary}`}
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setFolderToDelete(folder)}
                                            className={`p-1.5 rounded-full hover:bg-red-500/10 text-red-500`}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                     </div>
                </div>
            )}

            {isEmpty ? (
                <div className={`p-8 md:p-12 h-full flex flex-col items-center justify-center -mt-16`}>
                    <div className={`w-full max-w-3xl p-8 text-center rounded-lg ${themeClasses.bgSecondary}`}>
                        <h2 className={`text-2xl font-bold mb-2 ${themeClasses.accentText}`}>{t.emptyIdeaBox}</h2>
                        <p className={`${themeClasses.accentText} opacity-80 mb-6`}>
                            {t.emptyIdeaBoxHint}
                        </p>
                        <Link to="/" className={`inline-flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}>
                            <BackIcon className="w-5 h-5" />
                            <span>{t.goToHomePage}</span>
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                {(viewFolderId || folders.length > 0) && storyIdeas.length > 0 && (
                    <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 ${themeClasses.textSecondary}`}>
                        {viewFolderId ? 'Ideas' : 'Unsorted Ideas'}
                    </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {storyIdeas.map(idea => (
                        <div
                            key={idea.id}
                            className={`group relative p-5 rounded-lg flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${themeClasses.bgSecondary} ${draggedIdeaId === idea.id ? 'opacity-50' : ''}`}
                            onClick={() => navigate(`/idea/${idea.id}/edit`)}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, idea.id)}
                            onDragEnd={handleDragEnd}
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
                             <div className="mt-4 pt-3 border-t border-inherit flex justify-between items-center">
                                <span className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
                                    {(idea.wordCount || 0).toLocaleString()} {t.wordsCount}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIdeaToMove(idea);
                                    }}
                                    className={`p-1 rounded text-xs font-semibold ${themeClasses.bgTertiary} hover:opacity-80 opacity-0 group-hover:opacity-100 transition-opacity`}
                                >
                                    {t.move}
                                </button>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIdeaToDelete(idea);
                                }}
                                className={`absolute top-3 right-3 p-2 rounded-full text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity`}
                                aria-label={t.deleteIdeaTitle(enhancePlainText(idea.title))}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
                </>
            )}

            {/* Modals */}
            <CreateFolderModal isOpen={isCreateFolderOpen} onClose={() => setIsCreateFolderOpen(false)} onConfirm={handleCreateFolder} />
            <RenameFolderModal isOpen={!!folderToRename} onClose={() => setFolderToRename(null)} initialName={folderToRename?.name || ''} onConfirm={handleRenameFolder} />
            <MoveIdeaModal isOpen={!!ideaToMove} onClose={() => setIdeaToMove(null)} folders={folders} onConfirm={handleMoveIdea} />

            <ConfirmModal
                isOpen={!!folderToDelete}
                onClose={() => setFolderToDelete(null)}
                onConfirm={handleDeleteFolder}
                title={t.deleteFolder}
                message={t.deleteFolderConfirm}
            />

            <ConfirmModal
                isOpen={isDocxConfirmOpen}
                onClose={() => { setIsDocxConfirmOpen(false); setPendingImportData(null); }}
                onConfirm={handleDocxImport}
                title={t.importIdeaTitle(pendingImportData?.originalFilename || '')}
                message={
                    pendingImportData ? (
                        <div>
                            <p className="mb-4">{t.importIdeaMessage}</p>
                            <div className={`p-3 rounded-lg border ${themeClasses.border} ${themeClasses.bgTertiary}`}>
                                <p className="font-semibold text-sm">{t.title}</p>
                                <p className={`mb-2 ${themeClasses.accentText}`}>{enhancePlainText(pendingImportData.title)}</p>
                                <p className="font-semibold text-sm">{t.synopsisPreview}</p>
                                <p className={`text-sm italic ${themeClasses.textSecondary}`}>
                                    {getSnippet(pendingImportData.synopsisHtml)}
                                </p>
                            </div>
                            <p className="mt-4">{t.proceed}</p>
                        </div>
                    ) : t.loading
                }
                confirmButtonClass={`px-6 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
            />
             <ConfirmModal
                isOpen={!!ideaToDelete}
                onClose={() => setIdeaToDelete(null)}
                onConfirm={handleDeleteIdea}
                title={t.deleteIdeaConfirmTitle(ideaToDelete?.title || '')}
                message={t.deleteIdeaMessage}
            />
        </div>
    );
};

export default DemosPage;
