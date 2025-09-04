export type Theme = 'dark' | 'book';

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
  // FIX: Added sketches to the Novel type to support the sketches feature.
  sketches: NovelSketch[];
  createdAt: string;
}

// FIX: Added NovelSketch type to define the structure of a novel sketch.
export interface NovelSketch {
  id: string;
  title: string;
  content: string; // HTML content
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// FIX: Added AggregatedSketch type which extends NovelSketch with novel context.
export interface AggregatedSketch extends NovelSketch {
  novelId: string;
  novelTitle: string;
}

export type StoryIdeaStatus = 'Seedling' | 'Developing' | 'Archived';

export interface StoryIdea {
  id: string;
  title: string;
  synopsis: string; // HTML content
  tags: string[];
  status: StoryIdeaStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData {
  settings: {
    theme: Theme;
  };
  novels: Novel[];
  storyIdeas: StoryIdea[];
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
