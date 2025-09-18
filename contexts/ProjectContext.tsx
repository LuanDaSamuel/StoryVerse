import React, { createContext } from 'react';
import { ProjectData, Theme, ThemeConfig, SaveStatus, UserProfile } from '../types';

interface ProjectContextType {
  projectData: ProjectData | null;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  downloadProject: () => Promise<void>;
  closeProject: () => void;
  theme: Theme;
  themeClasses: ThemeConfig;
  saveStatus: SaveStatus;
  projectName: string;
  // Google Drive & Auth properties
  storageMode: 'local' | 'drive' | null;
  userProfile: UserProfile | null;
  signInWithGoogle: () => void;
  signOut: () => void;
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
  saveStatus: 'saved',
  projectName: '',
  storageMode: null,
  userProfile: null,
  signInWithGoogle: () => {},
  signOut: () => {},
  createProjectOnDrive: () => {},
  uploadProjectToDrive: () => {},
  connectLocalToDrive: () => {},
  overwriteDriveProject: () => {},
  loadDriveProjectAndDiscardLocal: () => {},
});