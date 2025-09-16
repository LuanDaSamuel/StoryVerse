
import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectData, StorageStatus, SaveStatus, Theme, StoryIdeaStatus, NovelSketch } from '../types';
import { get, set, del } from 'idb-keyval';

// --- Constants ---
const LOCAL_BACKUP_KEY = 'storyverse-local-backup';
const PROJECT_FILE_HANDLE_KEY = 'storyverse-project-file-handle';
const isFileSystemAccessAPISupported = 'showOpenFilePicker' in window;

const defaultProjectData: ProjectData = {
  settings: { theme: 'book' },
  novels: [],
  storyIdeas: [],
};

const sanitizeProjectData = (data: any): ProjectData => {
  const sanitized = JSON.parse(JSON.stringify(defaultProjectData));
  if (data?.settings?.theme) sanitized.settings.theme = data.settings.theme as Theme;
  if (Array.isArray(data?.novels)) {
    sanitized.novels = data.novels.map((novel: any) => ({
      id: novel.id || crypto.randomUUID(),
      title: novel.title || 'Untitled Novel',
      description: novel.description || '',
      coverImage: novel.coverImage,
      tags: Array.isArray(novel.tags) ? novel.tags : [],
      chapters: Array.isArray(novel.chapters)
        ? novel.chapters.map((chapter: any) => ({
            id: chapter.id || crypto.randomUUID(),
            title: chapter.title || 'Untitled Chapter',
            content: chapter.content || '',
            wordCount: chapter.wordCount || 0,
            createdAt: chapter.createdAt || new Date().toISOString(),
            updatedAt: chapter.updatedAt || new Date().toISOString(),
            history: Array.isArray(chapter.history) ? chapter.history : [],
          }))
        : [],
      sketches: Array.isArray(novel.sketches)
        ? novel.sketches.map((sketch: any): NovelSketch => ({
            id: sketch.id || crypto.randomUUID(),
            title: sketch.title || 'Untitled Sketch',
            content: sketch.content || '',
            tags: Array.isArray(sketch.tags) ? sketch.tags : [],
            createdAt: sketch.createdAt || new Date().toISOString(),
            updatedAt: sketch.updatedAt || new Date().toISOString(),
          }))
        : [],
      createdAt: novel.createdAt || new Date().toISOString(),
    }));
  }
  if (Array.isArray(data?.storyIdeas)) {
    sanitized.storyIdeas = data.storyIdeas.map((idea: any) => {
      const validStatuses: StoryIdeaStatus[] = ['Seedling', 'Developing', 'Archived'];
      const status = validStatuses.includes(idea.status) ? idea.status : 'Seedling';
      return {
        id: idea.id || crypto.randomUUID(),
        title: idea.title || 'Untitled Idea',
        synopsis: idea.synopsis || '',
        wordCount: idea.wordCount || 0,
        tags: Array.isArray(idea.tags) ? idea.tags : [],
        status: status,
        createdAt: idea.createdAt || new Date().toISOString(),
        updatedAt: idea.updatedAt || new Date().toISOString(),
      };
    });
  }
  return sanitized;
};

async function verifyPermission(handle: FileSystemHandle) {
    const options = { mode: 'readwrite' as const };
    if ((await handle.queryPermission(options)) === 'granted') return true;
    if ((await handle.requestPermission(options)) === 'granted') return true;
    return false;
}

