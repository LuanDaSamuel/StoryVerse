
import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
// FIX: Changed react-router-dom import to namespace import to fix module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, BookOpenIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, TextIcon, SearchIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, CloseIcon, Bars3Icon, DownloadIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon } from '../components/Icons';
import { enhancePlainText, enhanceHtml, THEME_CONFIG } from '../constants';
import ExportModal from '../components/ExportModal';

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
                                <ReactRouterDOM.Link
                                    to={`/novel/${novel.id}/edit/${c.id}`}
                                    onClick={onClose}
                                    className={`block w-full text-left px-3 py-2 rounded-md transition-colors ${c.id === currentChapterId ? `${themeClasses.bgTertiary}` : `hover:${themeClasses.bgTertiary}`}`}
                                >
                                    {enhancePlainText(c.title || 'Untitled Chapter')}
                                </ReactRouterDOM.Link>
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
const FindReplaceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  editorRef: React.RefObject<HTMLDivElement>;
  onReplaceAllInNovel: (find: string, replace: string, caseSensitive: boolean, wholeWord: boolean) => void;
}> = ({ isOpen, onClose, editorRef, onReplaceAllInNovel }) => {
  const { themeClasses } = useContext(ProjectContext);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [matches, setMatches] = useState<HTMLElement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const debounceTimeout = useRef<number | null>(null);

  const clearHighlights = useCallback(() => {
    if (!editorRef.current) return;
    const highlights = Array.from(editorRef.current.querySelectorAll('.search-highlight, .current-match'));
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

  const handleClose = useCallback(() => {
    clearHighlights();
    setFindText('');
    setReplaceText('');
    setMatches([]);
    setCurrentIndex(-1);
    onClose();
  }, [clearHighlights, onClose]);

  const highlightMatches = useCallback(() => {
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

  useEffect(() => {
    if (isOpen) {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = window.setTimeout(highlightMatches, 300);
    }
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [findText, isOpen, highlightMatches, caseSensitive, wholeWord, scope]);

  useEffect(() => {
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
    match.classList.remove('search-highlight', 'current-match');
    
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity font-sans">
      <div className={`p-6 rounded-lg shadow-2xl w-full max-w-md m-4 ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`}>
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
const ChapterEditorPage: React.FC = () => {
    const { novelId, chapterId } = ReactRouterDOM.useParams<{ novelId: string; chapterId: string }>();
    const navigate = ReactRouterDOM.useNavigate();
    const { projectData, setProjectData, theme, themeClasses } = useContext(ProjectContext);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const editorContentRef = useRef<string>("");
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
    const [isChapterListModalOpen, setIsChapterListModalOpen] = useState(false);
    const [isFormatPanelOpen, setIsFormatPanelOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false, isUL: false, isOL: false });
    const [currentFormat, setCurrentFormat] = useState({
        paragraphStyle: 'p',
        font: fontOptions[0].value,
        size: '18px',
        paragraphSpacing: '1em',
    });

    const cleanupEditor = useCallback(() => {
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

    const editorStyle = useMemo(() => {
        if (theme === 'book') {
            const colorClass = THEME_CONFIG.book.text;
            const colorValue = colorClass.match(/\[(.*?)\]/)?.[1] || '#F5EADD';
            return { color: colorValue };
        }
        return { color: 'inherit' };
    }, [theme]);
    
    const colorPalette = useMemo(() => {
        if (theme === 'book') {
            const textColor = THEME_CONFIG.book.text.match(/\[(.*?)\]/)?.[1] || '#F5EADD';
            return [textColor, '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'];
        }
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

    const updateActiveFormats = useCallback(() => {
        setActiveFormats({
            isBold: document.queryCommandState('bold'),
            isItalic: document.queryCommandState('italic'),
            isUL: document.queryCommandState('insertUnorderedList'),
            isOL: document.queryCommandState('insertOrderedList'),
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
        let detectedParagraphSpacing = '1em';
        
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
        });
    }, []);

    const handleSelectionChange = useCallback(() => {
        updateActiveFormats();
        updateCurrentFormat();
    }, [updateActiveFormats, updateCurrentFormat]);

    const handleEditorInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        const newContent = e.currentTarget.innerHTML;
        if (editorContentRef.current !== newContent) {
            editorContentRef.current = newContent;
            updateChapterField('content', newContent);
        }
    }, [updateChapterField]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Let browser handle Enter, then check and fix if it created a DIV.
            setTimeout(() => {
                if (!editorRef.current) return;
                const selection = window.getSelection();
                if (!selection?.anchorNode) return;

                // Find the block element containing the cursor.
                let blockElement: Node | null = selection.anchorNode;
                while (blockElement && blockElement.parentNode !== editorRef.current) {
                    blockElement = blockElement.parentNode;
                }

                // If it's a DIV, convert it to a P.
                if (blockElement instanceof HTMLElement && blockElement.tagName === 'DIV') {
                    const p = document.createElement('p');
                    // Move all child nodes from the div to the new p
                    while (blockElement.firstChild) {
                        p.appendChild(blockElement.firstChild);
                    }
                    // If the new p is empty, add a <br> to make it visible.
                    if (!p.innerHTML) {
                        p.innerHTML = '<br>';
                    }
                    
                    blockElement.parentNode.replaceChild(p, blockElement);

                    // Restore selection to the new paragraph to continue typing.
                    const range = document.createRange();
                    range.setStart(p, 0);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }, 0);
        }

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

                let isAtStartOfBlock = false;
                let node: Node | null = startContainer;
                while (node && node.parentNode !== editorRef.current) {
                    node = node.parentNode;
                }
                
                if (editorRef.current.contains(startContainer) && startContainer === editorRef.current && startOffset === 0) {
                     isAtStartOfBlock = true;
                } else if (node && node.nodeType === Node.ELEMENT_NODE) {
                    const rangeToCheck = document.createRange();
                    rangeToCheck.selectNodeContents(node);
                    rangeToCheck.setEnd(startContainer, startOffset);
                    if (rangeToCheck.toString().trim() === '') {
                        isAtStartOfBlock = true;
                    }
                }

                const precedingRange = document.createRange();
                precedingRange.setStart(editorRef.current, 0);
                precedingRange.setEnd(startContainer, startOffset);
                const textBeforeCursor = precedingRange.toString();
                const lastChar = textBeforeCursor.slice(-1);

                if (isAtStartOfBlock || /\s|\(|\[|\{/.test(lastChar)) {
                    document.execCommand('insertText', false, openQuote);
                } else if (e.key === "'") {
                    if (/\w/.test(lastChar)) {
                        document.execCommand('insertText', false, '’'); // Apostrophe
                    } else {
                        const openSingleCount = (textBeforeCursor.match(/‘/g) || []).length;
                        const closeSingleCount = (textBeforeCursor.match(/’/g) || []).length;
                        document.execCommand('insertText', false, openSingleCount > closeSingleCount ? '’' : '‘');
                    }
                } else {
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
    };
    
    const applyAndSaveFormat = useCallback((formatAction: () => void) => {
        if (!editorRef.current) return;
        formatAction();
        cleanupEditor(); // Clean up potential DOM messes from execCommand
        
        // Manually trigger the input event to ensure changes are saved
        const event = new Event('input', { bubbles: true, cancelable: true });
        editorRef.current.dispatchEvent(event);
        
        editorRef.current.focus();
        handleSelectionChange(); // Update toolbar state
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
            document.execCommand('fontSize', false, '1'); // Use a dummy size
            const fontElements = editorRef.current?.getElementsByTagName('font');
            if(fontElements) {
                for (let i = 0, len = fontElements.length; i < len; ++i) {
                    if (fontElements[i].size === "1") {
                        fontElements[i].removeAttribute("size");
                        fontElements[i].style.fontSize = size;
                    }
                }
            }
        });
    };
    
    const applyParagraphSpacing = (spacing: string) => {
        applyAndSaveFormat(() => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            let node = selection.getRangeAt(0).startContainer;
            if (node.nodeType === 3) node = node.parentNode!; // get element
            
            while(node && node !== editorRef.current) {
                if(node instanceof HTMLElement && ['P', 'H1', 'H2', 'H3', 'DIV'].includes(node.tagName)) {
                    node.style.marginBottom = spacing;
                    return;
                }
                node = node.parentNode!;
            }
        });
    };
    
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;
        const htmlToInsert = text.split(/\r?\n/).map(line => `<p>${enhancePlainText(line) || '<br>'}</p>`).join('');
        document.execCommand('insertHTML', false, htmlToInsert);
    };

    useEffect(() => {
        if (chapter && editorRef.current) {
            const currentContent = editorRef.current.innerHTML;
            const chapterContent = enhanceHtml(chapter.content || '<p><br></p>');
            if (currentContent !== chapterContent) {
                 editorRef.current.innerHTML = chapterContent;
                 editorContentRef.current = chapterContent;
            }
        }
    }, [chapter]);

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

    useEffect(() => {
        document.addEventListener('selectionchange', handleSelectionChange);
        const editorEl = editorRef.current;
        if (editorEl) {
            editorEl.addEventListener('keyup', handleSelectionChange);
            editorEl.addEventListener('mouseup', handleSelectionChange);
            editorEl.addEventListener('focus', handleSelectionChange);
        }
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
             if(editorEl) {
                editorEl.removeEventListener('keyup', handleSelectionChange);
                editorEl.removeEventListener('mouseup', handleSelectionChange);
                editorEl.removeEventListener('focus', handleSelectionChange);
            }
        };
    }, [handleSelectionChange]);

    const handleReplaceAllInNovel = (find: string, replace: string, caseSensitive: boolean, wholeWord: boolean) => {
        if (novelIndex === -1) return;
        
        let flags = 'g';
        if (!caseSensitive) flags += 'i';
        let pattern = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (wholeWord) {
            pattern = `\\b${pattern}\\b`;
        }
        const regex = new RegExp(pattern, flags);

        const tempDiv = document.createElement('div');

        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedNovels = [...currentData.novels];
            const currentNovel = updatedNovels[novelIndex];
            
            const updatedChapters = currentNovel.chapters.map(chap => {
                tempDiv.innerHTML = chap.content;
                const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
                let textNode;
                while(textNode = walker.nextNode()) {
                    if (textNode.textContent) {
                         textNode.textContent = textNode.textContent.replace(regex, replace);
                    }
                }
                const newContent = tempDiv.innerHTML;
                
                tempDiv.innerHTML = newContent;
                const text = tempDiv.textContent || "";
                const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
                
                return { ...chap, content: newContent, wordCount, updatedAt: new Date().toISOString() };
            });
            
            updatedNovels[novelIndex] = { ...currentNovel, chapters: updatedChapters };
            return { ...currentData, novels: updatedNovels };
        });
    };
    
    if (!novel || !chapter) {
        return (
            <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}>
                <p>Loading chapter...</p>
            </div>
        );
    }

    const prevChapter = chapterIndex > 0 ? novel.chapters[chapterIndex - 1] : null;
    const nextChapter = chapterIndex < novel.chapters.length - 1 ? novel.chapters[chapterIndex + 1] : null;

    return (
        <>
            <div className={`flex h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto relative"
                >
                    <div className={`sticky top-0 z-10 px-8 md:px-16 lg:px-24 pt-6 pb-4 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border}`}>
                        <button onClick={() => navigate(`/novel/${novelId}`)} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                            <BackIcon className="w-5 h-5" />
                            <span className="font-sans">Back to Details</span>
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
                            spellCheck={true}
                            suppressContentEditableWarning
                            onInput={handleEditorInput}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            onBlur={cleanupEditor}
                            className="w-full text-lg leading-relaxed outline-none story-content"
                            style={editorStyle}
                        />
                    </div>
                </div>

                {/* Right Sidebar for chapter navigation & word count */}
                <div className={`w-80 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-l ${themeClasses.border} flex-shrink-0 hidden md:flex flex-col`}>
                    <div className="p-4 border-b border-inherit">
                        <p className="font-bold">{novel.title}</p>
                    </div>
                     <div className={`px-4 py-4 border-b ${themeClasses.border}`}>
                        <p className="text-3xl font-bold">{chapter.wordCount.toLocaleString()}</p>
                        <p className={themeClasses.textSecondary}>WORDS IN CHAPTER</p>
                    </div>
                    <nav className="flex-1 p-4 overflow-y-auto">
                        <p className="font-bold mb-2">CHAPTER OUTLINE</p>
                        <ul className="space-y-1">
                            {novel.chapters.map(c => (
                                <li key={c.id}>
                                    <ReactRouterDOM.Link 
                                        to={`/novel/${novelId}/edit/${c.id}`}
                                        className={`block w-full text-left px-3 py-2 rounded-md transition-colors ${c.id === chapterId ? `${themeClasses.bgTertiary}` : `hover:${themeClasses.bgTertiary}`}`}
                                    >
                                        {enhancePlainText(c.title || 'Untitled Chapter')}
                                    </ReactRouterDOM.Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                     <div className={`p-4 border-t ${themeClasses.border} space-y-2`}>
                        <button onClick={() => setIsFindReplaceOpen(true)} className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:${themeClasses.bgTertiary}`}>
                            <SearchIcon className="w-5 h-5"/>
                            <span>Find & Replace...</span>
                        </button>
                        <button onClick={() => setIsExportModalOpen(true)} className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:${themeClasses.bgTertiary}`}>
                            <DownloadIcon className="w-5 h-5"/>
                            <span>Export Novel...</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none">
                <div ref={toolbarRef} className="relative pointer-events-auto">
                    {isFormatPanelOpen && (
                        <div className="absolute bottom-full mb-2 p-4 rounded-lg shadow-lg bg-stone-900/80 border border-white/10 backdrop-blur-sm w-[320px]">
                            <div className="space-y-4">
                               <ToolbarDropdown label="Paragraph Style" value={currentFormat.paragraphStyle} onChange={(e) => applyParagraphStyle(e.target.value)}>
                                    <option value="p">Paragraph</option>
                                    <option value="h1">Heading 1</option>
                                    <option value="h2">Heading 2</option>
                                    <option value="h3">Heading 3</option>
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

                    <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm font-sans" onMouseDown={e => e.preventDefault()}>
                        {prevChapter && (
                            <ReactRouterDOM.Link to={`/novel/${novelId}/edit/${prevChapter.id}`} className="p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors">
                                <ChevronLeftIcon className="w-5 h-5"/>
                            </ReactRouterDOM.Link>
                        )}
                        <button onClick={() => setIsChapterListModalOpen(true)} className="p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors md:hidden">
                            <Bars3Icon className="w-5 h-5"/>
                        </button>
                        <div className="w-px h-5 bg-white/20 mx-1" />
                        <button onClick={() => setIsFormatPanelOpen(p => !p)} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${isFormatPanelOpen ? 'bg-white/20' : ''}`}>
                            <TextIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => applyCommand('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isBold ? 'bg-white/20' : ''}`}>
                            <BoldIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => applyCommand('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isItalic ? 'bg-white/20' : ''}`}>
                            <ItalicIcon className="w-5 h-5"/>
                        </button>
                        <div className="w-px h-5 bg-white/20 mx-1" />
                        <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isUL ? 'bg-white/20' : ''}`}>
                            <ListBulletIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isOL ? 'bg-white/20' : ''}`}>
                            <OrderedListIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => applyParagraphStyle('blockquote')} className={`p-2 rounded-full text-white/90 hover:bg-white/10`}>
                            <BlockquoteIcon className="w-5 h-5"/>
                        </button>
                        <div className="w-px h-5 bg-white/20 mx-1" />
                        <button onClick={() => applyCommand('undo')} className="p-2 rounded-full text-white/90 hover:bg-white/10">
                            <UndoIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => applyCommand('redo')} className="p-2 rounded-full text-white/90 hover:bg-white/10">
                            <RedoIcon className="w-5 h-5"/>
                        </button>
                         <div className="w-px h-5 bg-white/20 mx-1" />
                        {nextChapter && (
                            <ReactRouterDOM.Link to={`/novel/${novelId}/edit/${nextChapter.id}`} className="p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors">
                                <ChevronRightIcon className="w-5 h-5"/>
                            </ReactRouterDOM.Link>
                        )}
                    </div>
                </div>
            </div>

            <ChapterListModal 
                isOpen={isChapterListModalOpen} 
                onClose={() => setIsChapterListModalOpen(false)} 
                novel={novel} 
                currentChapterId={chapterId}
                themeClasses={themeClasses}
            />
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
        </>
    );
};

export default ChapterEditorPage;
