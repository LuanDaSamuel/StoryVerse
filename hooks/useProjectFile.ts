
import * as React from 'react';
import { ProjectData, StorageStatus, Theme, StoryIdeaStatus, NovelSketch, UserProfile, SaveStatus, Language, WritingMode } from '../types';
import { get, set, del } from 'idb-keyval';
import { useProjectStorage, PermanentAuthError } from './useProjectStorage';

// --- Constants ---
const LOCAL_BACKUP_KEY = 'storyverse-local-backup';
const LOCAL_UNLOAD_BACKUP_KEY = 'storyverse-unload-backup';
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
  const sanitized = JSON.parse(JSON.stringify(defaultProjectData));
  
  if (data?.settings) {
    if (['dark', 'book'].includes(data.settings.theme)) {
      sanitized.settings.theme = data.settings.theme as Theme;
    }
    if (typeof data.settings.baseFontSize === 'number') {
      sanitized.settings.baseFontSize = data.settings.baseFontSize;
    }
    if (['en', 'vi', 'fi', 'sv'].includes(data.settings.language)) {
        sanitized.settings.language = data.settings.language as Language;
    }
    if (['standard', 'book-note'].includes(data.settings.writingMode)) {
        sanitized.settings.writingMode = data.settings.writingMode as WritingMode;
    }
  }

  if (data?.dailyGoal) {
      sanitized.dailyGoal = {
          target: typeof data.dailyGoal.target === 'number' ? data.dailyGoal.target : 500,
          current: typeof data.dailyGoal.current === 'number' ? data.dailyGoal.current : 0,
          lastUpdated: typeof data.dailyGoal.lastUpdated === 'string' ? data.dailyGoal.lastUpdated : new Date().toISOString().split('T')[0]
      };
  }

  if (Array.isArray(data?.userDictionary)) {
      sanitized.userDictionary = data.userDictionary.filter((w: any) => typeof w === 'string');
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

  if (Array.isArray(data?.ideaFolders)) {
    sanitized.ideaFolders = data.ideaFolders.map((folder: any) => ({
        id: folder.id || crypto.randomUUID(),
        name: folder.name || 'Untitled Folder',
        createdAt: folder.createdAt || new Date().toISOString(),
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
        wordCount: typeof idea.wordCount === 'number' ? idea.wordCount : 0,
        tags: Array.isArray(idea.tags) ? idea.tags : [],
        status: status,
        folderId: idea.folderId || null,
        visitCount: typeof idea.visitCount === 'number' ? idea.visitCount : 0,
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
  const localStorageBackupTimeoutRef = React.useRef<number | null>(null);
  
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
                    if (error instanceof PermanentAuthError) throw error; 
                    if (attempt < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY_MS * attempt));
                    }
                }
            }
            
            if (success) {
                // Always clear emergency backup on success regardless of mode
                localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
            } else {
                throw lastError || new Error("Save operation failed");
            }
        }
        
        setSaveStatus('saved');
    } catch (error) {
        console.error("Critical Sync Error:", error);
        setSaveStatus('error');
        isDirtyRef.current = true;
        hasCloudError = true;
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
  }, [storage, storageMode]);

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

  const setProjectDataAndMarkDirty = React.useCallback((updater: React.SetStateAction<ProjectData | null>) => {
    setProjectData(prevData => {
        const newData = typeof updater === 'function' ? updater(prevData) : updater;
        projectDataRef.current = newData;
        isDirtyRef.current = true;
        return newData;
    });

    if (!isSavingRef.current) setSaveStatus('unsaved');

    // ONLY perform emergency unload backup if NOT in drive mode
    if (storageMode !== 'drive') {
        if (localStorageBackupTimeoutRef.current) clearTimeout(localStorageBackupTimeoutRef.current);
        localStorageBackupTimeoutRef.current = window.setTimeout(() => {
            try {
                if (projectDataRef.current) {
                     localStorage.setItem(LOCAL_UNLOAD_BACKUP_KEY, JSON.stringify(projectDataRef.current));
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
    if (!isFileSystemAccessAPISupported) {
        alert("File System Access API not supported.");
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
        } else { setStatus('welcome'); }
    } catch (error) { setStatus('welcome'); }
  }, [storage]);
  
  const createLocalProject = React.useCallback(async () => {
    if (!isFileSystemAccessAPISupported) {
        alert("File System Access API not supported.");
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
    } catch (error) { setStatus('welcome'); }
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
