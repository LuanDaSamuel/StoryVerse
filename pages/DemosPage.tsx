
import React, { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { Sketch, SpellcheckLang } from '../types';
import { UploadIcon, PlusIcon, TrashIcon, LightbulbIcon, ChevronDownIcon, TextIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, Bars3Icon, CloseIcon, ListBulletIcon, HomeIcon, SearchIcon, DownloadIcon, ChartBarIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, BlockquoteIcon, OrderedListIcon, ChevronLeftIcon, ChevronRightIcon, H1Icon, H2Icon, H3Icon, SpellcheckIcon } from '../components/Icons';
import { enhanceHtml, enhancePlainText } from '../constants';
import { THEME_CONFIG } from '../constants';
import * as mammoth from 'mammoth';

declare var Typo: any;

interface SpellcheckError {
    word: string;
    suggestions: string[];
    context: { before: string; after: string; };
    node: Text;
    startOffset: number;
    endOffset: number;
}

// --- Reusable Utility and Type Definitions ---

const getPlainText = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || '';
};

interface Heading {
  id: string;
  text: string;
  level: number;
}

const fontOptions = [
    { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
];

// --- Sub-components for Demos Page UI ---

const SpellCheckPanel: React.FC<{
    error: SpellcheckError;
    onClose: () => void;
    onNext: () => void;
    onIgnore: (word: string) => void;
    onChange: (newWord: string) => void;
    onAddToDictionary: (word: string) => void;
    themeClasses: any;
    isLast: boolean;
}> = ({ error, onClose, onNext, onIgnore, onChange, onAddToDictionary, themeClasses, isLast }) => (
    <div className={`fixed top-20 right-8 z-50 w-80 p-4 rounded-lg shadow-2xl font-sans ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`}>
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg">Spell Check</h3>
            <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}><CloseIcon className="w-5 h-5"/></button>
        </div>
        <div className={`p-3 rounded-md ${themeClasses.bgTertiary} text-sm mb-3`}>
            <p className={themeClasses.textSecondary}>
                {error.context.before}
                <span className="font-bold text-red-400">{error.word}</span>
                {error.context.after}
            </p>
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
            {error.suggestions.length > 0 ? (
                error.suggestions.slice(0, 5).map(sugg => (
                    <button key={sugg} onClick={() => onChange(sugg)} className={`block w-full text-left px-3 py-1.5 rounded-md text-sm hover:${themeClasses.bgTertiary}`}>
                        {sugg}
                    </button>
                ))
            ) : (
                <p className={`text-sm px-3 py-2 ${themeClasses.textSecondary}`}>No suggestions found.</p>
            )}
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <div className="space-x-1">
                <button onClick={() => onIgnore(error.word)} className={`px-3 py-1 text-xs font-semibold rounded-md hover:opacity-80 ${themeClasses.bgTertiary}`}>Ignore</button>
                <button onClick={() => onAddToDictionary(error.word)} className={`px-3 py-1 text-xs font-semibold rounded-md hover:opacity-80 ${themeClasses.bgTertiary}`}>Add Word</button>
            </div>
            <button onClick={onNext} className={`px-4 py-2 text-sm font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}>
                {isLast ? 'Finish' : 'Next'}
            </button>
        </div>
    </div>
);


const SketchesOutlineModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    sketches: Sketch[];
    selectedSketchId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onImportClick: () => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    themeClasses: any;
}> = ({ isOpen, onClose, sketches, selectedSketchId, onSelect, onCreate, onImportClick, onDelete, themeClasses }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4 font-sans" onClick={onClose} role="dialog">
            <div className={`w-full max-w-md p-6 rounded-lg shadow-2xl ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Sketches</h2>
                    <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex space-x-2 mb-4">
                    <button onClick={onCreate} className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${themeClasses.bgTertiary} hover:opacity-80`}><PlusIcon className="w-5 h-5" /><span>Create New</span></button>
                    <button onClick={onImportClick} className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${themeClasses.bgTertiary} hover:opacity-80`}><UploadIcon className="w-5 h-5" /><span>Import DOCX</span></button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto -mr-2 pr-2">
                    {sketches.map(sketch => (
                        <div key={sketch.id} onClick={() => onSelect(sketch.id)} className={`group relative p-4 cursor-pointer border-b ${themeClasses.border} ${selectedSketchId === sketch.id ? `${themeClasses.bgTertiary}` : `hover:${themeClasses.bgTertiary}`}`}>
                            <h3 className={`font-semibold truncate pr-8 ${themeClasses.accentText}`}>{enhancePlainText(sketch.title) || 'Untitled Sketch'}</h3>
                            <p className={`text-sm truncate mt-1 ${themeClasses.textSecondary}`}>{getPlainText(sketch.content) || 'No content'}</p>
                            <button onClick={(e) => onDelete(e, sketch.id)} className={`absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10`} aria-label={`Delete sketch ${sketch.title}`}><TrashIcon className="w-5 h-5" /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const FindReplaceDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    editorRef: React.RefObject<HTMLDivElement>;
}> = ({ isOpen, onClose, editorRef }) => {
    const { themeClasses } = useContext(ProjectContext);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matches, setMatches] = useState<HTMLElement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);

    const clearHighlights = useCallback(() => {
        if (!editorRef.current) return;
        editorRef.current.querySelectorAll('.search-highlight, .current-match').forEach(node => {
            const parent = node.parentNode;
            if (parent) {
                while(node.firstChild) {
                    parent.insertBefore(node.firstChild, node);
                }
                parent.removeChild(node);
            }
        });
        editorRef.current.normalize();
    }, [editorRef]);

    const handleClose = useCallback(() => {
        clearHighlights();
        setFindText(''); setReplaceText(''); setMatches([]); setCurrentIndex(-1);
        onClose();
    }, [clearHighlights, onClose]);

    const highlightMatches = useCallback(() => {
        clearHighlights();
        if (!findText || !editorRef.current) { setMatches([]); setCurrentIndex(-1); return; }
        
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
            if (!node.textContent) return;
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

    useEffect(() => {
        if (isOpen) highlightMatches();
    }, [findText, isOpen, highlightMatches, caseSensitive, wholeWord]);

    useEffect(() => {
        matches.forEach((match, index) => {
            if (index === currentIndex) {
                match.classList.add('current-match');
                match.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                match.classList.remove('current-match');
            }
        });
    }, [currentIndex, matches]);

    const handleNavigate = (dir: 'next' | 'prev') => {
        if (matches.length === 0) return;
        setCurrentIndex(p => (p + (dir === 'next' ? 1 : -1) + matches.length) % matches.length);
    };

    const handleReplace = () => {
        if (currentIndex === -1 || matches.length === 0) return;
        const match = matches[currentIndex];
        match.textContent = replaceText;
        match.classList.remove('search-highlight', 'current-match');
        editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
            const newMatches = matches.filter(m => m !== match);
            setMatches(newMatches);
            setCurrentIndex(newMatches.length > 0 ? currentIndex % newMatches.length : -1);
        }, 0);
    };
    
    const handleReplaceAll = () => {
        if (!editorRef.current || matches.length === 0) return;
        matches.forEach(match => { match.textContent = replaceText; });
        editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed top-20 right-8 bg-black bg-opacity-0 z-50 transition-opacity font-sans">
            <div className={`p-4 rounded-lg shadow-2xl w-full max-w-xs ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Find & Replace</h2><button onClick={handleClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}><CloseIcon className="w-5 h-5" /></button></div>
                <div className="space-y-3">
                    <div className="relative"><input type="text" placeholder="Find..." value={findText} onChange={(e) => setFindText(e.target.value)} className={`w-full px-3 py-2 rounded-md text-sm ${themeClasses.input} border ${themeClasses.border}`} />{findText && <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${themeClasses.textSecondary}`}>{matches.length > 0 ? `${currentIndex + 1}/${matches.length}` : '0/0'}</div>}</div>
                    <input type="text" placeholder="Replace..." value={replaceText} onChange={(e) => setReplaceText(e.target.value)} className={`w-full px-3 py-2 rounded-md text-sm ${themeClasses.input} border ${themeClasses.border}`} />
                </div>
                <div className="flex items-center space-x-2 mt-2">
                    <button onClick={() => setCaseSensitive(p => !p)} className={`px-2 py-1 text-xs rounded-md font-semibold ${caseSensitive ? `${themeClasses.accent} ${themeClasses.accentText}` : themeClasses.bgTertiary}`}>Aa</button>
                    <button onClick={() => setWholeWord(p => !p)} className={`px-2 py-1 text-xs rounded-md font-semibold ${wholeWord ? `${themeClasses.accent} ${themeClasses.accentText}` : themeClasses.bgTertiary}`}>Whole Word</button>
                </div>
                <div className="flex justify-between items-center mt-3"><div className="flex items-center space-x-1"><button onClick={() => handleNavigate('prev')} disabled={matches.length < 2} className={`px-2 py-1 rounded text-xs font-semibold ${themeClasses.bgTertiary} disabled:opacity-50`}>Prev</button><button onClick={() => handleNavigate('next')} disabled={matches.length < 2} className={`px-2 py-1 rounded text-xs font-semibold ${themeClasses.bgTertiary} disabled:opacity-50`}>Next</button></div><div className="flex items-center space-x-1"><button onClick={handleReplace} disabled={currentIndex === -1} className={`px-2 py-1 text-xs rounded font-semibold ${themeClasses.bgTertiary} disabled:opacity-50`}>Replace</button><button onClick={handleReplaceAll} disabled={matches.length === 0} className={`px-2 py-1 text-xs rounded font-semibold ${themeClasses.accent} ${themeClasses.accentText} disabled:opacity-50`}>All</button></div></div>
            </div>
        </div>
    );
};

