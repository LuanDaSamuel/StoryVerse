import React, { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { Sketch } from '../types';
import { UploadIcon, PlusIcon, TrashIcon, LightbulbIcon, ChevronDownIcon, TextIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, Bars3Icon, CloseIcon, ListBulletIcon, HomeIcon, SearchIcon, DownloadIcon, ChartBarIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, BlockquoteIcon, OrderedListIcon } from '../components/Icons';
import { enhanceHtml, enhancePlainText } from '../constants';
import { THEME_CONFIG } from '../constants';
import * as mammoth from 'mammoth';

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

const DocumentOutlineModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    editorRef: React.RefObject<HTMLDivElement>;
    themeClasses: any;
}> = ({ isOpen, onClose, editorRef, themeClasses }) => {
    const [headings, setHeadings] = useState<Heading[]>([]);

    useEffect(() => {
        if (isOpen && editorRef.current) {
            const headingElements = Array.from(editorRef.current.querySelectorAll('h1, h2, h3'));
            const newHeadings = headingElements.map((el, index) => {
                const htmlEl = el as HTMLElement;
                if (!htmlEl.id) htmlEl.id = `temp-heading-id-${index}`;
                return { id: htmlEl.id, text: htmlEl.textContent || 'Untitled Heading', level: parseInt(htmlEl.tagName.substring(1), 10) };
            });
            setHeadings(newHeadings);
        }
    }, [isOpen, editorRef]);

    const handleHeadingClick = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4 font-sans" onClick={onClose} role="dialog">
            <div className={`w-full max-w-md p-6 rounded-lg shadow-2xl ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Document Outline</h2><button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}><CloseIcon className="w-6 h-6" /></button></div>
                {headings.length > 0 ? (
                    <nav className="max-h-[60vh] overflow-y-auto -mr-2 pr-2">
                        <ul className="space-y-1">
                            {headings.map(h => <li key={h.id}><button onClick={() => handleHeadingClick(h.id)} className={`w-full text-left px-3 py-2 rounded-md transition-colors hover:${themeClasses.bgTertiary} ${h.level === 2 ? 'pl-8' : ''} ${h.level === 3 ? 'pl-12' : ''}`}>{enhancePlainText(h.text)}</button></li>)}
                        </ul>
                    </nav>
                ) : <p className={themeClasses.textSecondary}>No headings (H1, H2, H3) found.</p>}
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

    const clearHighlights = useCallback(() => {
        if (!editorRef.current) return;
        editorRef.current.querySelectorAll('.search-highlight').forEach(node => {
            const parent = node.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(node.textContent || ''), node);
                parent.normalize();
            }
        });
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
        const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
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
    }, [findText, editorRef, clearHighlights]);

    useEffect(() => {
        if (isOpen) highlightMatches();
    }, [findText, isOpen, highlightMatches]);

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
    const [isDocumentOutlineOpen, setIsDocumentOutlineOpen] = useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [isDistractionFree, setIsDistractionFree] = useState(false);
    const [stats, setStats] = useState({ wordCount: 0, charCount: 0, readingTime: 0 });

    const editorRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const docxInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const [isFormatPanelOpen, setIsFormatPanelOpen] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false, isUL: false, isOL: false });
    const [currentFormat, setCurrentFormat] = useState({ paragraphStyle: 'p', font: fontOptions[0].value, size: '18px', paragraphSpacing: '1em' });

    const sketches = useMemo(() => projectData?.sketches || [], [projectData?.sketches]);
    const selectedSketch = useMemo(() => sketches.find(s => s.id === selectedSketchId) || null, [sketches, selectedSketchId]);
    
    const editorStyle = useMemo(() => theme === 'book' ? { color: THEME_CONFIG.book.text.match(/\[(.*?)\]/)?.[1] || '#F5EADD' } : { color: 'inherit' }, [theme]);
    const colorPalette = useMemo(() => theme === 'book' ? [THEME_CONFIG.book.text.match(/\[(.*?)\]/)?.[1] || '#F5EADD', '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'] : ['#3B2F27', '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'], [theme]);

    // --- Effects for state management and setup ---

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
            setStats({ wordCount, charCount: text.length, readingTime: Math.ceil(wordCount / 200) });
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

    // --- Handlers for sketch data operations ---

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

    // --- Handlers for export ---

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

    // --- Formatting Logic ---

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

    const applyCommand = (cmd: string, value?: string) => {
        if (!editorRef.current) return;
        document.execCommand(cmd, false, value);
        editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        editorRef.current.focus();
        handleSelectionChange();
    };

    const applyParagraphStyle = (style: string) => applyCommand('formatBlock', style);
    const applyFont = (fontValue: string) => applyCommand('fontName', fontOptions.find(f => f.value === fontValue)?.name || 'serif');
    const applyColor = (color: string) => applyCommand('foreColor', color);
    const applyParagraphSpacing = (spacing: string) => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        let node = selection.getRangeAt(0).startContainer;
        if (node.nodeType === 3) node = node.parentNode!;
        while (node && node !== editorRef.current) {
            if (node instanceof HTMLElement && ['P', 'H1', 'H2', 'H3', 'DIV'].includes(node.tagName)) {
                node.style.marginBottom = spacing;
                editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }
            node = node.parentNode!;
        }
    };
    
    // --- Lifecycle and event listeners ---

    useEffect(() => {
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', handleSelectionChange);
        if (editorEl) editorEl.addEventListener('keyup', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            if (editorEl) editorEl.removeEventListener('keyup', handleSelectionChange);
        };
    }, [handleSelectionChange]);

    // --- Render ---

    return (
        <div className={`flex flex-col h-screen ${themeClasses.bg} font-sans transition-all duration-300 ${isDistractionFree ? 'is-distraction-free' : ''}`}>
            {/* Header */}
            <header className={`flex-shrink-0 flex items-center justify-between p-3 border-b ${themeClasses.border} ${isDistractionFree ? 'hidden' : ''}`}>
                <div className="flex items-center space-x-2">
                    <button onClick={() => navigate('/')} className="p-2 rounded-md hover:bg-white/10"><HomeIcon className={`w-5 h-5 ${themeClasses.text}`} /></button>
                    <div className="w-px h-5 bg-white/20"></div>
                    <button onClick={() => setIsOutlineModalOpen(true)} className="p-2 rounded-md hover:bg-white/10"><Bars3Icon className={`w-5 h-5 ${themeClasses.text}`} /></button>
                </div>
                {selectedSketch && <input key={`${selectedSketch.id}-title`} defaultValue={selectedSketch.title} onBlur={(e) => handleUpdateSketch('title', e.target.value)} placeholder="Sketch Title" className={`text-lg font-semibold bg-transparent outline-none w-1/2 text-center ${themeClasses.text}`} />}
                <div className="flex items-center space-x-2">
                    <button onClick={() => setIsFindReplaceOpen(p => !p)} className="p-2 rounded-md hover:bg-white/10" disabled={!selectedSketchId}><SearchIcon className={`w-5 h-5 ${themeClasses.text}`} /></button>
                    <button onClick={() => setIsStatsOpen(p => !p)} className="p-2 rounded-md hover:bg-white/10" disabled={!selectedSketchId}><ChartBarIcon className={`w-5 h-5 ${themeClasses.text}`} /></button>
                    <div className="relative"><button onClick={() => setIsExportMenuOpen(p => !p)} className="p-2 rounded-md hover:bg-white/10" disabled={!selectedSketchId}><DownloadIcon className={`w-5 h-5 ${themeClasses.text}`} /></button>
                        {isExportMenuOpen && <div className={`absolute top-full right-0 mt-2 w-48 p-2 rounded-md shadow-lg ${themeClasses.bgSecondary} border ${themeClasses.border}`}><button onClick={() => handleExport('html')} className={`block w-full text-left px-3 py-2 rounded hover:${themeClasses.bgTertiary}`}>Export as .html</button><button onClick={() => handleExport('txt')} className={`block w-full text-left px-3 py-2 rounded hover:${themeClasses.bgTertiary}`}>Export as .txt</button><button onClick={() => handleExport('md')} className={`block w-full text-left px-3 py-2 rounded hover:${themeClasses.bgTertiary}`}>Export as .md</button></div>}
                    </div>
                    <button onClick={() => setIsDistractionFree(p => !p)} className="p-2 rounded-md hover:bg-white/10">{isDistractionFree ? <ArrowsPointingInIcon className={`w-5 h-5 ${themeClasses.text}`} /> : <ArrowsPointingOutIcon className={`w-5 h-5 ${themeClasses.text}`} />}</button>
                </div>
            </header>
            
            <input type="file" ref={docxInputRef} onChange={handleDocxImport} className="hidden" accept=".docx" />
            
            <main className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
                <div className={`p-8 md:p-12 font-serif min-h-full max-w-4xl mx-auto ${isDistractionFree ? 'pt-24' : ''}`}>
                    {selectedSketch ? (
                        <div ref={editorRef} key={`${selectedSketch.id}-content`} contentEditable suppressContentEditableWarning onInput={(e) => handleUpdateSketch('content', e.currentTarget.innerHTML)} className={`w-full text-lg leading-relaxed outline-none story-content ${themeClasses.text}`} style={editorStyle} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center mt-[-4rem]"><LightbulbIcon className={`w-16 h-16 mb-4 ${themeClasses.textSecondary}`} /><h2 className={`text-2xl font-bold ${themeClasses.accentText}`}>Welcome to Demos</h2><p className={`mt-2 max-w-md ${themeClasses.textSecondary}`}>This is your space for ideas and notes. Create a new sketch to get started.</p><button onClick={handleCreateSketch} className={`mt-8 flex items-center justify-center space-x-2 px-6 py-3 text-lg font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}><PlusIcon className="w-6 h-6" /><span>Create First Sketch</span></button></div>
                    )}
                </div>
            </main>

            {/* Modals & Dialogs */}
            <SketchesOutlineModal isOpen={isOutlineModalOpen} onClose={() => setIsOutlineModalOpen(false)} sketches={sketches} selectedSketchId={selectedSketchId} onSelect={handleSelectSketch} onCreate={handleCreateSketch} onImportClick={() => docxInputRef.current?.click()} onDelete={handleDeleteSketch} themeClasses={themeClasses} />
            <DocumentOutlineModal isOpen={isDocumentOutlineOpen} onClose={() => setIsDocumentOutlineOpen(false)} editorRef={editorRef} themeClasses={themeClasses} />
            <FindReplaceDialog isOpen={isFindReplaceOpen} onClose={() => setIsFindReplaceOpen(false)} editorRef={editorRef} />
            {isStatsOpen && <div className={`fixed top-20 right-8 p-4 rounded-lg shadow-2xl w-full max-w-xs ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border} z-50`}><div className="flex justify-between items-center mb-2"><h2 className="text-lg font-bold">Statistics</h2><button onClick={() => setIsStatsOpen(false)} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}><CloseIcon className="w-5 h-5" /></button></div><div className="space-y-2 text-sm"><div><strong>Word Count:</strong> {stats.wordCount.toLocaleString()}</div><div><strong>Character Count:</strong> {stats.charCount.toLocaleString()}</div><div><strong>Reading Time:</strong> ~{stats.readingTime} min</div></div></div>}
            
            {/* Floating Toolbar */}
            <div className={`absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none transition-opacity duration-300 ${isDistractionFree ? 'opacity-0' : 'opacity-100'}`}>
                <div ref={toolbarRef} className="relative pointer-events-auto">
                    {isFormatPanelOpen && (<div className="absolute bottom-full mb-2 p-4 rounded-lg shadow-lg bg-stone-900/80 border border-white/10 backdrop-blur-sm w-[320px]"><div className="space-y-4"><ToolbarDropdown label="Paragraph Style" value={currentFormat.paragraphStyle} onChange={(e) => applyParagraphStyle(e.target.value)}><option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Blockquote</option></ToolbarDropdown><ToolbarDropdown label="Font" value={currentFormat.font} onChange={(e) => applyFont(e.target.value)}>{fontOptions.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}</ToolbarDropdown><div className="grid grid-cols-2 gap-4"><ToolbarDropdown label="Size" value={currentFormat.size} onChange={(e) => console.log('Size change not implemented yet')}><option value="14px">14</option><option value="16px">16</option><option value="18px">18</option><option value="20px">20</option><option value="24px">24</option></ToolbarDropdown><ToolbarDropdown label="Paragraph Spacing" value={currentFormat.paragraphSpacing} onChange={(e) => applyParagraphSpacing(e.target.value)}><option value="0.5em">0.5</option><option value="1em">1.0</option><option value="1.5em">1.5</option><option value="2em">2.0</option></ToolbarDropdown></div><div><label className="block text-xs font-semibold mb-2 text-white/70">Color</label><div className="flex space-x-2">{colorPalette.map(c => (<button key={c} onClick={() => applyColor(c)} className="w-6 h-6 rounded-full border border-gray-400" style={{backgroundColor: c}}></button>))}</div></div></div></div>)}
                    <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm" onMouseDown={(e) => e.preventDefault()}>
                        <button onClick={() => setIsDocumentOutlineOpen(true)} className="p-2 rounded-full text-white/90 hover:bg-white/10" disabled={!selectedSketchId}><ListBulletIcon className="w-5 h-5"/></button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => setIsFormatPanelOpen(p => !p)} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${isFormatPanelOpen ? 'bg-white/20' : ''}`}><TextIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyCommand('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isBold ? 'bg-white/20' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyCommand('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isItalic ? 'bg-white/20' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isUL ? 'bg-white/20' : ''}`}><ListBulletIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isOL ? 'bg-white/20' : ''}`}><OrderedListIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyParagraphStyle('blockquote')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${currentFormat.paragraphStyle === 'blockquote' ? 'bg-white/20' : ''}`}><BlockquoteIcon className="w-5 h-5"/></button>
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