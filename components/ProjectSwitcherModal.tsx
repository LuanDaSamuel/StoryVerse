import React, { useState, useContext, useRef } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { CloseIcon, PlusIcon, UploadIcon, SettingsIcon, TrashIcon } from './Icons';
import { enhancePlainText } from '../constants';
import SettingsModal from './SettingsModal';
import ConfirmModal from './ConfirmModal';

interface ProjectSwitcherModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProjectSwitcherModal: React.FC<ProjectSwitcherModalProps> = ({ isOpen, onClose }) => {
    const { 
        projects, 
        activeProjectId,
        switchProject,
        createProject,
        importProject,
        deleteProject,
        renameProject,
        themeClasses,
    } = useContext(ProjectContext);
    
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [deletingProject, setDeletingProject] = useState<{id: string, name: string} | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;
    
    const handleCreate = async () => {
        if (newProjectName.trim()) {
            await createProject(newProjectName.trim());
            setNewProjectName('');
            setIsCreating(false);
        }
    };
    
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            const name = file.name.replace(/\.json$/, '');
            await importProject(content, name);
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
        onClose();
    };

    const handleSwitch = (projectId: string) => {
        if (projectId !== activeProjectId) {
            switchProject(projectId);
        }
        onClose();
    };
    
    const startEditing = (project: {id: string; name: string}) => {
        setEditingProjectId(project.id);
        setEditingName(project.name);
    };

    const handleRename = async () => {
        if (editingProjectId && editingName.trim()) {
            await renameProject(editingProjectId, editingName.trim());
            setEditingProjectId(null);
            setEditingName('');
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity font-sans" onClick={onClose}>
                <div 
                    className={`p-6 rounded-lg shadow-2xl w-full max-w-2xl m-4 ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border} flex flex-col max-h-[80vh]`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <h2 className="text-2xl font-bold">Projects</h2>
                        <div className="flex items-center space-x-2">
                           <button onClick={() => setIsSettingsOpen(true)} className={`p-2 rounded-full hover:${themeClasses.bgTertiary}`} aria-label="Settings">
                                <SettingsIcon className="w-6 h-6" />
                            </button>
                            <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`} aria-label="Close">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3">
                        {projects.map(p => (
                            <div 
                                key={p.id} 
                                className={`group p-3 rounded-lg flex items-center justify-between ${p.id === activeProjectId ? themeClasses.bgTertiary : `hover:${themeClasses.bgTertiary}`}`}
                            >
                                {editingProjectId === p.id ? (
                                    <input 
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onBlur={handleRename}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                        className={`flex-grow bg-transparent font-semibold border-b-2 ${themeClasses.accentBorder} outline-none`}
                                        autoFocus
                                    />
                                ) : (
                                    <button onClick={() => handleSwitch(p.id)} className="flex-grow text-left truncate">
                                        <span className="font-semibold">{enhancePlainText(p.name)}</span>
                                    </button>
                                )}
                                
                                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEditing(p)} className={`text-sm font-semibold hover:${themeClasses.text}`}>Rename</button>
                                    <button onClick={() => setDeletingProject(p)} className="p-2 -mr-2 rounded-full text-red-500 hover:bg-red-500/10">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={`mt-4 pt-4 border-t ${themeClasses.border} flex-shrink-0`}>
                        {isCreating ? (
                             <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="New project name..."
                                    className={`w-full px-3 py-2 rounded-md ${themeClasses.input} border ${themeClasses.border}`}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                />
                                <button onClick={handleCreate} className={`px-4 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}>Create</button>
                                <button onClick={() => setIsCreating(false)} className={`px-4 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} hover:opacity-80`}>Cancel</button>
                             </div>
                        ) : (
                            <div className="flex space-x-4">
                                <button onClick={() => setIsCreating(true)} className={`w-full flex items-center justify-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}>
                                    <PlusIcon className="w-5 h-5"/>
                                    <span>New Project</span>
                                </button>
                                <input type="file" ref={importFileRef} onChange={handleImport} className="hidden" accept=".json,application/json" />
                                <button onClick={() => importFileRef.current?.click()} className={`w-full flex items-center justify-center space-x-2 px-4 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}>
                                    <UploadIcon className="w-5 h-5"/>
                                    <span>Import Project</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            
            <ConfirmModal
                isOpen={!!deletingProject}
                onClose={() => setDeletingProject(null)}
                onConfirm={() => {
                    if (deletingProject) {
                        deleteProject(deletingProject.id);
                        if (projects.length <= 1) onClose(); // Close switcher if it was the last project
                    }
                }}
                title={`Delete "${deletingProject?.name}"?`}
                message="Are you sure you want to delete this project and all its content? This action cannot be undone."
            />
        </>
    );
};

export default ProjectSwitcherModal;