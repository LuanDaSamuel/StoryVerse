

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectData, FileStatus, SaveStatus } from '../types';
import { get, set, del } from 'idb-keyval';

const LOCAL_BACKUP_KEY = 'storyverse-local-backup';

const defaultProjectData: ProjectData = {
  settings: {
    theme: 'book',
    spellcheckLanguage: 'en',
    customDictionary: [],
  },
  novels: [],
  sketches: [],
};

// --- Data Sanitization Function ---
// This function ensures that any loaded project data (from a file or local backup)
// conforms to the current data structure. It prevents crashes from missing properties
// (e.g., trying to read `.length` of a non-existent `tags` array) on older project files.
const sanitizeProjectData = (data: any): ProjectData => {
  const sanitized = JSON.parse(JSON.stringify(defaultProjectData));

  // Merge settings safely
  if (data?.settings) {
    sanitized.settings = { ...sanitized.settings, ...data.settings };
  }
  if (!Array.isArray(sanitized.settings.customDictionary)) {
      sanitized.settings.customDictionary = [];
  }

  // Sanitize novels and their nested structures
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

  // Sanitize sketches
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


export function useProjectFile() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [status, setStatus] = useState<FileStatus>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  
  const saveTimeout = useRef<number | null>(null);
  const dataVersion = useRef(0);
  const lastSavedVersion = useRef(0);
  const projectDataRef = useRef(projectData);

  // Effect to load data from local backup on initial load
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
      if (dataVersion.current === lastSavedVersion.current) {
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Error saving to local backup:', error);
      setSaveStatus('unsaved');
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (status === 'ready' && projectData && saveStatus === 'unsaved') {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      
      const versionToSave = dataVersion.current;
      saveTimeout.current = window.setTimeout(() => {
        if (projectDataRef.current) {
            saveProjectToLocal(projectDataRef.current, versionToSave);
        }
      }, 1000); // Auto-save after 1 second of inactivity
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

  const createProject = useCallback(async () => {
    const newProjectData = { ...defaultProjectData };
    await set(LOCAL_BACKUP_KEY, newProjectData);
    projectDataRef.current = newProjectData;
    setProjectData(newProjectData);
    setStatus('ready');
    setSaveStatus('saved');
  }, []);

  const openProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
            const fileContent = await file.text();
            const rawData: any = JSON.parse(fileContent);
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
            console.error('Error opening project file:', error);
            alert('Failed to open file. It may be corrupted or not a valid StoryVerse project file.');
        }
    };
    input.click();
  }, []);

  const downloadProject = useCallback(() => {
    const dataToSave = projectDataRef.current;
    if (!dataToSave) return;

    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'StoryVerse-Project.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSaveStatus('saved'); // Downloading is a form of saving
  }, []);

  const closeProject = useCallback(async () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    await del(LOCAL_BACKUP_KEY);
    projectDataRef.current = null;
    setProjectData(null);
    setStatus('welcome');
  }, []);

  return { 
    projectData, 
    setProjectData: setProjectDataWithSave, 
    status, 
    saveStatus,
    createProject, 
    openProject, 
    downloadProject, 
    closeProject
  };
}