import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, ChevronLeftIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, TrashIcon, H1Icon, H2Icon, H3Icon, SearchIcon, LoadingIcon, CheckIcon, ExclamationTriangleIcon, CloseIcon } from '../components/Icons';
import { enhanceHtml, enhancePlainText, SKETCH_TAG_OPTIONS } from '../constants';
import { NovelSketch } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const SaveStatusIndicator: React.FC = () => {
    const { theme, saveStatus } = useContext(ProjectContext);
    const baseClasses = 'flex items-center space-x-2 text-sm font-sans font-semibold';
    switch (saveStatus) {
        case 'unsaved': return <div className={`${baseClasses} ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}><span>Unsaved changes</span></div>;
        case 'saving': return <div className={`${baseClasses} ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}><LoadingIcon className="w-4 h-4 animate-spin" /><span>Saving...</span></div>;
        case 'saved': return <div className={`${baseClasses} ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}><CheckIcon className="w-4 h-4" /><span>Saved!</span></div>;
        case 'error': return <div className={`${baseClasses} ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}><ExclamationTriangleIcon className="w-4 h-4" /><span>Error saving</span></div>;
        default: return null;
    }
};

const FindReplaceModal: React.FC<{ isOpen: boolean, onClose: () => void, editorRef: React.RefObject<HTMLDivElement> }> = ({ isOpen, onClose, editorRef }) => {
  const { themeClasses } = useContext(ProjectContext);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matches, setMatches] = useState<HTMLElement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const debounceTimeout = useRef<number | null>(null);

  const clearHighlights = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.querySelectorAll('.search-highlight, .current-match').forEach(node => {
        const parent = node.parentNode;
        if (parent) {
            while (node.firstChild) parent.insertBefore(node.firstChild, node);
            parent.removeChild(node);
        }
    });
    editorRef.current.normalize();
  }, [editorRef]);

  const handleClose = useCallback(() => { clearHighlights(); setFindText(''); setReplaceText(''); setMatches([]); setCurrentIndex(-1); onClose(); }, [clearHighlights, onClose]);
  const highlightMatches = useCallback(() => {
    clearHighlights();
    if (!findText || !editorRef.current) { setMatches([]); setCurrentIndex(-1); return; }
    const newMatches: HTMLElement[] = [];
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
    let flags = 'g'; if (!caseSensitive) flags += 'i'; let pattern = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); if (wholeWord) pattern = `\\b${pattern}\\b`;
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
                const span = document.createElement('span'); span.className = 'search-highlight'; span.textContent = match[0]; fragment.appendChild(span); newMatches.push(span); lastIndex = index + match[0].length;
            });
            if (lastIndex < node.textContent.length) fragment.appendChild(document.createTextNode(node.textContent.slice(lastIndex)));
            node.parentNode?.replaceChild(fragment, node);
        }
    });
    setMatches(newMatches); setCurrentIndex(newMatches.length > 0 ? 0 : -1);
  }, [findText, editorRef, clearHighlights, caseSensitive, wholeWord]);

  useEffect(() => {
    if (isOpen) { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); debounceTimeout.current = window.setTimeout(highlightMatches, 300); }
    return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
  }, [findText, isOpen, highlightMatches, caseSensitive, wholeWord]);

  useEffect(() => { matches.forEach((match, index) => { if (index === currentIndex) { match.classList.add('current-match'); match.scrollIntoView({ block: 'center', behavior: 'smooth' }); } else { match.classList.remove('current-match'); } }); }, [currentIndex, matches]);
  const handleNavigate = (direction: 'next' | 'prev') => { if (matches.length === 0) return; setCurrentIndex(prev => (direction === 'next' ? prev + 1 : prev - 1 + matches.length) % matches.length); };
  const handleReplace = () => { if (currentIndex === -1 || matches.length === 0) return; const match = matches[currentIndex]; match.textContent = replaceText; match.classList.remove('search-highlight, .current-match'); setTimeout(() => { const newMatches = matches.filter(m => m !== match); setMatches(newMatches); if (newMatches.length > 0) { setCurrentIndex(currentIndex % newMatches.length); } else { setCurrentIndex(-1); } editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); }, 0); };
  const handleReplaceAll = () => { if (!editorRef.current || matches.length === 0) return; matches.forEach(match => { match.textContent = replaceText; }); editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); handleClose(); };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity font-sans">
      <div className={`p-6 rounded-lg shadow-2xl w-full max-w-md m-4 ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`}>
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

