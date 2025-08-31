import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, TextIcon, SearchIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, CloseIcon, Bars3Icon, DownloadIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, H1Icon, H2Icon, H3Icon, SpellcheckIcon, ChartBarIcon, ArrowsPointingInIcon, ArrowsPointingOutIcon } from '../components/Icons';
import { enhancePlainText, enhanceHtml } from '../constants';
import ExportModal from '../components/ExportModal';
import { Chapter, SpellcheckLang } from '../types';

declare var Typo: any;

interface SpellcheckError {
    word: string;
    suggestions: string[];
    context: { before: string; after: string; };
    node: Text;
    startOffset: number;
    endOffset: number;
}

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

const ChapterListModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    novel: { id: string; chapters: { id: string; title: string }[] };
    currentChapterId: string;
    themeClasses: any;
}> = ({ isOpen, onClose, novel, currentChapterId, themeClasses }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4 font-sans" onClick={onClose} role="dialog">
            <div className={`w-full max-w-md p-6 rounded-lg shadow-2xl ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Chapter Outline</h2><button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}><CloseIcon className="w-6 h-6" /></button></div>
                <nav className="max-h-[60vh] overflow-y-auto -mr-2 pr-2"><ul className="space-y-1">{novel.chapters.map(c => (<li key={c.id}><Link to={`/novel/${novel.id}/edit/${c.id}`} onClick={onClose} className={`block w-full text-left px-3 py-2 rounded-md transition-colors ${c.id === currentChapterId ? `${themeClasses.bgTertiary}` : `hover:${themeClasses.bgTertiary}`}`}>{enhancePlainText(c.title || 'Untitled Chapter')}</Link></li>))}</ul></nav>
            </div>
        </div>
    );
};

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
        <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-lg">Spell Check</h3><button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}><CloseIcon className="w-5 h-5"/></button></div>
        <div className={`p-3 rounded-md ${themeClasses.bgTertiary} text-sm mb-3`}><p className={themeClasses.textSecondary}>{error.context.before}<span className="font-bold text-red-400">{error.word}</span>{error.context.after}</p></div>
        <div className="space-y-2 max-h-32 overflow-y-auto mb-3">{error.suggestions.length > 0 ? (error.suggestions.slice(0, 5).map(sugg => (<button key={sugg} onClick={() => onChange(sugg)} className={`block w-full text-left px-3 py-1.5 rounded-md text-sm hover:${themeClasses.bgTertiary}`}>{sugg}</button>))) : (<p className={`text-sm px-3 py-2 ${themeClasses.textSecondary}`}>No suggestions found.</p>)}</div>
        <div className="flex justify-between items-center pt-2 border-t border-white/10"><div className="space-x-1"><button onClick={() => onIgnore(error.word)} className={`px-3 py-1 text-xs font-semibold rounded-md hover:opacity-80 ${themeClasses.bgTertiary}`}>Ignore</button><button onClick={() => onAddToDictionary(error.word)} className={`px-3 py-1 text-xs font-semibold rounded-md hover:opacity-80 ${themeClasses.bgTertiary}`}>Add Word</button></div><button onClick={onNext} className={`px-4 py-2 text-sm font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}>{isLast ? 'Finish' : 'Next'}</button></div>
    </div>
);

