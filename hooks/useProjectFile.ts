
import * as React from 'react';
import { ProjectData, StorageStatus, Theme, StoryIdeaStatus, NovelSketch, UserProfile, SaveStatus, Language, WritingMode } from '../types';
import { get, set, del } from 'idb-keyval';
import { useProjectStorage } from './useProjectStorage';

// --- Constants ---
const LOCAL_BACKUP_KEY = 'storyverse-local-backup';
const LOCAL_UNLOAD_BACKUP_KEY = 'storyverse-unload-backup';
const isFileSystemAccessAPISupported = 'showOpenFilePicker' in window;

// Sync Speed Optimization
const CLOUD_SAVE_IDLE_MS = 3000; // Wait 3s of idleness to save to Firebase
const LOCAL_SAVE_DEBOUNCE_MS = 800;

const defaultProjectData: ProjectData = {
  settings: { theme: 'book', baseFontSize: 18, language: 'en', writingMode: 'standard' },
  dailyGoal: { target: 500, current: 0, lastUpdated: new Date().toISOString().split('T')[0] },
  userDictionary: [],
  novels: [],
  ideaFolders: [],
  storyIdeas: [],
};

const sanitizeProjectData = (data: any): ProjectData => {
  const sanitized = JSON.parse(JSON.stringify(defaultProjectData));
  if (data?.settings) {
    if (['dark', 'book'].includes(data.settings.theme)) sanitized.settings.theme = data.settings.theme as Theme;
    if (typeof data.settings.baseFontSize === 'number') sanitized.settings.baseFontSize = data.settings.baseFontSize;
    if (['en', 'vi', 'fi', 'sv'].includes(data.settings.language)) sanitized.settings.language = data.settings.language as Language;
    if (['standard', 'book-note'].includes(data.settings.writingMode)) sanitized.settings.writingMode = data.settings.writingMode as WritingMode;
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
  const [storageMode, setStorageMode] = React.useState<'local' | 'cloud' | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');

  const isDirtyRef = React.useRef(false);
  const isSavingRef = React.useRef(false);
  const projectDataRef = React.useRef(projectData);
  const saveProjectRef = React.useRef<() => Promise<void>>(async () => {});
  const saveTimeoutRef = React.useRef<number | null>(null);
  const storage = useProjectStorage();

  const resetState = React.useCallback(() => {
    setProjectData(null);
    setProjectName('');
    setStorageMode(null);
    setUserProfile(null);
    setSaveStatus('idle');
    isDirtyRef.current = false;
  }, []);

  const saveProject = React.useCallback(async () => {
    if (isSavingRef.current || !isDirtyRef.current || !projectDataRef.current) return;

    isSavingRef.current = true;
    setSaveStatus('saving');
    
    try {
        const dataToSave = projectDataRef.current;
        if (storageMode === 'cloud') {
            await storage.saveToCloud(dataToSave);
        } else if (storageMode === 'local') {
            await Promise.all([
                storage.saveToFileHandle(dataToSave),
                set(LOCAL_BACKUP_KEY, dataToSave)
            ]);
        }
        isDirtyRef.current = false;
        setSaveStatus('saved');
        localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
    } catch (error) {
        console.error("Cloud save failed:", error);
        setSaveStatus('error');
    } finally {
        isSavingRef.current = false;
        if (isDirtyRef.current) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = window.setTimeout(() => saveProjectRef.current(), 5000);
        }
    }
  }, [storage, storageMode]);

  React.useEffect(() => { saveProjectRef.current = saveProject; }, [saveProject]);

  const setProjectDataAndMarkDirty = React.useCallback((updater: React.SetStateAction<ProjectData | null>) => {
    setProjectData(prevData => {
        const newData = typeof updater === 'function' ? updater(prevData) : updater;
        projectDataRef.current = newData;
        isDirtyRef.current = true;
        return newData;
    });
    
    if (!isSavingRef.current) setSaveStatus('unsaved');
    
    if (storageMode === 'local') {
        localStorage.setItem(LOCAL_UNLOAD_BACKUP_KEY, JSON.stringify(projectDataRef.current));
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const delay = storageMode === 'cloud' ? CLOUD_SAVE_IDLE_MS : LOCAL_SAVE_DEBOUNCE_MS;
    saveTimeoutRef.current = window.setTimeout(() => saveProjectRef.current(), delay); 
  }, [storageMode]);

  const signInWithGoogle = React.useCallback(async () => {
    setStatus('loading');
    try {
        const profile = await storage.signIn();
        setUserProfile(profile);
        setStorageMode('cloud');
        const cloudData = await storage.loadFromCloud();
        if (cloudData) {
            const sanitized = sanitizeProjectData(cloudData.data);
            setProjectData(sanitized);
            projectDataRef.current = sanitized;
            setProjectName(cloudData.name);
            setStatus('ready');
            del(LOCAL_BACKUP_KEY);
            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
        } else {
            setStatus('drive-no-project');
        }
    } catch (e) {
        setStatus('welcome');
    }
  }, [storage]);

  React.useEffect(() => {
    const unsubscribe = storage.subscribeToAuthState(async (user) => {
        if (user) {
            setStorageMode('cloud');
            setUserProfile({ name: user.displayName || '', email: user.email || '', picture: user.photoURL || '' });
            const cloudData = await storage.loadFromCloud();
            if (cloudData) {
                const sanitized = sanitizeProjectData(cloudData.data);
                setProjectData(sanitized);
                projectDataRef.current = sanitized;
                setProjectName(cloudData.name);
                setStatus('ready');
                del(LOCAL_BACKUP_KEY);
                localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
            } else {
                setStatus('drive-no-project');
            }
        } else {
            const local = await get(LOCAL_BACKUP_KEY);
            if (local) {
                const sanitized = sanitizeProjectData(local);
                setProjectData(sanitized);
                projectDataRef.current = sanitized;
                setStorageMode('local');
                setStatus('ready');
            } else {
                setStatus('welcome');
            }
        }
    });
    return () => unsubscribe();
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
    signOut: async () => {
        await storage.signOut();
        resetState();
        setStatus('welcome');
    },
    createProjectOnDrive: () => {
        setProjectData(defaultProjectData);
        projectDataRef.current = defaultProjectData;
        isDirtyRef.current = true;
        saveProjectRef.current();
        setStatus('ready');
    }, 
    createLocalProject: async () => { /* Logic in App.tsx */ }, 
    openLocalProject: async () => { /* Logic in App.tsx */ }, 
    downloadProject: async () => {
        if (!projectDataRef.current) return;
        const blob = new Blob([JSON.stringify(projectDataRef.current, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName || 'StoryVerse'}-Backup.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, 
    closeProject: async () => {
        if (storageMode === 'cloud') {
            await storage.signOut();
        }
        resetState();
        setStatus('welcome');
    },
    uploadProjectToDrive: async () => {
        if (!projectDataRef.current) return;
        setStatus('loading');
        try {
            await storage.saveToCloud(projectDataRef.current);
            setStatus('ready');
            del(LOCAL_BACKUP_KEY);
            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
        } catch (error) { setStatus('drive-no-project'); }
    },
    overwriteDriveProject: () => {},
    loadDriveProjectAndDiscardLocal: () => {},
    connectLocalToDrive: signInWithGoogle,
  };
}
