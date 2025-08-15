import React, { createContext } from 'react';
import { ProjectData, Theme, ThemeConfig, SaveStatus } from '../types';

interface ProjectContextType {
  projectData: ProjectData | null;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  downloadCopy: () => void;
  unlinkFile: () => void; // This will be mapped to deleteProject for compatibility
  saveProject: (data: ProjectData) => Promise<void>;
  theme: Theme;
  themeClasses: ThemeConfig;
  saveStatus: SaveStatus;
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
});