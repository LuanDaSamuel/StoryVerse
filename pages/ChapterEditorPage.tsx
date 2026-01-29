
import * as React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, BookOpenIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, TextIcon, SearchIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, CloseIcon, Bars3Icon, DownloadIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, LoadingIcon, CheckIcon, ExclamationTriangleIcon, ClipboardIcon } from '../components/Icons';
import { enhancePlainText, enhanceHtml, THEME_CONFIG } from '../constants';
import ExportModal from '../components/ExportModal';
import { useTranslations } from '../hooks/useTranslations';

// --- Reusable Components ---

const SaveStatusIndicator = () => {
    const { theme, saveStatus } = React.useContext(ProjectContext);
    const t = useTranslations();

    const baseClasses = 'flex items-center space-x-2 text-sm font-sans font-semibold';

    switch (saveStatus) {
        case 'unsaved':
            const unsavedColor = theme === 'dark' ? 'text-amber-400' : 'text-amber-600';
            return <div className={`${baseClasses} ${unsavedColor}`}><span>{t.saveStatusUnsaved}</span></div>;
        case 'saving':
            const savingColor = theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
            return <div className={`${baseClasses} ${savingColor}`}><LoadingIcon className="w-4 h-4 animate-spin" /><span>{t.saveStatusSaving}</span></div>;
        case 'saved':
            const savedColor = theme === 'dark' ? 'text-green-400' : 'text-green-600';
            return <div className={`${baseClasses} ${savedColor}`}><CheckIcon className="w-4 h-4" /><span>{t.saveStatusSaved}</span></div>;
        case 'error':
            const errorColor = theme === 'dark' ? 'text-red-400' : 'text-red-600';
            return <div className={`${baseClasses} ${errorColor}`}><ExclamationTriangleIcon className="w-4 h-4" /><span>{t.saveStatusError}</span></div>;
        default:
            return null; // 'idle'
    }
};

const ChapterListModal = ({ isOpen, onClose, novel, currentChapterId, themeClasses }: {
    isOpen: boolean;
    onClose: () => void;
    novel: { id: string; chapters: { id: string; title: string }[] };
    currentChapterId: string;
    themeClasses: any;
}) => {
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
    children?: React.ReactNode;
}

