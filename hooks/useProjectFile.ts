import { useState, useEffect, useCallback, useRef } from 'react';
import { Project, ProjectData, FileStatus, SaveStatus } from '../types';
import { get, set, del } from 'idb-keyval';

const ALL_PROJECTS_KEY = 'storyverse-all-projects';
const ACTIVE_PROJECT_ID_KEY = 'storyverse-active-project-id';

const defaultProjectData: ProjectData = {
  settings: {
    theme: 'book',
  },
  novels: [],
  sketches: [],
};

export function useMultiProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [status, setStatus] = useState<FileStatus>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  const hasUnsavedChanges = useRef(false);
  const saveTimeout = useRef<number | null>(null);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      try {
        const allProjects: Project[] | undefined = await get(ALL_PROJECTS_KEY);
        const savedActiveId: string | undefined = await get(ACTIVE_PROJECT_ID_KEY);

        if (allProjects && allProjects.length > 0) {
          setProjects(allProjects);
          const projectToLoad = allProjects.find(p => p.id === savedActiveId) || allProjects[0];
          setActiveProjectId(projectToLoad.id);
          setProjectData(projectToLoad.data);
          setStatus('ready');
        } else {
          // Backward compatibility: check for old single project data
          const oldData: ProjectData | undefined = await get('storyverse-project-data');
          if (oldData) {
            const newProject: Project = {
              id: crypto.randomUUID(),
              name: 'My StoryVerse Project',
              data: oldData,
            };
            await set(ALL_PROJECTS_KEY, [newProject]);
            await set(ACTIVE_PROJECT_ID_KEY, newProject.id);
            await del('storyverse-project-data'); // Clean up old key
            setProjects([newProject]);
            setActiveProjectId(newProject.id);
            setProjectData(newProject.data);
            setStatus('ready');
          } else {
            setStatus('welcome');
          }
        }
      } catch (error) {
        console.error('Error loading projects from DB:', error);
        setStatus('welcome');
      }
    };
    init();
  }, []);

  // --- Auto-saving Logic ---
  const saveProject = useCallback(async (dataToSave: ProjectData) => {
    if (!activeProjectId) return;

    setSaveStatus('saving');
    try {
      const updatedProjects = projects.map(p =>
        p.id === activeProjectId ? { ...p, data: dataToSave } : p
      );
      await set(ALL_PROJECTS_KEY, updatedProjects);
      setProjects(updatedProjects);
      hasUnsavedChanges.current = false;
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving project to DB:', error);
      setSaveStatus('unsaved');
    }
  }, [activeProjectId, projects]);

  useEffect(() => {
    if (status === 'ready' && projectData && hasUnsavedChanges.current) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = window.setTimeout(() => {
        saveProject(projectData);
      }, 1500); // Debounce save
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [projectData, status, saveProject]);

  const setProjectDataWithSave = (updater: React.SetStateAction<ProjectData | null>) => {
    hasUnsavedChanges.current = true;
    setSaveStatus('unsaved');
    setProjectData(updater);
  };
  
  // --- Project Management Functions ---
  const createProject = useCallback(async (name: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      data: defaultProjectData,
    };
    const newProjectList = [...projects, newProject];
    await set(ALL_PROJECTS_KEY, newProjectList);
    setProjects(newProjectList);
    switchProject(newProject.id);
  }, [projects]);

  const switchProject = useCallback(async (projectId: string) => {
    const projectToLoad = projects.find(p => p.id === projectId);
    if (projectToLoad) {
      await set(ACTIVE_PROJECT_ID_KEY, projectId);
      setActiveProjectId(projectId);
      setProjectData(projectToLoad.data);
      setStatus('ready');
    }
  }, [projects]);

  const importProject = useCallback(async (fileContent: string, name: string) => {
    try {
      const data: ProjectData = JSON.parse(fileContent);
       if (data && data.settings && Array.isArray(data.novels)) {
            const newProject: Project = {
                id: crypto.randomUUID(),
                name,
                data
            };
            const newProjectList = [...projects, newProject];
            await set(ALL_PROJECTS_KEY, newProjectList);
            setProjects(newProjectList);
            switchProject(newProject.id);
       } else {
         throw new Error('Invalid project file format.');
       }
    } catch (error) {
      console.error('Error importing project file:', error);
      alert('Failed to import file. It may be corrupted or not a valid StoryVerse project file.');
    }
  }, [projects, switchProject]);
  
  const deleteProject = useCallback(async (projectId: string) => {
    const newProjectList = projects.filter(p => p.id !== projectId);
    setProjects(newProjectList);
    await set(ALL_PROJECTS_KEY, newProjectList);

    if (activeProjectId === projectId) {
      if (newProjectList.length > 0) {
        switchProject(newProjectList[0].id);
      } else {
        setActiveProjectId(null);
        setProjectData(null);
        setStatus('welcome');
        await del(ACTIVE_PROJECT_ID_KEY);
      }
    }
  }, [projects, activeProjectId, switchProject]);
  
  const renameProject = useCallback(async (projectId: string, newName: string) => {
    const updatedProjects = projects.map(p => 
      p.id === projectId ? { ...p, name: newName } : p
    );
    await set(ALL_PROJECTS_KEY, updatedProjects);
    setProjects(updatedProjects);
  }, [projects]);

  const downloadCopy = useCallback(() => {
    if (!projectData) return;
    try {
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'StoryVerse-Project.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download a copy', error);
      alert('Failed to download project copy.');
    }
  }, [projectData]);

  return {
    projects,
    activeProjectId,
    projectData,
    setProjectData: setProjectDataWithSave,
    status,
    saveStatus,
    createProject,
    importProject,
    switchProject,
    renameProject,
    deleteProject,
    downloadCopy,
    saveProject
  };
}