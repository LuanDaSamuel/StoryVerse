import { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectData, FileStatus, SaveStatus } from '../types';
import { get, set, del } from 'idb-keyval';

const PROJECT_DATA_KEY = 'storyverse-project-data';

const defaultProjectData: ProjectData = {
  settings: {
    theme: 'book',
  },
  novels: [],
  sketches: [],
};

export function useProjectFile() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [status, setStatus] = useState<FileStatus>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  
  const hasUnsavedChanges = useRef(false);
  const saveTimeout = useRef<number | null>(null);
  const dataVersion = useRef(0);
  const lastSavedVersion = useRef(0);
  
  const projectDataRef = useRef(projectData);
  useEffect(() => {
    projectDataRef.current = projectData;
  }, [projectData]);


  useEffect(() => {
    const init = async () => {
      try {
        const data: ProjectData | undefined = await get(PROJECT_DATA_KEY);
        if (data) {
          let needsUpdate = false;
          const tempDiv = document.createElement('div');

          data.novels.forEach(novel => {
            if (novel.chapters && Array.isArray(novel.chapters)) {
              novel.chapters.forEach(chapter => {
                const oldWordCount = chapter.wordCount || 0;
                
                tempDiv.innerHTML = chapter.content || '';
                const text = tempDiv.textContent || "";
                const newWordCount = text.trim().split(/\s+/).filter(Boolean).length;

                if (oldWordCount !== newWordCount) {
                  chapter.wordCount = newWordCount;
                  needsUpdate = true;
                }
              });
            }
          });
          
          if (!data.sketches) {
            data.sketches = [];
            needsUpdate = true;
          }

          if (needsUpdate) {
            await set(PROJECT_DATA_KEY, data);
          }

          setProjectData(data);
          setStatus('ready');
        } else {
          setStatus('welcome');
        }
      } catch (error) {
        console.error('Error loading project from DB:', error);
        setStatus('welcome');
      }
    };
    init();
  }, []);
  
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const saveProject = useCallback(async (data: ProjectData, version: number) => {
    setSaveStatus('saving');
    try {
      await set(PROJECT_DATA_KEY, data);
      lastSavedVersion.current = version;
      
      // Only mark as 'saved' if the version we just saved is still the latest version.
      // If they don't match, it means a new edit occurred while we were saving,
      // and another save has already been scheduled.
      if (dataVersion.current === lastSavedVersion.current) {
        hasUnsavedChanges.current = false;
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Error saving project to DB:', error);
      setSaveStatus('unsaved');
    }
  }, []);
  
  const forceSave = useCallback(async () => {
    if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
    }
    if (hasUnsavedChanges.current && projectDataRef.current) {
        await saveProject(projectDataRef.current, dataVersion.current);
    }
  }, [saveProject]);
  
  useEffect(() => {
      const handlePageHide = () => {
          if (hasUnsavedChanges.current && projectDataRef.current) {
              saveProject(projectDataRef.current, dataVersion.current);
          }
      };
      window.addEventListener('pagehide', handlePageHide);
      return () => {
          window.removeEventListener('pagehide', handlePageHide);
      };
  }, [saveProject]);


  useEffect(() => {
    if (status === 'ready' && projectData && hasUnsavedChanges.current) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      
      const versionToSave = dataVersion.current;
      saveTimeout.current = window.setTimeout(() => {
        // Use the ref for data to ensure we save the absolute latest version,
        // even if another update happened since this effect ran.
        if (projectDataRef.current) {
            saveProject(projectDataRef.current, versionToSave);
        }
      }, 1500);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [projectData, status, saveProject]);

  const setProjectDataWithSave = (updater: React.SetStateAction<ProjectData | null>) => {
    dataVersion.current++;
    hasUnsavedChanges.current = true;
    setSaveStatus('unsaved');
    setProjectData(updater);
  };

  const createProject = useCallback(async () => {
    const theme = projectData?.settings?.theme || 'book';
    const newProjectData = { ...defaultProjectData, settings: { theme } };
    
    dataVersion.current++;
    lastSavedVersion.current = dataVersion.current;
    
    await set(PROJECT_DATA_KEY, newProjectData);
    
    setProjectData(newProjectData);
    setStatus('ready');
    setSaveStatus('saved');
    hasUnsavedChanges.current = false;
  }, [projectData?.settings?.theme]);

  const importProject = useCallback(async (fileContent: string) => {
    try {
      const data: ProjectData = JSON.parse(fileContent);
      if (data && data.settings && Array.isArray(data.novels)) {
        
        const tempDiv = document.createElement('div');
        data.novels.forEach(novel => {
            if (novel.chapters && Array.isArray(novel.chapters)) {
                novel.chapters.forEach(chapter => {
                    if (typeof chapter.content === 'string') {
                        tempDiv.innerHTML = chapter.content;
                        const text = tempDiv.textContent || "";
                        chapter.wordCount = text.trim().split(/\s+/).filter(Boolean).length;
                    } else {
                        chapter.wordCount = 0;
                    }
                });
            }
        });

        if (!data.sketches) {
          data.sketches = [];
        }

        dataVersion.current++;
        lastSavedVersion.current = dataVersion.current;
        await set(PROJECT_DATA_KEY, data);

        setProjectData(data);
        setStatus('ready');
        setSaveStatus('saved');
        hasUnsavedChanges.current = false;
      } else {
        throw new Error('Invalid project file format.');
      }
    } catch (error) {
      console.error('Error importing project file:', error);
      alert('Failed to import file. It may be corrupted or not a valid StoryVerse project file.');
    }
  }, []);

  const exportProject = useCallback(async () => {
    await forceSave();
    const dataToDownload = projectDataRef.current;
    if (!dataToDownload) return;

    try {
      const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'StoryVerse-Project.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export project file', error);
      alert('Failed to export project file.');
    }
  }, [forceSave]);

  const deleteProject = useCallback(async () => {
    await forceSave();
    
    hasUnsavedChanges.current = false;
    setProjectData(null);
    await del(PROJECT_DATA_KEY);
    setStatus('welcome');
  }, [forceSave]);

  return { 
    projectData, 
    setProjectData: setProjectDataWithSave, 
    status, 
    saveStatus,
    createProject, 
    importProject, 
    exportProject, 
    deleteProject,
    saveProject 
  };
}