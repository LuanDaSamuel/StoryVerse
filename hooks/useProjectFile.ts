

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

/**
 * Wraps a promise with a timeout. If the promise does not resolve or reject
 * within the given timeframe, it will be rejected with a timeout error.
 * This is crucial for file system operations that might hang if a device is disconnected.
 */
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(errorMessage));
        }, ms);

        promise.then(
            (res) => {
                clearTimeout(timeoutId);
                resolve(res);
            },
            (err) => {
                clearTimeout(timeoutId);
                reject(err);
            }
        );
    });
};

const verifyPermission = async (handle: FileSystemFileHandle): Promise<boolean> => {
    const options = { mode: 'readwrite' as const };
    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await handle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
};

export function useProjectFile() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [status, setStatus] = useState<FileStatus>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  
  const hasUnsavedChanges = useRef(false);
  const saveTimeout = useRef<number | null>(null);
  const dataVersion = useRef(0);
  const lastSavedVersion = useRef(0);
  
  const projectDataRef = useRef(projectData);


  useEffect(() => {
    const init = async () => {
      try {
        const handle: FileSystemFileHandle | undefined = await get(FILE_HANDLE_KEY);
        if (handle) {
            // The user may have a file handle for a removable drive that's not currently connected.
            // These file system operations can hang, so we use a timeout to prevent the app from freezing.
            const TIMEOUT_MS = 3000; // 3 seconds is a reasonable wait.
            
            const hasPermission = await withTimeout(
                verifyPermission(handle),
                TIMEOUT_MS,
                'Permission check timed out. The device may be disconnected.'
            );

            if (hasPermission) {
                const file = await withTimeout(
                    handle.getFile(),
                    TIMEOUT_MS,
                    'File access timed out. The device may be disconnected.'
                );
                const fileContent = await file.text();
                const data = JSON.parse(fileContent);
                
                projectDataRef.current = data;
                setProjectData(data);
                setFileHandle(handle);
                setStatus('ready');
                return;
            }
        }
        // If no handle, or permission is denied or timed out, go to welcome screen.
        setStatus('welcome');
      } catch (error) {
        console.warn('Could not load project from file handle. It might be invalid or disconnected.', error);
        // If anything fails, the handle is likely invalid. Clear it and go to the welcome screen.
        await del(FILE_HANDLE_KEY);
        setStatus('welcome');
      }
    };
    init();
  }, []);

  const unlinkFile = useCallback(async () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    hasUnsavedChanges.current = false;
    
    await del(FILE_HANDLE_KEY);
    await del(PROJECT_DATA_KEY);
    
    projectDataRef.current = null;
    setProjectData(null);
    setFileHandle(null);
    setStatus('welcome');
  }, []);

  const saveProject = useCallback(async (data: ProjectData, version: number) => {
    setSaveStatus('saving');
    try {
      await set(PROJECT_DATA_KEY, data); // Always save backup to IndexedDB

      if (fileHandle) {
          const hasPermission = await verifyPermission(fileHandle);
          if (!hasPermission) {
              // If permission was revoked, we can't save to the file.
              // The user will see 'unsaved' status and can use 'Save As...' to re-establish a file handle.
              console.warn('File system permission denied. Saving to local backup only.');
              setSaveStatus('unsaved');
              return;
          }
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
      }

      lastSavedVersion.current = version;
      
      // Only mark as saved if this was the most recent version to be queued.
      if (dataVersion.current === lastSavedVersion.current) {
        hasUnsavedChanges.current = false;
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        console.warn('Project file not found. Unlinking and returning to welcome screen.');
        alert('The project file could not be found. It may have been moved or deleted. The application will now return to the welcome screen.');
        unlinkFile();
      } else {
        setSaveStatus('unsaved');
      }
    }
  }, [fileHandle, unlinkFile]);
  
  const forceSave = useCallback(async () => {
    if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
    }
    if (hasUnsavedChanges.current && projectDataRef.current) {
        await saveProject(projectDataRef.current, dataVersion.current);
    }
  }, [saveProject]);
  
  useEffect(() => {
    if (status === 'ready' && projectData && hasUnsavedChanges.current) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      
      const versionToSave = dataVersion.current;
      saveTimeout.current = window.setTimeout(() => {
        if (projectDataRef.current) {
            saveProject(projectDataRef.current, versionToSave);
        }
      }, 1000); // Auto-save after 1 second of inactivity
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [projectData, status, saveProject]);

  const setProjectDataWithSave = (updater: React.SetStateAction<ProjectData | null>) => {
    dataVersion.current++;
    hasUnsavedChanges.current = true;
    setSaveStatus('unsaved');

    const newData = typeof updater === 'function'
        ? (updater as (prevState: ProjectData | null) => ProjectData | null)(projectDataRef.current)
        : updater;
    projectDataRef.current = newData;
    setProjectData(updater);
  };

  const createProject = useCallback(async () => {
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: 'StoryVerse-Project.json',
            types: [{
                description: 'StoryVerse Project Files',
                accept: { 'application/json': ['.json'] },
            }],
        });

        const theme = projectData?.settings?.theme || 'book';
        const newProjectData = { ...defaultProjectData, settings: { theme } };

        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(newProjectData, null, 2));
        await writable.close();

        await set(FILE_HANDLE_KEY, handle);
        await set(PROJECT_DATA_KEY, newProjectData);

        projectDataRef.current = newProjectData;
        setProjectData(newProjectData);
        setFileHandle(handle);
        setStatus('ready');
        setSaveStatus('saved');
        hasUnsavedChanges.current = false;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.log('User cancelled the save file picker.');
        } else {
            console.error('Error creating project file:', error);
            alert('Could not create project file.');
        }
    }
  }, [projectData?.settings?.theme]);

  const openProject = useCallback(async () => {
    try {
        const [handle] = await window.showOpenFilePicker({
            types: [{
                description: 'StoryVerse Project Files',
                accept: { 'application/json': ['.json'] },
            }],
            multiple: false,
        });

        const file = await handle.getFile();
        let fileContent = await file.text();
        let data: ProjectData;
        
        if (!fileContent.trim()) {
            data = { ...defaultProjectData };
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        } else {
            data = JSON.parse(fileContent);
        }

        if (data && data.settings && Array.isArray(data.novels)) {
            await set(FILE_HANDLE_KEY, handle);
            await set(PROJECT_DATA_KEY, data);

            projectDataRef.current = data;
            setProjectData(data);
            setFileHandle(handle);
            setStatus('ready');
            setSaveStatus('saved');
            hasUnsavedChanges.current = false;
        } else {
            throw new Error('Invalid project file format.');
        }
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.log('User cancelled the open file picker.');
        } else {
            console.error('Error opening project file:', error);
            alert('Failed to open file. It may be corrupted or not a valid StoryVerse project file.');
        }
    }
  }, []);

  const saveProjectAs = useCallback(async () => {
    await forceSave();
    const dataToSave = projectDataRef.current;
    if (!dataToSave) return;

    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: fileHandle?.name || 'StoryVerse-Project.json',
            types: [{
                description: 'StoryVerse Project Files',
                accept: { 'application/json': ['.json'] },
            }],
        });

        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(dataToSave, null, 2));
        await writable.close();

        await set(FILE_HANDLE_KEY, handle);
        setFileHandle(handle);
        
        hasUnsavedChanges.current = false;
        setSaveStatus('saved');
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.log('User cancelled the save file picker.');
        } else {
            console.error('Failed to save project file', error);
            alert('Failed to save project file.');
        }
    }
  }, [forceSave, fileHandle]);

  return { 
    projectData, 
    setProjectData: setProjectDataWithSave, 
    status, 
    saveStatus,
    createProject, 
    openProject, 
    saveProjectAs, 
    unlinkFile,
    saveProject 
  };
}