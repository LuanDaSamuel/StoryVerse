
import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectData, FileStatus, SaveStatus, Theme } from '../types';
import { get, set, del } from 'idb-keyval';

const LOCAL_BACKUP_KEY = 'storyverse-local-backup'; // Used for caching
const PROJECT_FILE_HANDLE_KEY = 'storyverse-project-file-handle'; // Used for the main file

const isFileSystemAccessAPISupported = 'showOpenFilePicker' in window;

const defaultProjectData: ProjectData = {
  settings: {
    theme: 'book',
  },
  novels: [],
  sketches: [],
};

const sanitizeProjectData = (data: any): ProjectData => {
  const sanitized = JSON.parse(JSON.stringify(defaultProjectData));
  if (data?.settings?.theme) {
    sanitized.settings.theme = data.settings.theme as Theme;
  }
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
        ? novel.sketches.map((sketch: any) => ({
            id: sketch.id || crypto.randomUUID(),
            title: sketch.title || "Untitled Sketch",
            content: sketch.content || "",
            tags: Array.isArray(sketch.tags) ? sketch.tags : [],
            createdAt: sketch.createdAt || new Date().toISOString(),
            updatedAt: sketch.updatedAt || new Date().toISOString(),
        }))
        : [],
      createdAt: novel.createdAt || new Date().toISOString(),
    }));
  }
  if (Array.isArray(data?.sketches)) {
    sanitized.sketches = data.sketches.map((sketch: any) => ({
      id: sketch.id || crypto.randomUUID(),
      title: sketch.title || 'Untitled Sketch',
      content: sketch.content || '',
      createdAt: sketch.createdAt || new Date().toISOString(),
      updatedAt: sketch.updatedAt || new Date().toISOString(),
    }));
  }
  return sanitized;
};

async function verifyPermission(handle: FileSystemHandle) {
    const options = { mode: 'readwrite' as const };
    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await handle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
}