const ToolbarDropdown = ({ label, value, onChange, children }: ToolbarDropdownProps) => {
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
const FindReplaceModal = ({ isOpen, onClose, editorRef, onReplaceAllInNovel }: {
  isOpen: boolean;
  onClose: () => void;
  editorRef: React.RefObject<HTMLDivElement>;
  onReplaceAllInNovel: (find: string, replace: string, caseSensitive: boolean, wholeWord: boolean) => void;
}) => {
  const { themeClasses } = React.useContext(ProjectContext);
  const [findText, setFindText] = React.useState('');
  const [replaceText, setReplaceText] = React.useState('');
  const [scope, setScope] = React.useState<'current' | 'all'>('current');
  const [matches, setMatches] = React.useState<HTMLElement[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(-1);
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [wholeWord, setWholeWord] = React.useState(false);
  const debounceTimeout = React.useRef<number | null>(null);

  const clearHighlights = React.useCallback(() => {
    if (!editorRef.current) return;
    const highlights = Array.from(editorRef.current.querySelectorAll('.search-highlight, .current-match') as NodeListOf<HTMLElement>);
    highlights.forEach(node => {
        const parent = node.parentNode;
        if (parent) {
            while(node.firstChild) {
                parent.insertBefore(node.firstChild, node);
            }
            parent.removeChild(node);
        }
    });
    // Normalizing after all unwraps is more efficient
    editorRef.current.normalize();
  }, [editorRef]);

  const handleClose = React.useCallback(() => {
    clearHighlights();
    setFindText('');
    setReplaceText('');
    setMatches([]);
    setCurrentIndex(-1);
    onClose();
  }, [clearHighlights, onClose]);

  const highlightMatches = React.useCallback(() => {
    clearHighlights();
    if (!findText || !editorRef.current || scope === 'all') {
        setMatches([]);
        setCurrentIndex(-1);
        return;
    }

    const newMatches: HTMLElement[] = [];
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    let flags = 'g';
    if (!caseSensitive) flags += 'i';
    let pattern = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    const regex = new RegExp(pattern, flags);

    textNodes.forEach(node => {
        if (!node.textContent || node.parentElement?.closest('.search-highlight')) return;

        const matchesInNode = [...node.textContent.matchAll(regex)];
        if (matchesInNode.length > 0) {
            let lastIndex = 0;
            const fragment = document.createDocumentFragment();
            matchesInNode.forEach(match => {
                const index = match.index!;
                if (index > lastIndex) {
                    fragment.appendChild(document.createTextNode(node.textContent!.slice(lastIndex, index)));
                }
                const span = document.createElement('span');
                span.className = 'search-highlight';
                span.textContent = match[0];
                fragment.appendChild(span);
                newMatches.push(span);
                lastIndex = index + match[0].length;
            });
            if (lastIndex < node.textContent.length) {
                fragment.appendChild(document.createTextNode(node.textContent.slice(lastIndex)));
            }
            node.parentNode?.replaceChild(fragment, node);
        }
    });

    setMatches(newMatches);
    setCurrentIndex(newMatches.length > 0 ? 0 : -1);
  }, [findText, editorRef, clearHighlights, caseSensitive, wholeWord, scope]);

  React.useEffect(() => {
    if (isOpen) {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = window.setTimeout(highlightMatches, 300);
    }
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [findText, isOpen, highlightMatches, caseSensitive, wholeWord, scope]);

  React.useEffect(() => {
    matches.forEach((match, index) => {
      if (index === currentIndex) {
        match.classList.add('current-match');
        match.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } else {
        match.classList.remove('current-match');
      }
    });
  }, [currentIndex, matches]);

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (matches.length === 0) return;
    setCurrentIndex(prev => {
        const nextIndex = direction === 'next' ? prev + 1 : prev - 1;
        return (nextIndex + matches.length) % matches.length;
    });
  };

  const handleReplace = () => {
    if (currentIndex === -1 || matches.length === 0) return;
    const match = matches[currentIndex];
    match.textContent = replaceText;
    match.classList.remove('search-highlight, .current-match');
    
    // Defer DOM changes to allow state to update first
    setTimeout(() => {
        const newMatches = matches.filter(m => m !== match);
        setMatches(newMatches);
        if (newMatches.length > 0) {
            setCurrentIndex(currentIndex % newMatches.length);
        } else {
            setCurrentIndex(-1);
        }
        editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }, 0);
  };
  
  const handleReplaceAll = () => {
    if (scope === 'current') {
      if (!editorRef.current || matches.length === 0) return;
      matches.forEach(match => {
        match.textContent = replaceText;
      });
      editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    } else {
      onReplaceAllInNovel(findText, replaceText, caseSensitive, wholeWord);
    }
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity font-sans" onClick={handleClose}>
      <div className={`p-6 rounded-lg shadow-2xl w-full max-w-md m-4 ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Find & Replace</h2>
          <button onClick={handleClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`} aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Find..." 
              value={findText} 
              onChange={(e) => setFindText(e.target.value)} 
              className={`w-full px-3 py-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`}
            />
            {findText && scope === 'current' && (
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${themeClasses.textSecondary}`}>
                    {matches.length > 0 ? `${currentIndex + 1} / ${matches.length}` : '0 matches'}
                </div>
            )}
          </div>
          <input 
            type="text" 
            placeholder="Replace with..." 
            value={replaceText} 
            onChange={(e) => setReplaceText(e.target.value)} 
            className={`w-full px-3 py-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`}
          />
        </div>
        <div className="flex items-center space-x-4 mt-3">
          <button onClick={() => setCaseSensitive(p => !p)} className={`px-3 py-1 text-xs rounded-md font-semibold ${caseSensitive ? `${themeClasses.accent} ${themeClasses.accentText}` : themeClasses.bgTertiary}`}>Aa</button>
          <button onClick={() => setWholeWord(p => !p)} className={`px-3 py-1 text-xs rounded-md font-semibold ${wholeWord ? `${themeClasses.accent} ${themeClasses.accentText}` : themeClasses.bgTertiary}`}>Whole Word</button>
        </div>

        <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-2">
                <button onClick={() => handleNavigate('prev')} disabled={matches.length === 0 || scope === 'all'} className={`px-3 py-1 rounded-md text-sm font-semibold ${themeClasses.bgTertiary} disabled:opacity-50`}>Previous</button>
                <button onClick={() => handleNavigate('next')} disabled={matches.length === 0 || scope === 'all'} className={`px-3 py-1 rounded-md text-sm font-semibold ${themeClasses.bgTertiary} disabled:opacity-50`}>Next</button>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={handleReplace} disabled={currentIndex === -1 || scope === 'all'} className={`px-4 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} disabled:opacity-50`}>Replace</button>
                <button onClick={handleReplaceAll} disabled={!findText} className={`px-4 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} disabled:opacity-50`}>Replace All</button>
            </div>
        </div>
        
        <div className="mt-4">
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
    </div>
  );
};

// --- Main Page Component ---
const ChapterEditorPage = () => {
    const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, theme, themeClasses, saveStatus } = React.useContext(ProjectContext);
    const t = useTranslations();
    
    const editorRef = React.useRef<HTMLDivElement>(null);
    const editorContentRef = React.useRef<string>("");
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const toolbarRef = React.useRef<HTMLDivElement>(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = React.useState(false);
    const [isChapterListModalOpen, setIsChapterListModalOpen] = React.useState(false);
    const [isFormatPanelOpen, setIsFormatPanelOpen] = React.useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
    const [isCopied, setIsCopied] = React.useState(false);
    const [activeFormats, setActiveFormats] = React.useState({ isBold: false, isItalic: false, isUL: false, isOL: false });
    const [currentFormat, setCurrentFormat] = React.useState({
        paragraphStyle: 'p',
        font: fontOptions[0].value,
        size: '18px',
        paragraphSpacing: '1em',
        lineHeight: '1.6',
        textIndent: '2em',
    });

    const cleanupEditor = React.useCallback(() => {
        if (!editorRef.current) return;
        const editor = editorRef.current;
    
        // 1. Remove empty inline elements that can cause bugs.
        // Run multiple passes to handle nested empty elements.
        for (let i = 0; i < 3; i++) {
            let changed = false;
            editor.querySelectorAll('span, strong, em, i, b').forEach(el => {
                if (!el.hasChildNodes() || el.textContent === '\u200B') {
                    el.remove();
                    changed = true;
                }
            });
            if (!changed) break;
        }
    
        // 2. Merge adjacent sibling elements with identical styles/tags.
        // This is crucial for fixing DOM fragmentation after multiple format applications.
        const mergeAdjacentSiblings = (parent: HTMLElement) => {
            let child = parent.firstChild;
            while (child) {
                const next = child.nextSibling;
                if (next && child.nodeType === Node.ELEMENT_NODE && next.nodeType === Node.ELEMENT_NODE) {
                    const el1 = child as HTMLElement;
                    const el2 = next as HTMLElement;
    
                    const areMergable = 
                        el1.tagName === el2.tagName &&
                        el1.className === el2.className &&
                        el1.style.cssText === el2.style.cssText;
    
                    if (areMergable) {
                        while (el2.firstChild) {
                            el1.appendChild(el2.firstChild);
                        }
                        parent.removeChild(el2);
                        // Do not advance child; check the new next sibling
                        continue;
                    }
                }
                child = next;
            }
        };
    
        editor.querySelectorAll('p, h1, h2, h3, blockquote, li, div').forEach(block => {
            mergeAdjacentSiblings(block as HTMLElement);
        });
    
        // 3. Merge adjacent text nodes. This fixes "stuck word" issues.
        editor.normalize();
    }, []);

    const editorStyle = React.useMemo(() => {
        const baseFontSize = projectData?.settings?.baseFontSize || 18;
        const style: React.CSSProperties = {
            fontSize: `${baseFontSize}px`
        };

        if (theme === 'book') {
            const colorClass = THEME_CONFIG.book.text;
            const colorValue = colorClass.match(/\[(.*?)\]/)?.[1] || '#F5EADD';
            style.color = colorValue;
        }
        return style;
    }, [theme, projectData?.settings?.baseFontSize]);
    
    const colorPalette = React.useMemo(() => {
        if (theme === 'book') {
            const textColor = THEME_CONFIG.book.text.match(/\[(.*?)\]/)?.[1] || '#F5EADD';
            return [textColor, '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'];
        }
        return ['#3B2F27', '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'];
    }, [theme]);
    
    const { novel, chapter, chapterIndex, novelIndex } = React.useMemo(() => {
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

    const updateChapterField = React.useCallback((field: 'title' | 'content', value: string) => {
        if (novelIndex === -1 || chapterIndex === -1) return;

        setProjectData(currentProjectData => {
            if (!currentProjectData) return null;

            const updatedProjectData = { ...currentProjectData };
            const updatedNovels = [...updatedProjectData.novels];
            if (novelIndex >= updatedNovels.length) return currentProjectData;

            const updatedChapters = [...updatedNovels[novelIndex].chapters];
            if (chapterIndex >= updatedChapters.length) return currentProjectData;
            
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
            return updatedProjectData;
        });
    }, [novelIndex, chapterIndex, setProjectData]);

    const updateActiveFormats = React.useCallback(() => {
        setActiveFormats({
            isBold: document.queryCommandState('bold'),
            isItalic: document.queryCommandState('italic'),
            isUL: document.queryCommandState('insertUnorderedList'),
            isOL: document.queryCommandState('insertOrderedList'),
        });
    }, []);

    const updateCurrentFormat = React.useCallback(() => {
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
        let detectedParagraphSpacing = '1em';
        let detectedLineHeight = '1.6';
        let detectedTextIndent = '2em';
        
        let blockElement: HTMLElement | null = element;
        while (blockElement && blockElement !== editorRef.current) {
            const tagName = blockElement.tagName.toLowerCase();
            if (['p', 'h1', 'h2', 'h3', 'blockquote'].includes(tagName)) {
                detectedParagraphStyle = tagName;
                const styles = window.getComputedStyle(blockElement);

                if (styles.marginBottom) {
                    const mbPx = parseFloat(styles.marginBottom);
                    const fontPx = parseFloat(styles.fontSize);
                    if (fontPx > 0) {
                        const mbEm = mbPx / fontPx;
                        if (mbEm < 0.75) detectedParagraphSpacing = '0.5em';
                        else if (mbEm < 1.25) detectedParagraphSpacing = '1em';
                        else if (mbEm < 1.75) detectedParagraphSpacing = '1.5em';
                        else detectedParagraphSpacing = '2em';
                    }
                }
                
                if (styles.lineHeight) {
                    const lh = styles.lineHeight;
                    if (lh === 'normal') detectedLineHeight = '1.6';
                    else if (!isNaN(parseFloat(lh)) && styles.fontSize) {
                         const ratio = parseFloat(lh) / parseFloat(styles.fontSize);
                         if (Math.abs(ratio - 1.0) < 0.1) detectedLineHeight = '1.0';
                         else if (Math.abs(ratio - 1.15) < 0.1) detectedLineHeight = '1.15';
                         else if (Math.abs(ratio - 1.5) < 0.1) detectedLineHeight = '1.5';
                         else if (Math.abs(ratio - 2.0) < 0.1) detectedLineHeight = '2.0';
                    }
                }
                
                if (styles.textIndent) {
                     const indent = parseFloat(styles.textIndent);
                     if (indent < 1) detectedTextIndent = '0px';
                     else detectedTextIndent = '2em';
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
            paragraphSpacing: detectedParagraphSpacing,
            lineHeight: detectedLineHeight,
            textIndent: detectedTextIndent,
        });
    }, []);

    const handleSelectionChange = React.useCallback(() => {
        updateActiveFormats();
        updateCurrentFormat();
    }, [updateActiveFormats, updateCurrentFormat]);

    const applyAndSaveFormat = React.useCallback((formatAction: () => void) => {
        if (!editorRef.current) return;
        
        formatAction();
        
        cleanupEditor();

        const event = new Event('input', { bubbles: true, cancelable: true });
        editorRef.current.dispatchEvent(event);
        
        editorRef.current.focus();
        
        handleSelectionChange();

    }, [handleSelectionChange, cleanupEditor]);

    const applyCommand = (command: string, value?: string) => {
        applyAndSaveFormat(() => document.execCommand(command, false, value));
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

            // For a cursor without selection, insert a styled span to start typing with the new size.
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
                return;
            }

            // For a text selection, use a temporary highlight. This is a robust way to wrap content
            // that might cross multiple existing HTML tags. The browser handles splitting nodes correctly.
            const DUMMY_COLOR_RGB = 'rgb(1, 2, 3)';
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand('hiliteColor', false, DUMMY_COLOR_RGB);

            const tempSpans = Array.from(editorRef.current.querySelectorAll(`span[style*="background-color: ${DUMMY_COLOR_RGB}"]`) as NodeListOf<HTMLElement>);
            
            const parentsToClean = new Set<Node>();

            tempSpans.forEach(span => {
                if (span.parentElement) {
                    parentsToClean.add(span.parentElement);
                }

                // Replace the temporary background color with the desired font size.
                span.style.backgroundColor = '';
                span.style.fontSize = size;
                
                // If the span has no style attribute left, it's an empty wrapper and can be removed.
                if (!span.getAttribute('style')?.trim()) {
                    const parent = span.parentNode;
                    if (parent) {
                        while (span.firstChild) {
                            parent.insertBefore(span.firstChild, span);
                        }
                        parent.removeChild(span);
                    }
                }
            });

            // After styling, perform a cleanup pass on the affected areas of the DOM.
            // This merges adjacent `<span>` elements if they have the exact same style,
            // preventing the editor's HTML from becoming a mess of redundant tags.
            parentsToClean.forEach(parent => {
                let child = parent.firstChild;
                while (child) {
                    const next = child.nextSibling;
                    if (
                        next &&
                        child instanceof HTMLSpanElement &&
                        next instanceof HTMLSpanElement &&
                        child.style.cssText === next.style.cssText
                    ) {
                        while (next.firstChild) {
                            child.appendChild(next.firstChild);
                        }
                        parent.removeChild(next);
                        // Do not advance child, check again against the new next sibling
                    } else {
                        child = next; // Advance only if no merge happened
                    }
                }
                parent.normalize(); // Also merge adjacent text nodes.
            });
        });
    };
    
    const applyParagraphSpacing = (spacing: string) => {
        applyAndSaveFormat(() => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            let node = selection.getRangeAt(0).startContainer;
            if (node.nodeType === 3) node = node.parentNode!;
            while(node && node !== editorRef.current) {
                if(node instanceof HTMLElement && ['P', 'H1', 'H2', 'DIV', 'BLOCKQUOTE'].includes(node.tagName)) {
                    node.style.marginBottom = spacing;
                    return;
                }
                node = node.parentNode!;
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
                if(node instanceof HTMLElement && ['P', 'H1', 'H2', 'DIV', 'BLOCKQUOTE'].includes(node.tagName)) {
                    node.style.lineHeight = height;
                    return;
                }
                node = node.parentNode!;
            }
        });
    };

    const applyTextIndent = (indent: string) => {
        applyAndSaveFormat(() => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            let node = selection.getRangeAt(0).startContainer;
            if (node.nodeType === 3) node = node.parentNode!;
            while(node && node !== editorRef.current) {
                if(node instanceof HTMLElement && ['P', 'H1', 'H2', 'DIV', 'BLOCKQUOTE'].includes(node.tagName)) {
                    node.style.textIndent = indent;
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
        
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
            return;
        }

        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE) {
                const textNode = range.startContainer as Text;
                const offset = range.startOffset;
                const text = textNode.textContent || '';
                
                if (e.key === 'Backspace' && offset >= 4 && text.substring(offset - 4, offset) === '    ') {
                    e.preventDefault();
                    range.setStart(textNode, offset - 4);
                    range.deleteContents();
                    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    return;
                }
                
                if (e.key === 'Delete' && text.length - offset >= 4 && text.substring(offset, offset + 4) === '    ') {
                    e.preventDefault();
                    range.setEnd(textNode, offset + 4);
                    range.deleteContents();
                    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    return;
                }
            }
        }


        if (e.key === '"' || e.key === "'") {
            e.preventDefault();
            const openQuote = e.key === '"' ? '“' : '‘';
            const closeQuote = e.key === '"' ? '”' : '’';

            if (!range.collapsed) {
                // If text is selected, wrap it with smart quotes
                const selectedContent = range.extractContents();
                const fragment = document.createDocumentFragment();
                fragment.appendChild(document.createTextNode(openQuote));
                fragment.appendChild(selectedContent);
                fragment.appendChild(document.createTextNode(closeQuote));
                range.insertNode(fragment);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // If no text is selected, insert a single smart quote based on context.
                const { startContainer, startOffset } = range;
                if (!editorRef.current) return;

                // 1. Determine if the cursor is at the beginning of a block-level element.
                let isAtStartOfBlock = false;
                let node: Node | null = startContainer;
                // Find the nearest ancestor element that is a direct child of the editor. This is our block.
                while (node && node.parentNode !== editorRef.current) {
                    node = node.parentNode;
                }
                
                // If we are at the very start of the editor, consider it the start of a block.
                if (editorRef.current.contains(startContainer) && startContainer === editorRef.current && startOffset === 0) {
                     isAtStartOfBlock = true;
                } else if (node && node.nodeType === Node.ELEMENT_NODE) {
                    const rangeToCheck = document.createRange();
                    rangeToCheck.selectNodeContents(node);
                    rangeToCheck.setEnd(startContainer, startOffset);
                    // If the text content from the start of the block to the cursor is empty, it's the start.
                    if (rangeToCheck.toString().trim() === '') {
                        isAtStartOfBlock = true;
                    }
                }

                // Get text before the cursor for context.
                const precedingRange = document.createRange();
                precedingRange.setStart(editorRef.current, 0);
                precedingRange.setEnd(startContainer, startOffset);
                const textBeforeCursor = precedingRange.toString();
                const lastChar = textBeforeCursor.slice(-1);

                if (isAtStartOfBlock) {
                    // Always use an opening quote at the start of a block.
                    document.execCommand('insertText', false, e.key === '"' ? '“' : '‘');
                } else if (e.key === "'") {
                    // Heuristic for apostrophe vs. single quote.
                    if (/\w/.test(lastChar)) {
                        document.execCommand('insertText', false, '’'); // Apostrophe
                    } else {
                        // Balance single quotes.
                        const openSingleCount = (textBeforeCursor.match(/‘/g) || []).length;
                        const closeSingleCount = (textBeforeCursor.match(/’/g) || []).length;
                        document.execCommand('insertText', false, openSingleCount > closeSingleCount ? '’' : '‘');
                    }
                } else { // e.key === '"'
                    // Balance double quotes.
                    const openDoubleCount = (textBeforeCursor.match(/“/g) || []).length;
                    const closeDoubleCount = (textBeforeCursor.match(/”/g) || []).length;
                    document.execCommand('insertText', false, openDoubleCount > closeDoubleCount ? '”' : '“');
                }
            }
            editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
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
                    const ellipsis = document.createTextNode('…');
                    range.insertNode(ellipsis);
                    // Explicitly move cursor after the inserted ellipsis
                    range.setStartAfter(ellipsis);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    return;
                }

                if (e.key === '-' && textNode.textContent?.substring(offset - 1, offset) === '-') {
                    e.preventDefault();
                    range.setStart(textNode, offset - 1);
                    range.deleteContents();
                    const emDash = document.createTextNode('—');
                    range.insertNode(emDash);
                    // Explicitly move cursor after the inserted em-dash
                    range.setStartAfter(emDash);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    return;
                }
            }
        }
    
        if (e.key === 'Enter') {
            setTimeout(() => {
                const newSelection = window.getSelection();
                if (!newSelection?.rangeCount || !editorRef.current) return;
                
                let currentBlock = newSelection.getRangeAt(0).startContainer;
                while (currentBlock && currentBlock.parentNode !== editorRef.current) {
                    currentBlock = currentBlock.parentNode;
                }
        
                if (currentBlock instanceof HTMLElement) {
                    const isNewBlockEmpty = (currentBlock.textContent?.trim() === '' && currentBlock.children.length === 0) || currentBlock.innerHTML === '<br>';
                    if (isNewBlockEmpty) {
                        const previousBlock = currentBlock.previousElementSibling;
                        if (previousBlock instanceof HTMLElement) {
                            let styleSource: Element = previousBlock;
                            let lastNode: Node | null = previousBlock;
                            while (lastNode && lastNode.lastChild) {
                                lastNode = lastNode.lastChild;
                            }
                            
                            if (lastNode) {
                                styleSource = lastNode.nodeType === Node.TEXT_NODE ? lastNode.parentElement! : lastNode as Element;
                            }
                            
                            const computedStyle = window.getComputedStyle(styleSource);
                            const stylesToCopy = {
                                fontSize: computedStyle.fontSize,
                                fontFamily: computedStyle.fontFamily,
                                color: computedStyle.color,
                                marginBottom: computedStyle.marginBottom,
                                lineHeight: computedStyle.lineHeight,
                                textIndent: computedStyle.textIndent,
                            };
                            
                            const editorStyles = window.getComputedStyle(editorRef.current!);
                            const styleCarrier = document.createElement('span');
                            let styleApplied = false;
                            
                            if (stylesToCopy.fontSize !== editorStyles.fontSize) {
                                styleCarrier.style.fontSize = stylesToCopy.fontSize;
                                styleApplied = true;
                            }
                            if (stylesToCopy.fontFamily !== editorStyles.fontFamily) {
                                styleCarrier.style.fontFamily = stylesToCopy.fontFamily;
                                styleApplied = true;
                            }
                            if (stylesToCopy.color !== editorStyles.color) {
                                styleCarrier.style.color = stylesToCopy.color;
                                styleApplied = true;
                            }
                            
                            // Copy block level styles
                            if (stylesToCopy.marginBottom !== editorStyles.marginBottom) currentBlock.style.marginBottom = stylesToCopy.marginBottom;
                            if (stylesToCopy.lineHeight !== editorStyles.lineHeight) currentBlock.style.lineHeight = stylesToCopy.lineHeight;
                            if (stylesToCopy.textIndent !== editorStyles.textIndent) currentBlock.style.textIndent = stylesToCopy.textIndent;
                            
                            if (styleApplied) {
                                currentBlock.innerHTML = '';
                                styleCarrier.innerHTML = '&#8203;';
                                currentBlock.appendChild(styleCarrier);
                                
                                const range = document.createRange();
                                range.setStart(styleCarrier, 1);
                                range.collapse(true);
                                newSelection.removeAllRanges();
                                newSelection.addRange(range);
                            }
                        }
                    }
                }
        
                // Adjust Scroll Position
                let element = newSelection.getRangeAt(0).startContainer;
                if (element.nodeType === Node.TEXT_NODE) element = element.parentElement!;
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
            }, 0);
            setTimeout(cleanupEditor, 10);
        }
    };

    const handleKeyUp = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        // This function is intentionally left empty after removing heading markdown shortcuts.
        // It can be used for future key-up-based features.
    }, []);

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;

        // Sanitize pasted text into clean paragraphs.
        // Each line becomes a new <p> tag, preserving paragraph breaks from the source.
        const htmlToInsert = text
            .split(/\r?\n/)
            .map(line => `<p>${line.trim() === '' ? '<br>' : enhancePlainText(line)}</p>`)
            .join('');

        document.execCommand('insertHTML', false, htmlToInsert);
        cleanupEditor();
    };

    const handleCopy = React.useCallback((e: ClipboardEvent) => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
    
        const selectedText = selection.toString();
        const cleanedText = selectedText.replace(/(\r\n|\n|\r){2,}/g, '\n\n').trim();
    
        if (cleanedText.length < selectedText.length || (selectedText.length > 0 && cleanedText.length === 0)) {
            e.preventDefault();
    
            const selectedHtmlFragment = selection.getRangeAt(0).cloneContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(selectedHtmlFragment);
            
            e.clipboardData?.setData('text/plain', cleanedText);
            e.clipboardData?.setData('text/html', tempDiv.innerHTML);
        }
    }, []);

    const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
        const newHTML = e.currentTarget.innerHTML;
        editorContentRef.current = newHTML;
        updateChapterField('content', newHTML);
    };

    const handleCopyContent = React.useCallback(async () => {
        if (editorRef.current) {
            try {
                // Using innerText preserves paragraph breaks better than textContent.
                const textToCopy = editorRef.current.innerText;
                await navigator.clipboard.writeText(textToCopy);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    }, []);

    // --- Effects ---
    // This effect handles loading content when the chapter is switched.
    React.useEffect(() => {
        if (editorRef.current && chapter) {
            const initialContent = chapter.content || '<p><br></p>';
            const enhancedContent = enhanceHtml(initialContent);

            // Directly set content and sync the tracking ref
            editorRef.current.innerHTML = enhancedContent;
            editorContentRef.current = initialContent;

            // After loading a new chapter, focus the editor and move cursor to the end.
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
        handleSelectionChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterId]);

    // This effect handles programmatic content changes (like "Replace All in Novel").
    React.useEffect(() => {
        if (chapter && editorRef.current) {
            const contentFromState = chapter.content || '<p><br></p>';
            // If state content diverges from our tracked editor content, it was a programmatic change.
            if (contentFromState !== editorContentRef.current) {
                const enhancedContent = enhanceHtml(contentFromState);
                editorRef.current.innerHTML = enhancedContent;
                editorContentRef.current = contentFromState; // Re-sync the ref

                // After a programmatic change, moving cursor to the end is a sensible default.
                const selection = window.getSelection();
                if (selection) {
                    const range = document.createRange();
                    range.selectNodeContents(editorRef.current);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapter?.content]);

    React.useEffect(() => {
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', handleSelectionChange);
        if (editorEl) {
            editorEl.addEventListener('keyup', handleSelectionChange);
            editorEl.addEventListener('mouseup', handleSelectionChange);
            editorEl.addEventListener('focus', handleSelectionChange);
            editorEl.addEventListener('copy', handleCopy);
        }
        window.addEventListener('resize', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            if(editorEl) {
                editorEl.removeEventListener('keyup', handleSelectionChange);
                editorEl.removeEventListener('mouseup', handleSelectionChange);
                editorEl.removeEventListener('focus', handleSelectionChange);
                editorEl.addEventListener('copy', handleCopy);
            }
            window.removeEventListener('resize', handleSelectionChange);
        };
    }, [handleSelectionChange, handleCopy]);
    
     React.useEffect(() => {
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
    
    const handleReplaceAllInNovel = (find: string, replace: string, caseSensitive: boolean, wholeWord: boolean) => {
        if (!find || novelIndex === -1) return;

        setProjectData(currentData => {
            if (!currentData) return null;

            const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let pattern = escapeRegExp(find);
            if (wholeWord) {
                pattern = `\\b${pattern}\\b`;
            }
            const flags = caseSensitive ? 'g' : 'gi';
            const findRegex = new RegExp(pattern, flags);

            const tempDiv = document.createElement('div');

            const getWordCount = (html: string) => {
                if (!html) return 0;
                tempDiv.innerHTML = html;
                const text = tempDiv.textContent || "";
                return text.trim().split(/\s+/).filter(Boolean).length;
            };

            const updatedNovels = [...currentData.novels];
            if (novelIndex >= updatedNovels.length) return currentData;
            
            let currentNovel = { ...updatedNovels[novelIndex] };
            let changesMade = false;

            const updatedChapters = currentNovel.chapters.map(chap => {
                const docFragment = document.createElement('div');
                docFragment.innerHTML = chap.content;
                
                const walker = document.createTreeWalker(docFragment, NodeFilter.SHOW_TEXT);
                const textNodes: Text[] = [];
                let currentNode = walker.nextNode();
                while(currentNode) {
                    textNodes.push(currentNode as Text);
                    currentNode = walker.nextNode();
                }
                
                let chapterChanged = false;
                textNodes.forEach(textNode => {
                    const originalText = textNode.nodeValue || '';
                    const newText = originalText.replace(findRegex, replace);
                    if (originalText !== newText) {
                        textNode.nodeValue = newText;
                        chapterChanged = true;
                    }
                });

                if (chapterChanged) {
                    changesMade = true;
                    const newContent = docFragment.innerHTML;
                    return { 
                        ...chap, 
                        content: newContent, 
                        wordCount: getWordCount(newContent),
                        updatedAt: new Date().toISOString() 
                    };
                }
                return chap;
            });

            if (changesMade) {
                currentNovel = { ...currentNovel, chapters: updatedChapters };
                updatedNovels[novelIndex] = currentNovel;
                return { ...currentData, novels: updatedNovels };
            }

            return currentData;
        });
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
                     <div className={`sticky top-0 z-10 pt-6 pb-4 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border} flex items-center justify-between`}>
                        <div className="flex-1 flex items-center justify-between pl-8 md:pl-16 lg:pl-24">
                            <button onClick={() => navigate(`/novel/${novelId}`)} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                                <BackIcon className="w-5 h-5" />
                                <span className="font-sans">Return to Details</span>
                            </button>
                            <SaveStatusIndicator />
                        </div>
                        
                        {/* Sidebar toggle pushed to far right edge - Ghost style */}
                        <div className="pr-2 ml-4">
                            {!isSidebarOpen && (
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className={`p-2 rounded-md transition-colors text-inherit opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10`}
                                    aria-label="Open editor tools"
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
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
                            spellCheck={true}
                            suppressContentEditableWarning
                            onInput={handleEditorInput}
                            onKeyDown={handleKeyDown}
                            onKeyUp={handleKeyUp}
                            onPaste={handlePaste}
                            onBlur={cleanupEditor}
                            className="w-full leading-relaxed outline-none story-content"
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

                        <div className="flex-1 overflow-y-auto">
                           <div className={`border-b ${themeClasses.border}`}>
                                <button
                                    onClick={() => setIsChapterListModalOpen(true)}
                                    className={`w-full flex justify-between items-center py-3 px-4 font-semibold text-left transition-colors hover:${themeClasses.bgTertiary}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Bars3Icon className="w-5 h-5" />
                                        <span>Chapter Outline</span>
                                    </div>
                                </button>
                            </div>
                            <div className={`border-b ${themeClasses.border}`}>
                                <button
                                    onClick={handleCopyContent}
                                    className={`w-full flex justify-between items-center py-3 px-4 font-semibold text-left transition-colors hover:${themeClasses.bgTertiary}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <ClipboardIcon className="w-5 h-5" />
                                        <span>Copy Chapter Text</span>
                                    </div>
                                    {isCopied && <span className="text-xs text-green-400 font-normal">Copied!</span>}
                                </button>
                            </div>
                            <div className={`border-b ${themeClasses.border}`}>
                                <button
                                    onClick={() => navigate(`/novel/${novelId}/read/${chapterId}`)}
                                    className={`w-full flex justify-between items-center py-3 px-4 font-semibold text-left transition-colors hover:${themeClasses.bgTertiary}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <BookOpenIcon className="w-5 h-5" />
                                        <span>Read Novel</span>
                                    </div>
                                </button>
                            </div>
                            <div className={`border-b ${themeClasses.border}`}>
                                <button
                                    onClick={() => setIsExportModalOpen(true)}
                                    className={`w-full flex justify-between items-center py-3 px-4 font-semibold text-left transition-colors hover:${themeClasses.bgTertiary}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <DownloadIcon className="w-5 h-5" />
                                        <span>Export Novel</span>
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
                                        <option value="blockquote">Blockquote</option>
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
                                        <ToolbarDropdown label="Paragraph Spacing" value={currentFormat.paragraphSpacing} onChange={(e) => applyParagraphSpacing(e.target.value)}>
                                            <option value="0.5em">0.5</option>
                                            <option value="1em">1.0</option>
                                            <option value="1.5em">1.5</option>
                                            <option value="2em">2.0</option>
                                        </ToolbarDropdown>
                                        <ToolbarDropdown label="Line Height" value={currentFormat.lineHeight} onChange={(e) => applyLineHeight(e.target.value)}>
                                            <option value="1.0">1.0</option>
                                            <option value="1.15">1.15</option>
                                            <option value="1.5">1.5</option>
                                            <option value="2.0">2.0</option>
                                        </ToolbarDropdown>
                                        <ToolbarDropdown label="Indentation" value={currentFormat.textIndent} onChange={(e) => applyTextIndent(e.target.value)}>
                                            <option value="2em">Standard (2em)</option>
                                            <option value="0px">None (Block)</option>
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
                            <button onClick={() => setIsFormatPanelOpen(p => !p)} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${isFormatPanelOpen ? 'text-white bg-white/10' : ''}`}><TextIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('bold')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isBold ? 'text-white bg-white/10' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('italic')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isItalic ? 'text-white bg-white/10' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isUL ? 'text-white bg-white/10' : ''}`}><ListBulletIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isOL ? 'text-white bg-white/10' : ''}`}><OrderedListIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyParagraphStyle('blockquote')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${currentFormat.paragraphStyle === 'blockquote' ? 'text-white bg-white/10' : ''}`}><BlockquoteIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <button onClick={() => setIsFindReplaceOpen(true)} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors`}><SearchIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <button onClick={() => applyCommand('undo')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors`}><UndoIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('redo')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors`}><RedoIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1"></div>
                            <div className="px-3 text-sm text-white/70 font-sans" aria-live="polite">
                                {(chapter.wordCount || 0).toLocaleString()} {t.wordsCount}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FindReplaceModal 
                isOpen={isFindReplaceOpen}
                onClose={() => setIsFindReplaceOpen(false)}
                editorRef={editorRef}
                onReplaceAllInNovel={handleReplaceAllInNovel}
            />
            
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                novel={novel}
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