const SketchEditorPage: React.FC = () => {
    const { novelId, sketchId } = useParams<{ novelId: string; sketchId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, themeClasses } = useContext(ProjectContext);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const editorContentRef = useRef<string>("");

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
    const [documentOutline, setDocumentOutline] = useState<{ id: string; text: string; level: number }[]>([]);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false, isUL: false, isOL: false, currentBlock: 'p' });

    const { novel, sketch, novelIndex, sketchIndex } = useMemo(() => {
        if (!projectData?.novels || !novelId || !sketchId) return { novel: null, sketch: null, novelIndex: -1, sketchIndex: -1 };
        const nIndex = projectData.novels.findIndex(n => n.id === novelId);
        if (nIndex === -1) return { novel: null, sketch: null, novelIndex: -1, sketchIndex: -1 };
        const n = projectData.novels[nIndex];
        const sIndex = n.sketches.findIndex(s => s.id === sketchId);
        return sIndex === -1 ? { novel: n, sketch: null, novelIndex: nIndex, sketchIndex: -1 } : { novel: n, sketch: n.sketches[sIndex], novelIndex: nIndex, sketchIndex: sIndex };
    }, [projectData, novelId, sketchId]);

    const cleanupEditor = useCallback(() => { if (editorRef.current) editorRef.current.normalize(); }, []);

    const updateSketch = useCallback((updates: Partial<Omit<NovelSketch, 'id' | 'createdAt'>>) => {
        if (novelIndex === -1 || sketchIndex === -1) return;
        setProjectData(currentData => {
            if (!currentData) return null;
            const novels = [...currentData.novels];
            const novelToUpdate = { ...novels[novelIndex] };
            const sketches = [...novelToUpdate.sketches];
            sketches[sketchIndex] = { ...sketches[sketchIndex], ...updates, updatedAt: new Date().toISOString() };
            novelToUpdate.sketches = sketches;
            novels[novelIndex] = novelToUpdate;
            return { ...currentData, novels };
        });
    }, [novelIndex, sketchIndex, setProjectData]);

    const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => { const newHTML = e.currentTarget.innerHTML; editorContentRef.current = newHTML; updateSketch({ content: newHTML }); updateDocumentOutline(); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    '); } };
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => { e.preventDefault(); const text = e.clipboardData.getData('text/plain'); if (!text) return; const html = text.split(/\r?\n/).map(line => `<p>${enhancePlainText(line) || '<br>'}</p>`).join(''); document.execCommand('insertHTML', false, html); };
    
    useEffect(() => {
        if (editorRef.current && sketch && sketch.content !== editorContentRef.current) {
            const initialContent = sketch.content || '<p><br></p>';
            editorRef.current.innerHTML = enhanceHtml(initialContent);
            editorContentRef.current = initialContent;
        }
    }, [sketch]);
    
    const applyAndSaveFormat = useCallback((formatAction: () => void) => {
        if (!editorRef.current) return;
        formatAction();
        cleanupEditor();
        editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        editorRef.current.focus();
    }, [cleanupEditor]);

    const applyCommand = (command: string, value?: string) => applyAndSaveFormat(() => document.execCommand(command, false, value));
    const applyParagraphStyle = (style: string) => applyAndSaveFormat(() => document.execCommand('formatBlock', false, style));
    const handleTagClick = (tag: string) => { const currentTags = sketch?.tags || []; const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag].slice(0, 6); updateSketch({ tags: newTags }); };
    const handleDelete = () => { if (!sketch || novelIndex === -1) return; setProjectData(d => { if (!d) return null; const novels = [...d.novels]; const novelToUpdate = { ...novels[novelIndex] }; novelToUpdate.sketches = novelToUpdate.sketches.filter(s => s.id !== sketch.id); novels[novelIndex] = novelToUpdate; return { ...d, novels }; }); navigate('/sketches'); };
    
    const updateDocumentOutline = useCallback(() => { if (!editorRef.current) return; const headings = Array.from(editorRef.current.querySelectorAll<HTMLElement>('h1, h2, h3')); setDocumentOutline(headings.map((h: HTMLElement, i) => { const id = h.id || `h-${i}`; h.id = id; return { id, text: h.textContent || '', level: parseInt(h.tagName[1]) }; })); }, []);
    useEffect(updateDocumentOutline, [sketch?.content, updateDocumentOutline]);

    const editorStyle = useMemo(() => ({ fontSize: `${projectData?.settings?.baseFontSize || 18}px` }), [projectData?.settings?.baseFontSize]);
    
    if (!sketch || !novel) return <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}><p>Loading sketch...</p></div>;

    return (
        <>
            <div className={`flex h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
                {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30" />}
                <div className="flex-1 overflow-y-auto relative">
                    <div className={`sticky top-0 z-10 px-8 md:px-16 lg:px-24 pt-6 pb-4 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border} flex justify-between items-center`}>
                        <button onClick={() => navigate('/sketches')} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}><BackIcon className="w-5 h-5" /><span className="font-sans">Return to Sketches</span></button>
                        <SaveStatusIndicator />
                    </div>
                    <div className="px-8 md:px-16 lg:px-24 pt-8 pb-48">
                        <input type="text" value={sketch.title} onChange={e => updateSketch({ title: e.target.value })} onBlur={(e) => updateSketch({ title: enhancePlainText(e.target.value) })} placeholder="Sketch Title" className="text-4xl font-bold bg-transparent outline-none w-full mb-8" />
                        <div ref={editorRef} contentEditable spellCheck={true} suppressContentEditableWarning onInput={handleEditorInput} onKeyDown={handleKeyDown} onPaste={handlePaste} onBlur={cleanupEditor} className="w-full leading-relaxed outline-none story-content" style={editorStyle} />
                    </div>
                </div>
                <div className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className={`w-80 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-l ${themeClasses.border} flex flex-col`}>
                        <div className={`px-4 py-3 flex justify-between items-center border-b ${themeClasses.border}`}><span className="font-bold text-base">SKETCH DETAILS</span><button onClick={() => setIsSidebarOpen(false)}><ChevronLeftIcon className="w-5 h-5"/></button></div>
                        <div className={`px-4 py-4 border-b ${themeClasses.border}`}>
                            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${themeClasses.textSecondary}`}>Part of Novel</p>
                            <p className="font-bold">{enhancePlainText(novel.title)}</p>
                        </div>
                        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                            <div><h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Document Outline</h3>{documentOutline.length > 0 ? <ul className="space-y-1">{documentOutline.map(h => <li key={h.id}><button onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="w-full text-left px-2 py-1 rounded hover:bg-white/10" style={{ paddingLeft: `${h.level}rem` }}>{h.text}</button></li>)}</ul> : <p className={`text-xs ${themeClasses.textSecondary}`}>No headings found.</p>}</div>
                            <div><h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Tags</h3><div className="flex flex-wrap gap-1.5">{SKETCH_TAG_OPTIONS.map(t => <button key={t} onClick={() => handleTagClick(t)} className={`px-2 py-1 text-xs rounded-full font-semibold ${sketch.tags.includes(t) ? `${themeClasses.accent} ${themeClasses.accentText}` : `${themeClasses.bgTertiary} hover:opacity-80`}`}>{t}</button>)}</div></div>
                            <div><h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Actions</h3><button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold bg-red-700 text-red-100 hover:bg-red-800"><TrashIcon className="w-5 h-5"/><span>Delete Sketch</span></button></div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none">
                    <div className="relative pointer-events-auto">
                        <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm" onMouseDown={e => e.preventDefault()}>
                            <button onClick={() => applyCommand('bold')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isBold ? 'text-white bg-white/10' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('italic')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isItalic ? 'text-white bg-white/10' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => applyParagraphStyle('h1')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.currentBlock === 'h1' ? 'text-white bg-white/10' : ''}`}><H1Icon className="w-5 h-5"/></button>
                            <button onClick={() => applyParagraphStyle('h2')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.currentBlock === 'h2' ? 'text-white bg-white/10' : ''}`}><H2Icon className="w-5 h-5"/></button>
                            <button onClick={() => applyParagraphStyle('h3')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.currentBlock === 'h3' ? 'text-white bg-white/10' : ''}`}><H3Icon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isUL ? 'text-white bg-white/10' : ''}`}><ListBulletIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isOL ? 'text-white bg-white/10' : ''}`}><OrderedListIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyParagraphStyle('blockquote')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.currentBlock === 'blockquote' ? 'text-white bg-white/10' : ''}`}><BlockquoteIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => setIsFindReplaceOpen(true)} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors`}><SearchIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => applyCommand('undo')} className="p-2 rounded-full text-white/70 hover:text-white transition-colors"><UndoIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('redo')} className="p-2 rounded-full text-white/70 hover:text-white transition-colors"><RedoIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
            </div>
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className={`fixed top-4 right-4 z-30 p-2 rounded-md ${themeClasses.bgSecondary} ${themeClasses.accentText} hover:opacity-80 shadow-lg border ${themeClasses.border}`}><ChevronLeftIcon className="w-5 h-5" /></button>}
            <FindReplaceModal isOpen={isFindReplaceOpen} onClose={() => setIsFindReplaceOpen(false)} editorRef={editorRef} />
            <ConfirmModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title={`Delete "${sketch.title}"?`} message="Are you sure you want to delete this sketch? This action is permanent." />
        </>
    );
};

export default SketchEditorPage;