const FindReplaceModal: React.FC<{
  isOpen: boolean; onClose: () => void; editorRef: React.RefObject<HTMLDivElement>;
  onReplaceAllInNovel: (find: string, replace: string, caseSensitive: boolean, wholeWord: boolean) => void;
}> = ({ isOpen, onClose, editorRef, onReplaceAllInNovel }) => {
  const { themeClasses } = useContext(ProjectContext);
  const [findText, setFindText] = useState(''); const [replaceText, setReplaceText] = useState(''); const [scope, setScope] = useState<'current' | 'all'>('current'); const [matches, setMatches] = useState<HTMLElement[]>([]); const [currentIndex, setCurrentIndex] = useState(-1); const [caseSensitive, setCaseSensitive] = useState(false); const [wholeWord, setWholeWord] = useState(false); const debounceTimeout = useRef<number | null>(null);
  const clearHighlights = useCallback(() => { if (!editorRef.current) return; editorRef.current.querySelectorAll('.search-highlight, .current-match').forEach(node => { const parent = node.parentNode; if (parent) { while(node.firstChild) { parent.insertBefore(node.firstChild, node); } parent.removeChild(node); }}); editorRef.current.normalize(); }, [editorRef]);
  const handleClose = useCallback(() => { clearHighlights(); setFindText(''); setReplaceText(''); setMatches([]); setCurrentIndex(-1); onClose(); }, [clearHighlights, onClose]);
  const highlightMatches = useCallback(() => { clearHighlights(); if (!findText || !editorRef.current || scope === 'all') { setMatches([]); setCurrentIndex(-1); return; } const newMatches: HTMLElement[] = []; const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT); const textNodes: Text[] = []; while (walker.nextNode()) textNodes.push(walker.currentNode as Text); let flags = 'g'; if (!caseSensitive) flags += 'i'; let pattern = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); if (wholeWord) { pattern = `\\b${pattern}\\b`; } const regex = new RegExp(pattern, flags); textNodes.forEach(node => { if (!node.textContent || node.parentElement?.closest('.search-highlight')) return; const matchesInNode = [...node.textContent.matchAll(regex)]; if (matchesInNode.length > 0) { let lastIndex = 0; const fragment = document.createDocumentFragment(); matchesInNode.forEach(match => { const index = match.index!; if (index > lastIndex) { fragment.appendChild(document.createTextNode(node.textContent!.slice(lastIndex, index))); } const span = document.createElement('span'); span.className = 'search-highlight'; span.textContent = match[0]; fragment.appendChild(span); newMatches.push(span); lastIndex = index + match[0].length; }); if (lastIndex < node.textContent.length) { fragment.appendChild(document.createTextNode(node.textContent.slice(lastIndex))); } node.parentNode?.replaceChild(fragment, node); }}); setMatches(newMatches); setCurrentIndex(newMatches.length > 0 ? 0 : -1); }, [findText, editorRef, clearHighlights, caseSensitive, wholeWord, scope]);
  useEffect(() => { if (isOpen) { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); debounceTimeout.current = window.setTimeout(highlightMatches, 300); } return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); }; }, [findText, isOpen, highlightMatches, caseSensitive, wholeWord, scope]);
  useEffect(() => { matches.forEach((match, index) => { if (index === currentIndex) { match.classList.add('current-match'); match.scrollIntoView({ block: 'center', behavior: 'smooth' }); } else { match.classList.remove('current-match'); }}); }, [currentIndex, matches]);
  const handleNavigate = (direction: 'next' | 'prev') => { if (matches.length === 0) return; setCurrentIndex(prev => (direction === 'next' ? prev + 1 : prev - 1 + matches.length) % matches.length); };
  const handleReplace = () => { if (currentIndex === -1 || !editorRef.current) return; const match = matches[currentIndex]; match.textContent = replaceText; editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); setTimeout(highlightMatches, 50); };
  const handleReplaceAll = () => { if (scope === 'current') { if (matches.length === 0 || !editorRef.current) return; matches.forEach(match => { match.textContent = replaceText; }); editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); handleClose(); } else { if (!findText) return; onReplaceAllInNovel(findText, replaceText, caseSensitive, wholeWord); handleClose(); } };
  if (!isOpen) return null;
  return (<div className="fixed top-20 right-8 bg-black bg-opacity-0 z-50 transition-opacity font-sans"><div className={`p-4 rounded-lg shadow-2xl w-full max-w-xs ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`}><div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Find & Replace</h2><button onClick={handleClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}><CloseIcon className="w-5 h-5" /></button></div><div className="space-y-3"><div className="relative"><input type="text" placeholder="Find..." value={findText} onChange={(e) => setFindText(e.target.value)} className={`w-full px-3 py-2 rounded-md text-sm ${themeClasses.input} border ${themeClasses.border}`} />{findText && scope === 'current' && <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${themeClasses.textSecondary}`}>{matches.length > 0 ? `${currentIndex + 1}/${matches.length}` : '0/0'}</div>}</div><input type="text" placeholder="Replace with..." value={replaceText} onChange={(e) => setReplaceText(e.target.value)} className={`w-full px-3 py-2 rounded-md text-sm ${themeClasses.input} border ${themeClasses.border}`} /></div><div className="flex items-center space-x-2 mt-2"><button onClick={() => setCaseSensitive(p => !p)} className={`px-2 py-1 text-xs rounded-md font-semibold ${caseSensitive ? `${themeClasses.accent} ${themeClasses.accentText}` : themeClasses.bgTertiary}`}>Aa</button><button onClick={() => setWholeWord(p => !p)} className={`px-2 py-1 text-xs rounded-md font-semibold ${wholeWord ? `${themeClasses.accent} ${themeClasses.accentText}` : themeClasses.bgTertiary}`}>Whole Word</button></div><div className="mt-3"><label className="block text-xs font-semibold mb-1">Scope</label><div className="flex rounded-md" role="group"><button onClick={() => setScope('current')} className={`px-3 py-1 text-xs w-1/2 rounded-l-md ${scope === 'current' ? `${themeClasses.accent} ${themeClasses.accentText}` : themeClasses.bgTertiary}`}>Current Chapter</button><button onClick={() => setScope('all')} className={`px-3 py-1 text-xs w-1/2 rounded-r-md ${scope === 'all' ? `${themeClasses.accent} ${themeClasses.accentText}` : themeClasses.bgTertiary}`}>Entire Novel</button></div></div><div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10"><div className="flex items-center space-x-1"><button onClick={() => handleNavigate('prev')} disabled={matches.length < 2 || scope === 'all'} className={`px-2 py-1 rounded text-xs font-semibold ${themeClasses.bgTertiary} disabled:opacity-50`}>Prev</button><button onClick={() => handleNavigate('next')} disabled={matches.length < 2 || scope === 'all'} className={`px-2 py-1 rounded text-xs font-semibold ${themeClasses.bgTertiary} disabled:opacity-50`}>Next</button></div><div className="flex items-center space-x-1"><button onClick={handleReplace} disabled={currentIndex === -1 || scope === 'all'} className={`px-2 py-1 text-xs rounded font-semibold ${themeClasses.bgTertiary} disabled:opacity-50`}>Replace</button><button onClick={handleReplaceAll} disabled={!findText} className={`px-2 py-1 text-xs rounded font-semibold ${themeClasses.accent} ${themeClasses.accentText} disabled:opacity-50`}>Replace All</button></div></div></div></div>);
};

const ToolbarDropdown: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; }> = ({ label, value, onChange, children }) => (
    <div><label className="block text-xs font-semibold mb-1 text-white/70">{label}</label><div className="relative"><select value={value} onChange={onChange} className="w-full appearance-none px-3 py-2 text-sm rounded-md bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50">{children}</select><ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" /></div></div>
);

const ChapterEditorPage: React.FC = () => {
    const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, theme, themeClasses } = useContext(ProjectContext);

    const editorRef = useRef<HTMLDivElement>(null);
    
    const [isChapterListOpen, setIsChapterListOpen] = useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    
    const [isOutlineSidebarOpen, setIsOutlineSidebarOpen] = useState(false);
    const [headings, setHeadings] = useState<Heading[]>([]);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [isDistractionFree, setIsDistractionFree] = useState(false);
    const [stats, setStats] = useState({ wordCount: 0, charCount: 0 });
    
    const [isFormatPanelOpen, setIsFormatPanelOpen] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false, isUL: false, isOL: false });
    const [currentFormat, setCurrentFormat] = useState({ paragraphStyle: 'p', font: fontOptions[0].value, size: '18px', paragraphSpacing: '1em' });

    const [spellchecker, setSpellchecker] = useState<any>(null);
    const [isSpellcheckPanelOpen, setIsSpellcheckPanelOpen] = useState(false);
    const [spellcheckErrors, setSpellcheckErrors] = useState<SpellcheckError[]>([]);
    const [currentErrorIndex, setCurrentErrorIndex] = useState(0);
    const sessionIgnoredWords = useRef(new Set<string>());

    const { novel, chapter, chapterIndex, novelIndex } = useMemo(() => {
        if (!projectData || !novelId || !chapterId) return { novel: null, chapter: null, chapterIndex: -1, novelIndex: -1 };
        const nIndex = projectData.novels.findIndex(n => n.id === novelId);
        if (nIndex === -1) return { novel: null, chapter: null, chapterIndex: -1, novelIndex: -1 };
        const n = projectData.novels[nIndex];
        const cIndex = n.chapters.findIndex(c => c.id === chapterId);
        const c = cIndex > -1 ? n.chapters[cIndex] : null;
        return { novel: n, chapter: c, chapterIndex: cIndex, novelIndex: nIndex };
    }, [projectData, novelId, chapterId]);

    const handleUpdateChapter = (field: 'title' | 'content', value: string) => {
        if (!chapter || novelIndex === -1 || chapterIndex === -1) return;
        setProjectData(currentData => {
            if (!currentData) return null;
            const novels = [...currentData.novels];
            const currentNovel = { ...novels[novelIndex] };
            const chapters = [...currentNovel.chapters];
            const oldChapter = chapters[chapterIndex];
            chapters[chapterIndex] = { ...oldChapter, [field]: value, updatedAt: new Date().toISOString() };
            currentNovel.chapters = chapters;
            novels[novelIndex] = currentNovel;
            return { ...currentData, novels };
        });
    };
    
    useEffect(() => {
        if (projectData && !chapter) navigate(`/novel/${novelId}`);
    }, [projectData, chapter, novelId, navigate]);
    
    useEffect(() => {
        if (editorRef.current && chapter && editorRef.current.innerHTML !== chapter.content) {
            editorRef.current.innerHTML = enhanceHtml(chapter.content || '<p><br></p>');
        }
    }, [chapter]);

    useEffect(() => {
        const calculateStats = () => {
            if (!editorRef.current) return;
            const text = editorRef.current.innerText || '';
            const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
            setStats({ wordCount, charCount: text.length });
        };
        calculateStats(); 
        const debouncedCalc = setTimeout(calculateStats, 300);
        return () => clearTimeout(debouncedCalc);
    }, [chapter?.content]);

    useEffect(() => {
        const lang = projectData?.settings?.spellcheckLanguage;
        if (lang && lang !== 'browser-default' && typeof Typo !== 'undefined') {
            const dictionaryId = lang === 'en' ? 'en_US' : lang;
            const affUrl = `https://cdn.jsdelivr.net/npm/typo-js@1.2.1/dictionaries/${dictionaryId}/${dictionaryId}.aff`;
            const dicUrl = `https://cdn.jsdelivr.net/npm/typo-js@1.2.1/dictionaries/${dictionaryId}/${dictionaryId}.dic`;
            Promise.all([fetch(affUrl).then(r => r.text()), fetch(dicUrl).then(r => r.text())])
              .then(([affData, dicData]) => setSpellchecker(new Typo(dictionaryId, affData, dicData)))
              .catch(err => { console.error(`Could not load dictionary for ${lang}`, err); setSpellchecker(null); });
        } else { setSpellchecker(null); }
    }, [projectData?.settings?.spellcheckLanguage]);

    const cleanupSpellcheckHighlight = () => {
        editorRef.current?.querySelectorAll('.spell-error-current').forEach(el => {
            const parent = el.parentNode;
            while (el.firstChild) parent?.insertBefore(el.firstChild, el);
            parent?.removeChild(el); parent?.normalize();
        });
    };

    const startSpellcheck = () => {
        if (!spellchecker || !editorRef.current) { alert('Spellchecker dictionary not loaded.'); return; }
        sessionIgnoredWords.current.clear(); const errors: SpellcheckError[] = []; const customDictionary = new Set(projectData?.settings?.customDictionary || []);
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
        let node; while (node = walker.nextNode()) {
            const textNode = node as Text; const text = textNode.textContent || ''; const wordRegex = /\b[\p{L}']+\b/gu; let match;
            while ((match = wordRegex.exec(text)) !== null) {
                const word = match[0];
                if (!customDictionary.has(word.toLowerCase()) && !spellchecker.check(word)) {
                    errors.push({ word, suggestions: spellchecker.suggest(word), context: { before: text.substring(Math.max(0, match.index - 15), match.index), after: text.substring(match.index + word.length, match.index + word.length + 15), }, node: textNode, startOffset: match.index, endOffset: match.index + word.length });
                }
            }
        }
        setSpellcheckErrors(errors); setCurrentErrorIndex(0); setIsSpellcheckPanelOpen(errors.length > 0);
        if (errors.length === 0) alert('No spelling errors found!');
    };

    const handleCloseSpellcheck = () => { cleanupSpellcheckHighlight(); setIsSpellcheckPanelOpen(false); setSpellcheckErrors([]); setCurrentErrorIndex(0); };
    const handleSpellcheckNext = () => { if (currentErrorIndex >= spellcheckErrors.length - 1) handleCloseSpellcheck(); else setCurrentErrorIndex(prev => prev + 1); };
    const handleSpellcheckChange = (newWord: string) => { const error = spellcheckErrors[currentErrorIndex]; if (!error) return; const range = document.createRange(); range.setStart(error.node, error.startOffset); range.setEnd(error.node, error.endOffset); range.deleteContents(); range.insertNode(document.createTextNode(newWord)); editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); handleSpellcheckNext(); };
    const handleSpellcheckIgnore = (word: string) => { sessionIgnoredWords.current.add(word.toLowerCase()); const remainingErrors = spellcheckErrors.filter((e, idx) => idx > currentErrorIndex && e.word.toLowerCase() !== word.toLowerCase()); if (remainingErrors.length > 0) { const nextIndex = spellcheckErrors.indexOf(remainingErrors[0]); cleanupSpellcheckHighlight(); setCurrentErrorIndex(nextIndex); } else { handleCloseSpellcheck(); }};
    const handleAddToDictionary = (word: string) => { const lowerWord = word.toLowerCase(); setProjectData(c => { if (!c || c.settings.customDictionary.includes(lowerWord)) return c; return { ...c, settings: { ...c.settings, customDictionary: [...c.settings.customDictionary, lowerWord].sort(), }, }; }); handleSpellcheckIgnore(word); };
    
    useEffect(() => { cleanupSpellcheckHighlight(); if (isSpellcheckPanelOpen && spellcheckErrors.length > 0 && currentErrorIndex < spellcheckErrors.length) { const error = spellcheckErrors[currentErrorIndex]; const range = document.createRange(); range.setStart(error.node, error.startOffset); range.setEnd(error.node, error.endOffset); if (error.node.parentNode && editorRef.current?.contains(error.node)) { const span = document.createElement('span'); span.className = 'spell-error-current'; try { range.surroundContents(span); span.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { handleSpellcheckNext(); } } else { handleSpellcheckNext(); } } }, [isSpellcheckPanelOpen, currentErrorIndex, spellcheckErrors]);
    
    const handleReplaceAllInNovel = (find: string, replace: string, caseSensitive: boolean, wholeWord: boolean) => {
        if (!novel || novelIndex === -1) return;
        let flags = 'g'; if (!caseSensitive) flags += 'i'; let pattern = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); if (wholeWord) pattern = `\\b${pattern}\\b`; const regex = new RegExp(pattern, flags);
        setProjectData(currentData => {
            if (!currentData) return null;
            const novels = [...currentData.novels]; const currentNovel = { ...novels[novelIndex] };
            currentNovel.chapters = currentNovel.chapters.map(chap => {
                const tempDiv = document.createElement('div'); tempDiv.innerHTML = chap.content;
                const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
                let node; while(node = walker.nextNode()) { if (node.textContent) { node.textContent = node.textContent.replace(regex, replace); } }
                return { ...chap, content: tempDiv.innerHTML };
            });
            novels[novelIndex] = currentNovel;
            if (editorRef.current && chapter) { const changedChapter = currentNovel.chapters.find(c => c.id === chapter.id); if (changedChapter) editorRef.current.innerHTML = changedChapter.content; }
            return { ...currentData, novels };
        });
    };

    const cleanupEditor = useCallback(() => { if (!editorRef.current) return; editorRef.current.normalize(); }, []);
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => { e.preventDefault(); const text = e.clipboardData.getData('text/plain'); if (!text) return; const htmlToInsert = text.split(/\r?\n/).map(line => `<p>${line.trim() === '' ? '<br>' : enhancePlainText(line)}</p>`).join(''); document.execCommand('insertHTML', false, htmlToInsert); cleanupEditor(); };
    // FIX: Changed event type from native ClipboardEvent to React.ClipboardEvent to fix type error.
    const handleCopy = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => { const selection = window.getSelection(); if (!selection?.rangeCount) return; const selectedText = selection.toString(); const cleanedText = selectedText.replace(/(\r\n|\n|\r){2,}/g, '\n\n').trim(); if (cleanedText.length < selectedText.length || (selectedText.length > 0 && cleanedText.length === 0)) { e.preventDefault(); const selectedHtmlFragment = selection.getRangeAt(0).cloneContents(); const tempDiv = document.createElement('div'); tempDiv.appendChild(selectedHtmlFragment); e.clipboardData.setData('text/plain', cleanedText); e.clipboardData.setData('text/html', tempDiv.innerHTML); } }, []);
    const handleSelectionChange = useCallback(() => { setActiveFormats({ isBold: document.queryCommandState('bold'), isItalic: document.queryCommandState('italic'), isUL: document.queryCommandState('insertUnorderedList'), isOL: document.queryCommandState('insertOrderedList'), }); }, []);
    const applyAndSaveFormat = useCallback((formatAction: () => void) => { if (!editorRef.current) return; formatAction(); cleanupEditor(); editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); editorRef.current.focus(); handleSelectionChange(); }, [handleSelectionChange, cleanupEditor]);
    const applyCommand = (cmd: string, value?: string) => applyAndSaveFormat(() => document.execCommand(cmd, false, value));
    
    // FIX: Removed redundant 'copy' event listener and handleCopy from dependency array. The onCopyCapture prop is sufficient.
    useEffect(() => { const editorEl = editorRef.current; document.addEventListener('selectionchange', handleSelectionChange); if (editorEl) { editorEl.addEventListener('keyup', handleSelectionChange); } return () => { document.removeEventListener('selectionchange', handleSelectionChange); if (editorEl) { editorEl.removeEventListener('keyup', handleSelectionChange); }}; }, [handleSelectionChange]);
    useEffect(() => { const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isDistractionFree) setIsDistractionFree(false); }; window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [isDistractionFree]);
    useEffect(() => { const editorEl = editorRef.current; if (!editorEl || !chapterId) { setHeadings([]); return; }; let debounceTimeout: number; const updateHeadings = () => { clearTimeout(debounceTimeout); debounceTimeout = window.setTimeout(() => { if (!editorRef.current) return; const headingElements = Array.from(editorRef.current.querySelectorAll('h1, h2, h3')); const newHeadings: Heading[] = headingElements.map((el, index) => { const htmlEl = el as HTMLElement; if (!htmlEl.id) htmlEl.id = `heading-outline-${index}-${Date.now()}`; return { id: htmlEl.id, text: htmlEl.textContent || 'Untitled Heading', level: parseInt(htmlEl.tagName.substring(1), 10), }; }); setHeadings(currentHeadings => JSON.stringify(currentHeadings.map(h => ({text: h.text, level: h.level}))) === JSON.stringify(newHeadings.map(h => ({text: h.text, level: h.level}))) ? currentHeadings : newHeadings); }, 300); }; updateHeadings(); const observer = new MutationObserver(updateHeadings); observer.observe(editorEl, { childList: true, subtree: true, characterData: true }); return () => { clearTimeout(debounceTimeout); observer.disconnect(); }; }, [chapterId]);

    if (!projectData || !novel || !chapter) return <div className={`flex items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>Loading...</div>;
    
    const prevChapter = chapterIndex > 0 ? novel.chapters[chapterIndex - 1] : null;
    const nextChapter = chapterIndex < novel.chapters.length - 1 ? novel.chapters[chapterIndex + 1] : null;

    return (
        <div className={`flex flex-col h-screen font-sans ${themeClasses.bg} ${themeClasses.text} transition-all duration-300 ${isDistractionFree ? 'is-distraction-free' : ''}`}>
            {isSpellcheckPanelOpen && spellcheckErrors.length > 0 && <SpellCheckPanel error={spellcheckErrors[currentErrorIndex]} onClose={handleCloseSpellcheck} onNext={handleSpellcheckNext} onIgnore={handleSpellcheckIgnore} onChange={handleSpellcheckChange} onAddToDictionary={handleAddToDictionary} themeClasses={themeClasses} isLast={currentErrorIndex >= spellcheckErrors.length - 1} />}
            <div className={`fixed top-0 left-0 h-full z-40 flex items-start transition-transform duration-300 ease-in-out ${isOutlineSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className={`w-64 h-full bg-stone-900/80 border-r border-white/10 backdrop-blur-sm flex flex-col ${isDistractionFree ? 'pt-4' : 'pt-16'}`}>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0"><h3 className="font-bold text-white">Chapter Outline</h3><button onClick={() => setIsOutlineSidebarOpen(false)} className="p-1 rounded-full text-white/70 hover:bg-white/10"><ChevronLeftIcon className="w-5 h-5"/></button></div>
                    <nav className="flex-1 overflow-y-auto p-2">{headings.length > 0 ? (<ul className="space-y-1">{headings.map(h => (<li key={h.id}><button onClick={() => {document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });}} className={`w-full text-left px-2 py-1 rounded text-sm text-white/80 hover:bg-white/10 truncate ${h.level === 2 ? 'pl-6' : ''} ${h.level === 3 ? 'pl-10' : ''}`} title={h.text}>{enhancePlainText(h.text)}</button></li>))}</ul>) : (<p className="p-4 text-sm text-white/50">No headings in chapter.</p>)}</nav>
                </div>
            </div>

            <header className={`flex-shrink-0 flex items-center justify-between p-2 border-b ${themeClasses.border} ${isDistractionFree ? 'hidden' : ''}`}>
                <div className="flex items-center space-x-2">
                    <Link to={`/novel/${novelId}`} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`}><BackIcon className="w-5 h-5"/></Link>
                    <button onClick={() => setIsOutlineSidebarOpen(true)} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`}><Bars3Icon className="w-5 h-5"/></button>
                    <button onClick={() => setIsChapterListOpen(true)} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`}><Bars3Icon className="w-5 h-5"/></button>
                </div>
                <div className="flex-1 text-center truncate px-4"><span className="font-semibold">{enhancePlainText(novel.title)}</span></div>
                <div className="flex items-center space-x-2">
                    {prevChapter && <Link to={`/novel/${novelId}/edit/${prevChapter.id}`} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`}><ChevronLeftIcon className="w-5 h-5"/></Link>}
                    {nextChapter && <Link to={`/novel/${novelId}/edit/${nextChapter.id}`} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`}><ChevronRightIcon className="w-5 h-5"/></Link>}
                    <button onClick={() => startSpellcheck()} disabled={!spellchecker} className="p-2 rounded-md hover:bg-white/10 disabled:opacity-50"><SpellcheckIcon className={`w-5 h-5 ${themeClasses.text}`} /></button>
                    <button onClick={() => setIsFindReplaceOpen(p => !p)} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`}><SearchIcon className="w-5 h-5"/></button>
                    <button onClick={() => setIsStatsOpen(p => !p)} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`}><ChartBarIcon className="w-5 h-5" /></button>
                    <button onClick={() => setIsExportModalOpen(true)} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`}><DownloadIcon className="w-5 h-5"/></button>
                    <button onClick={() => setIsDistractionFree(p => !p)} className="p-2 rounded-md hover:bg-white/10">{isDistractionFree ? <ArrowsPointingInIcon className={`w-5 h-5 ${themeClasses.text}`} /> : <ArrowsPointingOutIcon className={`w-5 h-5 ${themeClasses.text}`} />}</button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto">
                <div className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isDistractionFree ? 'pt-24' : ''}`}>
                    <input key={`${chapter.id}-title`} defaultValue={chapter.title} onBlur={(e) => handleUpdateChapter('title', e.target.value)} placeholder="Chapter Title" className={`text-4xl font-bold bg-transparent outline-none w-full mb-6 ${themeClasses.accentText}`} />
                    <div ref={editorRef} contentEditable spellCheck={false} suppressContentEditableWarning onInput={(e) => handleUpdateChapter('content', e.currentTarget.innerHTML)} onPaste={handlePaste} onCopyCapture={handleCopy} onBlur={cleanupEditor} className={`w-full text-lg leading-relaxed outline-none story-content`} />
                </div>
            </main>
            
            <footer className={`flex-shrink-0 flex justify-center py-2 border-t ${themeClasses.border} ${isDistractionFree ? 'hidden' : ''}`}>
                <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm" onMouseDown={(e) => e.preventDefault()}>
                    <button onClick={() => applyCommand('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isBold ? 'bg-white/20' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                    <button onClick={() => applyCommand('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isItalic ? 'bg-white/20' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                    <div className="w-px h-5 bg-white/20 mx-1"></div>
                    <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isUL ? 'bg-white/20' : ''}`}><ListBulletIcon className="w-5 h-5"/></button>
                    <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isOL ? 'bg-white/20' : ''}`}><OrderedListIcon className="w-5 h-5"/></button>
                    <button onClick={() => applyCommand('formatBlock', '<blockquote>')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><BlockquoteIcon className="w-5 h-5"/></button>
                    <div className="w-px h-5 bg-white/20 mx-1"></div>
                    <button onClick={() => applyCommand('formatBlock', '<h1>')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><H1Icon className="w-5 h-5"/></button>
                    <button onClick={() => applyCommand('formatBlock', '<h2>')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><H2Icon className="w-5 h-5"/></button>
                    <button onClick={() => applyCommand('formatBlock', '<h3>')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><H3Icon className="w-5 h-5"/></button>
                    <div className="w-px h-5 bg-white/20 mx-1"></div>
                    <button onClick={() => applyCommand('undo')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><UndoIcon className="w-5 h-5"/></button>
                    <button onClick={() => applyCommand('redo')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><RedoIcon className="w-5 h-5"/></button>
                </div>
            </footer>
            
            <ChapterListModal isOpen={isChapterListOpen} onClose={() => setIsChapterListOpen(false)} novel={novel} currentChapterId={chapter.id} themeClasses={themeClasses} />
            <FindReplaceModal isOpen={isFindReplaceOpen} onClose={() => setIsFindReplaceOpen(false)} editorRef={editorRef} onReplaceAllInNovel={handleReplaceAllInNovel}/>
            <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} novel={novel} />
            {isStatsOpen && <div className={`fixed top-20 right-8 p-4 rounded-lg shadow-2xl w-full max-w-xs ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border} z-50`}><div className="flex justify-between items-center mb-2"><h2 className="text-lg font-bold">Statistics</h2><button onClick={() => setIsStatsOpen(false)} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}><CloseIcon className="w-5 h-5" /></button></div><div className="space-y-2 text-sm"><div><strong>Word Count:</strong> {stats.wordCount.toLocaleString()}</div><div><strong>Character Count:</strong> {stats.charCount.toLocaleString()}</div></div></div>}
        </div>
    );
};

export default ChapterEditorPage;
