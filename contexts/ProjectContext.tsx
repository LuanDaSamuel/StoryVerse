import React, { createContext } from 'react';
import { ProjectData, Theme, ThemeConfig, UserProfile, SaveStatus } from '../types';

interface ProjectContextType {
  projectData: ProjectData | null;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  downloadProject: () => Promise<void>;
  closeProject: () => void;
  theme: Theme;
  themeClasses: ThemeConfig;
  projectName: string;
  saveStatus: SaveStatus;
  // Google Drive & Auth properties
  storageMode: 'local' | 'drive' | null;
  userProfile: UserProfile | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  createProjectOnDrive: () => void;
  uploadProjectToDrive: () => void;
  connectLocalToDrive: () => void;
  // Drive Conflict Resolution
  overwriteDriveProject: () => void;
  loadDriveProjectAndDiscardLocal: () => void;
}

export const ProjectContext = createContext<ProjectContextType>({
  projectData: null,
  setProjectData: () => {},
  downloadProject: async () => {},
  closeProject: () => {},
  theme: 'dark',
  themeClasses: {
    bg: '',
    bgSecondary: '',
    bgTertiary: '',
    text: '',
    textSecondary: '',
    accent: '',
    accentText: '',
    accentBorder: '',
    border: '',
    input: '',
    logoColor: '',
  },
  projectName: '',
  saveStatus: 'idle',
  storageMode: null,
  userProfile: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  createProjectOnDrive: () => {},
  uploadProjectToDrive: () => {},
  connectLocalToDrive: () => {},
  overwriteDriveProject: () => {},
  loadDriveProjectAndDiscardLocal: () => {},
});