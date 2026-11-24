
import * as React from 'react';
import { ProjectData, StorageStatus, Theme, StoryIdeaStatus, NovelSketch, UserProfile, SaveStatus, Language, WritingMode, DiskSyncState, LocalProjectMeta, LocalFileNotice } from '../types';
import { get, set, del } from 'idb-keyval';
import { useProjectStorage, PermanentAuthError, isNativeFileSystemPickerUsable, requestPermissionSafe } from './useProjectStorage';

// --- Constants ---
const LOCAL_BACKUP_KEY = 'storyverse-local-backup';
const LOCAL_META_KEY = 'storyverse-local-meta';
const LOCAL_UNLOAD_BACKUP_KEY = 'storyverse-unload-backup';
const LOCAL_UNLOAD_META_KEY = 'storyverse-unload-meta';
const LOCAL_UNLOAD_BACKUP_TIMESTAMP_KEY = 'storyverse-unload-backup-timestamp';
const STORAGE_PREFERENCE_KEY = 'storyverse-storage-preference';
const DEFAULT_LOCAL_FILENAME = 'StoryVerse-Project.json';

const defaultProjectData: ProjectData = {
  settings: { theme: 'book', baseFontSize: 18, language: 'en', writingMode: 'standard' },
  dailyGoal: { target: 500, current: 0, lastUpdated: new Date().toISOString().split('T')[0] },
  userDictionary: [],
  novels: [],
  ideaFolders: [],
  storyIdeas: [],
};

