import React, { createContext } from 'react';
import { ProjectData, Theme, ThemeConfig, SaveStatus, Project } from '../types';

interface ProjectContextType {
  projectData: ProjectData | null;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  downloadCopy: () => void;
  unlinkFile: (projectId: string) => void;
  saveProject: (data: ProjectData) => Promise<void>;
  theme: Theme;
  themeClasses: ThemeConfig;
  saveStatus: SaveStatus;
  
  // For multi-project management
  projects: Project[];
  activeProjectId: string | null;
  createProject: (name: string) => Promise<void>;
  importProject: (fileContent: string, name: string) => Promise<void>;
  switchProject: (projectId: string) => void;
  deleteProject: (projectId: string) => Promise<void>;
  renameProject: (projectId: string, newName: string) => Promise<void>;
}

export const ProjectContext = createContext<ProjectContextType>({
  projectData: null,
  setProjectData: () => {},
  downloadCopy: () => {},
  unlinkFile: () => {},
  saveProject: async () => {},
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

  // Multi-project defaults
  projects: [],
  activeProjectId: null,
  createProject: async () => {},
  importProject: async () => {},
  switchProject: () => {},
  deleteProject: async () => {},
  renameProject: async () => {},
});