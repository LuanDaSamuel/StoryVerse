import { create } from 'zustand';
import { ProjectData, StorageStatus, UserProfile, SaveStatus, Theme, StoryIdeaStatus, NovelSketch } from '../types';
import { useProjectStorage, DRIVE_PROJECT_FILENAME } from '../hooks/useProjectStorage';
// FIX: Aliased the `get` import from idb-keyval to `idbGet` to avoid a name collision with Zustand's `get` function inside the store creator.
import { get as idbGet, set, del } from 'idb-keyval';
import { THEME_CONFIG } from '../constants';

const LOCAL_BACKUP_KEY = 'storyverse-local-backup';
const isFileSystemAccessAPISupported = 'showOpenFilePicker' in window;

const defaultProjectData: ProjectData = {
  settings: { theme: 'book', baseFontSize: 18 },
  novels: [],
  storyIdeas: [],
};

const sanitizeProjectData = (data: any): ProjectData => {
  const sanitized = JSON.parse(JSON.stringify(defaultProjectData));
  if (data?.settings) {
    if (['dark', 'book'].includes(data.settings.theme)) sanitized.settings.theme = data.settings.theme as Theme;
    if (typeof data.settings.baseFontSize === 'number') sanitized.settings.baseFontSize = data.settings.baseFontSize;
  }
  if (Array.isArray(data?.novels)) {
    sanitized.novels = data.novels.map((novel: any) => ({
      id: novel.id || crypto.randomUUID(), title: novel.title || 'Untitled Novel', description: novel.description || '', coverImage: novel.coverImage, tags: Array.isArray(novel.tags) ? novel.tags : [],
      chapters: Array.isArray(novel.chapters) ? novel.chapters.map((chapter: any) => ({
            id: chapter.id || crypto.randomUUID(), title: chapter.title || 'Untitled Chapter', content: chapter.content || '', wordCount: typeof chapter.wordCount === 'number' ? chapter.wordCount : 0,
            createdAt: chapter.createdAt || new Date().toISOString(), updatedAt: chapter.updatedAt || new Date().toISOString(), history: Array.isArray(chapter.history) ? chapter.history : [],
      })) : [],
      sketches: Array.isArray(novel.sketches) ? novel.sketches.map((sketch: any): NovelSketch => ({
            id: sketch.id || crypto.randomUUID(), title: sketch.title || 'Untitled Sketch', content: sketch.content || '', tags: Array.isArray(sketch.tags) ? sketch.tags : [],
            createdAt: sketch.createdAt || new Date().toISOString(), updatedAt: sketch.updatedAt || new Date().toISOString(),
      })) : [],
      createdAt: novel.createdAt || new Date().toISOString(),
    }));
  }
  if (Array.isArray(data?.storyIdeas)) {
    sanitized.storyIdeas = data.storyIdeas.map((idea: any) => {
      const validStatuses: StoryIdeaStatus[] = ['Seedling', 'Developing', 'Archived'];
      const status = validStatuses.includes(idea.status) ? idea.status : 'Seedling';
      return {
        id: idea.id || crypto.randomUUID(), title: idea.title || 'Untitled Idea', synopsis: idea.synopsis || '', wordCount: typeof idea.wordCount === 'number' ? idea.wordCount : 0,
        tags: Array.isArray(idea.tags) ? idea.tags : [], status: status, createdAt: idea.createdAt || new Date().toISOString(), updatedAt: idea.updatedAt || new Date().toISOString(),
      };
    });
  }
  return sanitized;
};

interface ProjectState {
  projectData: ProjectData | null;
  status: StorageStatus;
  projectName: string;
  storageMode: 'local' | 'drive' | null;
  userProfile: UserProfile | null;
  saveStatus: SaveStatus;
  isSaving: boolean;
  isDirty: boolean;
  saveTimeout: number | null;
  storage: ReturnType<typeof useProjectStorage>;
}

interface ProjectActions {
  initialize: () => Promise<void>;
  setProjectData: (updater: (data: ProjectData | null) => ProjectData | null) => void;
  saveProject: () => Promise<void>;
  flushChanges: () => Promise<void>;
  resetState: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  createProjectOnDrive: () => Promise<void>;
  uploadProjectToDrive: () => Promise<void>;
  openLocalProject: () => Promise<void>;
  createLocalProject: () => Promise<void>;
  closeProject: () => Promise<void>;
  downloadProject: () => Promise<void>;
  overwriteDriveProject: () => Promise<void>;
  loadDriveProjectAndDiscardLocal: () => Promise<void>;
}

