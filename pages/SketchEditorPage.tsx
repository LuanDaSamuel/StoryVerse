import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, ChevronLeftIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, TrashIcon, H1Icon, H2Icon, H3Icon, SearchIcon, LoadingIcon, CheckIcon, ExclamationTriangleIcon, CloseIcon } from '../components/Icons';
import { enhanceHtml, enhancePlainText, SKETCH_TAG_OPTIONS } from '../constants';
import { NovelSketch } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslations } from '../hooks/useTranslations';

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
    editorRef.current.querySelectorAll('.search-highlight, .current-match').forEach(node => {
        const parent = node.parentNode;
        if (parent) {
            while (node.firstChild) parent.insertBefore(node.firstChild, node);
            parent.removeChild(node);
        }
    });
    editorRef.current.normalize();
  }, [editorRef]);

  const handleClose = React.useCallback(() => { clearHighlights(); setFindText(''); setReplaceText(''); setMatches([]); setCurrentIndex(-1); onClose(); }, [clearHighlights, onClose]);
  const highlightMatches = React.useCallback(() => {
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

  React.useEffect(() => {
    if (isOpen) { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); debounceTimeout.current = window.setTimeout(highlightMatches, 300); }
    return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
  }, [findText, isOpen, highlightMatches, caseSensitive, wholeWord]);

  React.useEffect(() => { matches.forEach((match, index) => { if (index === currentIndex) { match.classList.add('current-match'); match.scrollIntoView({ block: 'center', behavior: 'smooth' }); } else { match.classList.remove('current-match'); } }); }, [currentIndex, matches]);
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

const SketchEditorPage = () => {
    const { novelId, sketchId } = useParams<{ novelId: string; sketchId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, themeClasses } = React.useContext(ProjectContext);
    const t = useTranslations();
    
    const editorRef = React.useRef<HTMLDivElement>(null);
    const editorContentRef = React.useRef<string>("");

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
    const [isFindReplaceOpen, setIsFindReplaceOpen] = React.useState(false);
    const [activeFormats, setActiveFormats] = React.useState({ isBold: false, isItalic: false, isUL: false, isOL: false, currentBlock: 'p' });

    const { novel, sketch, novelIndex, sketchIndex } = React.useMemo(() => {
        if (!projectData?.novels || !novelId || !sketchId) return { novel: null, sketch: null, novelIndex: -1, sketchIndex: -1 };
        
        const nIndex = projectData.novels.findIndex(n => n.id === novelId);
        if (nIndex === -1) return { novel: null, sketch: null, novelIndex: -1, sketchIndex: -1 };
        
        const n = projectData.novels[nIndex];
        const sIndex = n.sketches.findIndex(s => s.id === sketchId);
        if (sIndex === -1) return { novel: n, sketch: null, novelIndex: nIndex, sketchIndex: -1 };

        return {
            novel: n,
            sketch: n.sketches[sIndex],
            novelIndex: nIndex,
            sketchIndex: sIndex,
        };
    }, [projectData, novelId, sketchId]);

    const updateSketch = React.useCallback((updates: Partial<Omit<NovelSketch, 'id' | 'createdAt'>>) => {
        if (novelIndex === -1 || sketchIndex === -1) return;

        setProjectData(currentData => {
            if (!currentData || !currentData.novels[novelIndex]) return currentData;
            
            const updatedNovels = [...currentData.novels];
            const novelToUpdate = { ...updatedNovels[novelIndex] };
            const updatedSketches = [...novelToUpdate.sketches];
            
            if (!updatedSketches[sketchIndex]) return currentData;

            let updatedSketch = {
                ...updatedSketches[sketchIndex],
                ...updates,
                updatedAt: new Date().toISOString(),
            };

            if ('content' in updates) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = updates.content || '';
                const text = tempDiv.textContent || "";
                updatedSketch.wordCount = text.trim().split(/\s+/).filter(Boolean).length;
            }
            
            updatedSketches[sketchIndex] = updatedSketch;
            
            novelToUpdate.sketches = updatedSketches;
            updatedNovels[novelIndex] = novelToUpdate;
            
            return { ...currentData, novels: updatedNovels };
        });
    }, [novelIndex, sketchIndex, setProjectData]);

    const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
        const newHTML = e.currentTarget.innerHTML;
        editorContentRef.current = newHTML;
        updateSketch({ content: newHTML });
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
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
    };

    React.useEffect(() => {
        if (editorRef.current && sketch && sketch.content !== editorContentRef.current) {
            const initialContent = sketch.content || '<p><br></p>';
            editorRef.current.innerHTML = enhanceHtml(initialContent);
            editorContentRef.current = initialContent;
        }
    }, [sketch]);
    
    const updateActiveFormats = React.useCallback(() => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        let element = selection.anchorNode;
        if (element?.nodeType === 3) element = element.parentNode;
        let blockType = 'p';
        let parent = element as HTMLElement | null;
        while(parent && parent !== editorRef.current) {
            const tag = parent.tagName.toLowerCase();
            if(['h1','h2','h3','blockquote'].includes(tag)) {
                blockType = tag;
                break;
            }
            parent = parent.parentElement;
        }
        setActiveFormats({
            isBold: document.queryCommandState('bold'),
            isItalic: document.queryCommandState('italic'),
            isUL: document.queryCommandState('insertUnorderedList'),
            isOL: document.queryCommandState('insertOrderedList'),
            currentBlock: blockType,
        });
    }, []);

    React.useEffect(() => {
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', updateActiveFormats);
        editorEl?.addEventListener('keyup', updateActiveFormats);
        editorEl?.addEventListener('mouseup', updateActiveFormats);
        editorEl?.addEventListener('focus', updateActiveFormats);
        return () => {
            document.removeEventListener('selectionchange', updateActiveFormats);
            editorEl?.removeEventListener('keyup', updateActiveFormats);
            editorEl?.removeEventListener('mouseup', updateActiveFormats);
            editorEl?.removeEventListener('focus', updateActiveFormats);
        };
    }, [updateActiveFormats]);

    const applyCommand = (e: React.MouseEvent<HTMLButtonElement>, command: string, value?: string) => {
        e.preventDefault();
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        updateActiveFormats();
    };

    const applyBlockFormat = (e: React.MouseEvent<HTMLButtonElement>, format: string) => {
        e.preventDefault();
        const currentBlock = activeFormats.currentBlock;
        const formatToApply = currentBlock === format ? 'p' : format;
        document.execCommand('formatBlock', false, formatToApply);
        editorRef.current?.focus();
        updateActiveFormats();
    };
    
    const handleTagClick = (tag: string) => {
        if (!sketch) return;
        const currentTags = sketch.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag].slice(0, 6);
        updateSketch({ tags: newTags });
    };

    const handleDelete = () => {
        if (!sketch || novelIndex === -1) return;
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedNovels = [...currentData.novels];
            const novelToUpdate = { ...updatedNovels[novelIndex] };
            novelToUpdate.sketches = novelToUpdate.sketches.filter(s => s.id !== sketch.id);
            updatedNovels[novelIndex] = novelToUpdate;
            return { ...currentData, novels: updatedNovels };
        });
        navigate('/sketches');
    };

    if (!novel || !sketch) {
        return (
            <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}>
                <p>Loading sketch...</p>
            </div>
        );
    }

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
                        <div ref={editorRef} contentEditable spellCheck={true} suppressContentEditableWarning onInput={handleEditorInput} onKeyDown={handleKeyDown} onPaste={handlePaste} className="w-full leading-relaxed outline-none story-content" style={{ fontSize: `${projectData?.settings?.baseFontSize || 18}px` }}/>
                    </div>
                </div>
                <div className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className={`w-80 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-l ${themeClasses.border} flex flex-col`}>
                        <div className={`px-4 py-3 flex justify-between items-center border-b ${themeClasses.border}`}><span className="font-bold text-base">SKETCH DETAILS</span><button onClick={() => setIsSidebarOpen(false)}><ChevronLeftIcon className="w-5 h-5"/></button></div>
                        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                           <div><h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Novel</h3><p className="px-3 py-2 rounded-md bg-black/10">{enhancePlainText(novel.title)}</p></div>
                           <div><h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Tags</h3><div className="flex flex-wrap gap-1.5">{SKETCH_TAG_OPTIONS.map(t => <button key={t} onClick={() => handleTagClick(t)} className={`px-2 py-1 text-xs rounded-full font-semibold ${sketch.tags.includes(t) ? `${themeClasses.accent} ${themeClasses.accentText}` : `${themeClasses.bgTertiary} hover:opacity-80`}`}>{t}</button>)}</div></div>
                           <div><h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Actions</h3><button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold bg-red-700 text-red-100 hover:bg-red-800"><TrashIcon className="w-5 h-5"/><span>Delete Sketch</span></button></div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none">
                    <div className="relative pointer-events-auto">
                        <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm" onMouseDown={e => e.preventDefault()}>
                            <button onClick={(e) => applyCommand(e, 'bold')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isBold ? 'text-white bg-white/10' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                            <button onClick={(e) => applyCommand(e, 'italic')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isItalic ? 'text-white bg-white/10' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={(e) => applyBlockFormat(e, 'h1')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.currentBlock === 'h1' ? 'text-white bg-white/10' : ''}`}><H1Icon className="w-5 h-5"/></button>
                            <button onClick={(e) => applyBlockFormat(e, 'h2')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.currentBlock === 'h2' ? 'text-white bg-white/10' : ''}`}><H2Icon className="w-5 h-5"/></button>
                            <button onClick={(e) => applyBlockFormat(e, 'h3')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.currentBlock === 'h3' ? 'text-white bg-white/10' : ''}`}><H3Icon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={(e) => applyCommand(e, 'insertUnorderedList')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isUL ? 'text-white bg-white/10' : ''}`}><ListBulletIcon className="w-5 h-5"/></button>
                            <button onClick={(e) => applyCommand(e, 'insertOrderedList')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.isOL ? 'text-white bg-white/10' : ''}`}><OrderedListIcon className="w-5 h-5"/></button>
                            <button onClick={(e) => applyBlockFormat(e, 'blockquote')} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors ${activeFormats.currentBlock === 'blockquote' ? 'text-white bg-white/10' : ''}`}><BlockquoteIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => setIsFindReplaceOpen(true)} className={`p-2 rounded-full text-white/70 hover:text-white transition-colors`}><SearchIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={(e) => applyCommand(e, 'undo')} className="p-2 rounded-full text-white/70 hover:text-white transition-colors"><UndoIcon className="w-5 h-5"/></button>
                            <button onClick={(e) => applyCommand(e, 'redo')} className="p-2 rounded-full text-white/70 hover:text-white transition-colors"><RedoIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <div className="px-3 text-sm text-white/70 font-sans" aria-live="polite">
                                {(sketch.wordCount || 0).toLocaleString()} {t.wordsCount}
                            </div>
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
