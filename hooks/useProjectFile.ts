import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectData, FileStatus, SaveStatus } from '../types';
import { get, set, del } from 'idb-keyval';

const PROJECT_DATA_KEY = 'storyverse-project-data';
const FILE_HANDLE_KEY = 'storyverse-file-handle';

const defaultProjectData: ProjectData = {
  settings: {
    theme: 'book',
  },
  novels: [],
  sketches: [],
};

const verifyPermission = async (handle: FileSystemFileHandle, readWrite: boolean) => {
    const options: FileSystemHandlePermissionDescriptor = {};
    if (readWrite) {
        options.mode = 'readwrite';
    }
    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await handle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
};

const processImportedData = (data: ProjectData) => {
    let needsUpdate = false;
    const tempDiv = document.createElement('div');

    data.novels.forEach(novel => {
      if (novel.chapters && Array.isArray(novel.chapters)) {
        novel.chapters.forEach(chapter => {
          const oldWordCount = chapter.wordCount || 0;
          tempDiv.innerHTML = chapter.content || '';
          const text = tempDiv.textContent || "";
          const newWordCount = text.trim().split(/\s+/).filter(Boolean).length;
          if (oldWordCount !== newWordCount) {
            chapter.wordCount = newWordCount;
            needsUpdate = true;
          }
        });
      }
    });
    
    if (!data.sketches) {
      data.sketches = [];
      needsUpdate = true;
    }
    return { data, needsUpdate };
};


export function useProjectFile() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [status, setStatus] = useState<FileStatus>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const hasUnsavedChanges = useRef(false);
  const saveTimeout = useRef<number | null>(null);

  useEffect(() => {
    const init = async () => {
        try {
            // 1. Prioritize loading from a stored file handle for a true offline, local-file experience.
            const handle: FileSystemFileHandle | undefined = await get(FILE_HANDLE_KEY);
            if (handle && await verifyPermission(handle, false)) {
                const file = await handle.getFile();
                const content = await file.text();
                const data = JSON.parse(content);
                processImportedData(data); // Validate and migrate data
                setProjectData(data);
                setFileHandle(handle);
                setStatus('ready');
                console.log("Project loaded from file handle.");
                return;
            }

            // 2. Fallback to loading from IndexedDB if no handle is available or permission is denied.
            const data: ProjectData | undefined = await get(PROJECT_DATA_KEY);
            if (data) {
                const { data: processedData, needsUpdate } = processImportedData(data);
                if (needsUpdate) {
                    await set(PROJECT_DATA_KEY, processedData);
                }
                setProjectData(processedData);
                setStatus('ready');
                console.log("Project loaded from IndexedDB.");
            } else {
                setStatus('welcome');
            }
        } catch (error) {
            console.error('Error during initial load:', error);
            // If loading fails, clear potentially corrupted handles and fall back to welcome screen.
            await del(FILE_HANDLE_KEY);
            setFileHandle(null);
            setStatus('welcome');
        }
    };
    init();
  }, []);
  
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);


  const saveProject = useCallback(async (data: ProjectData) => {
    setSaveStatus('saving');
    try {
        // Always save to IndexedDB as a reliable backup.
        await set(PROJECT_DATA_KEY, data);

        // If a file handle is linked, also save directly to the local file.
        if (fileHandle && await verifyPermission(fileHandle, true)) {
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        }

        hasUnsavedChanges.current = false;
        setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving project:', error);
      setSaveStatus('unsaved');
    }
  }, [fileHandle]);

  useEffect(() => {
    if (status === 'ready' && projectData && hasUnsavedChanges.current) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = window.setTimeout(() => {
        saveProject(projectData);
      }, 1500);
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

  const createProject = useCallback(async () => {
    const theme = projectData?.settings?.theme || 'book';
    const newProjectData = { ...defaultProjectData, settings: { theme } };
    await saveProject(newProjectData);
    setProjectData(newProjectData);
    setStatus('ready');
  }, [projectData, saveProject]);

  const importProject = useCallback(async () => {
      if (!window.showOpenFilePicker) {
          alert('Your browser does not support the File System Access API for direct file linking. Please use a modern browser like Chrome or Edge.');
          return;
      }
      try {
          const [handle] = await window.showOpenFilePicker({
              types: [{ description: 'StoryVerse Project', accept: { 'application/json': ['.json'] } }],
          });
          const file = await handle.getFile();
          const content = await file.text();
          const data: ProjectData = JSON.parse(content);

          if (data && data.settings && Array.isArray(data.novels)) {
              processImportedData(data);
              await set(FILE_HANDLE_KEY, handle);
              setFileHandle(handle);
              await saveProject(data);
              setProjectData(data);
              setStatus('ready');
          } else {
              throw new Error('Invalid project file format.');
          }
      } catch (error) {
          if ((error as DOMException).name !== 'AbortError') {
              console.error('Error importing project file:', error);
              alert('Failed to import file. It may be corrupted or not a valid StoryVerse project file.');
          }
      }
  }, [saveProject]);

  const downloadCopy = useCallback(async () => {
    if (!projectData) return;
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'StoryVerse-Project.json',
                types: [{ description: 'StoryVerse Project', accept: { 'application/json': ['.json'] } }],
            });
            // Link the app to this new file for future saves.
            setFileHandle(handle);
            await set(FILE_HANDLE_KEY, handle);
            await saveProject(projectData); // Save current data to the new file.
        } catch (error) {
            if ((error as DOMException).name !== 'AbortError') {
                 console.error('Failed to save a copy', error);
                 alert('Failed to save project copy.');
            }
        }
    } else {
        // Fallback for older browsers.
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'StoryVerse-Project.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
  }, [projectData, saveProject]);

  const deleteProject = useCallback(async () => {
    setProjectData(null);
    setFileHandle(null);
    await del(PROJECT_DATA_KEY);
    await del(FILE_HANDLE_KEY);
    setStatus('welcome');
  }, []);

  return { 
    projectData, 
    setProjectData: setProjectDataWithSave, 
    status, 
    saveStatus,
    createProject, 
    importProject, 
    downloadCopy, 
    deleteProject,
    saveProject 
  };
}