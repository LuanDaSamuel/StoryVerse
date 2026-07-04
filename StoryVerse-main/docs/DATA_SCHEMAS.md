# Data Schemas

This document outlines the core data structures used in the StoryVerse application. 
The main state revolves around the `ProjectData` interface, which encapsulates all user-generated content and settings.

## Core Entities

### ProjectData
The root object that is serialized and stored natively. It holds global settings, the user's daily goals, custom dictionary, their library of novels, and their story ideas (Idea Box).
```typescript
export interface ProjectData {
  settings: {
    theme: Theme;
    baseFontSize: number;
    language: Language;
    writingMode: WritingMode; // 'standard' | 'book-note'
  };
  dailyGoal: DailyGoal;
  userDictionary: string[];
  novels: Novel[];
  ideaFolders: IdeaFolder[];
  storyIdeas: StoryIdea[];
}
```

### Novel
A user's specific written project containing chapters and associated reference sketches.
```typescript
export interface Novel {
  id: string;
  title: string;
  description: string;
  coverImage?: string; // base64 string
  tags: string[];
  chapters: Chapter[];
  sketches: NovelSketch[];
  createdAt: string;
}
```

### Chapter
A section within a Novel. Contains HTML content, local history revisions, and word count statistics.
```typescript
export interface Chapter {
  id: string;
  title: string;
  content: string; // HTML format
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  history: ChapterHistory[];
}
```

### ChapterHistory
Snapshots of a chapter's content at a point in time, enabling Undo/Revert features.
```typescript
export interface ChapterHistory {
  timestamp: string;
  content: string;
}
```

### NovelSketch
A reference document (character sheets, locations, plot notes) attached directly to a specific Novel.
```typescript
export interface NovelSketch {
  id: string;
  title: string;
  content: string; // HTML format
  wordCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### StoryIdea
A loosely structured note or seed idea, part of the distinct "Idea Box" (Demos/Scratchpad area). Can be grouped into folders.
```typescript
export type StoryIdeaStatus = 'Seedling' | 'Developing' | 'Archived';

export interface StoryIdea {
  id: string;
  title: string;
  synopsis: string; // HTML format
  wordCount: number;
  tags: string[];
  status: StoryIdeaStatus;
  folderId?: string;
  visitCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### IdeaFolder
A container to logically organize `StoryIdea` entries.
```typescript
export interface IdeaFolder {
  id: string;
  name: string;
  createdAt: string;
}
```

## Secondary Structures

### DailyGoal
Tracks the user's daily writing output against a target word count.
```typescript
export interface DailyGoal {
  target: number;
  current: number;
  lastUpdated: string; // ISO Date string (YYYY-MM-DD)
}
```

### Settings Types
```typescript
export type Theme = 'dark' | 'book';
export type Language = 'en' | 'vi' | 'fi' | 'sv';
export type WritingMode = 'standard' | 'book-note';
```
