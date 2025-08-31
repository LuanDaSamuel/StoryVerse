
import React, { createContext } from 'react';
import { ProjectData, Theme, ThemeConfig, SaveStatus } from '../types';

interface ProjectContextType {
  projectData: ProjectData | null;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  downloadProject: () => Promise<void>;
  closeProject: () => void;
  theme: Theme;
  themeClasses: ThemeConfig;
  saveStatus: SaveStatus;
  projectName: string;
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
});
