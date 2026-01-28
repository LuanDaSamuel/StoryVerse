
import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, ChevronLeftIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, TrashIcon, H1Icon, H2Icon, H3Icon, SearchIcon, LoadingIcon, CheckIcon, ExclamationTriangleIcon, CloseIcon, ChevronDownIcon, TextIcon, ChevronRightIcon, Bars3Icon } from '../components/Icons';
import { enhanceHtml, enhancePlainText, SKETCH_TAG_OPTIONS, THEME_CONFIG } from '../constants';
import { StoryIdea, StoryIdeaStatus } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslations } from '../hooks/useTranslations';

// --- Reusable Components (Matching ChapterEditorPage) ---

const SaveStatusIndicator = () => {
    const { theme, saveStatus } = React.useContext(ProjectContext);
    const t = useTranslations();
    const baseClasses = 'flex items-center space-x-2 text-sm font-sans font-semibold';
    switch (saveStatus) {
        case 'unsaved': return <div className={`${baseClasses} ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}><span>{t.saveStatusUnsaved}</span></div>;
        case 'saving': return <div className={`${baseClasses} ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}><LoadingIcon className="w-4 h-4 animate-spin" /><span>{t.saveStatusSaving}</span></div>;
        case 'saved': return <div className={`${baseClasses} ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}><CheckIcon className="w-4 h-4" /><span>{t.saveStatusSaved}</span></div>;
        case 'error': return <div className={`${baseClasses} ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}><ExclamationTriangleIcon className="w-4 h-4" /><span>{t.saveStatusError}</span></div>;
        default: return null;
    }
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

const FindReplaceModal = ({ isOpen, onClose, editorRef }: { isOpen: boolean, onClose: () => void, editorRef: React.RefObject<HTMLDivElement> }) => {
    const { themeClasses } = React.useContext(ProjectContext);
    const [findText, setFindText] = React.useState('');
    const [replaceText, setReplaceText] = React.useState('');
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
                while (node.firstChild) parent.insertBefore(node.firstChild, node);
                parent.removeChild(node);
            }
        });
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
        if (!findText || !editorRef.current) {
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
                    if (index > lastIndex) fragment.appendChild(document.createTextNode(node.textContent!.slice(lastIndex, index)));
                    const span = document.createElement('span');
                    span.className = 'search-highlight';
                    span.textContent = match[0];
                    fragment.appendChild(span);
                    newMatches.push(span);
                    lastIndex = index + match[0].length;
                });
                if (lastIndex < node.textContent.length) fragment.appendChild(document.createTextNode(node.textContent.slice(lastIndex)));
                node.parentNode?.replaceChild(fragment, node);
            }
        });
        setMatches(newMatches);
        setCurrentIndex(newMatches.length > 0 ? 0 : -1);
    }, [findText, editorRef, clearHighlights, caseSensitive, wholeWord]);

    React.useEffect(() => {
        if (isOpen) {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            debounceTimeout.current = window.setTimeout(highlightMatches, 300);
        }
        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        };
    }, [findText, isOpen, highlightMatches, caseSensitive, wholeWord]);

    React.useEffect(() => {
        matches.forEach((match, index) => {
            if (index === currentIndex) {
                match.classList.add('current-match');
                match.scrollIntoView({
                    block: 'center',
                    behavior: 'smooth'
                });
            } else {
                match.classList.remove('current-match');
            }
        });
    }, [currentIndex, matches]);
    
    const handleNavigate = (direction: 'next' | 'prev') => {
        if (matches.length === 0) return;
        setCurrentIndex(prev => (direction === 'next' ? prev + 1 : prev - 1 + matches.length) % matches.length);
    };

    const handleReplace = () => {
        if (currentIndex === -1 || matches.length === 0) return;
        const match = matches[currentIndex];
        match.textContent = replaceText;
        match.classList.remove('search-highlight', 'current-match');
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
        if (!editorRef.current || matches.length === 0) return;
        matches.forEach(match => {
            match.textContent = replaceText;
        });
        editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        handleClose();
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 font-sans" onClick={handleClose}>
            <div className={`p-6 rounded-lg shadow-2xl w-full max-w-md m-4 ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Find & Replace</h2><button onClick={handleClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`} aria-label="Close"><CloseIcon className="w-6 h-6" /></button></div>
                <div className="space-y-4">
                    <div className="relative">
                        <input type="text" placeholder="Find..." value={findText} onChange={(e) => setFindText(e.target.value)} className={`w-full px-3 py-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`} />
                        {findText && <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${themeClasses.textSecondary}`}>{matches.length > 0 ? `${currentIndex + 1} / ${matches.length}` : '0 matches'}</div>}
                    </div>
                    <input type="text" placeholder="Replace with..." value={replaceText} onChange={(e) => setReplaceText(e.target.value)} className={`w-full px-3 py-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`} />
                </div>
                <div className="flex items-center space-x-4 mt-3">
                    <button onClick={() => setCaseSensitive(p => !p)} className={`px-3 py-1 text-xs rounded-md font-semibold ${caseSensitive ? `${themeClasses.accent} ${themeClasses.accentText}` : themeClasses.bgTertiary}`}>Aa</button>
                    <button onClick={() => setWholeWord(p => !p)} className={`px-3 py-1 text-xs rounded-md font-semibold ${wholeWord ? `${themeClasses.accent} ${themeClasses.accentText}` : themeClasses.bgTertiary}`}>Whole Word</button>
                </div>
                <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center space-x-2"><button onClick={() => handleNavigate('prev')} disabled={matches.length === 0} className={`px-3 py-1 rounded-md text-sm font-semibold ${themeClasses.bgTertiary} disabled:opacity-50`}>Previous</button><button onClick={() => handleNavigate('next')} disabled={matches.length === 0} className={`px-3 py-1 rounded-md text-sm font-semibold ${themeClasses.bgTertiary} disabled:opacity-50`}>Next</button></div>
                    <div className="flex items-center space-x-2"><button onClick={handleReplace} disabled={currentIndex === -1} className={`px-4 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} disabled:opacity-50`}>Replace</button><button onClick={handleReplaceAll} disabled={!findText} className={`px-4 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} disabled:opacity-50`}>Replace All</button></div>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
const StoryIdeaEditorPage = () => {
    const { ideaId } = useParams<{ ideaId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, themeClasses, theme } = React.useContext(ProjectContext);
    const t = useTranslations();
    
    const editorRef = React.useRef<HTMLDivElement>(null);
    const editorContentRef = React.useRef<string>("");
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const toolbarRef = React.useRef<HTMLDivElement>(null);

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isOutlineOpen, setIsOutlineOpen] = React.useState(false); // New State for Outline Sidebar
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = React.useState(false);
    const [isFormatPanelOpen, setIsFormatPanelOpen] = React.useState(false);
    const [headings, setHeadings] = React.useState<{id: string, text: string, level: number}[]>([]); // Headings data

    const [activeFormats, setActiveFormats] = React.useState({ isBold: false, isItalic: false, isUL: false, isOL: false });
    const [currentFormat, setCurrentFormat] = React.useState({
        paragraphStyle: 'p',
        font: fontOptions[0].value,
        size: '18px',
        paragraphSpacing: '1em',
        lineHeight: '1.6',
        textIndent: '2em',
    });

    const { idea, ideaIndex, folders } = React.useMemo(() => {
        if (!projectData?.storyIdeas || !ideaId) return { idea: null, ideaIndex: -1, folders: [] };
        
        const index = projectData.storyIdeas.findIndex(i => i.id === ideaId);
        if (index === -1) return { idea: null, ideaIndex: -1, folders: [] };

        return {
            idea: projectData.storyIdeas[index],
            ideaIndex: index,
            folders: projectData.ideaFolders || []
        };
    }, [projectData, ideaId]);

    const updateHeadings = React.useCallback(() => {
        if (!editorRef.current) return;
        const elements = Array.from(editorRef.current.querySelectorAll('h1, h2, h3')) as HTMLElement[];
        const newHeadings = elements
            .map((el, index) => {
                if (!el.id) el.id = `heading-${index}-${crypto.randomUUID().slice(0,4)}`;
                return {
                    id: el.id,
                    text: (el.textContent || '').trim(), // Ensure text is trimmed
                    level: parseInt(el.tagName.substring(1)),
                };
            })
            .filter(heading => heading.text.length > 0); // Filter out empty headings
        setHeadings(newHeadings);
    }, []);

    const scrollToHeading = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Close outline on mobile/smaller screens if needed, but keeping it open is fine for desktop
            if (window.innerWidth < 1024) setIsOutlineOpen(false);
        }
    };

    const updateStoryIdea = React.useCallback((updates: Partial<Omit<StoryIdea, 'id' | 'createdAt'>>) => {
        if (ideaIndex === -1) return;

        setProjectData(currentData => {
            if (!currentData || !currentData.storyIdeas[ideaIndex]) return currentData;
            
            const updatedIdeas = [...currentData.storyIdeas];
            
            let updatedIdea = {
                ...updatedIdeas[ideaIndex],
                ...updates,
                updatedAt: new Date().toISOString(),
            };

            // Update word count if synopsis changes
            if ('synopsis' in updates) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = updates.synopsis || '';
                const text = tempDiv.textContent || "";
                updatedIdea.wordCount = text.trim().split(/\s+/).filter(Boolean).length;
            }
            
            updatedIdeas[ideaIndex] = updatedIdea;
            
            return { ...currentData, storyIdeas: updatedIdeas };
        });
    }, [ideaIndex, setProjectData]);

    const cleanupEditor = React.useCallback(() => {
        if (!editorRef.current) return;
        const editor = editorRef.current;
    
        // 1. Remove empty inline elements.
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
    
        // 2. Merge adjacent sibling elements.
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
                        continue;
                    }
                }
                child = next;
            }
        };
    
        editor.querySelectorAll('p, h1, h2, h3, blockquote, li, div').forEach(block => {
            mergeAdjacentSiblings(block as HTMLElement);
        });
    
        editor.normalize();
        updateHeadings(); // Update headings after cleanup
    }, [updateHeadings]);

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

            if (selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontSize = size;
                span.textContent = '\u200B';
                range.insertNode(span);
                range.selectNodeContents(span);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            }

            const DUMMY_COLOR_RGB = 'rgb(1, 2, 3)';
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand('hiliteColor', false, DUMMY_COLOR_RGB);

            const tempSpans = Array.from(editorRef.current.querySelectorAll(`span[style*="background-color: ${DUMMY_COLOR_RGB}"]`) as NodeListOf<HTMLElement>);
            
            const parentsToClean = new Set<Node>();

            tempSpans.forEach(span => {
                if (span.parentElement) parentsToClean.add(span.parentElement);
                span.style.backgroundColor = '';
                span.style.fontSize = size;
                if (!span.getAttribute('style')?.trim()) {
                    const parent = span.parentNode;
                    if (parent) {
                        while (span.firstChild) parent.insertBefore(span.firstChild, span);
                        parent.removeChild(span);
                    }
                }
            });

            parentsToClean.forEach(parent => {
                let child = parent.firstChild;
                while (child) {
                    const next = child.nextSibling;
                    if (next && child instanceof HTMLSpanElement && next instanceof HTMLSpanElement && child.style.cssText === next.style.cssText) {
                        while (next.firstChild) child.appendChild(next.firstChild);
                        parent.removeChild(next);
                    } else {
                        child = next;
                    }
                }
                parent.normalize();
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
        if (!selection || !selection.rangeCount) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
            return;
        }

        const range = selection.getRangeAt(0);

        if (e.key === '"' || e.key === "'") {
            e.preventDefault();
            const openQuote = e.key === '"' ? '“' : '‘';
            const closeQuote = e.key === '"' ? '”' : '’';

            if (!range.collapsed) {
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
                const { startContainer, startOffset } = range;
                if (!editorRef.current) return;

                // 1. Determine if the cursor is at the beginning of a block-level element.
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

                // 2. Balancing logic using context check
                const precedingRange = document.createRange();
                precedingRange.setStart(editorRef.current, 0);
                precedingRange.setEnd(startContainer, startOffset);
                const textBeforeCursor = precedingRange.toString();
                const lastChar = textBeforeCursor.slice(-1);

                // Use the same robust logic from ChapterEditor for consistency.
                const isOpeningContext = isAtStartOfBlock || /[\s\[\(\{\u200B]/.test(lastChar);

                if (e.key === '"') {
                    document.execCommand('insertText', false, isOpeningContext ? '“' : '”');
                } else { // e.key === "'"
                    // Special case for apostrophe (follows a word character like in "don't")
                    // We use the same set from constants to support Vietnamese/Accented characters
                    const isApostrophe = !isAtStartOfBlock && /[a-zA-Z\u00C0-\u017F]/.test(lastChar);
                    document.execCommand('insertText', false, (isOpeningContext && !isApostrophe) ? '‘' : '’');
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
                // Scroll into view logic same as chapter editor
                 if (!editorRef.current) return;
                 const newSelection = window.getSelection();
                 if(!newSelection?.rangeCount) return;

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
                 
                 // Apply existing block styles to new block
                 let currentBlock = newSelection.getRangeAt(0).startContainer;
                 while (currentBlock && currentBlock.parentNode !== editorRef.current) {
                    currentBlock = currentBlock.parentNode;
                 }
                 if (currentBlock instanceof HTMLElement) {
                    const previousBlock = currentBlock.previousElementSibling;
                    if (previousBlock instanceof HTMLElement) {
                         const prevStyles = window.getComputedStyle(previousBlock);
                         currentBlock.style.marginBottom = prevStyles.marginBottom;
                         currentBlock.style.lineHeight = prevStyles.lineHeight;
                         currentBlock.style.textIndent = prevStyles.textIndent;
                    }
                 }
                 
                 cleanupEditor();
            }, 0);
        }
    };

    const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
        const newHTML = e.currentTarget.innerHTML;
        editorContentRef.current = newHTML;
        updateStoryIdea({ synopsis: newHTML });
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;

        const htmlToInsert = text
            .split(/\r?\n/)
            .map(line => `<p>${line.trim() === '' ? '<br>' : enhancePlainText(line)}</p>`)
            .join('');

        document.execCommand('insertHTML', false, htmlToInsert);
        cleanupEditor();
    };

    // --- Effects ---
    React.useEffect(() => {
        if (editorRef.current && idea) {
            const initialContent = idea.synopsis || '<p><br></p>';
            // Only update if significantly different to avoid cursor jumps
            if (editorRef.current.innerHTML !== enhanceHtml(initialContent)) {
                 editorRef.current.innerHTML = enhanceHtml(initialContent);
                 editorContentRef.current = initialContent;
                 updateHeadings();
            } else if (headings.length === 0) {
                // Ensure headings are populated on initial load even if content matches
                updateHeadings();
            }
        }
    }, [idea?.id]); // Re-run when idea ID changes (loading new idea)

    React.useEffect(() => {
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', handleSelectionChange);
        if (editorEl) {
            editorEl.addEventListener('keyup', handleSelectionChange);
            editorEl.addEventListener('mouseup', handleSelectionChange);
            editorEl.addEventListener('focus', handleSelectionChange);
        }
        window.addEventListener('resize', handleSelectionChange);
        
        const handleClickOutside = (event: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
                setIsFormatPanelOpen(false);
            }
        };

        if (isFormatPanelOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            if(editorEl) {
                editorEl.removeEventListener('keyup', handleSelectionChange);
                editorEl.removeEventListener('mouseup', handleSelectionChange);
                editorEl.removeEventListener('focus', handleSelectionChange);
            }
            window.removeEventListener('resize', handleSelectionChange);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [handleSelectionChange, isFormatPanelOpen]);


    const handleTagClick = (tag: string) => {
        if (!idea) return;
        const currentTags = idea.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag].slice(0, 6);
        updateStoryIdea({ tags: newTags });
    };

    const handleDelete = () => {
        if (!idea) return;
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedIdeas = currentData.storyIdeas.filter(s => s.id !== idea.id);
            return { ...currentData, storyIdeas: updatedIdeas };
        });
        navigate('/demos');
    };

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

    if (!idea) {
        return (
            <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}>
                <p>Loading idea...</p>
            </div>
        );
    }
    const statusOptions: StoryIdeaStatus[] = ['Seedling', 'Developing', 'Archived'];

    return (
        <>
            <div className={`flex h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
                {/* Backdrop for sidebars */}
                {(isSidebarOpen || isOutlineOpen) && (
                    <div
                        onClick={() => { setIsSidebarOpen(false); setIsOutlineOpen(false); }}
                        className="fixed inset-0 bg-black/50 z-30"
                        aria-hidden="true"
                    />
                )}
                
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
                     <div className={`sticky top-0 z-10 pt-6 pb-4 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border} flex items-center justify-between`}>
                        <div className="flex-1 flex items-center justify-between pl-8 md:pl-16 lg:pl-24">
                            <div className="flex items-center space-x-4">
                                <button onClick={() => navigate('/demos')} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                                    <BackIcon className="w-5 h-5" />
                                    <span className="font-sans hidden sm:inline">Back</span>
                                </button>
                                {/* Outline Toggle - Adjusted to ghost style for better visibility */}
                                <button 
                                    onClick={() => setIsOutlineOpen(true)}
                                    className={`p-2 rounded-md transition-colors text-inherit opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10`}
                                    title="Outline"
                                >
                                    <Bars3Icon className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                                <SaveStatusIndicator />
                            </div>
                        </div>

                        {/* Integrated Sidebar Toggle - Adjusted to ghost style for better visibility */}
                        <div className="pr-2 ml-4">
                            {!isSidebarOpen && (
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className={`p-2 rounded-md transition-colors text-inherit opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10`}
                                    aria-label="Open details"
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="px-8 md:px-16 lg:px-24 pt-8 pb-48">
                        <input
                            type="text"
                            value={idea.title}
                            onChange={(e) => updateStoryIdea({ title: e.target.value })}
                            onBlur={(e) => updateStoryIdea({ title: enhancePlainText(e.target.value) })}
                            placeholder="Idea Title"
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
                            className="w-full leading-relaxed outline-none story-content"
                            style={editorStyle}
                        />
                    </div>
                </div>
                
                {/* Left Outline Sidebar */}
                <div
                    className={`
                        fixed top-0 left-0 h-full z-40 transition-transform duration-300 ease-in-out
                        ${isOutlineOpen ? 'translate-x-0' : '-translate-x-full'}
                    `}
                >
                    <div className={`w-64 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-r ${themeClasses.border} flex flex-col shadow-xl`}>
                        <div className={`px-4 py-3 flex justify-between items-center border-b ${themeClasses.border}`}>
                            <span className="font-bold text-base">OUTLINE</span>
                            <button onClick={() => setIsOutlineOpen(false)}>
                                <ChevronLeftIcon className="w-5 h-5"/>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {headings.length === 0 ? (
                                <p className={`p-4 text-center ${themeClasses.textSecondary} italic`}>
                                    No headings found. Add headings (H1-H3) to create an outline.
                                </p>
                            ) : (
                                <ul className="space-y-1">
                                    {headings.map((heading) => (
                                        <li key={heading.id}>
                                            <button
                                                onClick={() => scrollToHeading(heading.id)}
                                                className={`
                                                    block w-full text-left px-3 py-2 rounded-md transition-colors
                                                    hover:${themeClasses.bgTertiary} truncate
                                                `}
                                                style={{ paddingLeft: `${(heading.level - 1) * 0.75 + 0.75}rem` }}
                                            >
                                                {heading.text}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* Editor Tools Sidebar (Right) */}
                <div
                    className={`
                        fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out
                        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
                    `}
                >
                    <div className={`w-80 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-l ${themeClasses.border} flex flex-col`}>
                        <div className={`px-4 py-3 flex justify-between items-center border-b ${themeClasses.border}`}>
                            <span className="font-bold text-base">IDEA DETAILS</span>
                            <button onClick={() => setIsSidebarOpen(false)}>
                                <ChevronRightIcon className="w-5 h-5"/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Status</h3>
                                <div className={`flex rounded-md overflow-hidden border ${themeClasses.border}`}>
                                    {statusOptions.map(option => (
                                        <button key={option} onClick={() => updateStoryIdea({ status: option })} className={`flex-1 py-2 text-sm font-semibold transition-colors ${idea.status === option ? `${themeClasses.accent} ${themeClasses.accentText}` : `hover:${themeClasses.bgTertiary}`}`}>{option}</button>
                                    ))}
                                </div>
                           </div>
                           
                           {/* Folder Selection */}
                           {folders.length > 0 && (
                               <div>
                                    <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>{t.folder}</h3>
                                    <select
                                        value={idea.folderId || ''}
                                        onChange={(e) => updateStoryIdea({ folderId: e.target.value || undefined })}
                                        className={`w-full p-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`}
                                    >
                                        <option value="">{t.noFolder}</option>
                                        {folders.map(f => (
                                            <option key={f.id} value={f.id}>{enhancePlainText(f.name)}</option>
                                        ))}
                                    </select>
                               </div>
                           )}

                           <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Tags</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {SKETCH_TAG_OPTIONS.map(t => (
                                        <button 
                                            key={t} 
                                            onClick={() => handleTagClick(t)} 
                                            className={`px-2 py-1 text-xs rounded-full font-semibold ${idea.tags.includes(t) ? `${themeClasses.accent} ${themeClasses.accentText}` : `${themeClasses.bgTertiary} hover:opacity-80`}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                           <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Actions</h3>
                                <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold bg-red-700 text-red-100 hover:bg-red-800">
                                    <TrashIcon className="w-5 h-5"/>
                                    <span>Delete Idea</span>
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
                                {(idea.wordCount || 0).toLocaleString()} {t.wordsCount}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FindReplaceModal 
                isOpen={isFindReplaceOpen}
                onClose={() => setIsFindReplaceOpen(false)}
                editorRef={editorRef}
            />
            
            <ConfirmModal 
                isOpen={isDeleteConfirmOpen} 
                onClose={() => setIsDeleteConfirmOpen(false)} 
                onConfirm={handleDelete} 
                title={`Delete "${idea.title}"?`} 
                message="Are you sure you want to delete this idea? This action is permanent." 
            />
        </>
    );
};

export default StoryIdeaEditorPage;