export const useProjectStore = create<ProjectState & ProjectActions>((set, get) => ({
  projectData: null,
  status: 'loading',
  projectName: '',
  storageMode: null,
  userProfile: null,
  saveStatus: 'idle',
  isSaving: false,
  isDirty: false,
  saveTimeout: null,
  storage: useProjectStorage(),

  setProjectData: (updater) => {
    const { projectData, isSaving, saveTimeout, saveProject } = get();
    const newData = updater(projectData);

    if (JSON.stringify(newData) !== JSON.stringify(projectData)) {
      set({ projectData: newData, isDirty: true });
      if (!isSaving) {
        set({ saveStatus: 'unsaved' });
      }
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      const newTimeout = window.setTimeout(() => saveProject(), 1000);
      set({ saveTimeout: newTimeout });
    }
  },

  saveProject: async () => {
    const { isSaving, isDirty, projectData, storageMode, storage } = get();
    if (isSaving || !isDirty) return;

    set({ isSaving: true, isDirty: false, saveStatus: 'saving' });

    if (!projectData) {
      console.error("Attempted to save but no project data was available.");
      set({ saveStatus: 'error', isSaving: false, isDirty: true });
      return;
    }

    try {
      if (storageMode === 'drive') {
        await storage.saveToDrive(projectData);
      } else if (storageMode === 'local') {
        await set(LOCAL_BACKUP_KEY, projectData);
        await storage.saveToFileHandle(projectData);
      }
      set({ saveStatus: 'saved', isSaving: false });
      setTimeout(() => set(state => state.saveStatus === 'saved' ? { saveStatus: 'idle' } : {}), 1500);
    } catch (error) {
      console.error("Save failed:", error);
      set({ saveStatus: 'error', isSaving: false, isDirty: true });
    }
  },

  flushChanges: async () => {
    const { saveTimeout, isSaving, isDirty, saveProject } = get();
    if (saveTimeout) clearTimeout(saveTimeout);
    if (!isSaving && isDirty) await saveProject();
    while (get().isSaving) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },
  
  resetState: () => set({ projectData: null, projectName: '', storageMode: null, userProfile: null, saveStatus: 'idle', isDirty: false }),

  initialize: async () => {
    const { storage, resetState } = get();
    try {
      const profile = await storage.initAndRestoreSession();
      const getLocalProjectData = async () => {
        if (isFileSystemAccessAPISupported) {
          const handle = await storage.getHandleFromIdb();
          if (handle) {
            const fileData = await storage.loadFromFileHandle(handle);
            if (fileData) return fileData;
          }
        }
        // FIX: Used the aliased `idbGet` to prevent conflict with Zustand's `get`.
        const backup = await idbGet<ProjectData>(LOCAL_BACKUP_KEY);
        if (backup) return { name: 'Local Backup', data: backup };
        return null;
      };

      if (profile) {
        set({ userProfile: profile, storageMode: 'drive' });
        const localData = await getLocalProjectData();
        const driveProject = await storage.loadFromDrive();
        if (driveProject && localData) {
          set({ projectData: sanitizeProjectData(localData.data), projectName: localData.name, status: 'drive-conflict' });
        } else if (driveProject) {
          set({ projectData: sanitizeProjectData(driveProject.data), projectName: driveProject.name, status: 'ready' });
        } else {
          set({ status: 'drive-no-project' });
        }
      } else {
        const localData = await getLocalProjectData();
        if (localData) {
          set({ projectData: sanitizeProjectData(localData.data), projectName: localData.name, status: 'ready', storageMode: 'local' });
        } else {
          set({ status: 'welcome' });
        }
      }
    } catch (error) {
      console.error("Initialization failed:", error);
      resetState();
      set({ status: 'welcome' });
    }
  },

  signInWithGoogle: async () => {
    const { storage, resetState, createOnDrive } = get();
    set({ status: 'loading' });
    try {
      const profile = await storage.signIn();
      set({ userProfile: profile, storageMode: 'drive' });
      const driveProject = await storage.loadFromDrive();
      if (driveProject) {
        set({ projectData: sanitizeProjectData(driveProject.data), projectName: driveProject.name, status: 'ready' });
      } else {
        await createOnDrive();
      }
    } catch (error) {
      console.error("Sign in failed:", error);
      await storage.signOut();
      resetState();
      set({ status: 'welcome' });
    }
  },

  signOut: async () => {
    const { flushChanges, storage, resetState } = get();
    set({ status: 'loading' });
    await flushChanges();
    await storage.signOut();
    resetState();
    set({ status: 'welcome' });
  },

  createProjectOnDrive: async () => {
    const { storage, signOut } = get();
    set({ status: 'loading' });
    try {
      const { name } = await storage.createOnDrive(defaultProjectData);
      set({ projectName: name, projectData: defaultProjectData, status: 'ready' });
    } catch (error) {
      alert("Failed to create project on Google Drive.");
      await signOut();
    }
  },
  
  uploadProjectToDrive: async () => {
    const { projectData, storage } = get();
    if (!projectData) return;
    set({ status: 'loading' });
    try {
      await storage.createOnDrive(projectData);
      set({ status: 'ready' });
    } catch (error) {
      alert("Failed to upload project to Google Drive.");
      set({ status: 'drive-no-project' });
    }
  },

  openLocalProject: async () => {
    if (!isFileSystemAccessAPISupported) return alert("Your browser doesn't support the File System Access API.");
    set({ status: 'loading' });
    const { storage } = get();
    try {
      const [handle] = await window.showOpenFilePicker({ types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
      const fileData = await storage.loadFromFileHandle(handle);
      if (fileData) {
        await storage.saveHandleToIdb(handle);
        set({ projectName: fileData.name, projectData: sanitizeProjectData(fileData.data), storageMode: 'local', status: 'ready' });
      } else {
        set({ status: 'welcome' });
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('Failed to open file:', error);
      set({ status: 'welcome' });
    }
  },

  createLocalProject: async () => {
    if (!isFileSystemAccessAPISupported) return alert("Your browser doesn't support the File System Access API.");
    set({ status: 'loading' });
    const { storage } = get();
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: 'StoryVerse-Project.json', types: [{ description: 'StoryVerse Projects', accept: { 'application/json': ['.json'] } }] });
      await storage.saveHandleToIdb(handle);
      await storage.saveToFileHandle(defaultProjectData);
      set({ projectName: handle.name, projectData: defaultProjectData, storageMode: 'local', status: 'ready' });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('Error creating local project:', error);
      set({ status: 'welcome' });
    }
  },
  
  closeProject: async () => {
    const { flushChanges, storage, storageMode, resetState } = get();
    await flushChanges();
    if (storageMode === 'local') {
      await storage.clearHandleFromIdb();
      await del(LOCAL_BACKUP_KEY);
    }
    resetState();
    set({ status: 'welcome' });
  },

  downloadProject: async () => {
    const { flushChanges, projectData, projectName } = get();
    await flushChanges();
    if (!projectData) return;
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = projectName || 'StoryVerse-Backup.json';
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  },

  overwriteDriveProject: async () => {
    const { projectData, storage } = get();
    if (!projectData) return;
    set({ status: 'loading' });
    await storage.saveToDrive(projectData);
    await storage.clearHandleFromIdb();
    await del(LOCAL_BACKUP_KEY);
    set({ status: 'ready' });
  },

  loadDriveProjectAndDiscardLocal: async () => {
    set({ status: 'loading' });
    const { storage } = get();
    const driveProject = await storage.loadFromDrive();
    if (driveProject) {
      set({ projectData: sanitizeProjectData(driveProject.data), projectName: driveProject.name, status: 'ready' });
      await storage.clearHandleFromIdb();
      await del(LOCAL_BACKUP_KEY);
    } else {
      set({ status: 'drive-no-project' });
    }
  },

}));

// Add selectors for convenience and performance
export const useTheme = () => useProjectStore(state => state.projectData?.settings?.theme || 'book');
export const useThemeClasses = () => {
    const theme = useTheme();
    return THEME_CONFIG[theme];
};

// Initialize the app
useProjectStore.getState().initialize();

// Warn user before leaving with unsaved changes.
window.addEventListener('beforeunload', (event) => {
    const { saveStatus } = useProjectStore.getState();
    if (['unsaved', 'saving', 'error'].includes(saveStatus)) {
        event.preventDefault();
        event.returnValue = '';
        return '';
    }
});