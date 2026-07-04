import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { PlusIcon, CloseIcon, DownloadIcon, BoldIcon, ItalicIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, UndoIcon, RedoIcon, BookOpenIcon } from '../components/Icons';
import * as mammoth from 'mammoth';
import { useTranslations } from '../hooks/useTranslations';
import { StoryIdea } from '../types';
import { downloadAsHtml } from '../utils/htmlExport';

type PaneData = {
    id?: string;
    title: string;
    htmlContent: string;
    isManualSaveRequired?: boolean;
} | null;


const WorkingModelPage = () => {
    const { themeClasses, projectData, setProjectData } = React.useContext(ProjectContext);
    const t = useTranslations();
    
    // Manage state for two panes
    const [leftPane, setLeftPane] = React.useState<PaneData>(null);
    const [rightPane, setRightPane] = React.useState<PaneData>(null);
    const navigate = useNavigate();

    const applyCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    const applyParagraphStyle = (style: string) => {
        document.execCommand('formatBlock', false, style);
    };

    return (
        <div className={`h-full absolute inset-0 flex flex-col ${themeClasses.bg} ${themeClasses.text}`}>
            {/* Unified Top Toolbar */}
            <div className={`p-4 border-b ${themeClasses.border} ${themeClasses.bgSecondary} flex items-center justify-between`}>
                <div className="flex items-center space-x-2">
                    <button onClick={() => applyCommand('bold')} className={`p-2 rounded hover:bg-black/10 transition-colors`} title="Bold">
                        <BoldIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => applyCommand('italic')} className={`p-2 rounded hover:bg-black/10 transition-colors`} title="Italic">
                        <ItalicIcon className="w-5 h-5"/>
                    </button>
                    <div className={`w-px h-6 ${themeClasses.border} mx-2`}></div>
                    <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded hover:bg-black/10 transition-colors`} title="Unordered List">
                        <ListBulletIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded hover:bg-black/10 transition-colors`} title="Ordered List">
                        <OrderedListIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => applyParagraphStyle('blockquote')} className={`p-2 rounded hover:bg-black/10 transition-colors`} title="Blockquote">
                        <BlockquoteIcon className="w-5 h-5"/>
                    </button>
                    <div className={`w-px h-6 ${themeClasses.border} mx-2`}></div>
                    <button onClick={() => applyCommand('undo')} className={`p-2 rounded hover:bg-black/10 transition-colors`} title="Undo">
                        <UndoIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => applyCommand('redo')} className={`p-2 rounded hover:bg-black/10 transition-colors`} title="Redo">
                        <RedoIcon className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="flex items-center">
                    <button onClick={() => navigate('/')} className={`p-2 flex items-center rounded hover:bg-black/10 transition-colors text-sm font-semibold`} title="Go back to Home">
                        <BookOpenIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
                <Pane 
                    data={leftPane} 
                    onSetData={setLeftPane} 
                    themeClasses={themeClasses}
                    projectData={projectData}
                    setProjectData={setProjectData}
                    t={t}
                />
                
                {/* Divider */}
                <div className={`w-px ${themeClasses.border} bg-current opacity-20`} />
                
                <Pane 
                    data={rightPane} 
                    onSetData={setRightPane} 
                    themeClasses={themeClasses}
                    projectData={projectData}
                    setProjectData={setProjectData}
                    t={t}
                />
            </div>
        </div>
    );
};

