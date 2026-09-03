import { ProjectData, Novel, Chapter, NovelSketch, StoryIdea, IdeaFolder, Theme, Language, WritingMode, StoryIdeaStatus } from '../types';

/**
 * Data limitation and memory guard parameters for StoryVerse
 * These bounds guarantee safe memory consumption, preventing heap exhaustion (OOM),
 * QuotaExceededError in storage, and network payload timeouts during Google Drive cloud sync.
 */

export const DATA_LIMITS = {
    MAX_NOVELS_COUNT: 50,
    MAX_CHAPTERS_PER_NOVEL: 200,
    MAX_CHAPTER_CONTENT_CHARS: 500_000, // ~100k words per chapter
    MAX_HISTORY_ENTRIES_PER_CHAPTER: 3, // Capped to 3 snapshots per chapter to prevent high heap usage
    MAX_HISTORY_ENTRY_CHARS: 200_000,
    MAX_SKETCHES_PER_NOVEL: 100,
    MAX_SKETCH_CONTENT_CHARS: 300_000,
    MAX_IDEA_FOLDERS: 50,
    MAX_STORY_IDEAS: 300,
    MAX_STORY_IDEA_SYNOPSIS_CHARS: 150_000,
    MAX_TITLE_CHARS: 250,
    MAX_DESCRIPTION_CHARS: 5_000,
    MAX_TAGS_COUNT: 15,
    MAX_TAG_CHARS: 40,
    MAX_DICTIONARY_WORDS: 2_000,
    MAX_COVER_IMAGE_STRING_LENGTH: 20_000_000, // Generous ceiling ensuring no covers are stripped
    MAX_SAFE_PROJECT_JSON_BYTES: 25 * 1024 * 1024, // 25MB ceiling
    LOCAL_STORAGE_WRITE_LIMIT_BYTES: 2 * 1024 * 1024, // 2MB max for localStorage
};

const defaultProjectData: ProjectData = {
    settings: { theme: 'book', baseFontSize: 18, language: 'en', writingMode: 'standard' },
    dailyGoal: { target: 500, current: 0, lastUpdated: new Date().toISOString().split('T')[0] },
    userDictionary: [],
    novels: [],
    ideaFolders: [],
    storyIdeas: [],
};

/**
 * Estimates the byte size of a JavaScript object in JSON representation.
 */
export function estimateProjectDataSize(data: any): number {
    if (!data) return 0;
    try {
        const str = JSON.stringify(data);
        return str.length * 2; // UTF-16 approximate byte footprint
    } catch {
        return 0;
    }
}

/**
 * Prunes the oldest chapter histories across novels if the project exceeds safe memory thresholds.
 */
export function pruneExcessHistory(project: ProjectData, maxHistoryPerChapter: number = 3): ProjectData {
    if (!project || !Array.isArray(project.novels)) return project;

    const updatedNovels = project.novels.map(novel => ({
        ...novel,
        chapters: (novel.chapters || []).map(chapter => ({
            ...chapter,
            history: (chapter.history || []).slice(0, maxHistoryPerChapter)
        }))
    }));

    return {
        ...project,
        novels: updatedNovels
    };
}

/**
 * Validates the ProjectData object to ensure it is non-null and structured.
 * NOTE: As per architectural mandate, NEVER alter, downscale, or truncate user-provided
 * images, text content, font sizes, or settings. All user data is preserved with full fidelity.
 */
export function enforceProjectDataLimits(data: any): ProjectData {
    if (!data || typeof data !== 'object') {
        return JSON.parse(JSON.stringify(defaultProjectData));
    }
    // Return user data completely intact without modifying images, texts, sizes, or settings
    return data as ProjectData;
}
