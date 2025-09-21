import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectData, StorageStatus, Theme, StoryIdeaStatus, NovelSketch, UserProfile, SaveStatus } from '../types';
import { get, set, del } from 'idb-keyval';
import { useProjectStorage } from './useProjectStorage';

// --- Constants ---
const LOCAL_BACKUP_KEY = 'storyverse-local-backup';
const isFileSystemAccessAPISupported = 'showOpenFilePicker' in window;

const defaultProjectData: ProjectData = {
  settings: { theme: 'book', baseFontSize: 18 },
  novels: [],
  storyIdeas: [],
};

// --- Helper Functions ---
const sanitizeProjectData = (data: any): ProjectData => {
  // Deep clone the default structure to avoid mutations
  const sanitized = JSON.parse(JSON.stringify(defaultProjectData));
  
  // Safely merge settings
  if (data?.settings) {
    if (['dark', 'book'].includes(data.settings.theme)) {
      sanitized.settings.theme = data.settings.theme as Theme;
    }
    if (typeof data.settings.baseFontSize === 'number') {
      sanitized.settings.baseFontSize = data.settings.baseFontSize;
    }
  }

  // Safely merge novels and their nested structures
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
            wordCount: typeof chapter.wordCount === 'number' ? chapter.wordCount : 0,
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

  // Safely merge story ideas
  if (Array.isArray(data?.storyIdeas)) {
    sanitized.storyIdeas = data.storyIdeas.map((idea: any) => {
      const validStatuses: StoryIdeaStatus[] = ['Seedling', 'Developing', 'Archived'];
      const status = validStatuses.includes(idea.status) ? idea.status : 'Seedling';
      return {
        id: idea.id || crypto.randomUUID(),
        title: idea.title || 'Untitled Idea',
        synopsis: idea.synopsis || '',
        wordCount: typeof idea.wordCount === 'number' ? idea.wordCount : 0,
        tags: Array.isArray(idea.tags) ? idea.tags : [],
        status: status,
        createdAt: idea.createdAt || new Date().toISOString(),
        updatedAt: idea.updatedAt || new Date().toISOString(),
      };
    });
  }
  return sanitized;
};


