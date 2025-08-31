
import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectData, FileStatus, SaveStatus, Theme } from '../types';
import { get, set, del } from 'idb-keyval';

const LOCAL_BACKUP_KEY = 'storyverse-local-backup';
const AUTO_BACKUP_DIR_HANDLE_KEY = 'storyverse-auto-backup-dir-handle';
const AUTO_BACKUP_FILENAME = 'StoryVerse-AutoBackup.json';

const defaultProjectData: ProjectData = {
  settings: {
    theme: 'book',
  },
  novels: [],
  sketches: [],
};

const sanitizeProjectData = (data: any): ProjectData => {
  const sanitized = JSON.parse(JSON.stringify(defaultProjectData));
  if (data?.settings?.theme) {
    sanitized.settings.theme = data.settings.theme as Theme;
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
      createdAt: novel.createdAt || new Date().toISOString(),
    }));
  }
  if (Array.isArray(data?.sketches)) {
    sanitized.sketches = data.sketches.map((sketch: any) => ({
      id: sketch.id || crypto.randomUUID(),
      title: sketch.title || 'Untitled Sketch',
      content: sketch.content || '',
      createdAt: sketch.createdAt || new Date().toISOString(),
      updatedAt: sketch.updatedAt || new Date().toISOString(),
    }));
  }
  return sanitized;
};

async function verifyPermission(handle: FileSystemHandle) {
    const options = { mode: 'readwrite' as const };
    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await handle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
}