export function useProjectFile() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [status, setStatus] = useState<StorageStatus>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [projectName, setProjectName] = useState('');
  
  const saveTimeout = useRef<number | null>(null);
  const dataVersion = useRef(0);
  const lastSavedVersion = useRef(0);
  
  const projectFileHandleRef = useRef<FileSystemFileHandle | null>(null);

  const projectDataRef = useRef(projectData);
  projectDataRef.current = projectData;

  const saveProject = useCallback(async (data: ProjectData, version: number) => {
    setSaveStatus('saving');
    try {
        await set(LOCAL_BACKUP_KEY, data);

        if (projectFileHandleRef.current) {
            const writable = await projectFileHandleRef.current.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        }
        
        lastSavedVersion.current = version;
        if (dataVersion.current === lastSavedVersion.current) {
            setSaveStatus('saved');
        }
    } catch (error) {
        console.error('Error saving project:', error);
        setSaveStatus('unsaved');
    }
  }, []);

  useEffect(() => {
    if (status === 'ready' && projectData && saveStatus === 'unsaved') {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      const versionToSave = dataVersion.current;
      saveTimeout.current = window.setTimeout(() => {
        if (projectDataRef.current) saveProject(projectDataRef.current, versionToSave);
      }, 1000);
    }
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [projectData, status, saveStatus, saveProject]);

  const setProjectDataWithSave = (updater: React.SetStateAction<ProjectData | null>) => {
    dataVersion.current++;
    setSaveStatus('unsaved');
    const newData = typeof updater === 'function' ? (updater as (prevState: ProjectData | null) => ProjectData | null)(projectDataRef.current) : updater;
    projectDataRef.current = newData;
    setProjectData(newData);
  };
  
  const saveNow = useCallback(async () => {
    if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
    }
    if (status === 'ready' && projectDataRef.current && saveStatus !== 'saved') {
        await saveProject(projectDataRef.current, dataVersion.current);
    }
  }, [status, saveStatus, saveProject]);

  // --- Initialization ---
  useEffect(() => {
    const initLocal = async () => {
        if (!isFileSystemAccessAPISupported) {
          // Check for a local backup if FS API is not supported.
          const backup: ProjectData | undefined = await get(LOCAL_BACKUP_KEY);
          if (backup) {
              setProjectData(sanitizeProjectData(backup));
              setProjectName('Local Backup');
              setStatus('ready');
          } else {
              setStatus('welcome');
          }
          return;
        }
        try {
            const handle: FileSystemFileHandle | undefined = await get(PROJECT_FILE_HANDLE_KEY);
            if (handle && await verifyPermission(handle)) {
                projectFileHandleRef.current = handle;
                setProjectName(handle.name);
                const file = await handle.getFile();
                const data = sanitizeProjectData(JSON.parse(await file.text()));
                setProjectData(data);
                setStatus('ready');
            } else {
                setStatus('welcome');
            }
        } catch (error) {
            console.error('Initial local file load error:', error);
            setStatus('welcome');
        }
    };
    initLocal();
  }, []);

  // --- Local File Logic ---
  const createLocalProject = useCallback(async () => {
    if (isFileSystemAccessAPISupported) {
        try {
            const handle = await window.showSaveFilePicker({ suggestedName: 'StoryVerse-Project.json', types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(defaultProjectData, null, 2));
            await writable.close();
            await set(PROJECT_FILE_HANDLE_KEY, handle);
            projectFileHandleRef.current = handle;
            setProjectName(handle.name);
            setProjectData(defaultProjectData);
            setStatus('ready');
            return;
        } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
    }
    // Fallback for non-FS API browsers
    alert("Your browser doesn't support the File System Access API. Using a temporary in-browser project. Please download to save your work.");
    setProjectName('Untitled Project.json');
    setProjectData(defaultProjectData);
    setStatus('ready');
  }, []);

  const openLocalProject = useCallback(async () => {
    try {
        const [handle] = await window.showOpenFilePicker({ types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
        const file = await handle.getFile();
        const data = sanitizeProjectData(JSON.parse(await file.text()));
        await set(PROJECT_FILE_HANDLE_KEY, handle);
        projectFileHandleRef.current = handle;
        setProjectName(handle.name);
        setProjectData(data);
        setStatus('ready');
    } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; alert('Failed to open file.'); }
  }, []);
  
  const downloadProject = useCallback(async () => {
    await saveNow();
    if (!projectDataRef.current) return;
    const blob = new Blob([JSON.stringify(projectDataRef.current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = projectName || 'StoryVerse-Backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [saveNow, projectName]);

  const closeProject = useCallback(async () => {
    await saveNow();
    // Clear local handle
    await del(PROJECT_FILE_HANDLE_KEY);
    projectFileHandleRef.current = null;
    // Reset app state
    setProjectData(null);
    setProjectName('');
    setStatus('welcome');
  }, [saveNow]);
  
  return { 
    projectData, 
    setProjectData: setProjectDataWithSave, 
    status, 
    saveStatus,
    projectName,
    createLocalProject, 
    openLocalProject, 
    downloadProject, 
    closeProject,
  };
}