export function useProject() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [status, setStatus] = useState<StorageStatus>('loading');
  const [projectName, setProjectName] = useState('');
  const [storageMode, setStorageMode] = useState<'local' | 'drive' | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const saveStatusRef = useRef(saveStatus);
  useEffect(() => {
      saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  const isInitialLoadRef = useRef(true);
  const isDirtyRef = useRef(false);
  const isSavingRef = useRef(false);
  const projectDataRef = useRef(projectData);
  projectDataRef.current = projectData;

  const storage = useProjectStorage();
  const saveProjectRef = useRef<() => Promise<void>>(async () => {});
  const saveTimeoutRef = useRef<number | null>(null);

  const saveProject = useCallback(async () => {
    // Guard against concurrent saves or saving when there's nothing to save.
    if (isSavingRef.current || !isDirtyRef.current) {
      return;
    }

    isSavingRef.current = true;
    const dataToSave = projectDataRef.current;
    
    setSaveStatus('saving');

    try {
      if (!dataToSave) throw new Error("No project data to save.");

      if (storageMode === 'drive') {
        await storage.saveToDrive(dataToSave);
      } else if (storageMode === 'local') {
        await set(LOCAL_BACKUP_KEY, dataToSave);
        await storage.saveToFileHandle(dataToSave);
      }
      
      // If no new changes occurred during the save, mark as clean and saved.
      // We check isDirtyRef again in case a new change came in during the await.
      if (!isDirtyRef.current) {
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error(`Error saving project to ${storageMode}:`, error);
      // On failure, the data is still dirty.
      isDirtyRef.current = true;
      setSaveStatus('error');
    } finally {
      isSavingRef.current = false;
      
      // If new changes came in while saving, isDirtyRef will be true.
      // The `setProjectDataAndMarkDirty` function will have already scheduled
      // a new debounced save. We don't need to do anything here, preventing
      // an immediate re-save and respecting the user's typing flow.
    }
  }, [storage, storageMode]);

  // Keep the ref updated with the latest version of the save function
  useEffect(() => {
    saveProjectRef.current = saveProject;
  }, [saveProject]);

  const setProjectDataAndMarkDirty = useCallback((updater: React.SetStateAction<ProjectData | null>) => {
    setProjectData(prevData => {
        const newData = typeof updater === 'function' ? updater(prevData) : updater;
        if (JSON.stringify(newData) !== JSON.stringify(prevData)) {
            isDirtyRef.current = true;
            
            // Immediately show "Unsaved" to give instant feedback.
            setSaveStatus('unsaved');

            // Clear any existing timer to reset the debounce period.
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set a new timer to save after 1 second of inactivity.
            saveTimeoutRef.current = window.setTimeout(() => {
                saveProjectRef.current?.();
            }, 1000); // 1-second delay
        }
        return newData;
    });
  }, []);

  // Effect to revert 'saved' status to 'idle'
  useEffect(() => {
      if (saveStatus === 'saved') {
          // Once saved, we can consider the content clean.
          isDirtyRef.current = false;
          const timeoutId = setTimeout(() => setSaveStatus('idle'), 500);
          return () => clearTimeout(timeoutId);
      }
  }, [saveStatus]);
    
  const flushChanges = useCallback(async () => {
    // This function ensures all pending changes are saved before an action like closing or downloading.
    
    // Cancel any scheduled debounced save.
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
  
    // If a save isn't in progress but there are pending changes, start one immediately.
    if (!isSavingRef.current && isDirtyRef.current) {
      await saveProjectRef.current?.();
    }
  
    // Wait for the save we just kicked off (if any) to complete.
    while (isSavingRef.current) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, []);

    // Save on visibility change (e.g., switching tabs)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushChanges();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [flushChanges]);

    // Warn user on closing tab if data is at risk.
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            // The primary condition for showing a warning is if there are unsaved changes (`isDirtyRef.current`)
            // or if a save has explicitly failed (`saveStatusRef.current === 'error'`).
            // The `isDirtyRef` flag remains true during a save operation, which is correct because
            // the data is not yet safely persisted. This covers both the 'unsaved' and 'saving' states.
            if (isDirtyRef.current || saveStatusRef.current === 'error') {
                const message = "You have unsaved changes. Are you sure you want to leave?";
                event.preventDefault();
                event.returnValue = message;
                // The 'visibilitychange' event handler is the more reliable way to save on exit.
                // A best-effort save attempt here is unreliable in modern browsers. The primary
                // purpose of this handler is to warn the user, giving them a chance to cancel the exit.
                return message;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

  const resetState = useCallback(() => {
    setProjectData(null);
    setProjectName('');
    setStorageMode(null);
    setUserProfile(null);
    setSaveStatus('idle');
    isDirtyRef.current = false;
  }, []);
  
  const signOut = useCallback(async () => {
    setStatus('loading');
    await flushChanges();
    await storage.signOut();
    resetState();
    setStatus('welcome');
  }, [flushChanges, storage, resetState]);
  
  const handleDriveProject = (driveProject: { name: string, data: any } | null) => {
    if (driveProject) {
        setProjectData(sanitizeProjectData(driveProject.data));
        setProjectName(driveProject.name);
        setStatus('ready');
    } else {
        setStatus('drive-no-project');
    }
  };

  const signInWithGoogle = useCallback(async () => {
    setStatus('loading');
    try {
        const profile = await storage.signIn();
        setUserProfile(profile);
        setStorageMode('drive');
        
        const localData = await getLocalProjectData();
        const driveProject = await storage.loadFromDrive();

        if (driveProject && localData) {
            setProjectData(sanitizeProjectData(localData.data)); 
            setProjectName(localData.name);
            setStatus('drive-conflict');
        } else if (driveProject) {
            handleDriveProject(driveProject);
        } else if (localData) {
            setProjectData(sanitizeProjectData(localData.data));
            setProjectName(localData.name);
            await storage.createOnDrive(localData.data);
            setStatus('ready');
        } else {
            setStatus('drive-no-project');
        }
    } catch (error) {
        console.error("Sign in failed:", error);
        await storage.signOut();
        resetState();
        setStatus('welcome');
    }
  }, [storage, resetState]);
  
  const createProjectOnDrive = useCallback(async () => {
    setStatus('loading');
    try {
        const { name } = await storage.createOnDrive(defaultProjectData);
        setProjectName(name);
        setProjectData(defaultProjectData);
        setStatus('ready');
    } catch (error) {
        alert("Failed to create project on Google Drive.");
        await signOut();
    }
  }, [storage, signOut]);

    const getLocalProjectData = useCallback(async (): Promise<{ name: string; data: ProjectData } | null> => {
        if (isFileSystemAccessAPISupported) {
            const handle = await storage.getHandleFromIdb();
            if (handle) {
                const fileData = await storage.loadFromFileHandle(handle);
                if (fileData) return fileData;
            }
        }
        const backup = await get<ProjectData>(LOCAL_BACKUP_KEY);
        if (backup) return { name: 'Local Backup', data: backup };
        return null;
    }, [storage]);

  const checkForRecentLocalProject = useCallback(async () => {
    const localData = await getLocalProjectData();
    if (localData) {
        setProjectData(sanitizeProjectData(localData.data));
        setProjectName(localData.name);
        setStatus('ready');
        setStorageMode('local');
        return true;
    }
    return false;
  }, [storage, getLocalProjectData]);

  useEffect(() => {
    if (!isInitialLoadRef.current) return;

    const initializeApp = async () => {
        try {
            const profile = await storage.initAndRestoreSession();
            if (profile) {
                console.log("Restored Google session.");
                setUserProfile(profile);
                setStorageMode('drive');
                
                const localData = await getLocalProjectData();
                const driveProject = await storage.loadFromDrive();

                if (driveProject && localData) {
                    setProjectData(sanitizeProjectData(localData.data));
                    setProjectName(localData.name);
                    setStatus('drive-conflict');
                } else if (driveProject) {
                    handleDriveProject(driveProject);
                } else {
                    setStatus('drive-no-project');
                }
            } else {
                console.log("No active Google session. Checking for local project.");
                const hasLocal = await checkForRecentLocalProject();
                if (!hasLocal) {
                    console.log("No local project found. Displaying welcome screen.");
                    setStatus('welcome');
                }
            }
        } catch (error: any) {
            console.error("Initialization failed:", error);
            alert(`There was a problem initializing the application:\n\n${error.message}\n\nPlease try again.`);
            setStatus('welcome');
        }
    };
    initializeApp();
    isInitialLoadRef.current = false;
  }, [storage, checkForRecentLocalProject, getLocalProjectData]);
  
  const openLocalProject = useCallback(async () => {
    if (!isFileSystemAccessAPISupported) {
        alert("Your browser doesn't support the File System Access API, which is required for local file projects.");
        return;
    }
    setStatus('loading');
    try {
        const [handle] = await window.showOpenFilePicker({ types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
        const fileData = await storage.loadFromFileHandle(handle);
        if (fileData) {
            await storage.saveHandleToIdb(handle);
            setProjectName(fileData.name);
            setProjectData(sanitizeProjectData(fileData.data));
            setStorageMode('local');
            setStatus('ready');
        } else {
            alert('Permission to read the file was denied.');
            setStatus('welcome');
        }
    } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Failed to open file:', error);
          alert('Failed to open or read the selected file.');
        }
        setStatus('welcome');
    }
  }, [storage]);
  
  const createLocalProject = useCallback(async () => {
    if (!isFileSystemAccessAPISupported) {
        alert("Your browser doesn't support the File System Access API, which is required for local file projects.");
        return;
    }
    setStatus('loading');
    try {
        const handle = await window.showSaveFilePicker({ suggestedName: 'StoryVerse-Project.json', types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
        await storage.saveHandleToIdb(handle);
        setProjectName(handle.name);
        setProjectData(defaultProjectData);
        await storage.saveToFileHandle(defaultProjectData);
        setStorageMode('local');
        setStatus('ready');
    } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
            console.error('Error creating local project:', error);
            alert('Could not create the project file.');
        }
        setStatus('welcome');
    }
  }, [storage]);
  
  const closeProject = useCallback(async () => {
    await flushChanges();

    if (storageMode === 'local') {
        await storage.clearHandleFromIdb();
        await del(LOCAL_BACKUP_KEY);
    }
    resetState();
    setStatus('welcome');
  }, [flushChanges, storageMode, storage, resetState]);
  
  const downloadProject = useCallback(async () => {
    await flushChanges();

    if (!projectDataRef.current) return;
    const blob = new Blob([JSON.stringify(projectDataRef.current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = projectName || 'StoryVerse-Backup.json';
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }, [flushChanges, projectName]);

  const uploadProjectToDrive = useCallback(async () => {
        if (!projectDataRef.current) return;
        setStatus('loading');
        try {
            await storage.createOnDrive(projectDataRef.current);
            setStatus('ready');
        } catch (error) {
            alert("Failed to upload project to Google Drive.");
            setStatus('drive-no-project');
        }
    }, [storage]);

    const overwriteDriveProject = useCallback(async () => {
        if (!projectDataRef.current) return;
        setStatus('loading');
        await storage.saveToDrive(projectDataRef.current);
        await storage.clearHandleFromIdb();
        await del(LOCAL_BACKUP_KEY);
        setStatus('ready');
    }, [storage]);

    const loadDriveProjectAndDiscardLocal = useCallback(async () => {
        setStatus('loading');
        const driveProject = await storage.loadFromDrive();
        if (driveProject) {
            handleDriveProject(driveProject);
            await storage.clearHandleFromIdb();
            await del(LOCAL_BACKUP_KEY);
        } else {
            setStatus('drive-no-project');
        }
    }, [storage]);

  return { 
    projectData, 
    setProjectData: setProjectDataAndMarkDirty, 
    status, 
    projectName,
    storageMode,
    userProfile,
    saveStatus,
    signInWithGoogle,
    signOut,
    createProjectOnDrive,
    createLocalProject, 
    openLocalProject, 
    downloadProject, 
    closeProject,
    uploadProjectToDrive,
    overwriteDriveProject,
    loadDriveProjectAndDiscardLocal,
    connectLocalToDrive: signInWithGoogle,
  };
}