// --- Helper Functions ---
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const parseStoryVerseProjectJson = (rawText: string): any => {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    throw new Error('The selected file is empty.');
  }
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The selected file is not a valid StoryVerse JSON object.');
  }
  return parsed;
};

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
      id: novel.id || generateId(),
      title: novel.title || 'Untitled Novel',
      description: novel.description || '',
      coverImage: novel.coverImage,
      tags: Array.isArray(novel.tags) ? novel.tags : [],
      chapters: Array.isArray(novel.chapters)
        ? novel.chapters.map((chapter: any) => ({
            id: chapter.id || generateId(),
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
            id: sketch.id || generateId(),
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
        id: folder.id || generateId(),
        name: folder.name || 'Untitled Folder',
        createdAt: folder.createdAt || new Date().toISOString(),
    }));
  }

  if (Array.isArray(data?.storyIdeas)) {
    sanitized.storyIdeas = data.storyIdeas.map((idea: any) => {
      const validStatuses: StoryIdeaStatus[] = ['Seedling', 'Developing', 'Archived'];
      const status = validStatuses.includes(idea.status) ? idea.status : 'Seedling';
      return {
        id: idea.id || generateId(),
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

function parseTimestampMs(isoOrNull?: string | null): number {
    if (!isoOrNull) return 0;
    const ms = Date.parse(isoOrNull);
    return Number.isFinite(ms) ? ms : 0;
}

export function useProject() {
  const [projectData, setProjectData] = React.useState<ProjectData | null>(null);
  const [status, setStatus] = React.useState<StorageStatus>('loading');
  const [projectName, setProjectName] = React.useState('');
  const [storageMode, setStorageMode] = React.useState<'local' | 'drive' | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');
  const [diskSyncState, setDiskSyncState] = React.useState<DiskSyncState>('browser-local');
  const [localFileNotice, setLocalFileNotice] = React.useState<LocalFileNotice | null>(null);

  const dismissLocalFileNotice = React.useCallback(() => {
    setLocalFileNotice(null);
  }, []);

  const isNativePickerAvailable = React.useMemo(() => isNativeFileSystemPickerUsable(), []);

  const saveStatusRef = React.useRef(saveStatus);
  React.useEffect(() => {
      saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  const storageModeRef = React.useRef(storageMode);
  const setStorageModeSync = React.useCallback((mode: 'local' | 'drive' | null) => {
      storageModeRef.current = mode;
      setStorageMode(mode);
  }, []);

  const projectNameRef = React.useRef(projectName);
  const setProjectNameSync = React.useCallback((name: string) => {
      projectNameRef.current = name;
      setProjectName(name);
  }, []);

  const diskSyncStateRef = React.useRef<DiskSyncState>(diskSyncState);
  const setDiskSyncStateSync = React.useCallback((nextState: DiskSyncState) => {
      diskSyncStateRef.current = nextState;
      setDiskSyncState(nextState);
  }, []);

  const localMetaRef = React.useRef<LocalProjectMeta | null>(null);
  const isInitialLoadRef = React.useRef(true);
  const isDirtyRef = React.useRef(false);
  const isSavingRef = React.useRef(false);
  const hasAttemptedAutoGestureReconnectRef = React.useRef(false);
  const projectDataRef = React.useRef(projectData);

  const storage = useProjectStorage();
  const saveProjectRef = React.useRef<() => Promise<void>>(async () => {});
  const saveTimeoutRef = React.useRef<number | null>(null);
  const localStorageBackupTimeoutRef = React.useRef<number | null>(null);
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

  const writeEmergencyLocalStorageSnapshot = React.useCallback((data: ProjectData, meta: LocalProjectMeta | null) => {
      try {
          localStorage.setItem(LOCAL_UNLOAD_BACKUP_KEY, JSON.stringify(data));
          localStorage.setItem(LOCAL_UNLOAD_BACKUP_TIMESTAMP_KEY, Date.now().toString());
          if (meta) {
              localStorage.setItem(LOCAL_UNLOAD_META_KEY, JSON.stringify(meta));
          }
          localStorage.setItem(STORAGE_PREFERENCE_KEY, 'local');
      } catch (e) {
          console.warn("Could not write emergency localStorage snapshot:", e);
      }
  }, []);

  const persistLocalMirror = React.useCallback(async (data: ProjectData, meta: LocalProjectMeta) => {
      localMetaRef.current = meta;
      writeEmergencyLocalStorageSnapshot(data, meta);
      try {
          await set(LOCAL_BACKUP_KEY, data);
          await set(LOCAL_META_KEY, meta);
      } catch (err) {
          console.warn("Local IDB mirror save failed:", err);
      }
  }, [writeEmergencyLocalStorageSnapshot]);

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
    projectDataRef.current = null;
    setProjectNameSync('');
    setStorageModeSync(null);
    setUserProfile(null);
    setSaveStatus('idle');
    setDiskSyncStateSync('browser-local');
    localMetaRef.current = null;
    isDirtyRef.current = false;
    hasAttemptedAutoGestureReconnectRef.current = false;
    localStorage.removeItem(STORAGE_PREFERENCE_KEY);
  }, [setProjectNameSync, setStorageModeSync, setDiskSyncStateSync]);

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
            const activeMode = storageModeRef.current;
            if (!dataToSave) {
                 isDirtyRef.current = false;
                 break;
            }

            const nowIso = new Date().toISOString();
            const currentMeta: LocalProjectMeta = {
                projectName: localMetaRef.current?.projectName || projectNameRef.current || DEFAULT_LOCAL_FILENAME,
                openedAt: localMetaRef.current?.openedAt || nowIso,
                lastLocalModifiedAt: nowIso,
                lastDiskSyncAt: localMetaRef.current?.lastDiskSyncAt ?? null,
                hasLinkedHandle: localMetaRef.current?.hasLinkedHandle ?? false,
            };

            if (activeMode === 'local') {
                await persistLocalMirror(dataToSave, currentMeta);
            }

            isDirtyRef.current = false;

            const MAX_RETRIES = 2;
            const INITIAL_DELAY_MS = 1000;
            let success = false;
            let lastError: any = null;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    if (activeMode === 'drive') {
                        await storage.saveToDrive(dataToSave);
                        setDiskSyncStateSync('drive');
                        success = true;
                    } else if (activeMode === 'local') {
                        const writeResult = await storage.writeFileToHandle(dataToSave, false);
                        if (writeResult.ok) {
                            const syncedMeta: LocalProjectMeta = {
                                ...currentMeta,
                                lastDiskSyncAt: writeResult.syncedAt,
                                hasLinkedHandle: true,
                            };
                            await persistLocalMirror(dataToSave, syncedMeta);
                            setDiskSyncStateSync('disk-synced');
                            success = true;
                        } else if (writeResult.reason === 'needs-permission') {
                            // Keep handle linked and mirror saved in IDB; user gesture will resume disk sync.
                            setDiskSyncStateSync('needs-permission');
                            success = true;
                        } else if (writeResult.reason === 'no-handle') {
                            setDiskSyncStateSync('browser-local');
                            success = true;
                        } else {
                            setDiskSyncStateSync('disk-error');
                            lastError = writeResult.error || new Error("Disk write failed.");
                        }
                    } else {
                        success = true;
                    }
                    if (success) break;
                } catch (error: any) {
                    lastError = error;
                    if (error instanceof PermanentAuthError || error.name === 'ExpiredVersionError') throw error; 
                    if (attempt < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY_MS * attempt));
                    }
                }
            }
            
            if (success) {
                if (activeMode === 'drive') {
                    localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
                    localStorage.removeItem(LOCAL_UNLOAD_META_KEY);
                    localStorage.removeItem(LOCAL_UNLOAD_BACKUP_TIMESTAMP_KEY);
                }
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
  }, [storage, signOut, persistLocalMirror, setDiskSyncStateSync]);

  React.useEffect(() => {
    saveProjectRef.current = saveProject;
  }, [saveProject]);

  const scheduleAutoSave = React.useCallback((delayMs = 800) => {
    if (!isSavingRef.current) setSaveStatus('unsaved');

    if (storageModeRef.current !== 'drive') {
        if (localStorageBackupTimeoutRef.current) clearTimeout(localStorageBackupTimeoutRef.current);
        localStorageBackupTimeoutRef.current = window.setTimeout(() => {
            if (projectDataRef.current) {
                const nowIso = new Date().toISOString();
                const meta: LocalProjectMeta = {
                    projectName: localMetaRef.current?.projectName || projectNameRef.current || DEFAULT_LOCAL_FILENAME,
                    openedAt: localMetaRef.current?.openedAt || nowIso,
                    lastLocalModifiedAt: nowIso,
                    lastDiskSyncAt: localMetaRef.current?.lastDiskSyncAt ?? null,
                    hasLinkedHandle: localMetaRef.current?.hasLinkedHandle ?? false,
                };
                localMetaRef.current = meta;
                writeEmergencyLocalStorageSnapshot(projectDataRef.current, meta);
            }
        }, 400);
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
        saveProjectRef.current?.();
    }, delayMs);
  }, [writeEmergencyLocalStorageSnapshot]);

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
      return newData;
    });
    scheduleAutoSave(500);
  }, [scheduleAutoSave]);

  const setProjectDataAndMarkDirty = React.useCallback((updater: React.SetStateAction<ProjectData | null>) => {
    setProjectData(prevData => {
        const newData = typeof updater === 'function' ? updater(prevData) : updater;
        projectDataRef.current = newData;
        isDirtyRef.current = true;
        if (newData && broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({ type: 'PROJECT_DATA_REMOTE_UPDATE', data: newData });
        }
        return newData;
    });
    scheduleAutoSave(800);
  }, [scheduleAutoSave]);

  React.useEffect(() => {
    if (saveStatus === 'saved') {
        const timeoutId = setTimeout(() => {
            if (!isDirtyRef.current) setSaveStatus('idle');
        }, 1500); 
        return () => clearTimeout(timeoutId);
    }
  }, [saveStatus]);
    
  React.useEffect(() => {
      const handleBeforeUnloadOrPageHide = () => {
          if (storageModeRef.current === 'local' && projectDataRef.current) {
              const nowIso = new Date().toISOString();
              const meta: LocalProjectMeta = {
                  projectName: localMetaRef.current?.projectName || projectNameRef.current || DEFAULT_LOCAL_FILENAME,
                  openedAt: localMetaRef.current?.openedAt || nowIso,
                  lastLocalModifiedAt: isDirtyRef.current ? nowIso : (localMetaRef.current?.lastLocalModifiedAt || nowIso),
                  lastDiskSyncAt: localMetaRef.current?.lastDiskSyncAt ?? null,
                  hasLinkedHandle: localMetaRef.current?.hasLinkedHandle ?? false,
              };
              writeEmergencyLocalStorageSnapshot(projectDataRef.current, meta);
          }
          flushChanges();
      };
      const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
              handleBeforeUnloadOrPageHide();
          }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pagehide', handleBeforeUnloadOrPageHide);
      window.addEventListener('beforeunload', handleBeforeUnloadOrPageHide);
      return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('pagehide', handleBeforeUnloadOrPageHide);
          window.removeEventListener('beforeunload', handleBeforeUnloadOrPageHide);
      };
  }, [flushChanges, writeEmergencyLocalStorageSnapshot]);

  // --- Resume Disk Sync on User Gesture ---
  const resumeDiskSync = React.useCallback(async (): Promise<boolean> => {
      if (storageModeRef.current !== 'local' || !projectDataRef.current) return false;
      const handle = await storage.getCachedFileHandle();
      if (!handle) return false;

      setSaveStatus('saving');
      const result = await storage.writeFileToHandle(projectDataRef.current, true);
      if (result.ok) {
          const nowIso = result.syncedAt;
          const updatedMeta: LocalProjectMeta = {
              projectName: handle.name || localMetaRef.current?.projectName || projectNameRef.current || DEFAULT_LOCAL_FILENAME,
              openedAt: localMetaRef.current?.openedAt || nowIso,
              lastLocalModifiedAt: localMetaRef.current?.lastLocalModifiedAt || nowIso,
              lastDiskSyncAt: nowIso,
              hasLinkedHandle: true,
          };
          setProjectNameSync(updatedMeta.projectName);
          await persistLocalMirror(projectDataRef.current, updatedMeta);
          setDiskSyncStateSync('disk-synced');
          isDirtyRef.current = false;
          setSaveStatus('saved');
          return true;
      }

      if (result.reason === 'needs-permission') {
          setDiskSyncStateSync('needs-permission');
          setSaveStatus('idle');
      } else {
          setDiskSyncStateSync('disk-error');
          setSaveStatus('error');
      }
      return false;
  }, [storage, persistLocalMirror, setProjectNameSync, setDiskSyncStateSync]);

  // Attempt one automatic permission resume on first user click after reload when handle is pending permission
  React.useEffect(() => {
      if (status !== 'ready' || storageMode !== 'local' || diskSyncState !== 'needs-permission') {
          return;
      }
      if (hasAttemptedAutoGestureReconnectRef.current) {
          return;
      }

      const handleFirstUserClick = async () => {
          if (hasAttemptedAutoGestureReconnectRef.current) return;
          hasAttemptedAutoGestureReconnectRef.current = true;
          await resumeDiskSync();
      };

      window.addEventListener('click', handleFirstUserClick, { capture: true, once: true });
      return () => {
          window.removeEventListener('click', handleFirstUserClick, { capture: true });
      };
  }, [status, storageMode, diskSyncState, resumeDiskSync]);
  
  const handleDriveProject = React.useCallback((driveProject: { name: string, data: any } | null) => {
    if (driveProject) {
        const sanitizedData = sanitizeProjectData(driveProject.data);
        setProjectData(sanitizedData);
        projectDataRef.current = sanitizedData;
        setProjectNameSync(driveProject.name);
        setStorageModeSync('drive');
        setDiskSyncStateSync('drive');
        setStatus('ready');
        del(LOCAL_BACKUP_KEY);
        del(LOCAL_META_KEY);
        localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
        localStorage.removeItem(LOCAL_UNLOAD_META_KEY);
        localStorage.removeItem(LOCAL_UNLOAD_BACKUP_TIMESTAMP_KEY);
    } else {
        setStatus('drive-no-project');
    }
  }, [setProjectNameSync, setStorageModeSync, setDiskSyncStateSync]);

  const signInWithGoogle = React.useCallback(async () => {
    setStatus('loading');
    try {
        await storage.initGapiClient();
        const profile = await storage.signIn();
        setUserProfile(profile);
        setStorageModeSync('drive');
        
        const idbBackup = await get<ProjectData>(LOCAL_BACKUP_KEY);
        const idbMeta = await get<LocalProjectMeta>(LOCAL_META_KEY);
        const driveProject = await storage.loadFromDrive();

        if (driveProject && idbBackup) {
            setProjectNameSync(idbMeta?.projectName || DEFAULT_LOCAL_FILENAME);
            projectDataRef.current = sanitizeProjectData(idbBackup);
            setStatus('drive-conflict');
        } else if (driveProject) {
            handleDriveProject(driveProject);
        } else if (idbBackup) {
            const sanitizedLocal = sanitizeProjectData(idbBackup);
            setProjectData(sanitizedLocal);
            projectDataRef.current = sanitizedLocal;
            setProjectNameSync(idbMeta?.projectName || DEFAULT_LOCAL_FILENAME);
            await storage.createOnDrive(sanitizedLocal);
            setDiskSyncStateSync('drive');
            setStatus('ready');
            del(LOCAL_BACKUP_KEY);
            del(LOCAL_META_KEY);
            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
            localStorage.removeItem(LOCAL_UNLOAD_META_KEY);
        } else {
            setStatus('drive-no-project');
        }
    } catch (error) {
        console.error("Sign in error:", error);
        await storage.signOut();
        resetState();
        setStatus('welcome');
    }
  }, [storage, resetState, handleDriveProject, setStorageModeSync, setProjectNameSync, setDiskSyncStateSync]);
  
  const createProjectOnDrive = React.useCallback(async () => {
    setStatus('loading');
    try {
        const { name } = await storage.createOnDrive(defaultProjectData);
        setProjectNameSync(name);
        setProjectData(defaultProjectData);
        projectDataRef.current = defaultProjectData;
        setStorageModeSync('drive');
        setDiskSyncStateSync('drive');
        setStatus('ready');
        del(LOCAL_BACKUP_KEY);
        del(LOCAL_META_KEY);
        localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
        localStorage.removeItem(LOCAL_UNLOAD_META_KEY);
    } catch (error) {
        alert("Could not create project on Drive.");
        await signOut();
    }
  }, [storage, signOut, setProjectNameSync, setStorageModeSync, setDiskSyncStateSync]);

  const restoreLatestLocalProject = React.useCallback(async (): Promise<boolean> => {
    // 1. Read both emergency localStorage snapshot and IndexedDB mirror + metadata
    let unloadData: ProjectData | null = null;
    let unloadMeta: LocalProjectMeta | null = null;
    const unloadJson = localStorage.getItem(LOCAL_UNLOAD_BACKUP_KEY);
    if (unloadJson) {
        try {
            unloadData = sanitizeProjectData(JSON.parse(unloadJson));
            const unloadMetaRaw = localStorage.getItem(LOCAL_UNLOAD_META_KEY);
            if (unloadMetaRaw) {
                unloadMeta = JSON.parse(unloadMetaRaw);
            } else {
                const ts = localStorage.getItem(LOCAL_UNLOAD_BACKUP_TIMESTAMP_KEY);
                unloadMeta = {
                    projectName: DEFAULT_LOCAL_FILENAME,
                    openedAt: new Date().toISOString(),
                    lastLocalModifiedAt: ts ? new Date(parseInt(ts, 10)).toISOString() : new Date().toISOString(),
                    lastDiskSyncAt: null,
                    hasLinkedHandle: false,
                };
            }
        } catch {
            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
            localStorage.removeItem(LOCAL_UNLOAD_META_KEY);
        }
    }

    const idbDataRaw = await get<ProjectData>(LOCAL_BACKUP_KEY).catch(() => undefined);
    const idbData = idbDataRaw ? sanitizeProjectData(idbDataRaw) : null;
    const idbMeta = await get<LocalProjectMeta>(LOCAL_META_KEY).catch(() => undefined);

    const unloadMs = parseTimestampMs(unloadMeta?.lastLocalModifiedAt);
    const idbMs = parseTimestampMs(idbMeta?.lastLocalModifiedAt);

    let freshestLocalData: ProjectData | null = null;
    let freshestLocalMeta: LocalProjectMeta | null = null;

    if (unloadData && (!idbData || unloadMs >= idbMs)) {
        freshestLocalData = unloadData;
        freshestLocalMeta = unloadMeta || idbMeta || null;
    } else if (idbData) {
        freshestLocalData = idbData;
        freshestLocalMeta = idbMeta || null;
    }

    // 2. Check persisted FileSystemFileHandle without calling requestPermission (non-gesture safe!)
    const handle = await storage.getCachedFileHandle();
    if (handle) {
        const readResult = await storage.readFileFromHandle(handle, false);

        if (readResult.status === 'ok') {
            const diskData = sanitizeProjectData(readResult.data);
            const diskModifiedMs = readResult.lastModified || 0;
            const localModifiedMs = parseTimestampMs(freshestLocalMeta?.lastLocalModifiedAt);
            const lastDiskSyncMs = parseTimestampMs(freshestLocalMeta?.lastDiskSyncAt);

            const localHasNewerUnsyncedEdits = Boolean(
                freshestLocalData && localModifiedMs > Math.max(diskModifiedMs, lastDiskSyncMs) + 500
            );

            const chosenData = localHasNewerUnsyncedEdits && freshestLocalData ? freshestLocalData : diskData;
            const nowIso = new Date().toISOString();
            const chosenMeta: LocalProjectMeta = {
                projectName: readResult.name,
                openedAt: freshestLocalMeta?.openedAt || nowIso,
                lastLocalModifiedAt: localHasNewerUnsyncedEdits && freshestLocalMeta?.lastLocalModifiedAt
                    ? freshestLocalMeta.lastLocalModifiedAt
                    : new Date(diskModifiedMs || Date.now()).toISOString(),
                lastDiskSyncAt: localHasNewerUnsyncedEdits ? (freshestLocalMeta?.lastDiskSyncAt ?? null) : nowIso,
                hasLinkedHandle: true,
            };

            setProjectData(chosenData);
            projectDataRef.current = chosenData;
            setProjectNameSync(readResult.name);
            setStorageModeSync('local');

            if (readResult.writePermission === 'granted') {
                if (localHasNewerUnsyncedEdits) {
                    const syncRes = await storage.writeFileToHandle(chosenData, false);
                    if (syncRes.ok) {
                        chosenMeta.lastDiskSyncAt = syncRes.syncedAt;
                    }
                }
                setDiskSyncStateSync('disk-synced');
            } else {
                setDiskSyncStateSync('needs-permission');
            }

            await persistLocalMirror(chosenData, chosenMeta);
            setStatus('ready');
            return true;
        }

        if (readResult.status === 'needs-permission') {
            // Keep handle permanently linked! Immediately reopen from mirror if available.
            if (freshestLocalData) {
                const nowIso = new Date().toISOString();
                const restoredMeta: LocalProjectMeta = {
                    projectName: handle.name || freshestLocalMeta?.projectName || DEFAULT_LOCAL_FILENAME,
                    openedAt: freshestLocalMeta?.openedAt || nowIso,
                    lastLocalModifiedAt: freshestLocalMeta?.lastLocalModifiedAt || nowIso,
                    lastDiskSyncAt: freshestLocalMeta?.lastDiskSyncAt ?? null,
                    hasLinkedHandle: true,
                };
                setProjectData(freshestLocalData);
                projectDataRef.current = freshestLocalData;
                setProjectNameSync(restoredMeta.projectName);
                setStorageModeSync('local');
                setDiskSyncStateSync('needs-permission');
                await persistLocalMirror(freshestLocalData, restoredMeta);
                setStatus('ready');
                return true;
            }
            // Handle exists without cached mirror yet: open empty safe shell? Better: wait on welcome only if zero data exists.
        }

        if (readResult.status === 'not-found' || readResult.status === 'error') {
            if (freshestLocalData) {
                const nowIso = new Date().toISOString();
                const restoredMeta: LocalProjectMeta = {
                    projectName: freshestLocalMeta?.projectName || handle.name || DEFAULT_LOCAL_FILENAME,
                    openedAt: freshestLocalMeta?.openedAt || nowIso,
                    lastLocalModifiedAt: freshestLocalMeta?.lastLocalModifiedAt || nowIso,
                    lastDiskSyncAt: freshestLocalMeta?.lastDiskSyncAt ?? null,
                    hasLinkedHandle: true,
                };
                setProjectData(freshestLocalData);
                projectDataRef.current = freshestLocalData;
                setProjectNameSync(restoredMeta.projectName);
                setStorageModeSync('local');
                setDiskSyncStateSync('disk-error');
                await persistLocalMirror(freshestLocalData, restoredMeta);
                setStatus('ready');
                return true;
            }
        }
    }

    // 3. No handle (iframe or non-FS-Access browser) — auto-reopen from IndexedDB / localStorage mirror
    if (freshestLocalData) {
        const nowIso = new Date().toISOString();
        const restoredMeta: LocalProjectMeta = {
            projectName: freshestLocalMeta?.projectName || DEFAULT_LOCAL_FILENAME,
            openedAt: freshestLocalMeta?.openedAt || nowIso,
            lastLocalModifiedAt: freshestLocalMeta?.lastLocalModifiedAt || nowIso,
            lastDiskSyncAt: freshestLocalMeta?.lastDiskSyncAt ?? null,
            hasLinkedHandle: Boolean(handle),
        };
        setProjectData(freshestLocalData);
        projectDataRef.current = freshestLocalData;
        setProjectNameSync(restoredMeta.projectName);
        setStorageModeSync('local');
        setDiskSyncStateSync(handle ? 'needs-permission' : 'browser-local');
        await persistLocalMirror(freshestLocalData, restoredMeta);
        setStatus('ready');
        return true;
    }

    return false;
  }, [storage, persistLocalMirror, setProjectNameSync, setStorageModeSync, setDiskSyncStateSync]);

  React.useEffect(() => {
    if (!isInitialLoadRef.current) return;
    isInitialLoadRef.current = false;

    const initializeApp = async () => {
        try {
            const storedProfile = await storage.getStoredProfile();
            
            if (storedProfile) {
                setUserProfile(storedProfile);
                setStorageModeSync('drive');
                try {
                    await storage.initGapiClient();
                    const driveProject = await storage.loadFromDrive();
                    if (driveProject) {
                        handleDriveProject(driveProject);
                    } else {
                        const restoredLocal = await restoreLatestLocalProject();
                        if (restoredLocal) {
                            setStatus('drive-no-project');
                        } else {
                            setStatus('welcome');
                        }
                    }
                } catch (error) {
                    console.warn("Drive boot failed, attempting local fallback:", error);
                    const restoredLocal = await restoreLatestLocalProject();
                    if (!restoredLocal) {
                        setStatus('welcome');
                    }
                }
            } else {
                // Local-first instant boot: do NOT wait for Google API scripts
                const restoredLocal = await restoreLatestLocalProject();
                if (!restoredLocal) {
                    setStatus('welcome');
                }
            }
        } catch (error: any) {
            console.error("App initialization error:", error);
            setStatus('welcome');
        }
    };
    initializeApp();
  }, [storage, restoreLatestLocalProject, handleDriveProject, setStorageModeSync]);

  const fallbackFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const onFallbackFileSelectedRef = React.useRef<(e: Event) => void>(() => {});

  const handleFallbackFileChosen = React.useCallback(async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      target.value = '';
      if (!file) return;

      try {
          const text = await file.text();
          const json = parseStoryVerseProjectJson(text);
          const sanitizedData = sanitizeProjectData(json);
          const nowIso = new Date().toISOString();

          // Opening via standard <input type="file"> cannot yield a FileSystemFileHandle,
          // so unlink any previous file handle to prevent overwriting an older file by mistake.
          await storage.clearHandleFromIdb();

          const meta: LocalProjectMeta = {
              projectName: file.name || DEFAULT_LOCAL_FILENAME,
              openedAt: nowIso,
              lastLocalModifiedAt: nowIso,
              lastDiskSyncAt: null,
              hasLinkedHandle: false,
          };

          setLocalFileNotice(null);
          setProjectNameSync(meta.projectName);
          setProjectData(sanitizedData);
          projectDataRef.current = sanitizedData;
          setStorageModeSync('local');
          setDiskSyncStateSync('browser-local');
          isDirtyRef.current = false;
          hasAttemptedAutoGestureReconnectRef.current = false;
          setSaveStatus('saved');
          setStatus('ready');
          await persistLocalMirror(sanitizedData, meta);
      } catch (err: any) {
          console.error("Failed to open selected project file:", err);
          setLocalFileNotice({
              type: 'invalid-json',
              fileName: file.name,
              detail: err?.message,
              showStandardPickerOption: true,
          });
      }
  }, [storage, persistLocalMirror, setProjectNameSync, setStorageModeSync, setDiskSyncStateSync]);

  React.useEffect(() => {
      onFallbackFileSelectedRef.current = (e: Event) => {
          void handleFallbackFileChosen(e);
      };
  }, [handleFallbackFileChosen]);

  React.useEffect(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.tabIndex = -1;
      input.setAttribute('aria-hidden', 'true');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      input.style.top = '-9999px';
      input.style.width = '1px';
      input.style.height = '1px';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';

      const onChange = (e: Event) => {
          onFallbackFileSelectedRef.current(e);
      };
      input.addEventListener('change', onChange);
      document.body.appendChild(input);
      fallbackFileInputRef.current = input;

      return () => {
          input.removeEventListener('change', onChange);
          input.remove();
          if (fallbackFileInputRef.current === input) {
              fallbackFileInputRef.current = null;
          }
      };
  }, []);

  const openLocalProjectStandard = React.useCallback(() => {
      setLocalFileNotice(null);
      const input = fallbackFileInputRef.current;
      if (input) {
          input.value = '';
          input.click();
          return;
      }
      // Emergency inline fallback if ref is somehow not mounted yet
      const tempInput = document.createElement('input');
      tempInput.type = 'file';
      tempInput.accept = '.json,application/json';
      tempInput.onchange = (ev) => {
          void handleFallbackFileChosen(ev);
          tempInput.remove();
      };
      document.body.appendChild(tempInput);
      tempInput.click();
  }, [handleFallbackFileChosen]);
  
  const openLocalProject = React.useCallback(async () => {
    setLocalFileNotice(null);

    // Check synchronously BEFORE any await so user activation is preserved for <input type="file">!
    if (!isNativeFileSystemPickerUsable()) {
        openLocalProjectStandard();
        return;
    }

    let handle: FileSystemFileHandle | undefined;
    try {
        const picked = await window.showOpenFilePicker({
            types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }]
        });
        handle = picked?.[0];
    } catch (pickerError: any) {
        if (pickerError?.name === 'AbortError') {
            return;
        }
        console.warn("showOpenFilePicker blocked or failed:", pickerError);
        setLocalFileNotice({
            type: 'blocked',
            detail: pickerError?.message || pickerError?.name,
            showStandardPickerOption: true,
        });
        return;
    }

    if (!handle) return;

    let rawContent = '';
    try {
        const file = await handle.getFile();
        rawContent = await file.text();
    } catch (readError: any) {
        console.warn("Failed to read file from handle:", readError);
        setLocalFileNotice({
            type: 'read-error',
            fileName: handle.name,
            detail: readError?.message || readError?.name,
            showStandardPickerOption: true,
        });
        return;
    }

    let sanitizedData: ProjectData;
    try {
        const json = parseStoryVerseProjectJson(rawContent);
        sanitizedData = sanitizeProjectData(json);
    } catch (parseError: any) {
        console.warn("Failed to parse project JSON from handle:", parseError);
        setLocalFileNotice({
            type: 'invalid-json',
            fileName: handle.name,
            detail: parseError?.message,
            showStandardPickerOption: true,
        });
        return;
    }

    await storage.saveHandleToIdb(handle);
    const writePerm = await requestPermissionSafe(handle, 'readwrite');
    const nowIso = new Date().toISOString();
    const meta: LocalProjectMeta = {
        projectName: handle.name,
        openedAt: nowIso,
        lastLocalModifiedAt: nowIso,
        lastDiskSyncAt: writePerm === 'granted' ? nowIso : null,
        hasLinkedHandle: true,
    };

    setProjectNameSync(handle.name);
    setProjectData(sanitizedData);
    projectDataRef.current = sanitizedData;
    setStorageModeSync('local');
    setDiskSyncStateSync(writePerm === 'granted' ? 'disk-synced' : 'needs-permission');
    isDirtyRef.current = false;
    hasAttemptedAutoGestureReconnectRef.current = false;
    setSaveStatus('saved');
    setStatus('ready');
    await persistLocalMirror(sanitizedData, meta);
  }, [storage, openLocalProjectStandard, persistLocalMirror, setProjectNameSync, setStorageModeSync, setDiskSyncStateSync]);

  const linkLocalDiskFile = React.useCallback(async (): Promise<boolean> => {
      if (!projectDataRef.current) return false;
      if (!isNativeFileSystemPickerUsable()) {
          return false;
      }

      try {
          const handle = await window.showSaveFilePicker({
              suggestedName: projectNameRef.current || DEFAULT_LOCAL_FILENAME,
              types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }]
          });
          await storage.saveHandleToIdb(handle);
          const writeResult = await storage.writeFileToHandle(projectDataRef.current, true);
          const nowIso = new Date().toISOString();
          const meta: LocalProjectMeta = {
              projectName: handle.name,
              openedAt: localMetaRef.current?.openedAt || nowIso,
              lastLocalModifiedAt: nowIso,
              lastDiskSyncAt: writeResult.ok ? writeResult.syncedAt : null,
              hasLinkedHandle: true,
          };
          setProjectNameSync(handle.name);
          setStorageModeSync('local');
          setDiskSyncStateSync(writeResult.ok ? 'disk-synced' : 'needs-permission');
          await persistLocalMirror(projectDataRef.current, meta);
          setSaveStatus(writeResult.ok ? 'saved' : 'idle');
          return writeResult.ok;
      } catch (error: any) {
          if (error?.name === 'AbortError') return false;
          console.warn("linkLocalDiskFile failed:", error);
          return false;
      }
  }, [storage, persistLocalMirror, setProjectNameSync, setStorageModeSync, setDiskSyncStateSync]);
  
  const createLocalProject = React.useCallback(async () => {
    const createInBrowserStorage = async () => {
        const nowIso = new Date().toISOString();
        const freshData = JSON.parse(JSON.stringify(defaultProjectData)) as ProjectData;
        await storage.clearHandleFromIdb();
        const meta: LocalProjectMeta = {
            projectName: DEFAULT_LOCAL_FILENAME,
            openedAt: nowIso,
            lastLocalModifiedAt: nowIso,
            lastDiskSyncAt: null,
            hasLinkedHandle: false,
        };
        setProjectNameSync(DEFAULT_LOCAL_FILENAME);
        setProjectData(freshData);
        projectDataRef.current = freshData;
        setStorageModeSync('local');
        setDiskSyncStateSync('browser-local');
        isDirtyRef.current = false;
        hasAttemptedAutoGestureReconnectRef.current = false;
        await persistLocalMirror(freshData, meta);
        setSaveStatus('saved');
        setStatus('ready');
    };

    if (!isNativeFileSystemPickerUsable()) {
        await createInBrowserStorage();
        return;
    }
    
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: DEFAULT_LOCAL_FILENAME,
            types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }]
        });
        setStatus('loading');
        const freshData = JSON.parse(JSON.stringify(defaultProjectData)) as ProjectData;
        await storage.saveHandleToIdb(handle);
        const writeRes = await storage.writeFileToHandle(freshData, true);
        const nowIso = new Date().toISOString();
        const meta: LocalProjectMeta = {
            projectName: handle.name,
            openedAt: nowIso,
            lastLocalModifiedAt: nowIso,
            lastDiskSyncAt: writeRes.ok ? writeRes.syncedAt : null,
            hasLinkedHandle: true,
        };
        setProjectNameSync(handle.name);
        setProjectData(freshData);
        projectDataRef.current = freshData;
        setStorageModeSync('local');
        setDiskSyncStateSync(writeRes.ok ? 'disk-synced' : 'needs-permission');
        isDirtyRef.current = false;
        hasAttemptedAutoGestureReconnectRef.current = false;
        await persistLocalMirror(freshData, meta);
        setSaveStatus('saved');
        setStatus('ready');
    } catch (error: any) {
        if (error?.name === 'AbortError') {
            return;
        }
        console.warn("showSaveFilePicker failed, using automatic browser storage:", error);
        await createInBrowserStorage();
    }
  }, [storage, persistLocalMirror, setProjectNameSync, setStorageModeSync, setDiskSyncStateSync]);
  
  const closeProject = React.useCallback(async () => {
    await flushChanges();
    if (storageModeRef.current === 'local') {
        await storage.clearHandleFromIdb();
    }
    await del(LOCAL_BACKUP_KEY);
    await del(LOCAL_META_KEY);
    localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
    localStorage.removeItem(LOCAL_UNLOAD_META_KEY);
    localStorage.removeItem(LOCAL_UNLOAD_BACKUP_TIMESTAMP_KEY);
    localStorage.removeItem(STORAGE_PREFERENCE_KEY);
    resetState();
    setStatus('welcome');
  }, [flushChanges, storage, resetState]);
  
  const downloadProject = React.useCallback(async () => {
    await flushChanges();
    if (!projectDataRef.current) return;
    const blob = new Blob([JSON.stringify(projectDataRef.current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = projectNameRef.current || 'StoryVerse-Backup.json';
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }, [flushChanges]);

  const uploadProjectToDrive = React.useCallback(async () => {
        if (!projectDataRef.current) return;
        setStatus('loading');
        try {
            await storage.createOnDrive(projectDataRef.current);
            setStorageModeSync('drive');
            setDiskSyncStateSync('drive');
            setStatus('ready');
            del(LOCAL_BACKUP_KEY);
            del(LOCAL_META_KEY);
            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
            localStorage.removeItem(LOCAL_UNLOAD_META_KEY);
        } catch (error) { setStatus('drive-no-project'); }
    }, [storage, setStorageModeSync, setDiskSyncStateSync]);

    const overwriteDriveProject = React.useCallback(async () => {
        if (!projectDataRef.current) return;
        setStatus('loading');
        try {
            await storage.saveToDrive(projectDataRef.current);
            localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
            localStorage.removeItem(LOCAL_UNLOAD_META_KEY);
            del(LOCAL_BACKUP_KEY);
            del(LOCAL_META_KEY);
            localStorage.setItem(STORAGE_PREFERENCE_KEY, 'drive'); 
            setStorageModeSync('drive');
            setDiskSyncStateSync('drive');
            setStatus('ready');
        } catch (e) {
            alert("Could not overwrite cloud project. Check your connection.");
            setStatus('drive-conflict');
        }
    }, [storage, setStorageModeSync, setDiskSyncStateSync]);

    const loadDriveProjectAndDiscardLocal = React.useCallback(async () => {
        setStatus('loading');
        try {
            const driveProject = await storage.loadFromDrive();
            if (driveProject) {
                handleDriveProject(driveProject);
                localStorage.removeItem(LOCAL_UNLOAD_BACKUP_KEY);
                localStorage.removeItem(LOCAL_UNLOAD_META_KEY);
                del(LOCAL_BACKUP_KEY);
                del(LOCAL_META_KEY);
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
    diskSyncState,
    isNativePickerAvailable,
    localFileNotice,
    dismissLocalFileNotice,
    userProfile,
    saveStatus,
    signInWithGoogle,
    signOut,
    createProjectOnDrive,
    createLocalProject, 
    openLocalProject,
    openLocalProjectStandard,
    resumeDiskSync,
    linkLocalDiskFile,
    downloadProject, 
    closeProject,
    uploadProjectToDrive,
    overwriteDriveProject,
    loadDriveProjectAndDiscardLocal,
    connectLocalToDrive: signInWithGoogle,
  };
}
