export type Theme = 'dark' | 'light' | 'sakura' | 'book' | 'jungle';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

export interface ChapterHistory {
  timestamp: string;
  content: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  history: ChapterHistory[];
}

export interface Novel {
  id:string;
  title: string;
  description: string;
  coverImage?: string; // base64 string
  tags: string[];
  chapters: Chapter[];
  createdAt: string;
}

export interface Sketch {
  id: string;
  title: string;
  content: string; // HTML content
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData {
  settings: {
    theme: Theme;
  };
  novels: Novel[];
  sketches: Sketch[];
}

export interface Project {
    id: string;
    name: string;
    data: ProjectData;
}


export type FileStatus = 'loading' | 'welcome' | 'ready' | 'error';

export interface ThemeConfig {
    bg: string;
    bgSecondary: string;
    bgTertiary: string;
    text: string;
    textSecondary: string;
    accent: string;
    accentText: string;
    accentBorder: string;
    border: string;
    input: string;
    logoColor: string;
}