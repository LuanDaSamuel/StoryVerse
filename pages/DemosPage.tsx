import React, { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { Sketch } from '../types';
import { UploadIcon, PlusIcon, TrashIcon, LightbulbIcon, ChevronDownIcon, TextIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, Bars3Icon, CloseIcon, ListBulletIcon, HomeIcon } from '../components/Icons';
import { enhanceHtml, enhancePlainText } from '../constants';
import { THEME_CONFIG } from '../constants';
import * as mammoth from 'mammoth';

const getPlainText = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || '';
};

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
                    <h2 className="text-xl font-bold">Sketches</h2>
                    <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex space-x-2 mb-4">
                    <button onClick={onCreate} className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${themeClasses.bgTertiary} hover:opacity-80`}>
                        <PlusIcon className="w-5 h-5" />
                        <span>Create New</span>
                    </button>
                    <button onClick={onImportClick} className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${themeClasses.bgTertiary} hover:opacity-80`}>
                        <UploadIcon className="w-5 h-5" />
                        <span>Import from DOCX</span>
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto -mr-2 pr-2">
                    {sketches.map(sketch => (
                        <div 
                            key={sketch.id} 
                            onClick={() => onSelect(sketch.id)}
                            className={`group relative p-4 cursor-pointer border-b ${themeClasses.border} ${selectedSketchId === sketch.id ? `${themeClasses.bgTertiary}` : `hover:${themeClasses.bgTertiary}`}`}
                        >
                            <h3 className={`font-semibold truncate pr-8 ${themeClasses.accentText}`}>{enhancePlainText(sketch.title) || 'Untitled Sketch'}</h3>
                            <p className={`text-sm truncate mt-1 ${themeClasses.textSecondary}`}>{getPlainText(sketch.content) || 'No content'}</p>
                            <button 
                                onClick={(e) => onDelete(e, sketch.id)} 
                                className={`absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10`}
                                aria-label={`Delete sketch ${sketch.title}`}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface Heading {
  id: string;
  text: string;
  level: number;
}

const DocumentOutlineModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    editorRef: React.RefObject<HTMLDivElement>;
    themeClasses: any;
}> = ({ isOpen, onClose, editorRef, themeClasses }) => {
    const [headings, setHeadings] = useState<Heading[]>([]);

    useEffect(() => {
        if (isOpen && editorRef.current) {
            const headingElements = Array.from(editorRef.current.querySelectorAll('h1, h2'));
            const newHeadings = headingElements.map((el, index) => {
                const htmlEl = el as HTMLElement;
                if (!htmlEl.id) {
                    htmlEl.id = `temp-heading-id-${index}`;
                }
                return {
                    id: htmlEl.id,
                    text: htmlEl.textContent || 'Untitled Heading',
                    level: parseInt(htmlEl.tagName.substring(1), 10),
                };
            });
            setHeadings(newHeadings);
        }
    }, [isOpen, editorRef]);

    const handleHeadingClick = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        onClose();
    };

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
                    <h2 className="text-xl font-bold">Document Outline</h2>
                    <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                {headings.length > 0 ? (
                    <nav className="max-h-[60vh] overflow-y-auto -mr-2 pr-2">
                        <ul className="space-y-1">
                            {headings.map(heading => (
                                <li key={heading.id}>
                                    <button
                                        onClick={() => handleHeadingClick(heading.id)}
                                        className={`w-full text-left px-3 py-2 rounded-md transition-colors hover:${themeClasses.bgTertiary} ${heading.level === 2 ? 'pl-8' : ''}`}
                                    >
                                        {enhancePlainText(heading.text)}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                ) : (
                    <p className={themeClasses.textSecondary}>No headings (H1, H2) found in this sketch.</p>
                )}
            </div>
        </div>
    );
};

const ToolbarDropdown: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
}> = ({ label, value, onChange, children }) => {
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

const DemosPage: React.FC = () => {
    const { projectData, setProjectData, theme, themeClasses } = useContext(ProjectContext);
    const navigate = useNavigate();
    const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null);
    const [isOutlineModalOpen, setIsOutlineModalOpen] = useState(false);
    const [isDocumentOutlineOpen, setIsDocumentOutlineOpen] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const docxInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const [isFormatPanelOpen, setIsFormatPanelOpen] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false });
    const [currentFormat, setCurrentFormat] = useState({
        paragraphStyle: 'p',
        font: fontOptions[0].value,
        size: '18px',
        paragraphSpacing: '1em',
    });

    const sketches = useMemo(() => projectData?.sketches || [], [projectData?.sketches]);

    const selectedSketch = useMemo(() => {
        return sketches.find(s => s.id === selectedSketchId) || null;
    }, [sketches, selectedSketchId]);
    
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

    useEffect(() => {
        if (sketches.length > 0 && !sketches.some(s => s.id === selectedSketchId)) {
            setSelectedSketchId(sketches[0].id);
        } else if (sketches.length === 0) {
            setSelectedSketchId(null);
        }
    }, [sketches, selectedSketchId]);
    
    useEffect(() => {
        if (editorRef.current && selectedSketch) {
            const editorContent = enhanceHtml(selectedSketch.content || '');
            if (editorRef.current.innerHTML !== editorContent) {
                editorRef.current.innerHTML = editorContent;
            }
        }
    // This effect loads content when the selected sketch changes. It should only run
    // when selectedSketchId changes. `selectedSketch` is omitted from dependencies to
    // prevent this from running on every keystroke. This is safe because `selectedSketch`
    // will be up-to-date from the component's render scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSketchId]);

    const handleCreateSketch = () => {
        const now = new Date().toISOString();
        const newSketch: Sketch = {
            id: crypto.randomUUID(),
            title: 'Untitled Sketch',
            content: '<p><br></p>',
            createdAt: now,
            updatedAt: now,
        };
        
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedSketches = [newSketch, ...(currentData.sketches || [])];
            return { ...currentData, sketches: updatedSketches };
        });

        setSelectedSketchId(newSketch.id);
        setIsOutlineModalOpen(false);
    };
    
    const handleSelectSketch = (id: string) => {
        setSelectedSketchId(id);
        setIsOutlineModalOpen(false);
    };

    const handleDeleteSketch = (e: React.MouseEvent, sketchId: string) => {
        e.stopPropagation();
        setProjectData(currentData => {
            if (!currentData) return null;
            const updatedSketches = (currentData.sketches || []).filter(s => s.id !== sketchId);
            
            if (selectedSketchId === sketchId) {
                setSelectedSketchId(updatedSketches.length > 0 ? updatedSketches[0].id : null);
            }
            return { ...currentData, sketches: updatedSketches };
        });
    };

    const handleUpdateSketch = (field: 'title' | 'content', value: string) => {
        if (!selectedSketchId) return;

        setProjectData(currentData => {
            if (!currentData) return null;
            
            const sketchIndex = (currentData.sketches || []).findIndex(s => s.id === selectedSketchId);
            if (sketchIndex === -1) return currentData;
            
            const updatedSketches = [...currentData.sketches];
            updatedSketches[sketchIndex] = {
                ...updatedSketches[sketchIndex],
                [field]: value,
                updatedAt: new Date().toISOString(),
            };

            return { ...currentData, sketches: updatedSketches };
        });
    };

    const handleDocxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            e.target.value = '';
            return;
        }
        
        setIsOutlineModalOpen(false);

        try {
            const arrayBuffer = await file.arrayBuffer();
            
            const styleMap = [
                "p[style-name='Title'] => h1:fresh",
                "p[style-name='Heading 1'] => h2:fresh",
                "p[style-name='Heading 2'] => h3:fresh",
            ];
            
            const { value: html } = await mammoth.convertToHtml({ arrayBuffer }, { styleMap });
            
            // Clean the HTML by removing empty paragraphs which can mess with styling.
            const cleanedHtml = html.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, '');

            const now = new Date().toISOString();
            
            const newSketch: Sketch = {
                id: crypto.randomUUID(),
                title: file.name.replace(/\.docx$/, ''),
                content: cleanedHtml,
                createdAt: now,
                updatedAt: now,
            };
            
            setProjectData(currentData => {
                if (!currentData) return null;
                const updatedSketches = [newSketch, ...(currentData.sketches || [])];
                setSelectedSketchId(newSketch.id);
                return { ...currentData, sketches: updatedSketches };
            });

        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            alert(`Failed to process ${file.name}. It might be corrupted or not a valid .docx file.`);
        }
        
        e.target.value = '';
    };

    // --- Formatting Logic ---

    const updateActiveFormats = useCallback(() => {
        setActiveFormats({
            isBold: document.queryCommandState('bold'),
            isItalic: document.queryCommandState('italic'),
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
            if (['p', 'h1', 'h2'].includes(tagName)) {
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

    const applyAndSaveFormat = useCallback((formatAction: () => void) => {
        if (!editorRef.current) return;
        formatAction();
        const event = new Event('input', { bubbles: true, cancelable: true });
        editorRef.current.dispatchEvent(event);
        editorRef.current.focus();
        handleSelectionChange();
    }, [handleSelectionChange]);

    const applyFormat = (command: 'bold' | 'italic' | 'undo' | 'redo') => {
        applyAndSaveFormat(() => document.execCommand(command, false));
    };
    
    const applyParagraphStyle = (style: string) => applyAndSaveFormat(() => document.execCommand('formatBlock', false, style));
    
    const applyFont = (fontValue: string) => {
        const fontName = fontOptions.find(f => f.value === fontValue)?.name || 'serif';
        applyAndSaveFormat(() => document.execCommand('fontName', false, fontName));
    };

    const applyColor = (color: string) => applyAndSaveFormat(() => document.execCommand('foreColor', false, color));
    
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
                if (span.parentElement) {
                    parentsToClean.add(span.parentElement);
                }
                span.style.backgroundColor = '';
                span.style.fontSize = size;
                
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
                if(node instanceof HTMLElement && ['P', 'H1', 'H2', 'DIV'].includes(node.tagName)) {
                    node.style.marginBottom = spacing;
                    return;
                }
                node = node.parentNode!;
            }
        });
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
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
        
        if (e.key === 'Enter') {
            setTimeout(() => {
                const newSelection = window.getSelection();
                if (!newSelection?.rangeCount || !editorRef.current) return;
                const newRange = newSelection.getRangeAt(0);
                
                // --- 1. Fix Font Size Inheritance ---
                let currentBlock = newRange.startContainer;
                while (currentBlock && currentBlock.parentNode !== editorRef.current) {
                    currentBlock = currentBlock.parentNode;
                }
                
                if (currentBlock instanceof HTMLElement) {
                    const isNewBlockEmpty = (currentBlock.textContent?.trim() === '' && currentBlock.children.length === 0) || currentBlock.innerHTML === '<br>';
                    
                    if (isNewBlockEmpty) {
                        const previousBlock = currentBlock.previousElementSibling;
                        if (previousBlock instanceof HTMLElement) {
                            let styleSource: Element = previousBlock;
                            while (styleSource.lastElementChild) {
                                styleSource = styleSource.lastElementChild;
                            }
                            
                            const computedStyle = window.getComputedStyle(styleSource);
                            const fontSize = computedStyle.fontSize;
                            const defaultFontSize = window.getComputedStyle(editorRef.current).fontSize;
                            
                            if (fontSize && fontSize !== defaultFontSize) {
                                currentBlock.innerHTML = ''; // Clear the default <br>
                                const styleCarrier = document.createElement('span');
                                styleCarrier.style.fontSize = fontSize;
                                styleCarrier.innerHTML = '&#8203;'; // Use a zero-width space as a placeholder for the cursor.
                                currentBlock.appendChild(styleCarrier);
                                
                                newRange.setStart(styleCarrier.firstChild!, 1);
                                newRange.collapse(true);
                                newSelection.removeAllRanges();
                                newSelection.addRange(newRange);
                            }
                        }
                    }
                }

                // --- 2. Adjust Scroll Position ---
                let element = newRange.startContainer;
                if (element.nodeType === Node.TEXT_NODE) {
                    element = element.parentElement!;
                }
                
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
    };
    
    useEffect(() => {
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
    }, [handleSelectionChange]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
                setIsFormatPanelOpen(false);
            }
        };
        if (isFormatPanelOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFormatPanelOpen]);

    return (
        <div className={`flex h-screen ${themeClasses.bg} font-sans relative`}>
            <button 
                onClick={() => navigate('/')} 
                className={`fixed top-4 left-4 z-30 flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-semibold ${themeClasses.bgSecondary} ${themeClasses.accentText} hover:opacity-80 shadow-lg border ${themeClasses.border}`}
                aria-label="Back to Home"
            >
                <HomeIcon className="w-5 h-5" />
                <span>Home</span>
            </button>
            <input
                type="file"
                ref={docxInputRef}
                onChange={handleDocxImport}
                className="hidden"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
             <SketchesOutlineModal
                isOpen={isOutlineModalOpen}
                onClose={() => setIsOutlineModalOpen(false)}
                sketches={sketches}
                selectedSketchId={selectedSketchId}
                onSelect={handleSelectSketch}
                onCreate={handleCreateSketch}
                onImportClick={() => docxInputRef.current?.click()}
                onDelete={handleDeleteSketch}
                themeClasses={themeClasses}
            />

            {/* Editor Content */}
            <div ref={scrollContainerRef} className="flex-1 h-full overflow-y-auto">
                <div className="p-8 md:p-12 font-serif min-h-full">
                    {selectedSketch ? (
                        <div>
                            <input
                                key={`${selectedSketch.id}-title`}
                                defaultValue={selectedSketch.title}
                                onBlur={(e) => handleUpdateSketch('title', e.target.value)}
                                placeholder="Sketch Title"
                                className={`text-4xl font-bold bg-transparent outline-none w-full mb-8 ${themeClasses.text}`}
                            />
                            <div
                                ref={editorRef}
                                key={`${selectedSketch.id}-content`}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={(e) => handleUpdateSketch('content', e.currentTarget.innerHTML)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                className={`w-full text-lg leading-relaxed outline-none story-content ${themeClasses.text}`}
                                style={editorStyle}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center mt-[-4rem]">
                            <LightbulbIcon className={`w-16 h-16 mb-4 ${themeClasses.textSecondary}`} />
                            <h2 className={`text-2xl font-bold ${themeClasses.accentText}`}>Welcome to Demos</h2>
                            <p className={`mt-2 max-w-md ${themeClasses.textSecondary}`}>
                                This is your space for ideas, notes, and short stories. Create a new sketch to get started.
                            </p>
                            <button
                                onClick={handleCreateSketch}
                                className={`mt-8 flex items-center justify-center space-x-2 px-6 py-3 text-lg font-semibold rounded-lg transition-colors ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
                            >
                                <PlusIcon className="w-6 h-6" />
                                <span>Create First Sketch</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Floating Toolbar */}
             <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20 pointer-events-none">
                <div ref={toolbarRef} className="relative pointer-events-auto">
                    {isFormatPanelOpen && (
                        <div className="absolute bottom-full mb-2 p-4 rounded-lg shadow-lg bg-stone-900/80 border border-white/10 backdrop-blur-sm w-[320px]">
                            <div className="space-y-4">
                                <ToolbarDropdown label="Paragraph Style" value={currentFormat.paragraphStyle} onChange={(e) => applyParagraphStyle(e.target.value)}>
                                    <option value="p">Paragraph</option>
                                    <option value="h1">Heading 1</option>
                                    <option value="h2">Heading 2</option>
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
                    <div className="flex items-center space-x-1 p-1 rounded-full shadow-lg bg-stone-900/70 border border-white/10 backdrop-blur-sm" onMouseDown={(e) => e.preventDefault()}>
                        <button onClick={() => setIsOutlineModalOpen(true)} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}>
                            <Bars3Icon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => setIsDocumentOutlineOpen(true)} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`} disabled={!selectedSketchId}>
                            <ListBulletIcon className="w-5 h-5"/>
                        </button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => setIsFormatPanelOpen(p => !p)} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${isFormatPanelOpen ? 'bg-white/20' : ''}`}><TextIcon className="w-5 h-5"/></button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => applyFormat('bold')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.isBold ? 'bg-white/20' : ''}`}><BoldIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyFormat('italic')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors ${activeFormats.isItalic ? 'bg-white/20' : ''}`}><ItalicIcon className="w-5 h-5"/></button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <button onClick={() => applyFormat('undo')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><UndoIcon className="w-5 h-5"/></button>
                        <button onClick={() => applyFormat('redo')} className={`p-2 rounded-full text-white/90 hover:bg-white/10 transition-colors`}><RedoIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>

            <DocumentOutlineModal
                isOpen={isDocumentOutlineOpen}
                onClose={() => setIsDocumentOutlineOpen(false)}
                editorRef={editorRef}
                themeClasses={themeClasses}
            />

        </div>
    );
};

export default DemosPage;