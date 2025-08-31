export type Theme = 'dark' | 'book';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

export type SpellcheckLang = 'en' | 'fi' | 'vi' | 'browser-default';

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
    spellcheckLanguage: SpellcheckLang;
  };
  novels: Novel[];
  sketches: Sketch[];
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