export function useProjectFile() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [status, setStatus] = useState<FileStatus>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [autoBackupDirHandle, setAutoBackupDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isBackupLinked, setIsBackupLinked] = useState(false);
  const [linkedBackupName, setLinkedBackupName] = useState('');
  
  const saveTimeout = useRef<number | null>(null);
  const dataVersion = useRef(0);
  const lastSavedVersion = useRef(0);

  const projectDataRef = useRef(projectData);
  projectDataRef.current = projectData;
  const autoBackupDirHandleRef = useRef(autoBackupDirHandle);
  autoBackupDirHandleRef.current = autoBackupDirHandle;
  const saveStatusRef = useRef(saveStatus);
  saveStatusRef.current = saveStatus;

  useEffect(() => {
    const init = async () => {
      try {
        const rawData: any | undefined = await get(LOCAL_BACKUP_KEY);
        if (rawData) {
          const data = sanitizeProjectData(rawData);
          projectDataRef.current = data;
          setProjectData(data);
          setStatus('ready');
        } else {
          setStatus('welcome');
        }
        
        const handle: FileSystemDirectoryHandle | undefined = await get(AUTO_BACKUP_DIR_HANDLE_KEY);
        if (handle && await verifyPermission(handle)) {
            setAutoBackupDirHandle(handle);
            setIsBackupLinked(true);
            setLinkedBackupName(handle.name);
        } else {
            await del(AUTO_BACKUP_DIR_HANDLE_KEY);
        }
      } catch (error) {
        console.error('Error loading from local backup:', error);
        setStatus('welcome');
      }
    };
    init();
  }, []);

  const saveProjectToLocal = useCallback(async (data: ProjectData, version: number) => {
    setSaveStatus('saving');
    try {
      await set(LOCAL_BACKUP_KEY, data);
      lastSavedVersion.current = version;

      if (autoBackupDirHandleRef.current) {
          try {
              const fileHandle = await autoBackupDirHandleRef.current.getFileHandle(AUTO_BACKUP_FILENAME, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(JSON.stringify(data, null, 2));
              await writable.close();
          } catch (error) {
              console.error('Auto-backup to file system failed:', error);
              if (error instanceof DOMException && error.name === 'NotAllowedError') {
                  await del(AUTO_BACKUP_DIR_HANDLE_KEY);
                  setAutoBackupDirHandle(null);
                  setIsBackupLinked(false);
                  setLinkedBackupName('');
              }
          }
      }
      if (dataVersion.current === lastSavedVersion.current) {
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Error saving to local backup:', error);
      setSaveStatus('unsaved');
    }
  }, []);

  useEffect(() => {
    if (status === 'ready' && projectData && saveStatus === 'unsaved') {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      
      const versionToSave = dataVersion.current;
      saveTimeout.current = window.setTimeout(() => {
        if (projectDataRef.current) {
            saveProjectToLocal(projectDataRef.current, versionToSave);
        }
      }, 1000);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [projectData, status, saveStatus, saveProjectToLocal]);

  const setProjectDataWithSave = (updater: React.SetStateAction<ProjectData | null>) => {
    dataVersion.current++;
    setSaveStatus('unsaved');
    const newData = typeof updater === 'function'
        ? (updater as (prevState: ProjectData | null) => ProjectData | null)(projectDataRef.current)
        : updater;
    projectDataRef.current = newData;
    setProjectData(newData);
  };
  
  const saveNow = useCallback(async () => {
    if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
    }
    if (status === 'ready' && projectDataRef.current && saveStatusRef.current === 'unsaved') {
        await saveProjectToLocal(projectDataRef.current, dataVersion.current);
    }
  }, [status, saveProjectToLocal]);

  const createProject = useCallback(async () => {
    await set(LOCAL_BACKUP_KEY, defaultProjectData);
    await del(AUTO_BACKUP_DIR_HANDLE_KEY);
    projectDataRef.current = defaultProjectData;
    setProjectData(defaultProjectData);
    setAutoBackupDirHandle(null);
    setIsBackupLinked(false);
    setLinkedBackupName('');
    setStatus('ready');
    setSaveStatus('saved');
  }, []);

  const openProject = useCallback(async () => {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }],
        });
        const file = await fileHandle.getFile();
        const fileContent = await file.text();
        const rawData = JSON.parse(fileContent);

        if (rawData && rawData.settings && Array.isArray(rawData.novels)) {
            const data = sanitizeProjectData(rawData);
            await set(LOCAL_BACKUP_KEY, data);
            projectDataRef.current = data;
            setProjectData(data);
            setStatus('ready');
            setSaveStatus('saved');
        } else {
            throw new Error('Invalid project file format.');
        }
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error opening project file:', error);
        alert('Failed to open file.');
    }
  }, []);
  
  const downloadProject = useCallback(async () => {
    await saveNow();
    const dataToSave = projectDataRef.current;
    if (!dataToSave) return;

    try {
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        const suggestedName = `StoryVerse-Backup-${timestamp}.json`;

        const newHandle = await window.showSaveFilePicker({
            suggestedName,
            types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await newHandle.createWritable();
        await writable.write(JSON.stringify(dataToSave, null, 2));
        await writable.close();
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error saving project file:', error);
        alert('Failed to save file.');
    }
  }, [saveNow]);

  const closeProject = useCallback(async () => {
    await saveNow();
    await del(LOCAL_BACKUP_KEY);
    await del(AUTO_BACKUP_DIR_HANDLE_KEY);
    projectDataRef.current = null;
    setProjectData(null);
    setAutoBackupDirHandle(null);
    setIsBackupLinked(false);
    setLinkedBackupName('');
    setStatus('welcome');
  }, [saveNow]);
  
  const linkBackupDirectory = useCallback(async () => {
      try {
          const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
          if (await verifyPermission(dirHandle)) {
              await set(AUTO_BACKUP_DIR_HANDLE_KEY, dirHandle);
              setAutoBackupDirHandle(dirHandle);
              setIsBackupLinked(true);
              setLinkedBackupName(dirHandle.name);
              // Trigger a save immediately to create the backup file
              if (projectDataRef.current) {
                  await saveProjectToLocal(projectDataRef.current, dataVersion.current);
              }
          }
      } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.error('Error linking backup directory:', error);
          alert('Could not link directory. Please ensure you grant permission.');
      }
  }, [saveProjectToLocal]);
  
  const unlinkBackupDirectory = useCallback(async () => {
      await del(AUTO_BACKUP_DIR_HANDLE_KEY);
      setAutoBackupDirHandle(null);
      setIsBackupLinked(false);
      setLinkedBackupName('');
  }, []);

  return { 
    projectData, 
    setProjectData: setProjectDataWithSave, 
    status, 
    saveStatus,
    isBackupLinked,
    linkedBackupName,
    createProject, 
    openProject, 
    downloadProject, 
    closeProject,
    linkBackupDirectory,
    unlinkBackupDirectory,
  };
}
