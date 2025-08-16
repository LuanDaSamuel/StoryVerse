
import React, { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { Sketch } from '../types';
import { UploadIcon, PlusIcon, TrashIcon, LightbulbIcon, ChevronDownIcon, TextIcon, BoldIcon, ItalicIcon, UndoIcon, RedoIcon, Bars3Icon } from '../components/Icons';
import { enhanceHtml, enhancePlainText } from '../constants';
import { THEME_CONFIG } from '../constants';
import * as mammoth from 'mammoth';

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
    const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null);
    const [isSketchesListOpen, setIsSketchesListOpen] = useState(true);

    const editorRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const docxInputRef = useRef<HTMLInputElement>(null);
    
    const [isFormatPanelOpen, setIsFormatPanelOpen] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ isBold: false, isItalic: false });
    const [currentFormat, setCurrentFormat] = useState({
        paragraphStyle: 'p',
        font: fontOptions[0].value,
        size: '18px',
        lineHeight: '1.5',
    });

    const sketches = useMemo(() => projectData?.sketches || [], [projectData?.sketches]);

    const selectedSketch = useMemo(() => {
        return sketches.find(s => s.id === selectedSketchId) || null;
    }, [sketches, selectedSketchId]);
    
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
    }, [selectedSketch]);

    const handleCreateSketch = () => {
        if (!projectData) return;
        const now = new Date().toISOString();
        const newSketch: Sketch = {
            id: crypto.randomUUID(),
            title: 'Untitled Sketch',
            content: '<p><br></p>',
            createdAt: now,
            updatedAt: now,
        };
        
        const updatedSketches = [newSketch, ...sketches];
        setProjectData({ ...projectData, sketches: updatedSketches });
        setSelectedSketchId(newSketch.id);
        setIsSketchesListOpen(false);
    };

    const handleDeleteSketch = (e: React.MouseEvent, sketchId: string) => {
        e.stopPropagation();
        if (!projectData) return;
        const updatedSketches = sketches.filter(s => s.id !== sketchId);
        
        if (selectedSketchId === sketchId) {
            setSelectedSketchId(updatedSketches.length > 0 ? updatedSketches[0].id : null);
        }
        
        setProjectData({ ...projectData, sketches: updatedSketches });
    };

    const handleUpdateSketch = (field: 'title' | 'content', value: string) => {
        if (!projectData || !selectedSketchId) return;

        const sketchIndex = sketches.findIndex(s => s.id === selectedSketchId);
        if (sketchIndex === -1) return;
        
        const updatedSketches = [...sketches];
        const updatedSketch = {
            ...updatedSketches[sketchIndex],
            [field]: value,
            updatedAt: new Date().toISOString(),
        };

        updatedSketches[sketchIndex] = updatedSketch;
        setProjectData({ ...projectData, sketches: updatedSketches });
    };

    const handleDocxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !projectData) {
            e.target.value = ''; // Reset input
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

            const now = new Date().toISOString();
            const newSketch: Sketch = {
                id: crypto.randomUUID(),
                title: file.name.replace(/\.docx$/, ''),
                content: html,
                createdAt: now,
                updatedAt: now,
            };
            
            const updatedSketches = [newSketch, ...sketches];
            setProjectData({ ...projectData, sketches: updatedSketches });
            setSelectedSketchId(newSketch.id);
            setIsSketchesListOpen(false);

        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            alert(`Failed to process ${file.name}. It might be corrupted or not a valid .docx file.`);
        }
        
        e.target.value = ''; // Reset file input to allow selecting same file again
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
        if (element.nodeType === 3) element = element.parentNode!;
        if (!(element instanceof HTMLElement)) return;

        const inlineStyles = window.getComputedStyle(element);
        const family = inlineStyles.fontFamily;
        const matchedFont = fontOptions.find(f => family.includes(f.name))?.value || fontOptions[0].value;
        
        setCurrentFormat(prev => ({ ...prev, font: matchedFont, size: inlineStyles.fontSize }));
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
    const applyFont = (fontValue: string) => applyAndSaveFormat(() => document.execCommand('fontName', false, fontOptions.find(f => f.value === fontValue)?.name || 'serif'));
    const applyColor = (color: string) => applyAndSaveFormat(() => document.execCommand('foreColor', false, color));
    const applyFontSize = (size: string) => applyAndSaveFormat(() => document.execCommand('fontSize', false, '1')); // Dummy command, actual logic is complex
    const applyLineHeight = (height: string) => applyAndSaveFormat(() => { /* Complex logic placeholder */ });
    
    useEffect(() => {
        const editorEl = editorRef.current;
        document.addEventListener('selectionchange', handleSelectionChange);
        if (editorEl) editorEl.addEventListener('keyup', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            if(editorEl) editorEl.removeEventListener('keyup', handleSelectionChange);
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


    const getPlainText = (html: string) => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || '';
    }

    return (
        <div className={`flex h-screen ${themeClasses.bg} font-sans relative`}>
            <input
                type="file"
                ref={docxInputRef}
                onChange={handleDocxImport}
                className="hidden"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            {/* Sketches List Sidebar */}
            <div className={`
                fixed top-0 left-0 h-full w-80 z-20
                flex flex-col border-r ${themeClasses.border} ${themeClasses.bgSecondary}
                transition-transform duration-300 ease-in-out
                ${isSketchesListOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className={`p-4 flex justify-between items-center border-b ${themeClasses.border}`}>
                    <h2 className={`text-lg font-bold ${themeClasses.accentText}`}>Sketches</h2>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => docxInputRef.current?.click()} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`} aria-label="Import from DOCX">
                            <UploadIcon className={`w-5 h-5 ${themeClasses.accentText}`} />
                        </button>
                        <button onClick={handleCreateSketch} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`} aria-label="Create new sketch">
                            <PlusIcon className={`w-5 h-5 ${themeClasses.accentText}`} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {sketches.map(sketch => (
                        <div 
                            key={sketch.id} 
                            onClick={() => { setSelectedSketchId(sketch.id); setIsSketchesListOpen(false); }} 
                            className={`group relative p-4 cursor-pointer border-b ${themeClasses.border} ${selectedSketchId === sketch.id ? `${themeClasses.bgTertiary}` : `hover:${themeClasses.bgTertiary}`}`}
                        >
                            <h3 className={`font-semibold truncate pr-8 ${themeClasses.accentText}`}>{enhancePlainText(sketch.title) || 'Untitled Sketch'}</h3>
                            <p className={`text-sm truncate mt-1 ${themeClasses.textSecondary}`}>{getPlainText(sketch.content) || 'No content'}</p>
                             <button 
                                onClick={(e) => handleDeleteSketch(e, sketch.id)} 
                                className={`absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10`}
                                aria-label={`Delete sketch ${sketch.title}`}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor Content */}
            <div className={`
                flex-1 h-full overflow-y-auto transition-all duration-300 ease-in-out
                ${isSketchesListOpen ? 'pl-80' : 'pl-0'}
            `}>
                {!isSketchesListOpen && (
                    <button 
                        onClick={() => setIsSketchesListOpen(true)}
                        className={`fixed top-4 left-4 z-10 p-2 rounded-md ${themeClasses.bgSecondary} ${themeClasses.accentText} hover:opacity-80 shadow-lg border ${themeClasses.border}`}
                        aria-label="Open sketches list"
                    >
                        <Bars3Icon className="w-5 h-5" />
                    </button>
                )}
                <div className="p-8 md:p-12 font-serif">
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
                                className={`w-full text-lg leading-relaxed outline-none story-content ${themeClasses.text}`}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center mt-[-4rem]">
                            <LightbulbIcon className={`w-16 h-16 mb-4 ${themeClasses.textSecondary}`} />
                            <h2 className={`text-2xl font-bold ${themeClasses.accentText}`}>Welcome to Demos</h2>
                            <p className={`mt-2 max-w-md ${themeClasses.textSecondary}`}>
                                This is your space for ideas, notes, and short stories. Create a new sketch to get started.
                            </p>
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
                                <ToolbarDropdown label="Font" value={currentFormat.font} onChange={(e) => applyFont(e.target.value)}>
                                    {fontOptions.map(font => <option key={font.name} value={font.value}>{font.name}</option>)}
                                </ToolbarDropdown>
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

        </div>
    );
};

export default DemosPage;