const ToolbarDropdown: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
}> = ({ label, value, onChange, children }) => (
    <div>
        <label className="block text-xs font-semibold mb-1 text-white/70">{label}</label>
        <div className="relative">
            <select value={value} onChange={onChange} className="w-full appearance-none px-3 py-2 text-sm rounded-md bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50">{children}</select>
            <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" />
        </div>
    </div>
);

// --- Main Demos Page Component ---

const DemosPage: React.FC = () => {
    const { projectData, setProjectData, theme, themeClasses } = useContext(ProjectContext);
    const navigate = useNavigate();
    const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null);
    const [isOutlineModalOpen, setIsOutlineModalOpen] = useState(false);
    const [isOutlineSidebarOpen, setIsOutlineSidebarOpen] = useState(false);
    const [headings, setHeadings] = useState<Heading[]>([]);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [isDistractionFree, setIsDistractionFree] = useState(false);
    const [stats, setStats] = useState({ wordCount: 0, charCount: 0 });

    const editorRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const docxInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const [isFormatPanelOpen, setIsFormatPanelOpen] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false, isUL: false, isOL: false });
    const [currentFormat, setCurrentFormat] = useState({ paragraphStyle: 'p', font: fontOptions[0].value, size: '18px', paragraphSpacing: '1em' });
    
    // --- Spellcheck State and Logic ---
    const [spellchecker, setSpellchecker] = useState<any>(null);
    const [isSpellcheckPanelOpen, setIsSpellcheckPanelOpen] = useState(false);
    const [spellcheckErrors, setSpellcheckErrors] = useState<SpellcheckError[]>([]);
    const [currentErrorIndex, setCurrentErrorIndex] = useState(0);
    const sessionIgnoredWords = useRef(new Set<string>());

    useEffect(() => {
        const lang = projectData?.settings?.spellcheckLanguage;
        if (lang && lang !== 'browser-default' && typeof Typo !== 'undefined') {
            const dictionaryId = lang === 'en' ? 'en_US' : lang;
            const affUrl = `https://cdn.jsdelivr.net/npm/typo-js@1.2.1/dictionaries/${dictionaryId}/${dictionaryId}.aff`;
            const dicUrl = `https://cdn.jsdelivr.net/npm/typo-js@1.2.1/dictionaries/${dictionaryId}/${dictionaryId}.dic`;

            Promise.all([fetch(affUrl).then(r => r.text()), fetch(dicUrl).then(r => r.text())])
              .then(([affData, dicData]) => {
                const typo = new Typo(dictionaryId, affData, dicData);
                setSpellchecker(typo);
              })
              .catch(err => {
                console.error(`Could not load dictionary for ${lang}`, err);
                setSpellchecker(null);
              });
        } else {
            setSpellchecker(null);
        }
    }, [projectData?.settings?.spellcheckLanguage]);

    const cleanupSpellcheckHighlight = () => {
        const existingHighlight = editorRef.current?.querySelector('.spell-error-current');
        if (existingHighlight) {
            const parent = existingHighlight.parentNode;
            while (existingHighlight.firstChild) {
                parent?.insertBefore(existingHighlight.firstChild, existingHighlight);
            }
            parent?.removeChild(existingHighlight);
            parent?.normalize();
        }
    };

    const startSpellcheck = () => {
        if (!spellchecker || !editorRef.current) {
            alert('Spellchecker dictionary is not loaded or editor is not available.');
            return;
        }

        sessionIgnoredWords.current.clear();
        const errors: SpellcheckError[] = [];
        const customDictionary = new Set(projectData?.settings?.customDictionary || []);
        
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
            const textNode = node as Text;
            const text = textNode.textContent || '';
            const wordRegex = /\b[\p{L}']+\b/gu;
            let match;
            while ((match = wordRegex.exec(text)) !== null) {
                const word = match[0];
                if (!customDictionary.has(word.toLowerCase()) && !spellchecker.check(word)) {
                    const suggestions = spellchecker.suggest(word);
                    const contextWindow = 15;
                    const context = {
                        before: text.substring(Math.max(0, match.index - contextWindow), match.index),
                        after: text.substring(match.index + word.length, match.index + word.length + contextWindow),
                    };
                    errors.push({
                        word, suggestions, context, node: textNode,
                        startOffset: match.index,
                        endOffset: match.index + word.length
                    });
                }
            }
        }

        setSpellcheckErrors(errors);
        setCurrentErrorIndex(0);
        setIsSpellcheckPanelOpen(errors.length > 0);
        if (errors.length === 0) {
            alert('No spelling errors found!');
        }
    };

    const handleCloseSpellcheck = () => {
        cleanupSpellcheckHighlight();
        setIsSpellcheckPanelOpen(false);
        setSpellcheckErrors([]);
        setCurrentErrorIndex(0);
    };
    
    const handleSpellcheckNext = () => {
        if (currentErrorIndex >= spellcheckErrors.length - 1) {
            handleCloseSpellcheck();
        } else {
            setCurrentErrorIndex(prev => prev + 1);
        }
    };
    
    const handleSpellcheckIgnore = (word: string) => {
        sessionIgnoredWords.current.add(word.toLowerCase());
        const remainingErrors = spellcheckErrors.filter((e, idx) => idx > currentErrorIndex && e.word.toLowerCase() !== word.toLowerCase());
        
        if (remainingErrors.length > 0) {
            const nextError = remainingErrors[0];
            const nextIndex = spellcheckErrors.indexOf(nextError);
            cleanupSpellcheckHighlight(); // manually clean before jumping index
            setCurrentErrorIndex(nextIndex);
        } else {
            handleCloseSpellcheck();
        }
    };

    const handleSpellcheckChange = (newWord: string) => {
        const error = spellcheckErrors[currentErrorIndex];
        if (!error) return;

        const range = document.createRange();
        range.setStart(error.node, error.startOffset);
        range.setEnd(error.node, error.endOffset);
        range.deleteContents();
        range.insertNode(document.createTextNode(newWord));
        
        editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

        handleSpellcheckNext();
    };

    const handleAddToDictionary = (word: string) => {
        const lowerWord = word.toLowerCase();
        setProjectData(currentData => {
            if (!currentData || currentData.settings.customDictionary.includes(lowerWord)) return currentData;
            return {
                ...currentData,
                settings: {
                    ...currentData.settings,
                    customDictionary: [...currentData.settings.customDictionary, lowerWord].sort(),
                },
            };
        });
        handleSpellcheckIgnore(word);
    };

    useEffect(() => {
        cleanupSpellcheckHighlight();
        if (isSpellcheckPanelOpen && spellcheckErrors.length > 0 && currentErrorIndex < spellcheckErrors.length) {
            const error = spellcheckErrors[currentErrorIndex];
            const range = document.createRange();
            range.setStart(error.node, error.startOffset);
            range.setEnd(error.node, error.endOffset);
            
            if (error.node.parentNode && editorRef.current?.contains(error.node)) {
                const span = document.createElement('span');
                span.className = 'spell-error-current';
                try {
                    range.surroundContents(span);
                    span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch (e) {
                    console.error("Could not highlight spellcheck error:", e);
                    handleSpellcheckNext();
                }
            } else {
                 handleSpellcheckNext();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSpellcheckPanelOpen, currentErrorIndex]);
    
    const handleLanguageChange = (lang: SpellcheckLang) => {
        setProjectData(currentData => {
            if (!currentData) return null;
            return {
                ...currentData,
                settings: { ...currentData.settings, spellcheckLanguage: lang },
            };
        });
    };

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

    const sketches = useMemo(() => projectData?.sketches || [], [projectData?.sketches]);
    const selectedSketch = useMemo(() => sketches.find(s => s.id === selectedSketchId) || null, [sketches, selectedSketchId]);
    
    const editorStyle = useMemo(() => theme === 'book' ? { color: THEME_CONFIG.book.text.match(/\[(.*?)\]/)?.[1] || '#F5EADD' } : { color: 'inherit' }, [theme]);
    const colorPalette = useMemo(() => theme === 'book' ? [THEME_CONFIG.book.text.match(/\[(.*?)\]/)?.[1] || '#F5EADD', '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'] : ['#3B2F27', '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'], [theme]);

    useEffect(() => {
        if (sketches.length > 0 && !sketches.some(s => s.id === selectedSketchId)) setSelectedSketchId(sketches[0].id);
        else if (sketches.length === 0) setSelectedSketchId(null);
    }, [sketches, selectedSketchId]);
    
    useEffect(() => {
        if (editorRef.current && selectedSketch) {
            const editorContent = enhanceHtml(selectedSketch.content || '');
            if (editorRef.current.innerHTML !== editorContent) editorRef.current.innerHTML = editorContent;
        }
    }, [selectedSketchId, selectedSketch]);

    useEffect(() => {
        const calculateStats = () => {
            if (!editorRef.current) return;
            const text = editorRef.current.innerText;
            const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
            setStats({ wordCount, charCount: text.length });
        };
        const debouncedCalc = setTimeout(calculateStats, 300);
        return () => clearTimeout(debouncedCalc);
    }, [selectedSketch?.content]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isDistractionFree) setIsDistractionFree(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDistractionFree]);
    
    useEffect(() => {
        const editorEl = editorRef.current;
        if (!editorEl || !selectedSketchId) {
            setHeadings([]);
            return;
        };

        let debounceTimeout: number;
        const updateHeadings = () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = window.setTimeout(() => {
                if (!editorRef.current) return;
                const headingElements = Array.from(editorRef.current.querySelectorAll('h1, h2, h3'));
                const newHeadings: Heading[] = headingElements.map((el, index) => {
                    const htmlEl = el as HTMLElement;
                    if (!htmlEl.id) htmlEl.id = `heading-outline-${index}-${Date.now()}`;
                    return {
                        id: htmlEl.id,
                        text: htmlEl.textContent || 'Untitled Heading',
                        level: parseInt(htmlEl.tagName.substring(1), 10),
                    };
                });
                setHeadings(currentHeadings => {
                    if (JSON.stringify(currentHeadings.map(h => ({text: h.text, level: h.level}))) === JSON.stringify(newHeadings.map(h => ({text: h.text, level: h.level})))) {
                        return currentHeadings;
                    }
                    return newHeadings;
                });
            }, 300);
        };

        updateHeadings();

        const observer = new MutationObserver(updateHeadings);
        observer.observe(editorEl, { childList: true, subtree: true, characterData: true });

        return () => {
            clearTimeout(debounceTimeout);
            observer.disconnect();
        };
    }, [selectedSketchId]);

    const handleCreateSketch = () => {
        const now = new Date().toISOString();
        const newSketch: Sketch = { id: crypto.randomUUID(), title: 'Untitled Sketch', content: '<p><br></p>', createdAt: now, updatedAt: now };
        setProjectData(c => c ? { ...c, sketches: [newSketch, ...c.sketches] } : null);
        setSelectedSketchId(newSketch.id);
        setIsOutlineModalOpen(false);
    };
    
    const handleSelectSketch = (id: string) => {
        setSelectedSketchId(id);
        setIsOutlineModalOpen(false);
    };

    const handleDeleteSketch = (e: React.MouseEvent, sketchId: string) => {
        e.stopPropagation();
        setProjectData(c => {
            if (!c) return null;
            const updatedSketches = c.sketches.filter(s => s.id !== sketchId);
            if (selectedSketchId === sketchId) setSelectedSketchId(updatedSketches[0]?.id || null);
            return { ...c, sketches: updatedSketches };
        });
    };

    const handleUpdateSketch = (field: 'title' | 'content', value: string) => {
        if (!selectedSketchId) return;
        setProjectData(c => {
            if (!c) return null;
            const index = c.sketches.findIndex(s => s.id === selectedSketchId);
            if (index === -1) return c;
            const updatedSketches = [...c.sketches];
            updatedSketches[index] = { ...updatedSketches[index], [field]: value, updatedAt: new Date().toISOString() };
            return { ...c, sketches: updatedSketches };
        });
    };

    const handleDocxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) { e.target.value = ''; return; }
        setIsOutlineModalOpen(false);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const { value: html } = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: ["p[style-name='Title']=>h1:fresh", "p[style-name='Heading 1']=>h2:fresh", "p[style-name='Heading 2']=>h3:fresh"] });
            const cleanedHtml = html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
            const now = new Date().toISOString();
            const newSketch: Sketch = { id: crypto.randomUUID(), title: file.name.replace(/\.docx$/, ''), content: cleanedHtml, createdAt: now, updatedAt: now };
            setProjectData(c => {
                if (!c) return null;
                setSelectedSketchId(newSketch.id);
                return { ...c, sketches: [newSketch, ...c.sketches] };
            });
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            alert(`Failed to process ${file.name}.`);
        }
        e.target.value = '';
    };

    const handleExport = (format: 'txt' | 'html' | 'md') => {
        if (!selectedSketch) return;
        const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        const filename = `${slugify(selectedSketch.title)}.${format}`;
        let content = '';
        let mimeType = '';

        if (format === 'txt') {
            content = getPlainText(selectedSketch.content);
            mimeType = 'text/plain';
        } else if (format === 'html') {
            content = `<!DOCTYPE html><html><head><title>${selectedSketch.title}</title></head><body>${selectedSketch.content}</body></html>`;
            mimeType = 'text/html';
        } else if (format === 'md') {
            content = enhancePlainText(selectedSketch.content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
            mimeType = 'text/markdown';
        }

        const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
            return;
        }

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) {
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
                const precedingRange = document.createRange();
                if (!editorRef.current) return;
                precedingRange.setStart(editorRef.current, 0);
                precedingRange.setEnd(range.startContainer, range.startOffset);
                const textBeforeCursor = precedingRange.toString();
                const lastChar = textBeforeCursor.slice(-1);
                const isAfterWhitespace = !lastChar.trim();
                const openQuotePreceders = new Set(['(', '[', '{', '“', '‘']);
                const shouldBeOpening = isAfterWhitespace || openQuotePreceders.has(lastChar);
                if (e.key === "'") {
                    if (/\w/.test(lastChar)) document.execCommand('insertText', false, '’');
                    else if (shouldBeOpening) document.execCommand('insertText', false, '‘');
                    else document.execCommand('insertText', false, '’');
                } else {
                    if (shouldBeOpening) document.execCommand('insertText', false, '“');
                    else document.execCommand('insertText', false, '”');
                }
            }
            editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            return;
        }

        if (e.key === 'Enter') {
            setTimeout(() => {
                const sel = window.getSelection();
                if (!sel?.rangeCount || !editorRef.current) return;
                let currentBlock = sel.getRangeAt(0).startContainer;
                while (currentBlock && currentBlock.parentNode !== editorRef.current) currentBlock = currentBlock.parentNode;
                if (currentBlock instanceof HTMLElement) {
                    const isNewBlockEmpty = (currentBlock.textContent?.trim() === '' && currentBlock.children.length === 0) || currentBlock.innerHTML === '<br>';
                    if (isNewBlockEmpty) {
                        const previousBlock = currentBlock.previousElementSibling;
                        if (previousBlock instanceof HTMLElement) {
                            let styleSource: Element = previousBlock;
                            let lastNode: Node | null = previousBlock;
                            while (lastNode && lastNode.lastChild) lastNode = lastNode.lastChild;
                            if (lastNode) styleSource = lastNode.nodeType === Node.TEXT_NODE ? lastNode.parentElement! : lastNode as Element;
                            const computedStyle = window.getComputedStyle(styleSource);
                            const editorStyles = window.getComputedStyle(editorRef.current!);
                            if (computedStyle.fontFamily !== editorStyles.fontFamily) {
                                currentBlock.innerHTML = '';
                                const styleCarrier = document.createElement('span');
                                styleCarrier.style.fontFamily = computedStyle.fontFamily;
                                styleCarrier.innerHTML = '&#8203;';
                                currentBlock.appendChild(styleCarrier);
                                const newRange = document.createRange();
                                newRange.setStart(styleCarrier, 1);
                                newRange.collapse(true);
                                sel.removeAllRanges();
                                sel.addRange(newRange);
                            }
                        }
                    }
                }
            }, 0);
            setTimeout(cleanupEditor, 10);
        }
    };
    
    const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== ' ' || !editorRef.current) return;

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (!range.collapsed) return;

        let blockElement: Node | null = range.startContainer;
        while (blockElement && blockElement.parentNode !== editorRef.current) {
            blockElement = blockElement.parentNode;
        }

        if (!(blockElement instanceof HTMLElement)) return;

        const text = blockElement.textContent || '';
        let format: 'h1' | 'h2' | 'h3' | null = null;
        let markdownLength = 0;

        if (text.startsWith('# ')) { format = 'h1'; markdownLength = 2; } 
        else if (text.startsWith('## ')) { format = 'h2'; markdownLength = 3; } 
        else if (text.startsWith('### ')) { format = 'h3'; markdownLength = 4; }
        
        if (format) {
            const textNode = blockElement.firstChild;
            if (textNode?.nodeType === Node.TEXT_NODE && (textNode.textContent?.length ?? 0) >= markdownLength) {
                const markdownRange = document.createRange();
                markdownRange.setStart(textNode, 0);
                markdownRange.setEnd(textNode, markdownLength);
                selection.removeAllRanges();
                selection.addRange(markdownRange);
                document.execCommand('delete', false);
                document.execCommand('formatBlock', false, format);
                editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            }
        }
    }, []);

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;
        const htmlToInsert = text.split(/\r?\n/).map(line => `<p>${line.trim() === '' ? '<br>' : enhancePlainText(line)}</p>`).join('');
        document.execCommand('insertHTML', false, htmlToInsert);
        cleanupEditor();
    };

    const handleCopy = useCallback((e: ClipboardEvent) => {
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
        if (!selection?.rangeCount || !editorRef.current.contains(selection.anchorNode)) return;
        let element = selection.anchorNode.nodeType === 3 ? selection.anchorNode.parentNode! : selection.anchorNode;
        if (!(element instanceof HTMLElement)) return;
        let detectedStyle = 'p'; let detectedSpacing = '1em';
        let blockEl: HTMLElement | null = element;
        while(blockEl && blockEl !== editorRef.current) {
            const tag = blockEl.tagName.toLowerCase();
            if(['p', 'h1', 'h2', 'h3', 'blockquote'].includes(tag)) {
                detectedStyle = tag;
                const styles = window.getComputedStyle(blockEl);
                if (styles.marginBottom) {
                    const mbPx = parseFloat(styles.marginBottom); const fontPx = parseFloat(styles.fontSize);
                    if (fontPx > 0) {
                        const mbEm = mbPx / fontPx;
                        if (mbEm < 0.75) detectedSpacing = '0.5em'; else if (mbEm < 1.25) detectedSpacing = '1em'; else if (mbEm < 1.75) detectedSpacing = '1.5em'; else detectedSpacing = '2em';
                    }
                }
                break;
            }
            blockEl = blockEl.parentElement;
        }
        const inlineStyles = window.getComputedStyle(element);
        const family = inlineStyles.fontFamily;
        setCurrentFormat({ paragraphStyle: detectedStyle, font: fontOptions.find(f => family.includes(f.name))?.value || fontOptions[0].value, size: inlineStyles.fontSize, paragraphSpacing: detectedSpacing });
    }, []);

    const handleSelectionChange = useCallback(() => {
        updateActiveFormats();
        updateCurrentFormat();
    }, [updateActiveFormats, updateCurrentFormat]);

    const applyAndSaveFormat = useCallback((formatAction: () => void) => {
        if (!editorRef.current) return;
        formatAction();
        cleanupEditor();
        editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        editorRef.current.focus();
        handleSelectionChange();
    }, [handleSelectionChange, cleanupEditor]);

    const applyCommand = (cmd: string, value?: string) => {
        applyAndSaveFormat(() => document.execCommand(cmd, false, value));
    };
    
    const applyParagraphStyle = (style: string) => applyCommand('formatBlock', style);
    const applyFont = (fontValue: string) => applyCommand('fontName', fontOptions.find(f => f.value === fontValue)?.name || 'serif');
    const applyColor = (color: string) => applyCommand('foreColor', color);
    const applyParagraphSpacing = (spacing: string) => {
        applyAndSaveFormat(() => {
            const selection = window.getSelection();
            if (!selection?.rangeCount) return;
            let node = selection.getRangeAt(0).startContainer;
            if (node.nodeType === 3) node = node.parentNode!;
            while (node && node !== editorRef.current) {
                if (node instanceof HTMLElement && ['P', 'H1', 'H2', 'H3', 'DIV'].includes(node.tagName)) {
                    node.style.marginBottom = spacing; return;
                }
                node = node.parentNode!;
            }
        });
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
            const tempSpans = Array.from(editorRef.current.querySelectorAll<HTMLElement>(`span[style*="background-color: ${DUMMY_COLOR_RGB}"]`));
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

    useEffect(() => {
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', handleSelectionChange);
        if (editorEl) {
            editorEl.addEventListener('keyup', handleSelectionChange);
            editorEl.addEventListener('copy', handleCopy);
        }
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            if (editorEl) {
                editorEl.removeEventListener('keyup', handleSelectionChange);
                editorEl.removeEventListener('copy', handleCopy);
            }
        };
    }, [handleSelectionChange, handleCopy]);

    return (
        <div className={`flex flex-col h-screen ${themeClasses.bg} font-sans transition-all duration-300 ${isDistractionFree ? 'is-distraction-free' : ''}`}>
            {isSpellcheckPanelOpen && spellcheckErrors.length > 0 && (
                <SpellCheckPanel 
                    error={spellcheckErrors[currentErrorIndex]}
                    onClose={handleCloseSpellcheck}
                    onNext={handleSpellcheckNext}
                    onIgnore={handleSpellcheckIgnore}
                    onChange={handleSpellcheckChange}
                    onAddToDictionary={handleAddToDictionary}
                    themeClasses={themeClasses}
                    isLast={currentErrorIndex >= spellcheckErrors.length - 1}
                />
            )}
            {!isOutlineSidebarOpen && (
                <div className="fixed top-0 left-0 h-full z-40 flex items-center">
                    <button onClick={() => setIsOutlineSidebarOpen(true)} className={`pl-2 pr-1 py-3 bg-stone-900/70 backdrop-blur-sm border-y border-r border-white/10 rounded-r-lg text-white/70 hover:bg-stone-800/70 transition-colors ${!selectedSketchId ? 'hidden' : ''}`} aria-label="Show document outline" disabled={!selectedSketchId}>
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
            
             <div className={`fixed top-0 left-0 h-full z-40 flex items-start transition-transform duration-300 ease-in-out ${isOutlineSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className={`w-64 h-full bg-stone-900/80 border-r border-white/10 backdrop-blur-sm flex flex-col ${isDistractionFree ? 'pt-4' : 'pt-16'}`}>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0"><h3 className="font-bold text-white">Document Outline</h3><button onClick={() => setIsOutlineSidebarOpen(false)} className="p-1 rounded-full text-white/70 hover:bg-white/10" aria-label="Close outline"><ChevronLeftIcon className="w-5 h-5"/></button></div>
                    <nav className="flex-1 overflow-y-auto p-2">
                        {headings.length > 0 ? (<ul className="space-y-1">{headings.map(h => (<li key={h.id}><button onClick={() => {const el = document.getElementById(h.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });}} className={`w-full text-left px-2 py-1 rounded text-sm text-white/80 hover:bg-white/10 truncate ${h.level === 2 ? 'pl-6' : ''} ${h.level === 3 ? 'pl-10' : ''}`} title={h.text}>{enhancePlainText(h.text)}</button></li>))}</ul>) : (<p className="p-4 text-sm text-white/50">No headings in document.</p>)}
                    </nav>
                    <div className="p-4 border-t border-white/10 flex-shrink-0">
                        <label className="block text-sm font-semibold mb-2 text-white/90" htmlFor="spellcheck-lang-demos">
                            Language & Spelling
                        </label>
                        <select
                            id="spellcheck-lang-demos"
                            value={projectData?.settings.spellcheckLanguage || 'en'}
                            onChange={(e) => handleLanguageChange(e.target.value as SpellcheckLang)}
                            className="w-full px-3 py-2 rounded-md text-sm bg-stone-800 border border-stone-600 text-white"
                        >
                            <option value="en">English</option>
                            <option value="fi">Finnish (Suomi)</option>
                            <option value="vi">Vietnamese (Tiếng Việt)</option>
                            <option value="browser-default">Browser Default</option>
                        </select>
                        <p className="mt-2 text-xs text-white/50">
                            Note: Custom spellchecker requires a dictionary. May not be available for all languages.
                        </p>
                    </div>
                </div>
            </div>

            <header className={`flex-shrink-0 flex items-center justify-between p-3 border-b ${themeClasses.border} ${isDistractionFree ? 'hidden' : ''}`}>
                <div className="flex items-center space-x-2"><button onClick={() => navigate('/')} className="p-2 rounded-md hover:bg-white/10"><HomeIcon className={`w-5 h-5 ${themeClasses.text}`} /></button><div className="w-px h-5 bg-white/20"></div><button onClick={() => setIsOutlineModalOpen(true)} className="p-2 rounded-md hover:bg-white/10"><Bars3Icon className={`w-5 h-5 ${themeClasses.text}`} /></button></div>
                {selectedSketch && <input key={`${selectedSketch.id}-title`} defaultValue={selectedSketch.title} onBlur={(e) => handleUpdateSketch('title', e.target.value)} placeholder="Sketch Title" className={`text-lg font-semibold bg-transparent outline-none w-1/2 text-center ${themeClasses.text}`} />}
                <div className="flex items-center space-x-2"><button onClick={() => startSpellcheck()} className="p-2 rounded-md hover:bg-white/10" disabled={!selectedSketchId || !spellchecker}><SpellcheckIcon className={`w-5 h-5 ${themeClasses.text}`} /></button><button onClick={() => setIsFindReplaceOpen(p => !p)} className="p-2 rounded-md hover:bg-white/10" disabled={!selectedSketchId}><SearchIcon className={`w-5 h-5 ${themeClasses.text}`} /></button><button onClick={() => setIsStatsOpen(p => !p)} className="p-2 rounded-md hover:bg-white/10" disabled={!selectedSketchId}><ChartBarIcon className={`w-5 h-5 ${themeClasses.text}`} /></button><div className="relative"><button onClick={() => setIsExportMenuOpen(p => !p)} className="p-2 rounded-md hover:bg-white/10" disabled={!selectedSketchId}><DownloadIcon className={`w-5 h-5 ${themeClasses.text}`} /></button>{isExportMenuOpen && <div className={`absolute top-full right-0 mt-2 w-48 p-2 rounded-md shadow-lg ${themeClasses.bgSecondary} border ${themeClasses.border}`}><button onClick={() => handleExport('html')} className={`block w-full text-left px-3 py-2 rounded hover:${themeClasses.bgTertiary}`}>Export as .html</button><button onClick={() => handleExport('txt')} className={`block w-full text-left px-3 py-2 rounded hover:${themeClasses.bgTertiary}`}>Export as .txt</button><button onClick={() => handleExport('md')} className={`block w-full text-left px-3 py-2 rounded hover:${themeClasses.bgTertiary}`}>Export as .md</button></div>}</div><button onClick={() => setIsDistractionFree(p => !p)} className="p-2 rounded-md hover:bg-white/10">{isDistractionFree ? <ArrowsPointingInIcon className={`w-5 h-5 ${themeClasses.text}`} /> : <ArrowsPointingOutIcon className={`w-5 h-5 ${themeClasses.text}`} />}</button></div>
            </header>
            
            <input type="file" ref={docxInputRef} onChange={handleDocxImport} className="hidden" accept=".docx" />
            
            <main className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
                <div className={`p-8 md:p-12 font-serif min-h-full max-w-4xl mx-auto ${isDistractionFree ? 'pt-24' : ''}`}>
                    {selectedSketch ? (<div ref={editorRef} key={`${selectedSketch.id}-content`} contentEditable spellCheck={false} suppressContentEditableWarning onInput={(e) => handleUpdateSketch('content', e.currentTarget.innerHTML)} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onPaste={handlePaste} onBlur={cleanupEditor} className={`w-full text-lg leading-relaxed outline-none story-content ${themeClasses.text}`} style={editorStyle} />) : (<div className="flex flex-col items-center justify-center h-full text-center mt-[-4rem]"><LightbulbIcon className={`w-16 h-16 mb-4 ${themeClasses.textSecondary}`} /><h2 className={`text-2xl font-bold ${themeClasses.accentText}`}>Welcome to Demos</h2><p className={`mt-2 max-w-md ${themeClasses.textSecondary}`}>This is your space for ideas and notes. Create a new sketch to get started.</p><button onClick={handleCreateSketch} className={`mt-8 flex items-center justify-center space-x-2 px-6 py-3 text-lg font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}><PlusIcon className="w-6 h-6" /><span>Create First Sketch</span></button></div>)}
                </div>
            </main>

            <SketchesOutlineModal isOpen={isOutlineModalOpen} onClose={() => setIsOutlineModalOpen(false)} sketches={sketches} selectedSketchId={selectedSketchId} onSelect={handleSelectSketch} onCreate={handleCreateSketch} onImportClick={() => docxInputRef.current?.click()} onDelete={handleDeleteSketch} themeClasses={themeClasses} />
            <FindReplaceDialog isOpen={isFindReplaceOpen} onClose={() => setIsFindReplaceOpen(false)} editorRef={editorRef} />
            {isStatsOpen && <div className={`fixed top-20 right-8 p-4 rounded-lg shadow-2xl w-full max-w-xs ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border} z-50`}><div className="flex justify-between items-center mb-2"><h2 className="text-lg font-bold">Statistics</h2><button onClick={() => setIsStatsOpen(false)} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}><CloseIcon className="w-5 h-5" /></button></div><div className="space-y-2 text-sm"><div><strong>Word Count:</strong> {stats.wordCount.toLocaleString()}</div><div><strong>Character Count:</strong> {stats.charCount.toLocaleString()}</div></div></div>}
            
            <div className={`absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none transition-opacity duration-300 ${isDistractionFree ? 'opacity-0' : 'opacity-100'}`}>
                <div ref={toolbarRef} className="relative pointer-events-auto">
                    {isFormatPanelOpen && (<div className="absolute bottom-full mb-2 p-4 rounded-lg shadow-lg bg-stone-900/80 border border-white/10 backdrop-blur-sm w-[320px]"><div className="space-y-4"><ToolbarDropdown label="Paragraph Style" value={currentFormat.paragraphStyle} onChange={(e) => applyParagraphStyle(e.target.value)}><option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Blockquote</option></ToolbarDropdown><ToolbarDropdown label="Font" value={currentFormat.font} onChange={(e) => applyFont(e.target.value)}>{fontOptions.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}</ToolbarDropdown><div className="grid grid-cols-2 gap-4"><ToolbarDropdown label="Size" value={currentFormat.size} onChange={(e) => applyFontSize(e.target.value)}><option value="14px">14</option><option value="16px">16</option><option value="18px">18</option><option value="20px">20</option><option value="24px">24</option></ToolbarDropdown><ToolbarDropdown label="Paragraph Spacing" value={currentFormat.paragraphSpacing} onChange={(e) => applyParagraphSpacing(e.target.value)}><option value="0.5em">0.5</option><option value="1em">1.0</option><option value="1.5em">1.5</option><option value="2em">2.0</option></ToolbarDropdown></div><div><label className="block text-xs font-semibold mb-2 text-white/70">Color</label><div className="flex space-x-2">{colorPalette.map(c => (<button key={c} onClick={() => applyColor(c)} className="w-6 h-6 rounded-full border border-gray-400" style={{backgroundColor: c}}></button>))}</div></div></div></div>)}
                    <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm" onMouseDown={(e) => e.preventDefault()}>
                        <button onClick={() => setIsFormatPanelOpen(p => !p)} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${isFormatPanelOpen ? 'bg-white/20' : ''}`}><TextIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyCommand('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isBold ? 'bg-white/20' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyCommand('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isItalic ? 'bg-white/20' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isUL ? 'bg-white/20' : ''}`}><ListBulletIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isOL ? 'bg-white/20' : ''}`}><OrderedListIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyParagraphStyle('blockquote')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${currentFormat.paragraphStyle === 'blockquote' ? 'bg-white/20' : ''}`}><BlockquoteIcon className="w-5 h-5"/></button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => applyParagraphStyle('h1')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${currentFormat.paragraphStyle === 'h1' ? 'bg-white/20' : ''}`}><H1Icon className="w-5 h-5"/></button>
                        <button onClick={() => applyParagraphStyle('h2')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${currentFormat.paragraphStyle === 'h2' ? 'bg-white/20' : ''}`}><H2Icon className="w-5 h-5"/></button>
                        <button onClick={() => applyParagraphStyle('h3')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${currentFormat.paragraphStyle === 'h3' ? 'bg-white/20' : ''}`}><H3Icon className="w-5 h-5"/></button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => applyCommand('undo')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><UndoIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyCommand('redo')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><RedoIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemosPage;
