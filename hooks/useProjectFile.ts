
import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectData, StorageStatus, SaveStatus, Theme, StoryIdeaStatus, NovelSketch, UserProfile } from '../types';
import { get, set, del } from 'idb-keyval';
import { useProjectStorage, DRIVE_PROJECT_FILENAME } from './useProjectStorage';

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
  const sanitized = JSON.parse(JSON.stringify(defaultProjectData));
  if (data?.settings?.theme) sanitized.settings.theme = data.settings.theme as Theme;
  if (typeof data?.settings?.baseFontSize === 'number') {
      sanitized.settings.baseFontSize = data.settings.baseFontSize;
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


export function useProject() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [status, setStatus] = useState<StorageStatus>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [projectName, setProjectName] = useState('');
  const [storageMode, setStorageMode] = useState<'local' | 'drive' | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [driveConflict, setDriveConflict] = useState<{ localData: ProjectData } | null>(null);

  const projectDataRef = useRef(projectData);
  projectDataRef.current = projectData;
  const isConnectingLocal = useRef(false);
  const saveTimeout = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  const storage = useProjectStorage();

  const performSave = useCallback(async () => {
    const dataToSave = projectDataRef.current;
    if (!dataToSave) return;
    
    setSaveStatus('saving');
    try {
        if (storageMode === 'drive') {
            await storage.saveToDrive(dataToSave);
        } else if (storageMode === 'local') {
            await set(LOCAL_BACKUP_KEY, dataToSave);
            await storage.saveToFileHandle(dataToSave);
        }
        setSaveStatus('saved');
    } catch (error) {
        console.error(`Save failed:`, error);
        setSaveStatus('unsaved');
        throw error;
    }
  }, [storage, storageMode]);

  useEffect(() => {
    if (status === 'ready') {
      isInitialLoadRef.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'ready' || !projectData) {
      return;
    }
    if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        return;
    }
    setSaveStatus('unsaved');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(async () => {
      try {
        await performSave();
      } catch (e) { /* Error handled in performSave */ }
    }, 1500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [projectData, status, performSave]);

  const setProjectDataWithSave = (updater: React.SetStateAction<ProjectData | null>) => {
    setProjectData(updater);
  };
  
  const saveNow = useCallback(async () => {
    if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
    }
    if (saveStatus !== 'saved' && projectDataRef.current) {
        try {
            await performSave();
        } catch (error) {
            console.error("Immediate save failed", error);
        }
    }
  }, [saveStatus, performSave]);

  const signOut = useCallback(() => {
    storage.signOut();
    setUserProfile(null);
    setProjectData(null);
    setProjectName('');
    setStorageMode(null);
    setStatus('welcome');
    setDriveConflict(null);
  }, [storage]);

  const createProjectOnDrive = useCallback(async (initialData: ProjectData = defaultProjectData) => {
    setStatus('loading');
    try {
        const { name } = await storage.createOnDrive(initialData);
        setProjectName(name);
        setProjectData(initialData);
        setStatus('ready');
    } catch (error: any) {
        console.error("Error creating project on Google Drive:", error);
        let errorMessage = "Failed to create project on Google Drive.";
        if (error.result?.error?.message) {
            errorMessage += `\n\nDetails: ${error.result.error.message}`;
        }
        alert(errorMessage);
        signOut();
    }
  }, [storage, signOut]);

  const uploadProjectToDrive = useCallback(async () => {
    if (!isFileSystemAccessAPISupported) {
        alert("Your browser doesn't support the File System Access API required for this action.");
        return;
    }
    try {
        const [handle] = await window.showOpenFilePicker({ types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
        const file = await handle.getFile();
        const data = sanitizeProjectData(JSON.parse(await file.text()));
        await createProjectOnDrive(data);
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        alert('Failed to open local file for upload.');
    }
  }, [createProjectOnDrive]);

  const signInWithGoogle = useCallback(() => storage.signIn(), [storage]);

  const connectLocalToDrive = useCallback(() => {
      isConnectingLocal.current = true;
      signInWithGoogle();
  }, [signInWithGoogle]);

  const overwriteDriveProject = useCallback(async () => {
    if (!driveConflict) return;
    setStatus('loading');
    try {
        await storage.saveToDrive(driveConflict.localData);
        setProjectData(driveConflict.localData);
        setProjectName(DRIVE_PROJECT_FILENAME);
        await storage.clearHandleFromIdb();
        setDriveConflict(null);
        setStatus('ready');
    } catch (error: any) {
        console.error("Error overwriting Google Drive project:", error);
        let errorMessage = "Failed to overwrite project on Google Drive.";
        if (error.result?.error?.message) {
            errorMessage += `\n\nDetails: ${error.result.error.message}`;
        }
        alert(errorMessage);
        signOut();
    }
  }, [driveConflict, storage, signOut]);

  const loadDriveProjectAndDiscardLocal = useCallback(async () => {
      if (!driveConflict) return;
      setStatus('loading');
      try {
          const driveProject = await storage.loadFromDrive();
          if (driveProject) {
              setProjectData(sanitizeProjectData(driveProject.data));
              setProjectName(driveProject.name);
              await storage.clearHandleFromIdb();
              setDriveConflict(null);
              setStatus('ready');
          } else {
              throw new Error("Drive project disappeared unexpectedly.");
          }
      } catch (error: any) {
          console.error("Error loading from Google Drive:", error);
          let errorMessage = "Could not load project from Google Drive.";
          if (error.result?.error?.message) {
            errorMessage += `\n\nDetails: ${error.result.error.message}`;
          }
          alert(errorMessage);
          signOut();
      }
  }, [driveConflict, storage, signOut]);
  
  const openLocalProject = useCallback(async () => {
    if (!isFileSystemAccessAPISupported) {
        alert("Your browser doesn't support the File System Access API.");
        return;
    }
    setStatus('loading');
    try {
        const handles = await window.showOpenFilePicker({ types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
        const handle = handles[0];
        if (!handle) {
            setStatus('welcome');
            return;
        }

        const fileData = await storage.loadFromFileHandle(handle);
        if (fileData) {
            const data = sanitizeProjectData(fileData.data);
            await storage.saveHandleToIdb(handle);
            setProjectName(fileData.name);
            setProjectData(data);
            setStorageMode('local');
            setStatus('ready');
        } else {
            alert('Permission to read the file was denied.');
            setStatus('welcome');
        }
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            setStatus('welcome');
        } else {
            console.error('Failed to open file:', error);
            alert('Failed to open or read the selected file. It might be corrupted or in use.');
            setStatus('welcome');
        }
    }
  }, [storage]);
  
  const createLocalProject = useCallback(async () => {
    if (!isFileSystemAccessAPISupported) {
        alert("Your browser doesn't support the File System Access API.");
        return;
    }
    setStatus('loading');
    try {
        const handle = await window.showSaveFilePicker({ suggestedName: 'StoryVerse-Project.json', types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
        await storage.saveHandleToIdb(handle);
        setProjectName(handle.name);
        setProjectData(defaultProjectData);
        await storage.saveToFileHandle(defaultProjectData); // Initial save
        setStorageMode('local');
        setStatus('ready');
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            setStatus('welcome');
        } else {
            console.error('Error creating local project:', error);
            alert('Could not create the project file.');
            setStatus('welcome');
        }
    }
  }, [storage]);
  
  const closeProject = useCallback(async () => {
    await saveNow();
    if (storageMode === 'local') {
        await storage.clearHandleFromIdb();
    }
    setProjectData(null);
    setProjectName('');
    setStorageMode(null);
    setStatus('welcome');
  }, [saveNow, storage, storageMode]);
  
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

  const checkForRecentLocalProject = useCallback(async () => {
    if (isFileSystemAccessAPISupported) {
        const handle = await storage.getHandleFromIdb();
        if (handle) {
            setStatus('loading');
            setStorageMode('local');
            const fileData = await storage.loadFromFileHandle(handle);
            if(fileData) {
                setProjectData(sanitizeProjectData(fileData.data));
                setProjectName(fileData.name);
                setStatus('ready');
                return true;
            } else {
                await storage.clearHandleFromIdb();
            }
        }
    } else {
        const backup: ProjectData | undefined = await get(LOCAL_BACKUP_KEY);
        if (backup) {
            setProjectData(sanitizeProjectData(backup));
            setProjectName('Local Backup');
            setStatus('ready');
            setStorageMode('local');
            return true;
        }
    }
    return false;
  }, [storage]);

  useEffect(() => {
    const handleAuthSuccess = async (profile: UserProfile) => {
        setUserProfile(profile);
        setStorageMode('drive');
        setStatus('loading');

        if (isConnectingLocal.current) {
            isConnectingLocal.current = false;
            try {
                await saveNow();
                const localDataToUpload = projectDataRef.current;
                if (!localDataToUpload) {
                    throw new Error("No local project data to upload.");
                }
                
                const existingDriveProject = await storage.loadFromDrive();

                if (existingDriveProject) {
                    setDriveConflict({ localData: localDataToUpload });
                    setStatus('drive-conflict');
                } else {
                    const { name } = await storage.createOnDrive(localDataToUpload);
                    setProjectName(name);
                    setStatus('ready');
                    await storage.clearHandleFromIdb();
                }
            } catch (error: any) {
                console.error("Error connecting local project to Google Drive:", error);
                let errorMessage = "Failed to save your project to Google Drive.";
                 if (error.result?.error?.message) {
                    errorMessage += `\n\nDetails: ${error.result.error.message}`;
                }
                alert(errorMessage);
                signOut();
            }
        } else {
            try {
                const driveProject = await storage.loadFromDrive();
                if (driveProject) {
                    setProjectData(sanitizeProjectData(driveProject.data));
                    setProjectName(driveProject.name);
                    setStatus('ready');
                } else {
                    setStatus('drive-no-project');
                }
            } catch (error: any) {
                console.error("Error loading from Google Drive:", error);
                let errorMessage = "Could not load project from Google Drive.";
                if (error.result?.error?.message) {
                    errorMessage += `\n\nDetails: ${error.result.error.message}`;
                }
                alert(errorMessage);
                signOut();
            }
        }
    };

    const initializeApp = async () => {
        storage.initializeGapiClient(handleAuthSuccess);
        const loaded = await checkForRecentLocalProject();
        if (!loaded) {
            setStatus('welcome');
        }
    }
    
    if (status === 'loading') {
        initializeApp();
    }
  }, [storage, signOut, status, saveNow, checkForRecentLocalProject]);

  return { 
    projectData, 
    setProjectData: setProjectDataWithSave, 
    status, 
    saveStatus,
    projectName,
    storageMode,
    userProfile,
    signInWithGoogle,
    signOut,
    createProjectOnDrive,
    uploadProjectToDrive,
    connectLocalToDrive,
    createLocalProject, 
    openLocalProject, 
    downloadProject, 
    closeProject,
    overwriteDriveProject,
    loadDriveProjectAndDiscardLocal,
  };
}
