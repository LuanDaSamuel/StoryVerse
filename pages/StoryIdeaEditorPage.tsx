
import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
// FIX: Changed react-router-dom import to namespace import to fix module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, ChevronLeftIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, TrashIcon, H1Icon, H2Icon, H3Icon, TextIcon, ChevronDownIcon } from '../components/Icons';
import { enhanceHtml, enhancePlainText, SKETCH_TAG_OPTIONS, THEME_CONFIG } from '../constants';
import { StoryIdea, StoryIdeaStatus } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const fontOptions = [
    { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
];

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


const StoryIdeaEditorPage: React.FC = () => {
    const { ideaId } = ReactRouterDOM.useParams<{ ideaId: string }>();
    const navigate = ReactRouterDOM.useNavigate();
    const { projectData, setProjectData, theme, themeClasses } = useContext(ProjectContext);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const saveTimeout = useRef<number | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isFormatPanelOpen, setIsFormatPanelOpen] = useState(false);
    
    const { idea, ideaIndex } = useMemo(() => {
        if (!projectData?.storyIdeas || !ideaId) return { idea: null, ideaIndex: -1 };
        const iIndex = projectData.storyIdeas.findIndex(i => i.id === ideaId);
        return iIndex === -1 ? { idea: null, ideaIndex: -1 } : { idea: projectData.storyIdeas[iIndex], ideaIndex: iIndex };
    }, [projectData, ideaId]);

    const [title, setTitle] = useState(idea?.title || '');
    const [synopsis, setSynopsis] = useState(idea?.synopsis || '');
    const [tags, setTags] = useState<string[]>(idea?.tags || []);
    const [status, setStatus] = useState<StoryIdeaStatus>(idea?.status || 'Seedling');
    const [wordCount, setWordCount] = useState(idea?.wordCount || 0);

    const [documentOutline, setDocumentOutline] = useState<{ id: string; text: string; level: number }[]>([]);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false, isUL: false, isOL: false, currentBlock: 'p' });
    const [currentFormat, setCurrentFormat] = useState({
        paragraphStyle: 'p',
        font: fontOptions[0].value,
        size: '18px',
        paragraphSpacing: '1em',
    });

    const cleanupEditor = useCallback(() => {
        if (!editorRef.current) return;
        const editor = editorRef.current;
        editor.normalize();
    }, []);

    useEffect(() => {
        if (idea) {
            setTitle(idea.title);
            setTags(idea.tags);
            setStatus(idea.status);
            setWordCount(idea.wordCount);
            if (editorRef.current && idea.synopsis !== editorRef.current.innerHTML) {
                const enhancedContent = enhanceHtml(idea.synopsis || '<p><br></p>');
                editorRef.current.innerHTML = enhancedContent;
                setSynopsis(enhancedContent);
            }
        }
    }, [idea]);

    useEffect(() => {
        if (!idea) return;
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
        saveTimeout.current = window.setTimeout(() => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = synopsis;
            const text = tempDiv.textContent || "";
            const currentWordCount = text.trim().split(/\s+/).filter(Boolean).length;
    
            setProjectData(currentData => {
                if (!currentData || ideaIndex === -1) return currentData;
                const updatedIdeas = [...currentData.storyIdeas];
                const currentIdea = updatedIdeas[ideaIndex];
                if (currentIdea.title !== title || currentIdea.synopsis !== synopsis || JSON.stringify(currentIdea.tags) !== JSON.stringify(tags) || currentIdea.status !== status) {
                    updatedIdeas[ideaIndex] = {
                        ...currentIdea,
                        title,
                        synopsis,
                        tags,
                        status,
                        wordCount: currentWordCount,
                        updatedAt: new Date().toISOString(),
                    };
                    return { ...currentData, storyIdeas: updatedIdeas };
                }
                return currentData;
            });
            setWordCount(currentWordCount);
        }, 1000);
    
        return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
    }, [title, synopsis, tags, status, idea, ideaIndex, setProjectData]);

    const updateDocumentOutline = useCallback(() => {
        if (!editorRef.current) return;
        const headings = Array.from(editorRef.current.querySelectorAll('h1, h2, h3'));
        const newOutline = headings.map((heading, index) => {
            const id = heading.id || `heading-idea-${index}`;
            heading.id = id;
            return { id, text: heading.textContent || 'Untitled Heading', level: parseInt(heading.tagName.substring(1), 10) };
        });
        setDocumentOutline(newOutline);
    }, []);

    const updateCurrentFormat = useCallback(() => {
        if (!editorRef.current) return;
        const selection = window.getSelection();
        if (!selection?.rangeCount || !editorRef.current.contains(selection.anchorNode)) {
            return;
        }

        let element = selection.anchorNode;
        if (element.nodeType === 3) element = element.parentNode!;
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

    const updateActiveFormats = useCallback(() => {
        const selection = window.getSelection();
        if (!selection?.rangeCount || !editorRef.current || !editorRef.current.contains(selection.anchorNode)) return;

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
    
    const handleSelectionChange = useCallback(() => {
        updateActiveFormats();
        updateCurrentFormat();
    }, [updateActiveFormats, updateCurrentFormat]);

    useEffect(() => {
        updateDocumentOutline();
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', handleSelectionChange);
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
    }, [synopsis, updateDocumentOutline, handleSelectionChange]);

    const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
        setSynopsis(e.currentTarget.innerHTML);
    };

    const applyAndSaveFormat = useCallback((formatAction: () => void) => {
        if (!editorRef.current) return;
        formatAction();
        cleanupEditor();
        const event = new Event('input', { bubbles: true, cancelable: true });
        editorRef.current.dispatchEvent(event);
        editorRef.current.focus();
        handleSelectionChange();
    }, [handleSelectionChange, cleanupEditor]);

    const applyCommand = (command: string, value?: string) => { applyAndSaveFormat(() => document.execCommand(command, false, value)); };
    const applyParagraphStyle = (style: string) => { applyAndSaveFormat(() => document.execCommand('formatBlock', false, style)); };
    const applyFont = (fontValue: string) => { const fontName = fontOptions.find(f => f.value === fontValue)?.name || 'serif'; applyAndSaveFormat(() => document.execCommand('fontName', false, fontName)); };
    const applyColor = (color: string) => { applyAndSaveFormat(() => document.execCommand('foreColor', false, color)); };
    const applyFontSize = (size: string) => { applyAndSaveFormat(() => { document.execCommand('fontSize', false, '1'); const fontElements = editorRef.current?.getElementsByTagName('font'); if(fontElements) { for (let i = 0, len = fontElements.length; i < len; ++i) { if (fontElements[i].size === "1") { fontElements[i].removeAttribute("size"); fontElements[i].style.fontSize = size; } } } }); };
    const applyParagraphSpacing = (spacing: string) => { applyAndSaveFormat(() => { const selection = window.getSelection(); if (!selection || selection.rangeCount === 0) return; let node = selection.getRangeAt(0).startContainer; if (node.nodeType === 3) node = node.parentNode!; while(node && node !== editorRef.current) { if(node instanceof HTMLElement && ['P', 'H1', 'H2', 'H3', 'DIV'].includes(node.tagName)) { node.style.marginBottom = spacing; return; } node = node.parentNode!; } }); };

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

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;
        const htmlToInsert = text.split(/\r?\n/).map(line => `<p>${enhancePlainText(line) || '<br>'}</p>`).join('');
        document.execCommand('insertHTML', false, htmlToInsert);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) { setIsFormatPanelOpen(false); } };
        if (isFormatPanelOpen) { document.addEventListener('mousedown', handleClickOutside); }
        return () => { document.removeEventListener('mousedown', handleClickOutside); };
    }, [isFormatPanelOpen]);
    
    const handleTagClick = (tag: string) => { setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 6 ? [...prev, tag] : prev); };
    const handleDelete = () => { if (!idea) return; setProjectData(d => d ? { ...d, storyIdeas: d.storyIdeas.filter(i => i.id !== idea.id) } : null); navigate('/demos'); };
    const editorStyle = useMemo(() => (theme === 'book' ? { color: THEME_CONFIG.book.text.match(/\[(.*?)\]/)?.[1] || '#F5EADD' } : { color: 'inherit' }), [theme]);
    const colorPalette = useMemo(() => (theme === 'book' ? [THEME_CONFIG.book.text.match(/\[(.*?)\]/)?.[1] || '#F5EADD', '#3B82F6', '#FBBF24', '#22C55E', '#EC4899'] : ['#3B2F27', '#3B82F6', '#FBBF24', '#22C55E', '#EC4899']), [theme]);
    
    if (!idea) return <div className={`flex h-screen items-center justify-center ${themeClasses.bg}`}><p>Loading idea...</p></div>;

    return (
        <>
            <div className={`flex h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
                {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30" />}
                <div className="flex-1 overflow-y-auto relative">
                    <div className={`sticky top-0 z-10 px-8 md:px-16 lg:px-24 pt-6 pb-4 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border}`}>
                        <button onClick={() => navigate(`/demos`)} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                            <BackIcon className="w-5 h-5" /><span className="font-sans">Return to Idea Box</span>
                        </button>
                    </div>
                    <div className="px-8 md:px-16 lg:px-24 pt-8 pb-48">
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Idea Title" className="text-4xl font-bold bg-transparent outline-none w-full mb-8" />
                        <div ref={editorRef} contentEditable spellCheck={true} suppressContentEditableWarning onInput={handleEditorInput} onKeyDown={handleKeyDown} onPaste={handlePaste} onBlur={cleanupEditor} className="w-full text-lg leading-relaxed outline-none story-content" style={editorStyle} />
                    </div>
                </div>
                <div className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className={`w-80 h-full ${themeClasses.bgSecondary} ${themeClasses.accentText} text-sm font-sans border-l ${themeClasses.border} flex flex-col`}>
                        <div className={`px-4 py-3 flex justify-between items-center border-b ${themeClasses.border}`}>
                            <span className="font-bold text-base">IDEA DETAILS</span><button onClick={() => setIsSidebarOpen(false)}><ChevronLeftIcon className="w-5 h-5"/></button>
                        </div>
                        <div className={`px-4 py-4 border-b ${themeClasses.border}`}>
                            <p className="text-3xl font-bold">{wordCount.toLocaleString()}</p><p className={themeClasses.textSecondary}>WORDS</p>
                        </div>
                        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Document Outline</h3>
                                {documentOutline.length > 0 ? (
                                    <ul className="space-y-1">{documentOutline.map(h => <li key={h.id}><button onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="w-full text-left px-2 py-1 rounded hover:bg-white/10" style={{ paddingLeft: `${h.level}rem` }}>{h.text}</button></li>)}</ul>
                                ) : <p className={`text-xs ${themeClasses.textSecondary}`}>No headings found.</p>}
                            </div>
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Status</h3>
                                <div className={`flex rounded-md overflow-hidden border ${themeClasses.border}`}>
                                    {(['Seedling', 'Developing', 'Archived'] as StoryIdeaStatus[]).map(o => <button key={o} onClick={() => setStatus(o)} className={`flex-1 py-2 text-sm font-semibold ${status === o ? `${themeClasses.accent} ${themeClasses.accentText}` : `hover:${themeClasses.bgTertiary}`}`}>{o}</button>)}
                                </div>
                            </div>
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Tags</h3>
                                <div className="flex flex-wrap gap-1.5">{SKETCH_TAG_OPTIONS.map(t => <button key={t} onClick={() => handleTagClick(t)} className={`px-2 py-1 text-xs rounded-full font-semibold ${tags.includes(t) ? `${themeClasses.accent} ${themeClasses.accentText}` : `${themeClasses.bgTertiary} hover:opacity-80`}`}>{t}</button>)}</div>
                            </div>
                            <div>
                                <h3 className={`font-bold mb-2 text-sm uppercase ${themeClasses.textSecondary}`}>Actions</h3>
                                <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center space-x-3 text-left px-4 py-3 rounded-lg font-semibold bg-red-700 text-red-100 hover:bg-red-800"><TrashIcon className="w-5 h-5"/><span>Delete Idea</span></button>
                            </div>
                        </div>
                    </div>
                </div>
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
                                            <option value="14px">14</option><option value="16px">16</option><option value="18px">18</option><option value="20px">20</option><option value="24px">24</option>
                                        </ToolbarDropdown>
                                        <ToolbarDropdown label="Paragraph Spacing" value={currentFormat.paragraphSpacing} onChange={(e) => applyParagraphSpacing(e.target.value)}>
                                            <option value="0.5em">0.5</option><option value="1em">1.0</option><option value="1.5em">1.5</option><option value="2em">2.0</option>
                                        </ToolbarDropdown>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-2 text-white/70">Color</label>
                                        <div className="flex space-x-2">{colorPalette.map(color => <button key={color} onClick={() => applyColor(color)} className="w-6 h-6 rounded-full border border-gray-400" style={{backgroundColor: color}}></button>)}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm" onMouseDown={e => e.preventDefault()}>
                            <button onClick={() => setIsFormatPanelOpen(p => !p)} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${isFormatPanelOpen ? 'bg-white/20' : ''}`}><TextIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isBold ? 'bg-white/20' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isItalic ? 'bg-white/20' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => applyParagraphStyle('h1')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.currentBlock === 'h1' ? 'bg-white/20' : ''}`}><H1Icon className="w-5 h-5"/></button>
                            <button onClick={() => applyParagraphStyle('h2')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.currentBlock === 'h2' ? 'bg-white/20' : ''}`}><H2Icon className="w-5 h-5"/></button>
                            <button onClick={() => applyParagraphStyle('h3')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.currentBlock === 'h3' ? 'bg-white/20' : ''}`}><H3Icon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isUL ? 'bg-white/20' : ''}`}><ListBulletIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isOL ? 'bg-white/20' : ''}`}><OrderedListIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyParagraphStyle('blockquote')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.currentBlock === 'blockquote' ? 'bg-white/20' : ''}`}><BlockquoteIcon className="w-5 h-5"/></button>
                            <div className="w-px h-5 bg-white/20 mx-1" />
                            <button onClick={() => applyCommand('undo')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><UndoIcon className="w-5 h-5"/></button>
                            <button onClick={() => applyCommand('redo')} className="p-2 rounded-full text-white/90 hover:bg-white/10"><RedoIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
            </div>
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className={`fixed top-4 right-4 z-30 p-2 rounded-md ${themeClasses.bgSecondary} ${themeClasses.accentText} hover:opacity-80 shadow-lg border ${themeClasses.border}`}><ChevronLeftIcon className="w-5 h-5" /></button>}
            <ConfirmModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title={`Delete "${idea.title}"?`} message="Are you sure you want to delete this story idea? This action is permanent." />
        </>
    );
};

export default StoryIdeaEditorPage;
