
import * as React from 'react';
import { ProjectData, StorageStatus, Theme, StoryIdeaStatus, NovelSketch, UserProfile, SaveStatus, Language, WritingMode } from '../types';
import { get, set, del } from 'idb-keyval';
import { useProjectStorage, PermanentAuthError } from './useProjectStorage';
import { enforceProjectDataLimits, DATA_LIMITS } from '../utils/dataLimiter';

// --- Constants ---
const LOCAL_BACKUP_KEY = 'storyverse-local-backup';
const LOCAL_UNLOAD_BACKUP_KEY = 'storyverse-unload-backup';
const LOCAL_UNLOAD_BACKUP_TIMESTAMP_KEY = 'storyverse-unload-backup-timestamp';
const STORAGE_PREFERENCE_KEY = 'storyverse-storage-preference';
const isFileSystemAccessAPISupported = 'showOpenFilePicker' in window;

const defaultProjectData: ProjectData = {
  settings: { theme: 'book', baseFontSize: 18, language: 'en', writingMode: 'standard' },
  dailyGoal: { target: 500, current: 0, lastUpdated: new Date().toISOString().split('T')[0] },
  userDictionary: [],
  novels: [],
  ideaFolders: [],
  storyIdeas: [],
};

// --- Helper Functions ---
const sanitizeProjectData = (data: any): ProjectData => {
  return enforceProjectDataLimits(data);
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
  const localStorageBackupTimeoutRef = React.useRef<number | null>(null);
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

  React.useEffect(() => {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('storyverse_project_data_sync');
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (type === 'PROJECT_DATA_REMOTE_UPDATE' && data) {
          projectDataRef.current = data;
          setProjectData(data);
        }
      };
      return () => {
        channel.close();
        broadcastChannelRef.current = null;
      };
    }
  }, []);

  
  const resetState = React.useCallback(() => {
    setProjectData(null);
    setProjectName('');
    setStorageMode(null);
    setUserProfile(null);
    setSaveStatus('idle');
    isDirtyRef.current = false;
    localStorage.removeItem(STORAGE_PREFERENCE_KEY); 
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
        
        setStatus('loading');
        if (shouldFlush) {
            try {
                await flushChanges();
            } catch (error) {
                console.error("Failed to flush changes during sign out:", error);
            }
        }
        await storage.signOut();
        resetState();
        setStatus('welcome');
    }, [flushChanges, storage, resetState]);

  const saveProject = React.useCallback(async () => {
    if (isSavingRef.current) return;
    if (!isDirtyRef.current) return;

    isSavingRef.current = true;
    setSaveStatus('saving');
    let hasCloudError = false;

    try {
        while (isDirtyRef.current) {
            const dataToSave = projectDataRef.current;
            if (!dataToSave) {
                 isDirtyRef.current = false;
                 break;
            }

            // ONLY save to local backup if NOT in cloud mode
            if (storageMode === 'local') {
                try {
                    await set(LOCAL_BACKUP_KEY, dataToSave);
                } catch (backupError) {
                    console.warn("Local IDB backup failed:", backupError);
                }
            }

            isDirtyRef.current = false;

            const MAX_RETRIES = 2;
            const INITIAL_DELAY_MS = 1000;
            let success = false;
            let lastError: any = null;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    if (storageMode === 'drive') {
                        await storage.saveToDrive(dataToSave);
                    } else if (storageMode === 'local') {
                        await storage.saveToFileHandle(dataToSave);
                    } else {
                        success = true; 
                        break;
                    }
                    success = true;
                    break;
                } catch (error: any) {
                    lastError = error;
                    if (error instanceof PermanentAuthError || error.name === 'ExpiredVersionError') throw error; 
                    if (attempt < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY_MS * attempt));
                    }
                }
            }
            
            if (success) {
                // Always clear emergency backup on success regardless of mode
                localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
                localStorage.removeItem(LOCAL_UNLOAD_BACKUP_TIMESTAMP_KEY);
            } else {
                throw lastError || new Error("Save operation failed");
            }
        }
        
        setSaveStatus('saved');
    } catch (error: any) {
        console.error("Critical Sync Error:", error);
        setSaveStatus('error');
        isDirtyRef.current = true;
        hasCloudError = true;
        
        if (error.name === 'ExpiredVersionError') {
            alert("This session has expired because the project was modified on another device. You will be logged out to prevent overwriting changes.");
            signOut({ flush: false });
            return;
        }
        
        if (error instanceof PermanentAuthError || error.name === 'PermanentAuthError') {
            alert("Your Google Drive session has expired or failed to refresh. You will be signed out to prevent data loss. You can re-sign in or use local files.");
            signOut({ flush: false });
            return;
        }
    } finally {
        isSavingRef.current = false;
        if (isDirtyRef.current) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            const retryDelay = hasCloudError ? 10000 : 2000;
            saveTimeoutRef.current = window.setTimeout(() => {
                saveProjectRef.current?.();
            }, retryDelay); 
        }
    }
  }, [storage, storageMode, signOut]);

  React.useEffect(() => {
    saveProjectRef.current = saveProject;
  }, [saveProject]);

  const updateDailyWordCount = React.useCallback((wordCountDelta: number) => {
    setProjectData((prevData) => {
      if (!prevData) return null;
      const today = new Date().toISOString().split('T')[0];
      const lastUpdated = prevData.dailyGoal.lastUpdated;
      let newCurrent = prevData.dailyGoal.current;
      if (today !== lastUpdated) newCurrent = 0;
      newCurrent = Math.max(0, newCurrent + wordCountDelta);
      const newData = {
        ...prevData,
        dailyGoal: { ...prevData.dailyGoal, current: newCurrent, lastUpdated: today }
      };
      projectDataRef.current = newData;
      isDirtyRef.current = true;
      if (!isSavingRef.current) setSaveStatus('unsaved');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => {
          saveProjectRef.current?.();
      }, 500);
      return newData;
    });
  }, []);

  const broadcastDebounceTimeoutRef = React.useRef<number | null>(null);

  const setProjectDataAndMarkDirty = React.useCallback((updater: React.SetStateAction<ProjectData | null>) => {
    setProjectData(prevData => {
        const newData = typeof updater === 'function' ? updater(prevData) : updater;
        projectDataRef.current = newData;
        isDirtyRef.current = true;
        
        // Debounce BroadcastChannel transmission to avoid redundant structured cloning on rapid keystrokes
        if (newData && broadcastChannelRef.current) {
            if (broadcastDebounceTimeoutRef.current) clearTimeout(broadcastDebounceTimeoutRef.current);
            broadcastDebounceTimeoutRef.current = window.setTimeout(() => {
                try {
                    broadcastChannelRef.current?.postMessage({ type: 'PROJECT_DATA_REMOTE_UPDATE', data: projectDataRef.current });
                } catch (e) {
                    console.warn("BroadcastChannel postMessage failed:", e);
                }
            }, 600);
        }
        return newData;
    });

    if (!isSavingRef.current) setSaveStatus('unsaved');

    // ONLY perform emergency unload backup if NOT in drive mode
    if (storageMode !== 'drive') {
        if (localStorageBackupTimeoutRef.current) clearTimeout(localStorageBackupTimeoutRef.current);
        localStorageBackupTimeoutRef.current = window.setTimeout(() => {
            try {
                if (projectDataRef.current) {
                     const jsonString = JSON.stringify(projectDataRef.current);
                     // Guard against localStorage 5MB browser quota and memory lockup
                     if (jsonString.length <= DATA_LIMITS.LOCAL_STORAGE_WRITE_LIMIT_BYTES) {
                         localStorage.setItem(LOCAL_UNLOAD_BACKUP_KEY, jsonString);
                         localStorage.setItem(LOCAL_UNLOAD_BACKUP_TIMESTAMP_KEY, Date.now().toString());
                     }
                }
            } catch (e) { console.error("Unload backup failed", e); }
        }, 2000); 
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
        saveProjectRef.current?.();
    }, 800); 
  }, [storageMode]);

  React.useEffect(() => {
    if (saveStatus === 'saved') {
        const timeoutId = setTimeout(() => {
            if (!isDirtyRef.current) setSaveStatus('idle');
        }, 1500); 
        return () => clearTimeout(timeoutId);
    }
  }, [saveStatus]);
    
    React.useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') flushChanges();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [flushChanges]);
  
  const handleDriveProject = React.useCallback((driveProject: { name: string, data: any } | null) => {
    if (driveProject) {
        const sanitizedData = sanitizeProjectData(driveProject.data);
        setProjectData(sanitizedData);
        projectDataRef.current = sanitizedData;
        setProjectName(driveProject.name);
        setStatus('ready');
        // Aggressively clear local artifacts when cloud project is loaded
        del(LOCAL_BACKUP_KEY);
        localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
        localStorage.removeItem(LOCAL_UNLOAD_BACKUP_TIMESTAMP_KEY);
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
            // Clean up local after migration
            del(LOCAL_BACKUP_KEY);
            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
        } else {
            setStatus('drive-no-project');
        }
    } catch (error) {
        console.error("Sign in error:", error);
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
        // Clear local artifacts
        del(LOCAL_BACKUP_KEY);
        localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
    } catch (error) {
        alert("Could not create project on Drive.");
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
    const backupJson = localStorage.getItem(LOCAL_UNLOAD_BACKUP_KEY);
    if (backupJson) {
        try {
            const unloadBackup = sanitizeProjectData(JSON.parse(backupJson));
            if (isFileSystemAccessAPISupported) {
                const handle = await storage.getHandleFromIdb();
                if (handle) await storage.saveToFileHandle(unloadBackup);
            }
            await set(LOCAL_BACKUP_KEY, unloadBackup);
            return unloadBackup; 
        } catch (e) {
            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
        }
    }

    const localData = await getLocalProjectData();
    if (localData) {
        const sanitizedData = sanitizeProjectData(localData.data);
        setProjectData(sanitizedData);
        projectDataRef.current = sanitizedData;
        setProjectName(localData.name);
        return sanitizedData;
    }
    return null;
  }, [getLocalProjectData, storage]);

  React.useEffect(() => {
    if (!isInitialLoadRef.current) return;

    const initializeApp = async () => {
        try {
            await storage.initGapiClient(); 
            const storedProfile = await storage.getStoredProfile();
            
            // If user is logged in, we ignore local restored data to ensure cloud-only flow
            if (storedProfile) {
                setUserProfile(storedProfile);
                setStorageMode('drive');
                try {
                    const driveProject = await storage.loadFromDrive();
                    if (driveProject) {
                        handleDriveProject(driveProject);
                    } else {
                        // Profile exists but file gone? Check local one last time for migration
                        const restoredLocalData = await checkForRecentLocalProject();
                        if (restoredLocalData) {
                            setStatus('drive-no-project');
                        } else {
                            setStatus('welcome');
                        }
                    }
                } catch (error) {
                    setStatus('welcome');
                }
            } else {
                // NO CLOUD SESSION: Proceed with standard local flow
                const restoredLocalData = await checkForRecentLocalProject();
                if (restoredLocalData) {
                    setStorageMode('local');
                    setStatus('ready');
                } else {
                    setStatus('welcome');
                }
            }
        } catch (error: any) { setStatus('welcome'); }
    };
    initializeApp();
    isInitialLoadRef.current = false;
  }, [storage, checkForRecentLocalProject, handleDriveProject]);
  
  const openLocalProject = React.useCallback(async () => {
    const fallbackInput = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const text = await file.text();
                try {
                    const json = JSON.parse(text);
                    const sanitizedData = sanitizeProjectData(json);
                    setProjectName(file.name.replace('.json', ''));
                    setProjectData(sanitizedData);
                    projectDataRef.current = sanitizedData;
                    setStorageMode('local');
                    setStatus('ready');
                    await storage.clearHandleFromIdb();
                } catch (err) {
                    alert("Failed to parse project file.");
                }
            }
        };
        input.click();
    };

    if (!isFileSystemAccessAPISupported) {
        fallbackInput();
        return;
    }
    
    try {
        const [handle] = await window.showOpenFilePicker({ types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
        setStatus('loading');
        const fileData = await storage.loadFromFileHandle(handle);
        if (fileData) {
            await storage.saveHandleToIdb(handle);
            const sanitizedData = sanitizeProjectData(fileData.data);
            setProjectName(fileData.name);
            setProjectData(sanitizedData);
            projectDataRef.current = sanitizedData;
            setStorageMode('local');
            setStatus('ready');
        } else { setStatus('welcome'); }
    } catch (error: any) { 
        console.warn("showOpenFilePicker failed, falling back to input:", error);
        fallbackInput();
    }
  }, [storage]);
  
  const createLocalProject = React.useCallback(async () => {
    const fallbackCreate = async () => {
        setProjectName("New Project");
        setProjectData(defaultProjectData);
        projectDataRef.current = defaultProjectData;
        setStorageMode('local');
        setStatus('ready');
        await storage.clearHandleFromIdb();
    };

    if (!isFileSystemAccessAPISupported) {
        await fallbackCreate();
        return;
    }
    
    try {
        const handle = await window.showSaveFilePicker({ suggestedName: 'StoryVerse-Project.json', types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
        setStatus('loading');
        await storage.saveHandleToIdb(handle);
        setProjectName(handle.name);
        setProjectData(defaultProjectData);
        projectDataRef.current = defaultProjectData;
        await storage.saveToFileHandle(defaultProjectData);
        setStorageMode('local');
        setStatus('ready');
    } catch (error: any) { 
        console.warn("showSaveFilePicker failed, falling back to in-memory:", error);
        await fallbackCreate();
    }
  }, [storage]);
  
  const closeProject = React.useCallback(async () => {
    await flushChanges();
    if (storageMode === 'local') {
        await storage.clearHandleFromIdb();
    }
    await del(LOCAL_BACKUP_KEY);
    localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
    localStorage.removeItem(STORAGE_PREFERENCE_KEY);
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
            // Migration complete: remove local traces
            del(LOCAL_BACKUP_KEY);
            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
        } catch (error) { setStatus('drive-no-project'); }
    }, [storage]);

    const overwriteDriveProject = React.useCallback(async () => {
        if (!projectDataRef.current) return;
        setStatus('loading');
        try {
            await storage.saveToDrive(projectDataRef.current);
            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
            del(LOCAL_BACKUP_KEY);
            localStorage.setItem(STORAGE_PREFERENCE_KEY, 'local'); 
            setStatus('ready');
        } catch (e) {
            alert("Could not overwrite cloud project. Check your connection.");
            setStatus('drive-conflict');
        }
    }, [storage]);

    const loadDriveProjectAndDiscardLocal = React.useCallback(async () => {
        setStatus('loading');
        try {
            const driveProject = await storage.loadFromDrive();
            if (driveProject) {
                handleDriveProject(driveProject);
                localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
                del(LOCAL_BACKUP_KEY);
                localStorage.setItem(STORAGE_PREFERENCE_KEY, 'drive'); 
            } else {
                setStatus('drive-no-project');
            }
        } catch (e) {
            alert("Could not load cloud project.");
            setStatus('drive-conflict');
        }
    }, [storage, handleDriveProject]);

  return { 
    projectData, 
    setProjectData: setProjectDataAndMarkDirty, 
    updateDailyWordCount,
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
