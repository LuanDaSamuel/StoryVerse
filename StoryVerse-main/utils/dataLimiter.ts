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
    MAX_COVER_IMAGE_STRING_LENGTH: 160_000, // ~120KB ceiling for base64 cover images
    MAX_SAFE_PROJECT_JSON_BYTES: 12 * 1024 * 1024, // 12MB ceiling
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
 * Validates and deeply bounds all properties of a ProjectData object to prevent
 * memory overflows, unbounded array growth, and oversized payloads.
 */
export function enforceProjectDataLimits(data: any): ProjectData {
    if (!data || typeof data !== 'object') {
        return JSON.parse(JSON.stringify(defaultProjectData));
    }

    const sanitized: ProjectData = {
        settings: {
            theme: (['dark', 'book'].includes(data.settings?.theme) ? data.settings.theme : 'book') as Theme,
            baseFontSize: typeof data.settings?.baseFontSize === 'number' 
                ? Math.min(Math.max(12, data.settings.baseFontSize), 36) 
                : 18,
            language: (['en', 'vi', 'fi', 'sv'].includes(data.settings?.language) ? data.settings.language : 'en') as Language,
            writingMode: (['standard', 'book-note'].includes(data.settings?.writingMode) ? data.settings.writingMode : 'standard') as WritingMode,
        },
        dailyGoal: {
            target: typeof data.dailyGoal?.target === 'number' ? Math.min(Math.max(0, data.dailyGoal.target), 1_000_000) : 500,
            current: typeof data.dailyGoal?.current === 'number' ? Math.min(Math.max(0, data.dailyGoal.current), 1_000_000) : 0,
            lastUpdated: typeof data.dailyGoal?.lastUpdated === 'string' ? data.dailyGoal.lastUpdated.slice(0, 10) : new Date().toISOString().split('T')[0],
        },
        userDictionary: Array.isArray(data.userDictionary)
            ? data.userDictionary
                .filter((w: any) => typeof w === 'string' && w.trim().length > 0)
                .map((w: string) => w.trim().slice(0, 50))
                .slice(0, DATA_LIMITS.MAX_DICTIONARY_WORDS)
            : [],
        novels: [],
        ideaFolders: [],
        storyIdeas: [],
    };

    // 1. Novels & Chapters
    if (Array.isArray(data.novels)) {
        sanitized.novels = data.novels
            .slice(0, DATA_LIMITS.MAX_NOVELS_COUNT)
            .map((novel: any): Novel => {
                let coverImage: string | undefined = undefined;
                if (typeof novel.coverImage === 'string' && novel.coverImage.startsWith('data:image/')) {
                    // Check if base64 string exceeds max string length
                    if (novel.coverImage.length <= DATA_LIMITS.MAX_COVER_IMAGE_STRING_LENGTH) {
                        coverImage = novel.coverImage;
                    } else {
                        console.warn(`Cover image for novel "${novel.title || 'Untitled'}" exceeds safe limit (${novel.coverImage.length} chars). It will be sanitized.`);
                    }
                }

                const tags = Array.isArray(novel.tags)
                    ? novel.tags
                        .filter((t: any) => typeof t === 'string')
                        .map((t: string) => t.trim().slice(0, DATA_LIMITS.MAX_TAG_CHARS))
                        .slice(0, DATA_LIMITS.MAX_TAGS_COUNT)
                    : [];

                const chapters: Chapter[] = Array.isArray(novel.chapters)
                    ? novel.chapters
                        .slice(0, DATA_LIMITS.MAX_CHAPTERS_PER_NOVEL)
                        .map((ch: any): Chapter => {
                            const rawContent = typeof ch.content === 'string' ? ch.content : '';
                            const content = rawContent.length > DATA_LIMITS.MAX_CHAPTER_CONTENT_CHARS
                                ? rawContent.slice(0, DATA_LIMITS.MAX_CHAPTER_CONTENT_CHARS)
                                : rawContent;

                            const history = Array.isArray(ch.history)
                                ? ch.history
                                    .slice(0, DATA_LIMITS.MAX_HISTORY_ENTRIES_PER_CHAPTER)
                                    .map((h: any) => {
                                        const hContent = typeof h.content === 'string' ? h.content : '';
                                        return {
                                            timestamp: typeof h.timestamp === 'string' ? h.timestamp : new Date().toISOString(),
                                            content: hContent.length > DATA_LIMITS.MAX_HISTORY_ENTRY_CHARS 
                                                ? hContent.slice(0, DATA_LIMITS.MAX_HISTORY_ENTRY_CHARS) 
                                                : hContent,
                                        };
                                    })
                                : [];

                            return {
                                id: typeof ch.id === 'string' && ch.id ? ch.id : crypto.randomUUID(),
                                title: typeof ch.title === 'string' ? ch.title.slice(0, DATA_LIMITS.MAX_TITLE_CHARS) : 'Untitled Chapter',
                                content,
                                wordCount: typeof ch.wordCount === 'number' ? Math.max(0, ch.wordCount) : 0,
                                createdAt: typeof ch.createdAt === 'string' ? ch.createdAt : new Date().toISOString(),
                                updatedAt: typeof ch.updatedAt === 'string' ? ch.updatedAt : new Date().toISOString(),
                                history,
                            };
                        })
                    : [];

                const sketches: NovelSketch[] = Array.isArray(novel.sketches)
                    ? novel.sketches
                        .slice(0, DATA_LIMITS.MAX_SKETCHES_PER_NOVEL)
                        .map((sk: any): NovelSketch => {
                            const rawContent = typeof sk.content === 'string' ? sk.content : '';
                            const content = rawContent.length > DATA_LIMITS.MAX_SKETCH_CONTENT_CHARS
                                ? rawContent.slice(0, DATA_LIMITS.MAX_SKETCH_CONTENT_CHARS)
                                : rawContent;

                            const sketchTags = Array.isArray(sk.tags)
                                ? sk.tags
                                    .filter((t: any) => typeof t === 'string')
                                    .map((t: string) => t.trim().slice(0, DATA_LIMITS.MAX_TAG_CHARS))
                                    .slice(0, DATA_LIMITS.MAX_TAGS_COUNT)
                                : [];

                            return {
                                id: typeof sk.id === 'string' && sk.id ? sk.id : crypto.randomUUID(),
                                title: typeof sk.title === 'string' ? sk.title.slice(0, DATA_LIMITS.MAX_TITLE_CHARS) : 'Untitled Sketch',
                                content,
                                wordCount: typeof sk.wordCount === 'number' ? Math.max(0, sk.wordCount) : 0,
                                tags: sketchTags,
                                createdAt: typeof sk.createdAt === 'string' ? sk.createdAt : new Date().toISOString(),
                                updatedAt: typeof sk.updatedAt === 'string' ? sk.updatedAt : new Date().toISOString(),
                            };
                        })
                    : [];

                return {
                    id: typeof novel.id === 'string' && novel.id ? novel.id : crypto.randomUUID(),
                    title: typeof novel.title === 'string' ? novel.title.slice(0, DATA_LIMITS.MAX_TITLE_CHARS) : 'Untitled Novel',
                    description: typeof novel.description === 'string' ? novel.description.slice(0, DATA_LIMITS.MAX_DESCRIPTION_CHARS) : '',
                    coverImage,
                    tags,
                    chapters,
                    sketches,
                    createdAt: typeof novel.createdAt === 'string' ? novel.createdAt : new Date().toISOString(),
                };
            });
    }

    // 2. Idea Folders
    if (Array.isArray(data.ideaFolders)) {
        sanitized.ideaFolders = data.ideaFolders
            .slice(0, DATA_LIMITS.MAX_IDEA_FOLDERS)
            .map((folder: any): IdeaFolder => ({
                id: typeof folder.id === 'string' && folder.id ? folder.id : crypto.randomUUID(),
                name: typeof folder.name === 'string' ? folder.name.slice(0, DATA_LIMITS.MAX_TITLE_CHARS) : 'Untitled Folder',
                createdAt: typeof folder.createdAt === 'string' ? folder.createdAt : new Date().toISOString(),
            }));
    }

    // 3. Story Ideas
    if (Array.isArray(data.storyIdeas)) {
        const validStatuses: StoryIdeaStatus[] = ['Seedling', 'Developing', 'Archived'];
        sanitized.storyIdeas = data.storyIdeas
            .slice(0, DATA_LIMITS.MAX_STORY_IDEAS)
            .map((idea: any): StoryIdea => {
                const status = validStatuses.includes(idea.status) ? idea.status : 'Seedling';
                const rawSynopsis = typeof idea.synopsis === 'string' ? idea.synopsis : '';
                const synopsis = rawSynopsis.length > DATA_LIMITS.MAX_STORY_IDEA_SYNOPSIS_CHARS
                    ? rawSynopsis.slice(0, DATA_LIMITS.MAX_STORY_IDEA_SYNOPSIS_CHARS)
                    : rawSynopsis;

                const ideaTags = Array.isArray(idea.tags)
                    ? idea.tags
                        .filter((t: any) => typeof t === 'string')
                        .map((t: string) => t.trim().slice(0, DATA_LIMITS.MAX_TAG_CHARS))
                        .slice(0, DATA_LIMITS.MAX_TAGS_COUNT)
                    : [];

                return {
                    id: typeof idea.id === 'string' && idea.id ? idea.id : crypto.randomUUID(),
                    title: typeof idea.title === 'string' ? idea.title.slice(0, DATA_LIMITS.MAX_TITLE_CHARS) : 'Untitled Idea',
                    synopsis,
                    wordCount: typeof idea.wordCount === 'number' ? Math.max(0, idea.wordCount) : 0,
                    tags: ideaTags,
                    status,
                    folderId: typeof idea.folderId === 'string' ? idea.folderId : undefined,
                    visitCount: typeof idea.visitCount === 'number' ? Math.max(0, idea.visitCount) : 0,
                    createdAt: typeof idea.createdAt === 'string' ? idea.createdAt : new Date().toISOString(),
                    updatedAt: typeof idea.updatedAt === 'string' ? idea.updatedAt : new Date().toISOString(),
                };
            });
    }

    // 4. Memory Safety Net: Check total estimated size and prune history if approaching memory danger zone
    const estimatedSize = estimateProjectDataSize(sanitized);
    if (estimatedSize > DATA_LIMITS.MAX_SAFE_PROJECT_JSON_BYTES) {
        console.warn(`Project data size (${(estimatedSize / (1024 * 1024)).toFixed(2)} MB) approaches memory threshold. Auto-pruning history entries to prevent out-of-memory crashes.`);
        return pruneExcessHistory(sanitized, 2);
    }

    return sanitized;
}
