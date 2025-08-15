

import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, BookOpenIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, TextIcon, SearchIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, CloseIcon } from '../components/Icons';
import { enhancePlainText } from '../constants';

// --- Reusable Components ---
interface AccordionProps {
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    fullWidthBorder?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ title, icon, isOpen, onToggle, children, fullWidthBorder = false }) => {
    const { themeClasses } = useContext(ProjectContext);
    const borderClass = fullWidthBorder ? '' : `border-b ${themeClasses.border}`;
    return (
        <div className={borderClass}>
            <button onClick={onToggle} className="w-full flex justify-between items-center py-3 px-4 font-semibold text-left">
                <div className="flex items-center space-x-3">{icon}<span>{title}</span></div>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="pb-4 pt-2 px-4">{children}</div>}
        </div>
    );
};

interface EditorDropdownProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
}

const EditorDropdown: React.FC<EditorDropdownProps> = ({ label, value, onChange, children }) => {
    const { themeClasses } = useContext(ProjectContext);
    return (
        <div>
            <label className={`block text-xs font-semibold mb-1 ${themeClasses.textSecondary}`}>{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={onChange}
                    className={`w-full appearance-none px-3 py-2 rounded-md ${themeClasses.input} border ${themeClasses.border} focus:outline-none focus:ring-2 focus:${themeClasses.accentBorder}`}
                >
                    {children}
                </select>
                <ChevronDownIcon className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${themeClasses.textSecondary}`} />
            </div>
        </div>
    );
};

const fontOptions = [
    { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
];

// --- Find & Replace Modal Component ---
interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplaceAll: (find: string, replace: string, scope: 'current' | 'all') => void;
}

const FindReplaceModal: React.FC<FindReplaceModalProps> = ({ isOpen, onClose, onReplaceAll }) => {
  const { themeClasses } = useContext(ProjectContext);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [scope, setScope] = useState<'current' | 'all'>('current');

  if (!isOpen) return null;
  
  const handleReplace = () => {
    if (findText) {
      onReplaceAll(findText, replaceText, scope);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity font-sans">
      <div className={`p-6 rounded-lg shadow-2xl w-full max-w-md m-4 ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Find & Replace</h2>
          <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`} aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Find..." 
            value={findText} 
            onChange={(e) => setFindText(e.target.value)} 
            className={`w-full px-3 py-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`}
          />
          <input 
            type="text" 
            placeholder="Replace with..." 
            value={replaceText} 
            onChange={(e) => setReplaceText(e.target.value)} 
            className={`w-full px-3 py-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`}
          />
          
          <div>
            <label className={`block text-sm font-semibold mb-2 ${themeClasses.textSecondary}`}>Scope</label>
            <div className={`flex rounded-md overflow-hidden border ${themeClasses.border}`}>
              <button 
                onClick={() => setScope('current')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${scope === 'current' ? `${themeClasses.accent} ${themeClasses.accentText}` : `hover:${themeClasses.bgTertiary}`}`}
              >
                Current Chapter
              </button>
              <button 
                onClick={() => setScope('all')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors border-l ${themeClasses.border} ${scope === 'all' ? `${themeClasses.accent} ${themeClasses.accentText}` : `hover:${themeClasses.bgTertiary}`}`}
              >
                Entire Novel
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={onClose}
            className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} hover:opacity-80 transition-opacity`}
          >
            Cancel
          </button>
          <button
            onClick={handleReplace}
            disabled={!findText}
            className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Replace All
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Main Page Component ---
const ChapterEditorPage: React.FC = () => {
    const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, themeClasses } = useContext(ProjectContext);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const isEditorUpdate = useRef(false);
    
    const [openAccordion, setOpenAccordion] = useState<string | null>('format');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false });
    const [currentFormat, setCurrentFormat] = useState({
        paragraphStyle: 'p',
        font: fontOptions[0].value,
        size: '18px',
        lineHeight: '1.5',
    });
    
    const { novel, chapter, chapterIndex, novelIndex } = useMemo(() => {
        if (!projectData?.novels || !novelId || !chapterId) return { novel: null, chapter: null, chapterIndex: -1, novelIndex: -1 };
        
        const nIndex = projectData.novels.findIndex(n => n.id === novelId);
        if (nIndex === -1) return { novel: null, chapter: null, chapterIndex: -1, novelIndex: -1 };
        
        const n = projectData.novels[nIndex];
        const cIndex = n.chapters.findIndex(c => c.id === chapterId);
        if (cIndex === -1) return { novel: n, chapter: null, chapterIndex: -1, novelIndex: nIndex };

        return {
            novel: n,
            chapter: n.chapters[cIndex],
            chapterIndex: cIndex,
            novelIndex: nIndex,
        };
    }, [projectData, novelId, chapterId]);

    const updateChapterField = useCallback((field: 'title' | 'content', value: string) => {
        if (projectData && novelIndex !== -1 && chapterIndex !== -1) {
            isEditorUpdate.current = true;
            const updatedProjectData = { ...projectData };
            const updatedNovels = [...updatedProjectData.novels];
            const updatedChapters = [...updatedNovels[novelIndex].chapters];
            const originalChapter = updatedChapters[chapterIndex];
            
            let updatedChapter = { ...originalChapter };
            const now = new Date();

            if (field === 'content') {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = value;
                const text = tempDiv.textContent || "";
                const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

                const FIVE_MINUTES = 5 * 60 * 1000;
                const shouldCreateHistory = now.getTime() - new Date(originalChapter.updatedAt).getTime() > FIVE_MINUTES;

                if (shouldCreateHistory) {
                    const newHistoryEntry = {
                        timestamp: originalChapter.updatedAt,
                        content: originalChapter.content,
                    };
                    updatedChapter.history = [newHistoryEntry, ...(originalChapter.history || [])];
                }
                
                updatedChapter = { ...updatedChapter, content: value, wordCount, updatedAt: now.toISOString() };

            } else {
                 updatedChapter = { ...updatedChapter, title: value };
            }

            updatedChapters[chapterIndex] = updatedChapter;
            updatedNovels[novelIndex] = { ...updatedNovels[novelIndex], chapters: updatedChapters };
            updatedProjectData.novels = updatedNovels;
            setProjectData(updatedProjectData);
        }
    }, [projectData, novelIndex, chapterIndex, setProjectData]);
    
    const updateActiveFormats = useCallback(() => {
        setActiveFormats({
            isBold: document.queryCommandState('bold'),
            isItalic: document.queryCommandState('italic'),
        });
    }, []);

    const updateCurrentFormat = useCallback(() => {
        if (!editorRef.current) return;
        const selection = window.getSelection();
        if (!selection?.rangeCount || !editorRef.current.contains(selection.anchorNode)) {
            return;
        }

        let element = selection.anchorNode;
        if (element.nodeType === 3) {
            element = element.parentNode!;
        }

        if (!(element instanceof HTMLElement)) return;

        let detectedParagraphStyle = 'p';
        let detectedLineHeight = '1.5';
        
        let blockElement: HTMLElement | null = element;
        while (blockElement && blockElement !== editorRef.current) {
            const tagName = blockElement.tagName.toLowerCase();
            if (['p', 'h1', 'h2'].includes(tagName)) {
                detectedParagraphStyle = tagName;
                const styles = window.getComputedStyle(blockElement);
                if (styles.lineHeight && styles.lineHeight !== 'normal') {
                    const lh = parseFloat(styles.lineHeight);
                    const fs = parseFloat(styles.fontSize);
                    if (fs > 0) {
                        const calculatedLh = Math.round((lh / fs) * 10) / 10;
                         if ([1, 1.5, 2].includes(calculatedLh)) {
                            detectedLineHeight = String(calculatedLh);
                        }
                    }
                }
                break;
            }
            blockElement = blockElement.parentElement;
        }

        const inlineStyles = window.getComputedStyle(element);
        const detectedSize = inlineStyles.fontSize;
        
        const family = inlineStyles.fontFamily;
        const matchedFont = fontOptions.find(f => family.includes(f.name))?.value || fontOptions[0].value;

        setCurrentFormat({
            paragraphStyle: detectedParagraphStyle,
            font: matchedFont,
            size: detectedSize,
            lineHeight: detectedLineHeight,
        });
    }, []);

    const handleSelectionChange = useCallback(() => {
        updateActiveFormats();
        updateCurrentFormat();
    }, [updateActiveFormats, updateCurrentFormat]);

    const applyAndSaveFormat = useCallback((formatAction: () => void) => {
        if (!editorRef.current) return;
        
        formatAction();
        
        const event = new Event('input', { bubbles: true, cancelable: true });
        editorRef.current.dispatchEvent(event);
        
        editorRef.current.focus();
        
        handleSelectionChange();

    }, [handleSelectionChange]);

    const applyFormat = (command: 'bold' | 'italic' | 'undo' | 'redo') => {
        applyAndSaveFormat(() => document.execCommand(command, false));
    };
    
    const applyParagraphStyle = (style: string) => {
        applyAndSaveFormat(() => document.execCommand('formatBlock', false, style));
    };
    
    const applyFont = (fontValue: string) => {
        const fontName = fontOptions.find(f => f.value === fontValue)?.name || 'serif';
        applyAndSaveFormat(() => document.execCommand('fontName', false, fontName));
    };

    const applyColor = (color: string) => {
        applyAndSaveFormat(() => document.execCommand('foreColor', false, color));
    };
    
    const applyFontSize = (size: string) => {
        applyAndSaveFormat(() => {
            document.execCommand('fontSize', false, '1'); // Placeholder size
            const fontElements = editorRef.current?.getElementsByTagName('font');
            if (fontElements) {
                for(let i = 0; i < fontElements.length; i++) {
                    if (fontElements[i].size === '1') {
                        fontElements[i].removeAttribute('size');
                        fontElements[i].style.fontSize = size;
                    }
                }
            }
        });
    };
    
    const applyLineHeight = (height: string) => {
        applyAndSaveFormat(() => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            let node = selection.getRangeAt(0).startContainer;
            if (node.nodeType === 3) node = node.parentNode!;
            while(node && node !== editorRef.current) {
                if(node instanceof HTMLElement && ['P', 'H1', 'H2', 'DIV'].includes(node.tagName)) {
                    node.style.lineHeight = height;
                    return;
                }
                node = node.parentNode!;
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter') {
            // Use a timeout to allow the DOM to update after the key press.
            setTimeout(() => {
                const selection = window.getSelection();
                if (!selection?.rangeCount) return;

                // Find the element containing the cursor.
                const range = selection.getRangeAt(0);
                let element = range.startContainer;
                if (element.nodeType === Node.TEXT_NODE) {
                    element = element.parentElement!;
                }
                
                if (!(element instanceof HTMLElement)) return;

                const toolbarEl = toolbarRef.current;
                const scrollContainerEl = scrollContainerRef.current;

                if (!toolbarEl || !scrollContainerEl) return;
                
                const elementRect = element.getBoundingClientRect();
                const toolbarRect = toolbarEl.getBoundingClientRect();
                
                // Add a buffer so text doesn't sit exactly on the toolbar line.
                const buffer = 20; 

                // Check if the bottom of the current line is getting obscured by the toolbar.
                if (elementRect.bottom > toolbarRect.top - buffer) {
                    // Calculate how much to scroll to bring the line above the toolbar with the buffer.
                    const scrollAmount = elementRect.bottom - (toolbarRect.top - buffer);
                    
                    scrollContainerEl.scrollBy({
                        top: scrollAmount,
                        behavior: 'smooth',
                    });
                }
            }, 10);
        }
    };

    // --- Effects ---
    useEffect(() => {
        if (isEditorUpdate.current) {
            isEditorUpdate.current = false;
            return;
        }

        if (editorRef.current && chapter && editorRef.current.innerHTML !== chapter.content) {
            editorRef.current.innerHTML = chapter.content || '';
        }
        handleSelectionChange();
    }, [chapter, handleSelectionChange]);

    useEffect(() => {
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', handleSelectionChange);
        if (editorEl) {
            editorEl.addEventListener('keyup', handleSelectionChange);
            editorEl.addEventListener('mouseup', handleSelectionChange);
            editorEl.addEventListener('focus', handleSelectionChange);
        }
        window.addEventListener('resize', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            if(editorEl) {
                editorEl.removeEventListener('keyup', handleSelectionChange);
                editorEl.removeEventListener('mouseup', handleSelectionChange);
                editorEl.removeEventListener('focus', handleSelectionChange);
            }
            window.removeEventListener('resize', handleSelectionChange);
        };
    }, [handleSelectionChange]);
    
    const handleAccordionToggle = (accordionId: string) => {
        setOpenAccordion(prev => (prev === accordionId ? null : prev));
    };
    
    const handleReplaceAll = (find: string, replace: string, scope: 'current' | 'all') => {
      if (!projectData || !novel || novelIndex === -1 || !find) {
        setIsFindReplaceOpen(false);
        return;
      }

      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const findRegex = new RegExp(escapeRegExp(find), 'gi');
      const tempDiv = document.createElement('div');

      const getWordCount = (html: string) => {
        if (!html) return 0;
        tempDiv.innerHTML = html;
        const text = tempDiv.textContent || "";
        return text.trim().split(/\s+/).filter(Boolean).length;
      };

      const updatedNovels = [...projectData.novels];
      let currentNovel = updatedNovels[novelIndex];
      let changesMade = false;

      const updatedChapters = currentNovel.chapters.map(chap => {
        if ((scope === 'current' && chap.id === chapterId) || scope === 'all') {
          const newContent = chap.content.replace(findRegex, replace);
          if (newContent !== chap.content) {
            changesMade = true;
            return { 
              ...chap, 
              content: newContent, 
              wordCount: getWordCount(newContent),
              updatedAt: new Date().toISOString() 
            };
          }
        }
        return chap;
      });

      if (changesMade) {
        currentNovel = { ...currentNovel, chapters: updatedChapters };
        updatedNovels[novelIndex] = currentNovel;
        setProjectData({ ...projectData, novels: updatedNovels });
      }

      setIsFindReplaceOpen(false);
    };

    if (!projectData || !novel || !chapter) {
        return (
            <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}>
                <p>Loading chapter...</p>
            </div>
        );
    }

    return (
        <>
            <div className={`relative flex h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
                     <div className={`sticky top-0 z-10 px-8 md:px-16 lg:px-24 pt-6 pb-4 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border}`}>
                        <button onClick={() => navigate(`/novel/${novelId}`)} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                            <BackIcon className="w-5 h-5" />
                            <span className="font-sans">Return to Details</span>
                        </button>
                    </div>
                    
                    <div className="px-8 md:px-16 lg:px-24 pt-8 pb-48">
                        <input
                            type="text"
                            value={chapter.title}
                            onChange={(e) => updateChapterField('title', e.target.value)}
                            placeholder="Chapter Title"
                            className="text-4xl font-bold bg-transparent outline-none w-full mb-8"
                        />
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => updateChapterField('content', e.currentTarget.innerHTML)}
                            onKeyDown={handleKeyDown}
                            className="w-full text-lg leading-relaxed outline-none story-content"
                            style={{ color: 'inherit' }}
                        />
                    </div>
                </div>

                <div className={`
                    transition-all duration-300 ease-in-out flex-shrink-0
                    ${isSidebarOpen ? 'w-80' : 'w-0'}
                    overflow-hidden
                `}>
                    <div className={`w-80 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-l ${themeClasses.border} flex flex-col`}>
                        <div className={`px-4 py-3 flex justify-between items-center border-b ${themeClasses.border}`}>
                            <span className="font-bold text-base">EDITOR TOOLS</span>
                            <button onClick={() => setIsSidebarOpen(false)}>
                                <ChevronRightIcon className="w-5 h-5"/>
                            </button>
                        </div>

                        <div className={`px-4 py-4 border-b ${themeClasses.border}`}>
                            <p className="text-3xl font-bold">{(chapter.wordCount || 0).toLocaleString()}</p>
                            <p className={themeClasses.textSecondary}>WORDS</p>
                        </div>
                        <hr className={`border-t ${themeClasses.border} w-full`}/>

                        <div className="flex-1 overflow-y-auto">
                            <Accordion title="Chapter Outline" icon={<BookOpenIcon className="w-5 h-5" />} isOpen={openAccordion === 'outline'} onToggle={() => handleAccordionToggle('outline')} fullWidthBorder>
                                <div className="space-y-2">
                                {novel.chapters.map(c => (
                                    <Link 
                                            key={c.id} 
                                            to={`/novel/${novel.id}/edit/${c.id}`}
                                            className={`block p-2 rounded-md transition-colors ${c.id === chapterId ? `${themeClasses.bgTertiary}` : `hover:${themeClasses.bgTertiary}`}`}
                                    >
                                    {enhancePlainText(c.title || 'Untitled Chapter')}
                                    </Link>
                                ))}
                                </div>
                            </Accordion>
                            <hr className={`border-t ${themeClasses.border} w-full`}/>
                            <Accordion title="Format" icon={<TextIcon className="w-5 h-5" />} isOpen={openAccordion === 'format'} onToggle={() => handleAccordionToggle('format')} fullWidthBorder>
                                <div className="space-y-4">
                                    <EditorDropdown label="Paragraph Style" value={currentFormat.paragraphStyle} onChange={(e) => applyParagraphStyle(e.target.value)}>
                                        <option value="p">Paragraph</option>
                                        <option value="h1">Heading 1</option>
                                        <option value="h2">Heading 2</option>
                                    </EditorDropdown>
                                    <EditorDropdown label="Font" value={currentFormat.font} onChange={(e) => applyFont(e.target.value)}>
                                        {fontOptions.map(font => <option key={font.name} value={font.value}>{font.name}</option>)}
                                    </EditorDropdown>
                                    <div className="grid grid-cols-2 gap-4">
                                    <EditorDropdown label="Size" value={currentFormat.size} onChange={(e) => applyFontSize(e.target.value)}>
                                            <option value="14px">14</option>
                                            <option value="16px">16</option>
                                            <option value="18px">18</option>
                                            <option value="20px">20</option>
                                            <option value="24px">24</option>
                                    </EditorDropdown>
                                    <EditorDropdown label="Line Spacing" value={currentFormat.lineHeight} onChange={(e) => applyLineHeight(e.target.value)}>
                                            <option value="1">Single</option>
                                            <option value="1.5">1.5</option>
                                            <option value="2">Double</option>
                                    </EditorDropdown>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-2 ${themeClasses.textSecondary}`}>Color</label>
                                        <div className="flex space-x-2">
                                            {['#3B2F27', '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'].map(color => (
                                                <button key={color} onClick={() => applyColor(color)} className="w-6 h-6 rounded-full border border-gray-400" style={{backgroundColor: color}}></button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Accordion>
                        </div>
                    </div>
                </div>

                {/* Pinned Toolbar */}
                <div
                    ref={toolbarRef}
                    className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none"
                >
                    <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm pointer-events-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                        <button onClick={() => applyFormat('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.isBold ? 'bg-white/20' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyFormat('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.isItalic ? 'bg-white/20' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => setIsFindReplaceOpen(true)} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><SearchIcon className="w-5 h-5"/></button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => applyFormat('undo')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><UndoIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyFormat('redo')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><RedoIcon className="w-5 h-5"/></button>
                    </div>
                </div>

                 {!isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className={`
                            absolute top-4 right-4 z-30 p-2 rounded-md
                            ${themeClasses.bgSecondary} ${themeClasses.accentText}
                            hover:opacity-80 shadow-lg border ${themeClasses.border}
                        `}
                        aria-label="Open editor tools"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
            <FindReplaceModal 
                isOpen={isFindReplaceOpen}
                onClose={() => setIsFindReplaceOpen(false)}
                onReplaceAll={handleReplaceAll}
            />
        </>
    );
};

export default ChapterEditorPage;