export function useProjectFile() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [status, setStatus] = useState<FileStatus>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [projectFileHandle, setProjectFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [projectName, setProjectName] = useState('');
  
  const saveTimeout = useRef<number | null>(null);
  const dataVersion = useRef(0);
  const lastSavedVersion = useRef(0);

  const projectDataRef = useRef(projectData);
  projectDataRef.current = projectData;
  const projectFileHandleRef = useRef(projectFileHandle);
  projectFileHandleRef.current = projectFileHandle;
  const saveStatusRef = useRef(saveStatus);
  saveStatusRef.current = saveStatus;

  useEffect(() => {
    const init = async () => {
      // Don't even try to load from a handle if the API isn't supported.
      if (!isFileSystemAccessAPISupported) {
          setStatus('welcome');
          return;
      }

      try {
        const handle: FileSystemFileHandle | undefined = await get(PROJECT_FILE_HANDLE_KEY);
        if (handle && await verifyPermission(handle)) {
            setProjectFileHandle(handle);
            setProjectName(handle.name);
            const file = await handle.getFile();
            const fileContent = await file.text();
            const rawData = JSON.parse(fileContent);
            const data = sanitizeProjectData(rawData);
            
            projectDataRef.current = data;
            setProjectData(data);
            await set(LOCAL_BACKUP_KEY, data); // Update cache
            setStatus('ready');
        } else {
            // If no handle or permission, clear stored handle and go to welcome
            await del(PROJECT_FILE_HANDLE_KEY);
            setStatus('welcome');
        }
      } catch (error) {
        console.error('Error loading project from file handle:', error);
        // Fallback to welcome screen on any error
        setStatus('welcome');
      }
    };
    init();
  }, []);

  const saveProject = useCallback(async (data: ProjectData, version: number) => {
    setSaveStatus('saving');
    try {
      await set(LOCAL_BACKUP_KEY, data); // Save to cache first for speed and resilience

      if (projectFileHandleRef.current) {
          try {
              const writable = await projectFileHandleRef.current.createWritable();
              await writable.write(JSON.stringify(data, null, 2));
              await writable.close();
          } catch (error) {
              console.error('Saving to project file failed:', error);
              if (error instanceof DOMException && error.name === 'NotAllowedError') {
                  // User revoked permission. Clear handle and treat as closed project.
                  await del(PROJECT_FILE_HANDLE_KEY);
                  setProjectFileHandle(null);
                  setProjectName('');
                  projectDataRef.current = null;
                  setProjectData(null);
                  setStatus('welcome');
                  alert('Permission to save the file was denied. The project has been closed.');
              }
          }
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
        if (projectDataRef.current) {
            saveProject(projectDataRef.current, versionToSave);
        }
      }, 1000);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [projectData, status, saveStatus, saveProject]);

  const setProjectDataWithSave = (updater: React.SetStateAction<ProjectData | null>) => {
    dataVersion.current++;
    setSaveStatus('unsaved');
    const newData = typeof updater === 'function'
        ? (updater as (prevState: ProjectData | null) => ProjectData | null)(projectDataRef.current)
        : updater;
    projectDataRef.current = newData;
    setProjectData(newData);
  };
  
  const saveNow = useCallback(async () => {
    if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
    }
    if (status === 'ready' && projectDataRef.current && saveStatusRef.current === 'unsaved') {
        await saveProject(projectDataRef.current, dataVersion.current);
    }
  }, [status, saveProject]);

  const createProject = useCallback(async () => {
    if (isFileSystemAccessAPISupported) {
        try {
            const newHandle = await window.showSaveFilePicker({
                suggestedName: 'StoryVerse-Project.json',
                types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }],
            });

            const writable = await newHandle.createWritable();
            await writable.write(JSON.stringify(defaultProjectData, null, 2));
            await writable.close();
            
            await set(PROJECT_FILE_HANDLE_KEY, newHandle);
            await set(LOCAL_BACKUP_KEY, defaultProjectData);
            
            setProjectFileHandle(newHandle);
            setProjectName(newHandle.name);
            projectDataRef.current = defaultProjectData;
            setProjectData(defaultProjectData);
            setStatus('ready');
            setSaveStatus('saved');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error('Error creating new project file:', error);
            alert('Failed to create new project file.');
        }
    } else {
        // Fallback: create in memory, user must download to save.
        await del(PROJECT_FILE_HANDLE_KEY);
        await set(LOCAL_BACKUP_KEY, defaultProjectData);
        
        setProjectFileHandle(null);
        setProjectName('Untitled Project.json');
        projectDataRef.current = defaultProjectData;
        setProjectData(defaultProjectData);
        setStatus('ready');
        setSaveStatus('saved');
    }
  }, []);

  const openProject = useCallback(async () => {
    if (isFileSystemAccessAPISupported) {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }],
            });
            const file = await fileHandle.getFile();
            const fileContent = await file.text();
            const rawData = JSON.parse(fileContent);

            if (rawData && rawData.settings && Array.isArray(rawData.novels)) {
                const data = sanitizeProjectData(rawData);
                await set(PROJECT_FILE_HANDLE_KEY, fileHandle);
                await set(LOCAL_BACKUP_KEY, data);

                setProjectFileHandle(fileHandle);
                setProjectName(fileHandle.name);
                projectDataRef.current = data;
                setProjectData(data);
                setStatus('ready');
                setSaveStatus('saved');
            } else {
                throw new Error('Invalid project file format.');
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error('Error opening project file:', error);
            alert('Failed to open file.');
        }
    } else {
        // Fallback for browsers without File System Access API
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const fileContent = await file.text();
                const rawData = JSON.parse(fileContent);
                if (rawData && rawData.settings && Array.isArray(rawData.novels)) {
                    const data = sanitizeProjectData(rawData);
                    await del(PROJECT_FILE_HANDLE_KEY); 
                    await set(LOCAL_BACKUP_KEY, data);

                    setProjectFileHandle(null);
                    setProjectName(file.name);
                    projectDataRef.current = data;
                    setProjectData(data);
                    setStatus('ready');
                    setSaveStatus('saved');
                } else {
                    throw new Error('Invalid project file format.');
                }
            } catch (error) {
                console.error('Error opening project file from input:', error);
                alert('Failed to open file.');
            }
        };
        input.click();
    }
  }, []);
  
  const downloadProject = useCallback(async () => {
    await saveNow();
    const dataToSave = projectDataRef.current;
    if (!dataToSave) return;

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const suggestedName = `StoryVerse-Backup-${timestamp}.json`;

    if (isFileSystemAccessAPISupported) {
        try {
            const newHandle = await window.showSaveFilePicker({
                suggestedName,
                types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }],
            });
            const writable = await newHandle.createWritable();
            await writable.write(JSON.stringify(dataToSave, null, 2));
            await writable.close();
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error('Error saving project file:', error);
            alert('Failed to save file.');
        }
    } else {
        const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
  }, [saveNow, projectName]);

  const closeProject = useCallback(async () => {
    await saveNow();
    await del(LOCAL_BACKUP_KEY);
    await del(PROJECT_FILE_HANDLE_KEY);
    projectDataRef.current = null;
    setProjectData(null);
    setProjectFileHandle(null);
    setProjectName('');
    setStatus('welcome');
  }, [saveNow]);
  
  return { 
    projectData, 
    setProjectData: setProjectDataWithSave, 
    status, 
    saveStatus,
    projectName,
    createProject, 
    openProject, 
    downloadProject, 
    closeProject,
  };
}
