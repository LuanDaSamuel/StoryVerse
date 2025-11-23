
import * as React from 'react';
import { ProjectData, StorageStatus, Theme, StoryIdeaStatus, NovelSketch, UserProfile, SaveStatus, Language } from '../types';
import { get, set, del } from 'idb-keyval';
import { useProjectStorage, PermanentAuthError } from './useProjectStorage';

// --- Constants ---
const LOCAL_BACKUP_KEY = 'storyverse-local-backup';
const LOCAL_UNLOAD_BACKUP_KEY = 'storyverse-unload-backup';
const isFileSystemAccessAPISupported = 'showOpenFilePicker' in window;

const defaultProjectData: ProjectData = {
  settings: { theme: 'book', baseFontSize: 18, language: 'en' },
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
    if (['en', 'vi', 'fi'].includes(data.settings.language)) {
        sanitized.settings.language = data.settings.language as Language;
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
            wordCount: typeof sketch.wordCount === 'number' ? sketch.wordCount : 0,
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
  const [projectData, setProjectData] = React.useState<ProjectData | null>(null);
  const [status, setStatus] = React.useState<StorageStatus>('loading');
  const [projectName, setProjectName] = React.useState('');
  const [storageMode, setStorageMode] = React.useState<'local' | 'drive' | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');

  const saveStatusRef = React.useRef(saveStatus);
  React.useEffect(() => {
      saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  const isInitialLoadRef = React.useRef(true);
  const isDirtyRef = React.useRef(false);
  const isSavingRef = React.useRef(false);
  const projectDataRef = React.useRef(projectData);

  const storage = useProjectStorage();
  const saveProjectRef = React.useRef<() => Promise<void>>(async () => {});
  const saveTimeoutRef = React.useRef<number | null>(null);
  const inactivityTimerRef = React.useRef<number | null>(null);
  const localStorageBackupTimeoutRef = React.useRef<number | null>(null);
  
  const resetState = React.useCallback(() => {
    setProjectData(null);
    setProjectName('');
    setStorageMode(null);
    setUserProfile(null);
    setSaveStatus('idle');
    isDirtyRef.current = false;
  }, []);

  const flushChanges = React.useCallback(async () => {
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    if (!isSavingRef.current && isDirtyRef.current) {
      await saveProjectRef.current?.();
    }
    while (isSavingRef.current) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, []);
  
    const signOut = React.useCallback(async (options?: { flush?: boolean }) => {
        const shouldFlush = options?.flush ?? true;
        
        // Clear the inactivity timer immediately to prevent it from re-firing during the sign-out process.
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        
        setStatus('loading');
        if (shouldFlush) {
            try {
                await flushChanges();
            } catch (error) {
                console.error("Failed to flush changes during sign out:", error);
                // Proceed with sign out anyway, but don't remove the unload backup
                // as changes were not successfully saved.
            }
        }
        await storage.signOut();
        // CRITICAL FIX: Do not remove the unload backup here.
        // It should only be removed on a *successful* save (handled by `saveProject`)
        // or on a clean `closeProject`. Removing it here when signOut is called
        // from an error state would cause data loss.
        resetState();
        setStatus('welcome');
    }, [flushChanges, storage, resetState]);

  const resetInactivityTimer = React.useCallback(() => {
    if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(async () => {
        // No alert needed. Just sign the user out smoothly.
        // Their work will be saved, and they will be at the welcome screen when they return.
        await signOut({ flush: true });
    }, 15 * 60 * 1000); // 15 minutes
  }, [signOut]);

  React.useEffect(() => {
    // This effect sets up the inactivity timer only for Google Drive sessions.
    if (status === 'ready' && storageMode === 'drive') {
        const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
        
        resetInactivityTimer();

        events.forEach(event => window.addEventListener(event, resetInactivityTimer));

        return () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
            events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
        };
    }
  }, [status, storageMode, resetInactivityTimer]);

  const saveProject = React.useCallback(async () => {
    // If a save cycle is already running, it will pick up the latest changes
    // because of the while(isDirtyRef.current) loop.
    if (isSavingRef.current) {
        return;
    }

    // If nothing to save, ignore.
    if (!isDirtyRef.current) {
        return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');

    try {
        // Keep saving as long as there are dirty changes.
        // This ensures that if the user types *during* a save, those changes
        // get saved immediately after the current operation finishes.
        while (isDirtyRef.current) {
            const dataToSave = projectDataRef.current;
            if (!dataToSave) {
                 isDirtyRef.current = false;
                 break;
            }

            // We mark as not dirty *before* the async operation.
            // If user types during await, isDirtyRef becomes true again, causing another loop iteration.
            isDirtyRef.current = false;

            const MAX_RETRIES = 3;
            const INITIAL_DELAY_MS = 1500;
            let success = false;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    if (storageMode === 'drive') {
                        await storage.saveToDrive(dataToSave);
                    } else if (storageMode === 'local') {
                        await set(LOCAL_BACKUP_KEY, dataToSave);
                        await storage.saveToFileHandle(dataToSave);
                    }
                    success = true;
                    break;
                } catch (error: any) {
                    console.error(`Save attempt ${attempt}/${MAX_RETRIES} failed for storage mode '${storageMode}':`, error);

                    if (error instanceof PermanentAuthError) {
                        console.error("Permanent Authentication Error:", error.message, "Signing out.");
                        await signOut({ flush: false });
                        // We throw to exit the save loop immediately
                        throw error; 
                    }

                    if (attempt === MAX_RETRIES) {
                        throw error; // Throw to hit the outer catch block
                    }

                    const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                    console.log(`Will retry in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            if (success) {
                localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
            }
        }
        
        // If we exit the loop normally, all data is saved.
        setSaveStatus('saved');
    } catch (error) {
        console.error("Save failed after retries:", error);
        setSaveStatus('error');
        // Mark as dirty again so the user knows/we can retry
        isDirtyRef.current = true;
    } finally {
        // Always release the lock
        isSavingRef.current = false;
        
        // If we are still dirty (e.g. after an error, or a race condition at the very end), 
        // schedule another check.
        if (isDirtyRef.current) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = window.setTimeout(() => {
                saveProjectRef.current?.();
            }, 2000); // Retry slightly slower if there was an issue
        }
    }

  }, [storage, storageMode, signOut]);

  // Keep the ref updated with the latest version of the save function
  React.useEffect(() => {
    saveProjectRef.current = saveProject;
  }, [saveProject]);

  const setProjectDataAndMarkDirty = React.useCallback((updater: React.SetStateAction<ProjectData | null>) => {
    setProjectData(prevData => {
        const newData = typeof updater === 'function' ? updater(prevData) : updater;

        // PERFORMANCE FIX: The previous JSON.stringify comparison on every keystroke was the
        // primary cause of typing lag. It has been removed. We now assume any call to this
        // function implies a change that needs to be persisted.
        
        projectDataRef.current = newData;
        isDirtyRef.current = true;

        if (!isSavingRef.current) {
            setSaveStatus('unsaved');
        }

        // PERFORMANCE FIX: Throttle the synchronous localStorage backup. Writing to localStorage on
        // every keystroke is slow and blocks the main thread. This ensures it only happens
        // periodically during rapid typing.
        if (localStorageBackupTimeoutRef.current) {
            clearTimeout(localStorageBackupTimeoutRef.current);
        }
        localStorageBackupTimeoutRef.current = window.setTimeout(() => {
            try {
                // This stringify is still expensive, but now it only runs periodically, not on every input event.
                localStorage.setItem(LOCAL_UNLOAD_BACKUP_KEY, JSON.stringify(newData));
            } catch (e) {
                console.error("Failed to write to localStorage backup", e);
            }
        }, 500); // Backup at most every 500ms.

        // Debounce the actual save operation. This is correct.
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => {
            saveProjectRef.current?.();
        }, 1000); // 1-second delay after the last change.
        
        return newData;
    });
  }, []);

  // Effect to revert 'saved' status to 'idle'.
  React.useEffect(() => {
    if (saveStatus === 'saved') {
        const timeoutId = setTimeout(() => {
            // Only revert to idle if no new changes have come in.
            if (!isDirtyRef.current) {
                setSaveStatus('idle');
            }
        }, 1500); // Duration to display the "Saved!" message.
        return () => clearTimeout(timeoutId);
    }
  }, [saveStatus]);
    
    // Save on visibility change (e.g., switching tabs)
    React.useEffect(() => {
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
  
  const handleDriveProject = React.useCallback((driveProject: { name: string, data: any } | null) => {
    if (driveProject) {
        const sanitizedData = sanitizeProjectData(driveProject.data);
        setProjectData(sanitizedData);
        projectDataRef.current = sanitizedData;
        setProjectName(driveProject.name);
        setStatus('ready');
    } else {
        setStatus('drive-no-project');
    }
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    setStatus('loading');
    try {
        const profile = await storage.signIn();
        setUserProfile(profile);
        setStorageMode('drive');
        
        const localData = await getLocalProjectData();
        const driveProject = await storage.loadFromDrive();

        if (driveProject && localData) {
            const sanitizedLocal = sanitizeProjectData(localData.data);
            setProjectData(sanitizedLocal); 
            projectDataRef.current = sanitizedLocal;
            setProjectName(localData.name);
            setStatus('drive-conflict');
        } else if (driveProject) {
            handleDriveProject(driveProject);
        } else if (localData) {
            const sanitizedLocal = sanitizeProjectData(localData.data);
            setProjectData(sanitizedLocal);
            projectDataRef.current = sanitizedLocal;
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
  }, [storage, resetState, handleDriveProject]);
  
  const createProjectOnDrive = React.useCallback(async () => {
    setStatus('loading');
    try {
        const { name } = await storage.createOnDrive(defaultProjectData);
        setProjectName(name);
        setProjectData(defaultProjectData);
        projectDataRef.current = defaultProjectData;
        setStatus('ready');
    } catch (error) {
        alert("Failed to create project on Google Drive.");
        await signOut();
    }
  }, [storage, signOut]);

    const getLocalProjectData = React.useCallback(async (): Promise<{ name: string; data: ProjectData } | null> => {
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

  const checkForRecentLocalProject = React.useCallback(async () => {
    try {
        const backupJson = localStorage.getItem(LOCAL_UNLOAD_BACKUP_KEY);
        if (backupJson) {
            console.log("Found unload backup, restoring...");
            const unloadBackup = sanitizeProjectData(JSON.parse(backupJson));
            
            if (isFileSystemAccessAPISupported) {
                const handle = await storage.getHandleFromIdb();
                if (handle) {
                    await storage.saveToFileHandle(unloadBackup);
                    console.log("Restored unload backup to File Handle.");
                }
            }
            await set(LOCAL_BACKUP_KEY, unloadBackup);
            console.log("Restored unload backup to IndexedDB.");

            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
        }
    } catch (e) {
        console.error("Error processing unload backup:", e);
        localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
    }

    const localData = await getLocalProjectData();
    if (localData) {
        const sanitizedData = sanitizeProjectData(localData.data);
        setProjectData(sanitizedData);
        projectDataRef.current = sanitizedData;
        setProjectName(localData.name);
        setStatus('ready');
        setStorageMode('local');
        return true;
    }
    return false;
  }, [getLocalProjectData, storage]);

  React.useEffect(() => {
    if (!isInitialLoadRef.current) return;

    const initializeApp = async () => {
        try {
            // GAPI client is needed for manual sign-in later.
            await storage.initGapiClient(); 

            // Check for a local project first.
            const hasLocal = await checkForRecentLocalProject();
            if (!hasLocal) {
                // If no local project, show the welcome screen.
                console.log("No local project found. Displaying welcome screen.");
                setStatus('welcome');
            }
            // If hasLocal is true, checkForRecentLocalProject already set the state.
        } catch (error: any) {
            console.error("Initialization failed:", error);
            // Fallback to welcome screen on error.
            alert(`There was a problem initializing the application:\n\n${error.message}\n\nPlease try again.`);
            setStatus('welcome');
        }
    };
    initializeApp();
    isInitialLoadRef.current = false;
  }, [storage, checkForRecentLocalProject]);
  
  const openLocalProject = React.useCallback(async () => {
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
            const sanitizedData = sanitizeProjectData(fileData.data);
            setProjectName(fileData.name);
            setProjectData(sanitizedData);
            projectDataRef.current = sanitizedData;
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
  
  const createLocalProject = React.useCallback(async () => {
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
        projectDataRef.current = defaultProjectData;
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
  
  const closeProject = React.useCallback(async () => {
    await flushChanges();

    if (storageMode === 'local') {
        await storage.clearHandleFromIdb();
        await del(LOCAL_BACKUP_KEY);
    }
    localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
    resetState();
    setStatus('welcome');
  }, [flushChanges, storageMode, storage, resetState]);
  
  const downloadProject = React.useCallback(async () => {
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

  const uploadProjectToDrive = React.useCallback(async () => {
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

    const overwriteDriveProject = React.useCallback(async () => {
        if (!projectDataRef.current) return;
        setStatus('loading');
        await storage.saveToDrive(projectDataRef.current);
        await storage.clearHandleFromIdb();
        await del(LOCAL_BACKUP_KEY);
        setStatus('ready');
    }, [storage]);

    const loadDriveProjectAndDiscardLocal = React.useCallback(async () => {
        setStatus('loading');
        const driveProject = await storage.loadFromDrive();
        if (driveProject) {
            handleDriveProject(driveProject);
            await storage.clearHandleFromIdb();
            await del(LOCAL_BACKUP_KEY);
        } else {
            setStatus('drive-no-project');
        }
    }, [storage, handleDriveProject]);

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
