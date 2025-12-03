export type Theme = 'dark' | 'book';
export type Language = 'en' | 'vi' | 'fi';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

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
  sketches: NovelSketch[];
  createdAt: string;
}

export interface NovelSketch {
  id: string;
  title: string;
  content: string; // HTML content
  wordCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AggregatedSketch extends NovelSketch {
  novelId: string;
  novelTitle: string;
}

export type StoryIdeaStatus = 'Seedling' | 'Developing' | 'Archived';

export interface IdeaFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface StoryIdea {
  id: string;
  title: string;
  synopsis: string; // HTML content
  wordCount: number;
  tags: string[];
  status: StoryIdeaStatus;
  folderId?: string; // Optional: if undefined/null, it's in the root
  createdAt: string;
  updatedAt: string;
}

export interface DailyGoal {
  target: number;
  current: number;
  lastUpdated: string; // ISO Date string (YYYY-MM-DD)
}

export interface ProjectData {
  settings: {
    theme: Theme;
    baseFontSize: number;
    language: Language;
  };
  dailyGoal: DailyGoal;
  userDictionary: string[];
  novels: Novel[];
  ideaFolders: IdeaFolder[];
  storyIdeas: StoryIdea[];
}

export type StorageStatus = 'loading' | 'welcome' | 'ready' | 'error' | 'drive-no-project' | 'drive-conflict';

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

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