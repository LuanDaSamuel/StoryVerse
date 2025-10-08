import * as React from 'react';
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
  projectDataRef.current = projectData;

  const storage = useProjectStorage();
  const saveProjectRef = React.useRef<() => Promise<void>>(async () => {});
  const saveTimeoutRef = React.useRef<number | null>(null);

  const saveProject = React.useCallback(async () => {
    // If a save is already happening, or there are no changes, do nothing.
    // The debouncer will catch subsequent changes.
    if (isSavingRef.current || !isDirtyRef.current) {
        return;
    }

    isSavingRef.current = true;
    // Mark as clean *before* saving. Any new edits that occur *during* the save
    // operation will set this back to true, ensuring the debouncer schedules another save.
    isDirtyRef.current = false;
    setSaveStatus('saving');

    const dataToSave = projectDataRef.current;
    if (!dataToSave) {
        console.error("Attempted to save but no project data was available.");
        setSaveStatus('error');
        isSavingRef.current = false;
        // The data is still "dirty" because the save failed before it began.
        isDirtyRef.current = true;
        return;
    }

    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 1500; // Start with a slightly longer delay

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (storageMode === 'drive') {
                await storage.saveToDrive(dataToSave);
            } else if (storageMode === 'local') {
                // For local files, also update the IndexedDB backup.
                await set(LOCAL_BACKUP_KEY, dataToSave);
                await storage.saveToFileHandle(dataToSave);
            }

            // --- Success ---
            setSaveStatus('saved');
            isSavingRef.current = false;
            // A new save might have been queued by the debouncer if edits happened during this save.
            // The `saveProject` call from that debouncer will handle it. We are done here.
            return; 

        } catch (error) {
            console.error(`Save attempt ${attempt}/${MAX_RETRIES} failed for storage mode '${storageMode}':`, error);

            if (attempt === MAX_RETRIES) {
                // --- Final Failure ---
                // All retries have been exhausted. Show the error to the user.
                setSaveStatus('error');
                // The changes are still unsaved.
                isDirtyRef.current = true;
                isSavingRef.current = false;
                // Stop the retry loop. The user will need to trigger a new save,
                // either by editing again or with a manual save button (if we add one).
                return;
            }

            // --- Retry ---
            // Wait before the next attempt, using exponential backoff.
            const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`Will retry in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
  }, [storage, storageMode]);

  // Keep the ref updated with the latest version of the save function
  React.useEffect(() => {
    saveProjectRef.current = saveProject;
  }, [saveProject]);

  const setProjectDataAndMarkDirty = React.useCallback((updater: React.SetStateAction<ProjectData | null>) => {
    setProjectData(prevData => {
        const newData = typeof updater === 'function' ? updater(prevData) : updater;
        if (JSON.stringify(newData) !== JSON.stringify(prevData)) {
            isDirtyRef.current = true;

            // Only show "unsaved" if a save isn't already in progress.
            // This prevents the UI from flickering between "Saving..." and "Unsaved".
            if (!isSavingRef.current) {
                setSaveStatus('unsaved');
            }

            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = window.setTimeout(() => {
                saveProjectRef.current?.();
            }, 1000); // 1-second delay
        }
        return newData;
    });
  }, []);

  // Effect to revert 'saved' status to 'idle'.
  React.useEffect(() => {
    if (saveStatus === 'saved') {
        const timeoutId = setTimeout(() => {
            // After the 'Saved!' message has been displayed, transition to idle.
            // The debouncer in `setProjectDataAndMarkDirty` will trigger the next save if needed.
            setSaveStatus('idle');
        }, 1500); // Duration to display the "Saved!" message.
        return () => clearTimeout(timeoutId);
    }
  }, [saveStatus]);
    
  const flushChanges = React.useCallback(async () => {
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

  // Warn user before leaving with unsaved changes.
  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Check ref directly to get the latest status without re-running the effect.
      if (['unsaved', 'saving', 'error'].includes(saveStatusRef.current)) {
        event.preventDefault();
        // Required for legacy browsers.
        event.returnValue = '';
        return ''; // Triggers the prompt in modern browsers.
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount.

  const resetState = React.useCallback(() => {
    setProjectData(null);
    setProjectName('');
    setStorageMode(null);
    setUserProfile(null);
    setSaveStatus('idle');
    isDirtyRef.current = false;
  }, []);
  
  const signOut = React.useCallback(async () => {
    setStatus('loading');
    await flushChanges();
    await storage.signOut();
    resetState();
    setStatus('welcome');
  }, [flushChanges, storage, resetState]);
  
  const handleDriveProject = React.useCallback((driveProject: { name: string, data: any } | null) => {
    if (driveProject) {
        setProjectData(sanitizeProjectData(driveProject.data));
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
  }, [storage, resetState, handleDriveProject]);
  
  const createProjectOnDrive = React.useCallback(async () => {
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
    const localData = await getLocalProjectData();
    if (localData) {
        setProjectData(sanitizeProjectData(localData.data));
        setProjectName(localData.name);
        setStatus('ready');
        setStorageMode('local');
        return true;
    }
    return false;
  }, [getLocalProjectData]);

  React.useEffect(() => {
    if (!isInitialLoadRef.current) return;

    const initializeApp = async () => {
        try {
            const profile = await storage.initAndRestoreSession();
            if (profile) {
                console.log("Restored Google session.");
                setUserProfile(profile);
                setStorageMode('drive');
                
                const localData = await getLocalProjectData();
                let driveProject;

                try {
                    driveProject = await storage.loadFromDrive();
                } catch (error: any) {
                    if (error.status === 401 || error.status === 403) {
                        console.warn("Initial Drive load failed with auth error. Refreshing token and retrying.");
                        const newProfile = await storage.refreshTokenAndGetProfile();
                        if (newProfile) {
                            console.log("Token refreshed, retrying Drive load.");
                            setUserProfile(newProfile);
                            driveProject = await storage.loadFromDrive();
                        } else {
                            console.log("Token refresh failed. Signing out.");
                            await storage.signOut();
                            resetState();
                            // If sign out happens, check for a local project before showing welcome.
                            const hasLocal = await checkForRecentLocalProject();
                            if (!hasLocal) {
                                setStatus('welcome');
                            }
                            return; // Exit initializeApp
                        }
                    } else {
                        // Not an auth error, re-throw it to be caught by the outer catch block.
                        throw error;
                    }
                }

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
  }, [storage, checkForRecentLocalProject, getLocalProjectData, resetState, handleDriveProject, signOut]);
  
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