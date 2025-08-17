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

  useEffect(() => {
    const init = async () => {
      try {
        const data: ProjectData | undefined = await get(PROJECT_DATA_KEY);
        if (data) {
          let needsUpdate = false;
          const tempDiv = document.createElement('div');

          // Iterate through all novels and chapters to ensure word counts are accurate.
          data.novels.forEach(novel => {
            if (novel.chapters && Array.isArray(novel.chapters)) {
              novel.chapters.forEach(chapter => {
                const oldWordCount = chapter.wordCount || 0;
                
                // Use a temporary element to strip HTML and get plain text
                tempDiv.innerHTML = chapter.content || '';
                const text = tempDiv.textContent || "";
                const newWordCount = text.trim().split(/\s+/).filter(Boolean).length;

                // If the count is different, update it.
                if (oldWordCount !== newWordCount) {
                  chapter.wordCount = newWordCount;
                  needsUpdate = true;
                }
              });
            }
          });
          
          // Migration check for the 'sketches' property
          if (!data.sketches) {
            data.sketches = [];
            needsUpdate = true;
          }

          // If any counts were updated, save the corrected data back to the database.
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
  
  // Effect to warn user before leaving with unsaved changes.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        event.preventDefault();
        // Modern browsers show a generic message, but setting returnValue is required.
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);


  const saveProject = useCallback(async (data: ProjectData) => {
    setSaveStatus('saving');
    try {
      await set(PROJECT_DATA_KEY, data);
      hasUnsavedChanges.current = false;
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving project to DB:', error);
      setSaveStatus('unsaved');
    }
  }, []);

  useEffect(() => {
    if (status === 'ready' && projectData && hasUnsavedChanges.current) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = window.setTimeout(() => {
        saveProject(projectData);
      }, 1500); // Debounce save
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [projectData, status, saveProject]);

  const setProjectDataWithSave = (updater: React.SetStateAction<ProjectData | null>) => {
    hasUnsavedChanges.current = true;
    setSaveStatus('unsaved');
    setProjectData(updater);
  };

  const createProject = useCallback(async () => {
    const theme = projectData?.settings?.theme || 'book';
    const newProjectData = { ...defaultProjectData, settings: { theme } };
    await saveProject(newProjectData);
    setProjectData(newProjectData);
    setStatus('ready');
  }, [projectData, saveProject]);

  const importProject = useCallback(async (fileContent: string) => {
    try {
      const data: ProjectData = JSON.parse(fileContent);
      if (data && data.settings && Array.isArray(data.novels)) {
        
        // Recalculate word counts for all chapters on import
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

        // Migration check for sketches on import
        if (!data.sketches) {
          data.sketches = [];
        }

        await saveProject(data);
        setProjectData(data);
        setStatus('ready');
      } else {
        throw new Error('Invalid project file format.');
      }
    } catch (error) {
      console.error('Error importing project file:', error);
      alert('Failed to import file. It may be corrupted or not a valid StoryVerse project file.');
    }
  }, [saveProject]);

  const downloadCopy = useCallback(() => {
    if (!projectData) return;
    try {
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'StoryVerse-Project.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download a copy', error);
      alert('Failed to download project copy.');
    }
  }, [projectData]);

  const deleteProject = useCallback(async () => {
    setProjectData(null);
    await del(PROJECT_DATA_KEY);
    setStatus('welcome');
  }, []);

  return { 
    projectData, 
    setProjectData: setProjectDataWithSave, 
    status, 
    saveStatus,
    createProject, 
    importProject, 
    downloadCopy, 
    deleteProject,
    saveProject 
  };
}