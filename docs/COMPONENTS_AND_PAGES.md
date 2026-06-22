# Components and Pages

This document catalogs the primary React components and pages that compose the StoryVerse front-end.

## Pages routing (via `react-router-dom`)
- **`HomePage.tsx`** (`/`): The dashboard view. Displays daily writing goals, recent novels, and global progress.
- **`DemosPage.tsx`** (`/demos`): The "Idea Box". A separate repository for untethered novel ideas and sketches organized into folders.
- **`CreateNovelPage.tsx`** (`/create`): A wizard for creating a new novel. Allows entering title, description, and tags.
- **`NovelDetailPage.tsx`** (`/novel/:id`): The hub for a specific novel. Displays the chapter list, metadata, and controls for exporting or managing sketches.
- **`ChapterEditorPage.tsx`** (`/novel/:novelId/chapter/:chapterId`): The primary rich text writing interface. Facilitates drafting the prose with word counting and revision histories.
- **`ReadNovelPage.tsx`** (`/novel/:id/read`): A distraction-free reader mode that stitches together all chapters of a novel into a continuous flow.
- **`SketchesPage.tsx`** (`/novel/:id/sketches`): Organizes supplemental reference "sketches" (characters, locations, plot notes) related to a specific novel.
- **`SketchEditorPage.tsx`** (`/novel/:novelId/sketch/:sketchId`): The editor explicitly built for writing novel-specific reference sketches.
- **`StoryIdeaEditorPage.tsx`** (`/idea/:id`): An editor tailored for writing and refining independent "Story Ideas".
- **`WorkingModelPage.tsx`** (`/working-model`): The "Parallel Working" mode interface. This unique view allows side-by-side editing where users can select reference documents in the left pane and draft content in the right pane simultaneously.

## Core Components
These UI pieces are reused throughout the app, found in `/components/`.

- **`Sidebar.tsx`**: Main global navigation. Houses links to Home, Idea Box, Parallel Working, distinct Novels, and Settings.
- **`Icons.tsx`**: SVGR function components for all visual icons (used extensively in toolbars and sidebars).
- **`ConfirmModal.tsx`**: A generic reusable modal for destructive actions (e.g., "Are you sure you want to delete this chapter?").
- **`SettingsModal.tsx`**: Global configuration interface allowing users to adjust preferences like Theme (`dark` | `book`), Font Size, Language, and Writing Mode.
- **`ExportModal.tsx`**: Interface for downloading content. Formats typically support TXT and DOCX via dynamically loaded libraries.
- **`WelcomeScreen.tsx`**: First-time user experience or splash screen when opening the application.
- **`NovelHistoryPage.tsx`**: Dedicated view (often rendered functionally within editors) for comparing and reverting to past iterations of a text.

## Contexts
- **`ProjectContext`** (`/contexts/ProjectContext.tsx`): The monolithic React Context provider wrapping the application. It acts as the pipeline between components and the persistent storage backend (the File System API and JSON serialization). It provides `projectData`, `setProjectData`, `themeClasses`, `isLoading`, and `t` (translations context).
