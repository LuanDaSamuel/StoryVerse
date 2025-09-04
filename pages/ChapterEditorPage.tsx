
import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { BackIcon, BookOpenIcon, ChevronLeftIcon, TextIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, CloseIcon, Bars3Icon, DownloadIcon, ListBulletIcon, OrderedListIcon, BlockquoteIcon, H1Icon, H2Icon, H3Icon } from '../components/Icons';
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

// --- Main Page Component ---
const ChapterEditorPage: React.FC = () => {
    const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
    const navigate = useNavigate();
    const { projectData, setProjectData, theme, themeClasses } = useContext(ProjectContext);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const editorContentRef = useRef<string>("");
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChapterListModalOpen, setIsChapterListModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false, isUL: false, isOL: false, currentBlock: 'p' });

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
        let blockType = 'p';
        const selection = window.getSelection();
        if (selection?.rangeCount) {
            let element = selection.getRangeAt(0).startContainer;
            if (element.nodeType === 3) element = element.parentNode!;
            while (element && element !== editorRef.current) {
                const tag = (element as HTMLElement).tagName?.toLowerCase();
                if (['h1', 'h2', 'h3', 'blockquote'].includes(tag)) {
                    blockType = tag;
                    break;
                }
                element = element.parentNode!;
            }
        }
        setActiveFormats({
            isBold: document.queryCommandState('bold'),
            isItalic: document.queryCommandState('italic'),
            isUL: document.queryCommandState('insertUnorderedList'),
            isOL: document.queryCommandState('insertOrderedList'),
            currentBlock: blockType,
        });
    }, []);

    const applyAndSaveFormat = useCallback((formatAction: () => void) => {
        if (!editorRef.current) return;
        
        formatAction();
        cleanupEditor();

        const event = new Event('input', { bubbles: true, cancelable: true });
        editorRef.current.dispatchEvent(event);
        
        editorRef.current.focus();
        updateActiveFormats();

    }, [updateActiveFormats, cleanupEditor]);

    const applyCommand = (command: string, value?: string) => {
        applyAndSaveFormat(() => document.execCommand(command, false, value));
    };
    
    const applyParagraphStyle = (style: string) => {
        const format = activeFormats.currentBlock === style ? 'p' : style;
        applyAndSaveFormat(() => document.execCommand('formatBlock', false, format));
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

    // --- Effects ---
    // This effect handles loading content when the chapter is switched.
    useEffect(() => {
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
        updateActiveFormats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterId]);

    // This effect handles programmatic content changes (like "Replace All in Novel").
    useEffect(() => {
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

    useEffect(() => {
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', updateActiveFormats);
        if (editorEl) {
            editorEl.addEventListener('keyup', updateActiveFormats);
            editorEl.addEventListener('mouseup', updateActiveFormats);
            editorEl.addEventListener('focus', updateActiveFormats);
            editorEl.addEventListener('copy', handleCopy);
        }

        return () => {
            document.removeEventListener('selectionchange', updateActiveFormats);
            if(editorEl) {
                editorEl.removeEventListener('keyup', updateActiveFormats);
                editorEl.removeEventListener('mouseup', updateActiveFormats);
                editorEl.removeEventListener('focus', updateActiveFormats);
                editorEl.removeEventListener('copy', handleCopy);
            }
        };
    }, [updateActiveFormats, handleCopy]);

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
                     <div ref={toolbarRef} className={`sticky top-0 z-10 ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border}`}>
                        <div className="px-8 md:px-16 lg:px-24 pt-6 pb-4">
                            <button onClick={() => navigate(`/novel/${novelId}`)} className={`flex items-center space-x-2 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                                <BackIcon className="w-5 h-5" />
                                <span className="font-sans">Return to Details</span>
                            </button>
                        </div>
                        <div className="flex justify-center pb-2" onMouseDown={(e) => e.preventDefault()}>
                            <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm">
                                <button onClick={() => applyCommand('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.isBold ? 'bg-white/20' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                                <button onClick={() => applyCommand('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.isItalic ? 'bg-white/20' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                                <div className="w-px h-5 bg-white/20 mx-1"></div>
                                <button onClick={() => applyParagraphStyle('h1')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.currentBlock === 'h1' ? 'bg-white/20' : ''}`}><H1Icon className="w-5 h-5"/></button>
                                <button onClick={() => applyParagraphStyle('h2')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.currentBlock === 'h2' ? 'bg-white/20' : ''}`}><H2Icon className="w-5 h-5"/></button>
                                <button onClick={() => applyParagraphStyle('h3')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.currentBlock === 'h3' ? 'bg-white/20' : ''}`}><H3Icon className="w-5 h-5"/></button>
                                <div className="w-px h-5 bg-white/20 mx-1"></div>
                                <button onClick={() => applyCommand('insertUnorderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isUL ? 'bg-white/20' : ''}`}><ListBulletIcon className="w-5 h-5"/></button>
                                <button onClick={() => applyCommand('insertOrderedList')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.isOL ? 'bg-white/20' : ''}`}><OrderedListIcon className="w-5 h-5"/></button>
                                <button onClick={() => applyParagraphStyle('blockquote')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 ${activeFormats.currentBlock === 'blockquote' ? 'bg-white/20' : ''}`}><BlockquoteIcon className="w-5 h-5"/></button>
                                <div className="w-px h-5 bg-white/20 mx-1"></div>
                                <button onClick={() => applyCommand('undo')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><UndoIcon className="w-5 h-5"/></button>
                                <button onClick={() => applyCommand('redo')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><RedoIcon className="w-5 h-5"/></button>
                            </div>
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
                            onInput={(e) => {
                                const newHTML = e.currentTarget.innerHTML;
                                editorContentRef.current = newHTML;
                                updateChapterField('content', newHTML);
                            }}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            onBlur={cleanupEditor}
                            className="w-full text-lg leading-relaxed outline-none story-content"
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
                                <ChevronLeftIcon className="w-5 h-5"/>
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
                                        <Bars3Icon className="w-5 h-5" />
                                        <span>Chapter Outline</span>
                                    </div>
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