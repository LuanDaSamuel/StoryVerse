

import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, BookOpenIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, TextIcon, SearchIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, CloseIcon } from '../components/Icons';
import { enhancePlainText, enhanceHtml, THEME_CONFIG } from '../constants';

// --- Reusable Components ---
const ChapterListModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    novel: { id: string; chapters: { id: string; title: string }[] };
    currentChapterId: string;
    themeClasses: any;
}> = ({ isOpen, onClose, novel, currentChapterId, themeClasses }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4 font-sans"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className={`w-full max-w-md p-6 rounded-lg shadow-2xl ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Chapter Outline</h2>
                    <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <nav className="max-h-[60vh] overflow-y-auto -mr-2 pr-2">
                    <ul className="space-y-1">
                        {novel.chapters.map(c => (
                            <li key={c.id}>
                                <Link
                                    to={`/novel/${novel.id}/edit/${c.id}`}
                                    onClick={onClose}
                                    className={`block w-full text-left px-3 py-2 rounded-md transition-colors ${c.id === currentChapterId ? `${themeClasses.bgTertiary}` : `hover:${themeClasses.bgTertiary}`}`}
                                >
                                    {enhancePlainText(c.title || 'Untitled Chapter')}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </div>
    );
};

interface ToolbarDropdownProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
}

const ToolbarDropdown: React.FC<ToolbarDropdownProps> = ({ label, value, onChange, children }) => {
    return (
        <div>
            <label className="block text-xs font-semibold mb-1 text-white/70">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={onChange}
                    className="w-full appearance-none px-3 py-2 text-sm rounded-md bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                    {children}
                </select>
                <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" />
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
    const { projectData, setProjectData, theme, themeClasses } = useContext(ProjectContext);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
    const [isChapterListModalOpen, setIsChapterListModalOpen] = useState(false);
    const [isFormatPanelOpen, setIsFormatPanelOpen] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false });
    const [currentFormat, setCurrentFormat] = useState({
        paragraphStyle: 'p',
        font: fontOptions[0].value,
        size: '18px',
        lineHeight: '1.5',
    });

    const editorStyle = useMemo(() => {
        // For the book theme, we need to explicitly set the color because
        // contentEditable's default styling can interfere with inheritance on a dark background.
        if (theme === 'book') {
            const colorClass = THEME_CONFIG.book.text;
            // Extracts the hex code from the Tailwind class, e.g., 'text-[#F5EADD]' -> '#F5EADD'
            const colorValue = colorClass.match(/\[(.*?)\]/)?.[1] || '#F5EADD';
            return { color: colorValue };
        }
        // For other themes, 'inherit' works fine and is more flexible.
        return { color: 'inherit' };
    }, [theme]);
    
    const colorPalette = useMemo(() => {
        if (theme === 'book') {
            const textColor = THEME_CONFIG.book.text.match(/\[(.*?)\]/)?.[1] || '#F5EADD';
            // For the book theme, replace the dark brown with the theme's main text color (off-white).
            return [textColor, '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'];
        }
        // Default palette for other themes.
        return ['#3B2F27', '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'];
    }, [theme]);
    
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
            if (!editorRef.current) return;
            editorRef.current.focus();
            const selection = window.getSelection();
            if (!selection?.rangeCount) return;

            if (selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontSize = size;
                span.textContent = '\u200B'; // Zero-width space
                range.insertNode(span);
                
                range.selectNodeContents(span);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // Use a unique background color to mark the selection, as it's more reliable than `fontSize`.
                const DUMMY_COLOR_RGB = 'rgb(1, 2, 3)';
                document.execCommand('styleWithCSS', false, 'true');
                document.execCommand('hiliteColor', false, DUMMY_COLOR_RGB);

                // Find all the temporary spans we just created.
                const tempSpans = Array.from(editorRef.current.querySelectorAll<HTMLElement>(`span[style*="background-color: ${DUMMY_COLOR_RGB}"]`));

                tempSpans.forEach(span => {
                    const parent = span.parentElement;

                    // Case 1: The selection was already inside a font-size span, and we selected all of its text.
                    // This creates a nested span. We need to merge them to prevent incorrect styling.
                    if (
                        parent &&
                        parent.tagName === 'SPAN' &&
                        parent.style.fontSize &&
                        parent.textContent === span.textContent
                    ) {
                        // Modify the parent's font size directly.
                        parent.style.fontSize = size;
                        // Then, unwrap the temporary inner span by moving its children out.
                        while (span.firstChild) {
                            parent.insertBefore(span.firstChild, span);
                        }
                        parent.removeChild(span);
                    } else {
                        // Case 2: A simple selection, or a partial selection within another span.
                        // Just replace the background color with the font size.
                        span.style.backgroundColor = '';
                        span.style.fontSize = size;
                    }
                });
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
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) {
            return;
        }

        const range = selection.getRangeAt(0);

        const handleQuotePair = (key: '"' | "'") => {
            e.preventDefault();
            const openQuote = key === '"' ? '“' : '‘';
            const closeQuote = key === '"' ? '”' : '’';

            if (range.collapsed) {
                const textNode = document.createTextNode(openQuote + closeQuote);
                range.insertNode(textNode);
                range.setStart(textNode, 1);
                range.setEnd(textNode, 1);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                const selectedContent = range.extractContents();
                const fragment = document.createDocumentFragment();
                fragment.appendChild(document.createTextNode(openQuote));
                fragment.appendChild(selectedContent);
                fragment.appendChild(document.createTextNode(closeQuote));
                range.insertNode(fragment);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        };

        if (e.key === '"') {
            handleQuotePair('"');
            return;
        }

        if (e.key === "'") {
            let isApostrophe = false;
            if (range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE) {
                const textContent = range.startContainer.textContent || '';
                const precedingChar = textContent.charAt(range.startOffset - 1);
                if (/\w/.test(precedingChar)) {
                    isApostrophe = true;
                }
            }

            if (isApostrophe) {
                e.preventDefault();
                document.execCommand('insertText', false, '’');
            } else {
                handleQuotePair("'");
            }
            return;
        }

        if (['.', '-'].includes(e.key)) {
            if (range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE) {
                const textNode = range.startContainer as Text;
                const offset = range.startOffset;

                if (e.key === '.' && textNode.textContent?.substring(offset - 2, offset) === '..') {
                    e.preventDefault();
                    range.setStart(textNode, offset - 2);
                    range.deleteContents();
                    range.insertNode(document.createTextNode('…'));
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    return;
                }

                if (e.key === '-' && textNode.textContent?.substring(offset - 1, offset) === '-') {
                    e.preventDefault();
                    range.setStart(textNode, offset - 1);
                    range.deleteContents();
                    range.insertNode(document.createTextNode('—'));
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    return;
                }
            }
        }
    
        if (e.key === 'Enter') {
            // This timeout allows the browser to execute its default 'Enter' behavior (creating a new paragraph)
            // before we run our logic to fix the styling and scroll position.
            setTimeout(() => {
                const newSelection = window.getSelection();
                if (!newSelection?.rangeCount || !editorRef.current) return;
                const newRange = newSelection.getRangeAt(0);
                
                // --- 1. Fix Font Size Inheritance ---
                let currentBlock = newRange.startContainer;
                while (currentBlock && currentBlock.parentNode !== editorRef.current) {
                    currentBlock = currentBlock.parentNode;
                }
                
                if (currentBlock instanceof HTMLElement) {
                    const isNewBlockEmpty = (currentBlock.textContent?.trim() === '' && currentBlock.children.length === 0) || currentBlock.innerHTML === '<br>';
                    
                    if (isNewBlockEmpty) {
                        const previousBlock = currentBlock.previousElementSibling;
                        if (previousBlock instanceof HTMLElement) {
                            // Find the very last element in the previous block to get its style.
                            let styleSource: Element = previousBlock;
                            while (styleSource.lastElementChild) {
                                styleSource = styleSource.lastElementChild;
                            }
                            
                            const computedStyle = window.getComputedStyle(styleSource);
                            const fontSize = computedStyle.fontSize;
                            const defaultFontSize = window.getComputedStyle(editorRef.current).fontSize;
                            
                            // If the previous line had a custom font size, apply it to the new line.
                            if (fontSize && fontSize !== defaultFontSize) {
                                currentBlock.innerHTML = ''; // Clear the default <br>
                                const styleCarrier = document.createElement('span');
                                styleCarrier.style.fontSize = fontSize;
                                styleCarrier.innerHTML = '&#8203;'; // Use a zero-width space as a placeholder for the cursor.
                                currentBlock.appendChild(styleCarrier);
                                
                                // Place the cursor inside our new styled span.
                                newRange.setStart(styleCarrier.firstChild!, 1);
                                newRange.collapse(true);
                                newSelection.removeAllRanges();
                                newSelection.addRange(newRange);
                            }
                        }
                    }
                }

                // --- 2. Adjust Scroll Position ---
                let element = newRange.startContainer;
                if (element.nodeType === Node.TEXT_NODE) {
                    element = element.parentElement!;
                }
                
                if (!(element instanceof HTMLElement)) return;

                const toolbarEl = toolbarRef.current;
                const scrollContainerEl = scrollContainerRef.current;
                if (!toolbarEl || !scrollContainerEl) return;
                
                const elementRect = element.getBoundingClientRect();
                const toolbarRect = toolbarEl.getBoundingClientRect();
                const buffer = 20; 

                if (elementRect.bottom > toolbarRect.top - buffer) {
                    const scrollAmount = elementRect.bottom - (toolbarRect.top - buffer);
                    scrollContainerEl.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                }
            }, 0); // Timeout 0 ensures this runs immediately after the browser's default action.
        }
    };

    // --- Effects ---
    useEffect(() => {
        if (editorRef.current && chapter) {
            const editorHadFocus = document.activeElement === editorRef.current;
            const initialContent = chapter.content || '<p><br></p>';
            const enhancedContent = enhanceHtml(initialContent);

            if (editorRef.current.innerHTML !== enhancedContent) {
                editorRef.current.innerHTML = enhancedContent;
            }

            if (editorHadFocus) {
                editorRef.current.focus();
                const selection = window.getSelection();
                if (selection) {
                    const range = document.createRange();
                    range.selectNodeContents(editorRef.current);
                    range.collapse(false); // Go to end
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }
        handleSelectionChange();
    }, [chapterId]);


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
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
                setIsFormatPanelOpen(false);
            }
        };

        if (isFormatPanelOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFormatPanelOpen]);
    
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

    if (!projectData || !novel || !chapter || !chapterId) {
        return (
            <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}>
                <p>Loading chapter...</p>
            </div>
        );
    }

    return (
        <>
            <div className={`flex h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
                {/* Backdrop for sidebar */}
                {isSidebarOpen && (
                    <div
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/50 z-30"
                        aria-hidden="true"
                    />
                )}
                
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
                            className="w-full text-lg leading-relaxed outline-none story-content editor-container"
                            style={editorStyle}
                        />
                    </div>
                </div>
                
                {/* Editor Tools Sidebar */}
                <div
                    className={`
                        fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out
                        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
                    `}
                >
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

                        <div className="flex-1 overflow-y-auto">
                           <div className={`border-b ${themeClasses.border}`}>
                                <button
                                    onClick={() => setIsChapterListModalOpen(true)}
                                    className={`w-full flex justify-between items-center py-3 px-4 font-semibold text-left transition-colors hover:${themeClasses.bgTertiary}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <BookOpenIcon className="w-5 h-5" />
                                        <span>Chapter Outline</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pinned Toolbar */}
                <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none">
                    <div ref={toolbarRef} className="relative pointer-events-auto">
                        {isFormatPanelOpen && (
                            <div
                                className="absolute bottom-full mb-2 p-4 rounded-lg shadow-lg bg-stone-900/80 border border-white/10 backdrop-blur-sm w-[320px]"
                            >
                                <div className="space-y-4">
                                    <ToolbarDropdown label="Paragraph Style" value={currentFormat.paragraphStyle} onChange={(e) => applyParagraphStyle(e.target.value)}>
                                        <option value="p">Paragraph</option>
                                        <option value="h1">Heading 1</option>
                                        <option value="h2">Heading 2</option>
                                    </ToolbarDropdown>
                                    <ToolbarDropdown label="Font" value={currentFormat.font} onChange={(e) => applyFont(e.target.value)}>
                                        {fontOptions.map(font => <option key={font.name} value={font.value}>{font.name}</option>)}
                                    </ToolbarDropdown>
                                    <div className="grid grid-cols-2 gap-4">
                                        <ToolbarDropdown label="Size" value={currentFormat.size} onChange={(e) => applyFontSize(e.target.value)}>
                                            <option value="14px">14</option>
                                            <option value="16px">16</option>
                                            <option value="18px">18</option>
                                            <option value="20px">20</option>
                                            <option value="24px">24</option>
                                        </ToolbarDropdown>
                                        <ToolbarDropdown label="Line Spacing" value={currentFormat.lineHeight} onChange={(e) => applyLineHeight(e.target.value)}>
                                            <option value="1">Single</option>
                                            <option value="1.5">1.5</option>
                                            <option value="2">Double</option>
                                        </ToolbarDropdown>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-2 text-white/70">Color</label>
                                        <div className="flex space-x-2">
                                            {colorPalette.map(color => (
                                                <button key={color} onClick={() => applyColor(color)} className="w-6 h-6 rounded-full border border-gray-400" style={{backgroundColor: color}}></button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div
                            className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm"
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            <button onClick={() => setIsFormatPanelOpen(p => !p)} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${isFormatPanelOpen ? 'bg-white/20' : ''}`}><TextIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <button onClick={() => applyFormat('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.isBold ? 'bg-white/20' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyFormat('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.isItalic ? 'bg-white/20' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <button onClick={() => setIsFindReplaceOpen(true)} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><SearchIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <button onClick={() => applyFormat('undo')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><UndoIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyFormat('redo')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><RedoIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
            </div>

            {!isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className={`
                        fixed top-4 right-4 z-30 p-2 rounded-md
                        ${themeClasses.bgSecondary} ${themeClasses.accentText}
                        hover:opacity-80 shadow-lg border ${themeClasses.border}
                    `}
                    aria-label="Open editor tools"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
            )}

            <FindReplaceModal 
                isOpen={isFindReplaceOpen}
                onClose={() => setIsFindReplaceOpen(false)}
                onReplaceAll={handleReplaceAll}
            />
            
            <ChapterListModal
                isOpen={isChapterListModalOpen}
                onClose={() => setIsChapterListModalOpen(false)}
                novel={novel}
                currentChapterId={chapterId}
                themeClasses={themeClasses}
            />
        </>
    );
};

export default ChapterEditorPage;