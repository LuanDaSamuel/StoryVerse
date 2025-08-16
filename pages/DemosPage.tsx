import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { Sketch } from '../types';
import { PlusIcon, TrashIcon, LightbulbIcon } from '../components/Icons';
import { enhanceHtml, enhancePlainText } from '../constants';

const DemosPage: React.FC = () => {
    const { projectData, setProjectData, themeClasses } = useContext(ProjectContext);
    const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const sketches = useMemo(() => projectData?.sketches || [], [projectData?.sketches]);

    const selectedSketch = useMemo(() => {
        return sketches.find(s => s.id === selectedSketchId) || null;
    }, [sketches, selectedSketchId]);

    // Effect to handle selection: select first sketch on load, or null if list is empty.
    useEffect(() => {
        if (sketches.length > 0 && !sketches.some(s => s.id === selectedSketchId)) {
            setSelectedSketchId(sketches[0].id);
        } else if (sketches.length === 0) {
            setSelectedSketchId(null);
        }
    }, [sketches, selectedSketchId]);
    
    // Effect to update editor content only when sketch changes to prevent cursor jumping
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
            content: '<p><br></p>', // Start with an empty paragraph for better editing experience
            createdAt: now,
            updatedAt: now,
        };
        
        const updatedSketches = [newSketch, ...sketches];
        setProjectData({ ...projectData, sketches: updatedSketches });
        setSelectedSketchId(newSketch.id);
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

    const getPlainText = (html: string) => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || '';
    }

    return (
        <div className={`flex h-full ${themeClasses.bg} font-sans`}>
            {/* Left Column: Sketch List */}
            <div className={`w-80 h-full flex flex-col border-r ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                <div className={`p-4 flex justify-between items-center border-b ${themeClasses.border}`}>
                    <h2 className={`text-lg font-bold ${themeClasses.accentText}`}>Sketches</h2>
                    <button onClick={handleCreateSketch} className={`p-2 rounded-md hover:${themeClasses.bgTertiary}`} aria-label="Create new sketch">
                        <PlusIcon className={`w-5 h-5 ${themeClasses.accentText}`} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {sketches.map(sketch => (
                        <div 
                            key={sketch.id} 
                            onClick={() => setSelectedSketchId(sketch.id)} 
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

            {/* Right Column: Editor */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto font-serif">
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
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <LightbulbIcon className={`w-16 h-16 mb-4 ${themeClasses.textSecondary}`} />
                        <h2 className={`text-2xl font-bold ${themeClasses.accentText}`}>Welcome to Demos</h2>
                        <p className={`mt-2 max-w-md ${themeClasses.textSecondary}`}>
                            This is your space for ideas, notes, and short stories. Create a new sketch to get started.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DemosPage;