const Pane = ({ data, onSetData, themeClasses, projectData, setProjectData, t }: any) => {
    const docxInputRef = React.useRef<HTMLInputElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [showOptions, setShowOptions] = React.useState(false);
    const [showIdeasModal, setShowIdeasModal] = React.useState(false);

    React.useEffect(() => {
        document.execCommand('defaultParagraphSeparator', false, 'p');
        if (contentRef.current && data) {
            const initialHtml = data.htmlContent || '<p><br></p>';
            if (contentRef.current.innerHTML !== initialHtml) {
                contentRef.current.innerHTML = initialHtml;
            }
        }
    }, [data?.id]); // Only update DOM on initial load or document switch

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setShowOptions(false);
            const arrayBuffer = await file.arrayBuffer();
            const mammothLib = (mammoth as any).default || mammoth;
            const { value: html } = await mammothLib.convertToHtml({ arrayBuffer });
            
            const tempDiv = document.createElement('div');
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
            
            let ideaTitle = file.name.replace(/\.docx$/i, '');
            
            onSetData({
                id: crypto.randomUUID(),
                title: ideaTitle,
                htmlContent: tempDiv.innerHTML,
                isManualSaveRequired: true
            });
        } catch (error: any) {
            console.error(error);
            alert(`Failed: ${error.message}`);
        } finally {
            e.target.value = '';
        }
    };

    const handleSelectIdea = (idea: StoryIdea) => {
        onSetData({
            id: idea.id,
            title: idea.title,
            htmlContent: idea.synopsis,
            isManualSaveRequired: false
        });
        setShowIdeasModal(false);
        setShowOptions(false);
    };

    const handleCreateBlankPage = () => {
        const newIdeaId = crypto.randomUUID();
        const newIdea: StoryIdea = {
            id: newIdeaId,
            title: 'Untitled Idea',
            synopsis: '<p><br></p>',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            wordCount: 0,
            status: 'Seedling',
            tags: [],
            visitCount: 0
        };
        
        setProjectData((prev: any) => prev ? { ...prev, storyIdeas: [newIdea, ...(prev.storyIdeas || [])] } : null);

        onSetData({
            id: newIdeaId,
            title: 'Untitled Idea',
            htmlContent: '',
            isManualSaveRequired: false
        });
        setShowOptions(false);
    };
    
    // Content editable handler
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;
        document.execCommand('insertText', false, text);
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const newContent = target.innerHTML;
        
        onSetData((prev: any) => prev ? { ...prev, htmlContent: newContent } : null);

        if (data?.isManualSaveRequired !== true && data?.id) {
            setProjectData((prev: any) => {
                if (!prev) return null;
                return {
                    ...prev,
                    storyIdeas: prev.storyIdeas.map((idea: StoryIdea) => 
                        idea.id === data.id ? { ...idea, synopsis: newContent, updatedAt: Date.now() } : idea
                    )
                };
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
            return;
        }

        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE) {
                const node = range.startContainer;
                const parent = node.parentElement;
                
                if (e.key === 'Backspace' && range.startOffset === 0 && parent && parent.tagName !== 'P') {
                    // Let browser handle normally if we're at the start of a non-P block
                    return;
                }
                
                if (node.textContent === '') {
                    e.preventDefault();
                    if (parent && parent.childNodes.length === 1 && parent.tagName === 'P') {
                        parent.innerHTML = '<br>';
                    } else if (parent) {
                        parent.removeChild(node);
                    }
                    return;
                }
            }
            return;
        }

        if (e.key === '.' || e.key === '-' || e.key === '"' || e.key === "'") {
            if (!range.collapsed) return;
            
            const node = range.startContainer;
            if (node.nodeType === Node.TEXT_NODE) {
                const textBeforeCursor = node.textContent?.slice(0, range.startOffset) || '';
                
                if (e.key === '.' && textBeforeCursor.endsWith('..')) {
                    e.preventDefault();
                    document.execCommand('delete');
                    document.execCommand('delete');
                    document.execCommand('insertText', false, '…');
                    return;
                }
                
                if (e.key === '-' && textBeforeCursor.endsWith('-')) {
                    e.preventDefault();
                    document.execCommand('delete');
                    document.execCommand('insertText', false, '—');
                    return;
                }

                if (e.key === '"' || e.key === "'") {
                    e.preventDefault();
                    const precedingRange = document.createRange();
                    precedingRange.selectNodeContents(contentRef.current!);
                    precedingRange.setEnd(range.startContainer, range.startOffset);
                    
                    // Simple heuristic to determine if we are at the start of a block
                    const isAtStartOfBlock = 
                        precedingRange.toString().trim() === '' || 
                        precedingRange.toString().match(/(\n|\r)$/) !== null;

                    const fullTextBefore = precedingRange.toString();
                    const lastChar = fullTextBefore.slice(-1);

                    if (isAtStartOfBlock) {
                        document.execCommand('insertText', false, e.key === '"' ? '“' : '‘');
                    } else if (e.key === "'") {
                        if (/\\w/.test(lastChar)) {
                            document.execCommand('insertText', false, '’');
                        } else {
                            const openSingleCount = (fullTextBefore.match(/‘/g) || []).length;
                            const closeSingleCount = (fullTextBefore.match(/’/g) || []).length;
                            document.execCommand('insertText', false, openSingleCount > closeSingleCount ? '’' : '‘');
                        }
                    } else { // e.key === '"'
                        const openDoubleCount = (fullTextBefore.match(/“/g) || []).length;
                        const closeDoubleCount = (fullTextBefore.match(/”/g) || []).length;
                        document.execCommand('insertText', false, openDoubleCount > closeDoubleCount ? '”' : '“');
                    }
                    
                    contentRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    return;
                }
            }
        }
    };


    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        onSetData((prev: any) => prev ? { ...prev, title: newTitle } : null);

        if (data?.isManualSaveRequired !== true && data?.id) {
            setProjectData((prev: any) => {
                if (!prev) return null;
                return {
                    ...prev,
                    storyIdeas: prev.storyIdeas.map((idea: StoryIdea) => 
                        idea.id === data.id ? { ...idea, title: newTitle, updatedAt: Date.now() } : idea
                    )
                };
            });
        }
    };

    const handleSaveToIdeaBox = () => {
        if (!data) return;
        
        setProjectData((prev: any) => {
            if (!prev) return null;
            
            const existingIdeaIndex = prev.storyIdeas?.findIndex((i: StoryIdea) => i.id === data.id);
            const isExisting = existingIdeaIndex !== undefined && existingIdeaIndex >= 0;
            
            if (isExisting) {
                // Update existing
                return {
                    ...prev,
                    storyIdeas: prev.storyIdeas.map((idea: StoryIdea) => 
                        idea.id === data.id ? { ...idea, title: data.title, synopsis: data.htmlContent, updatedAt: Date.now() } : idea
                    )
                };
            } else {
                // Add new
                const newIdeaId = data.id || crypto.randomUUID();
                const newIdea: StoryIdea = {
                    id: newIdeaId,
                    title: data.title,
                    synopsis: data.htmlContent || '<p><br></p>',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    wordCount: 0,
                    status: 'Seedling',
                    tags: [],
                    visitCount: 0
                };
                
                // Update local state to enable autosave going forward
                onSetData((prevData: any) => prevData ? { ...prevData, id: newIdeaId, isManualSaveRequired: false } : null);
                
                return {
                    ...prev,
                    storyIdeas: [newIdea, ...(prev.storyIdeas || [])]
                };
            }
        });
        
        alert("Saved to Idea Box! It will now auto-save your changes.");
    };

    const handleDownloadHtml = () => {
        if (!data) return;
        downloadAsHtml(data.htmlContent, data.title || 'document');
    };

    const editorStyle = React.useMemo(() => {
        const baseFontSize = projectData?.settings?.baseFontSize || 18;
        return {
            fontSize: `${baseFontSize}px`,
            lineHeight: projectData?.settings?.lineSpacing || 1.6,
        };
    }, [projectData?.settings?.baseFontSize, projectData?.settings?.lineSpacing]);

    if (data) {
        return (
            <div className="flex-1 flex flex-col h-full bg-white/5 relative">
                <div className={`p-2 border-b ${themeClasses.border} flex justify-between items-center h-12`}>
                    <input 
                        type="text" 
                        value={data.title} 
                        onChange={handleTitleChange}
                        className={`font-semibold bg-transparent outline-none flex-1 truncate ${themeClasses.text}`} 
                        placeholder="Untitled"
                    />
                    <div className="flex items-center space-x-1 ml-2">
                        {data.isManualSaveRequired && (
                            <button onClick={handleSaveToIdeaBox} className="text-xs px-3 py-1 rounded bg-black/20 hover:bg-black/30 whitespace-nowrap">
                                Save
                            </button>
                        )}
                        <button onClick={handleDownloadHtml} className="p-1 hover:bg-black/10 rounded flex-shrink-0" title="Download HTML">
                            <DownloadIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => onSetData(null)} className="p-1 hover:bg-black/10 rounded flex-shrink-0">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto w-full relative">
                    <div className="px-8 md:px-16 lg:px-24 pt-8 pb-48 mx-auto w-full max-w-[900px]">
                        <div 
                            ref={contentRef}
                            className="w-full min-h-[50vh] leading-relaxed outline-none story-content"
                            style={editorStyle}
                            contentEditable
                            suppressContentEditableWarning
                            onPaste={handlePaste}
                            onInput={handleInput}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center relative">
            {!showOptions ? (
                <button 
                    onClick={() => setShowOptions(true)}
                    className={`p-4 rounded-full ${themeClasses.bgSecondary} hover:opacity-80 transition-opacity`}
                >
                    <PlusIcon className="w-12 h-12" />
                </button>
            ) : (
                <div className={`flex flex-col gap-4 p-6 rounded-lg ${themeClasses.bgSecondary} shadow-lg`}>
                    <h3 className="text-lg font-bold text-center">Import Document</h3>
                    <button 
                        onClick={handleCreateBlankPage}
                        className={`px-4 py-2 rounded ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
                    >
                        Create Blank Page
                    </button>
                    <button 
                        onClick={() => setShowIdeasModal(true)}
                        className={`px-4 py-2 rounded border border-current hover:opacity-80`}
                    >
                        From Idea Box
                    </button>
                    <button 
                        onClick={() => docxInputRef.current?.click()}
                        className={`px-4 py-2 rounded ${themeClasses.bgTertiary} hover:opacity-80`}
                    >
                        From DOCX Format
                    </button>
                    <button 
                        onClick={() => setShowOptions(false)}
                        className="text-sm mt-2 opacity-70 hover:opacity-100"
                    >
                        Cancel
                    </button>
                </div>
            )}
            
            <input
                type="file"
                ref={docxInputRef}
                style={{ display: 'none' }}
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
            />
            
            {showIdeasModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className={`w-full max-w-md p-6 rounded-lg shadow-xl flex flex-col max-h-[80vh] ${themeClasses.bgSecondary} ${themeClasses.text}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Select from Idea Box</h2>
                            <button onClick={() => setShowIdeasModal(false)} className="hover:opacity-70">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                            {projectData?.storyIdeas?.map((idea: StoryIdea) => (
                                <button
                                    key={idea.id}
                                    onClick={() => handleSelectIdea(idea)}
                                    className={`w-full text-left p-3 rounded-lg border ${themeClasses.border} hover:${themeClasses.bgTertiary} transition-colors`}
                                >
                                    <div className="font-semibold truncate">{idea.title}</div>
                                    <div className="text-xs opacity-70 mt-1">{idea.wordCount} words</div>
                                </button>
                            ))}
                            {(!projectData?.storyIdeas || projectData.storyIdeas.length === 0) && (
                                <div className="text-center py-8 opacity-70">No ideas found.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkingModelPage;
