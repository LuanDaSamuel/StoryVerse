# Application Overview

**StoryVerse** is an advanced, offline-first web application designed dedicatedly for authors and novelists. It serves as a comprehensive writing environment similar to Scrivener but implemented fully within a modern browser. 

## Key Features

1. **Rich Novel Management:** Users can maintain multiple distinct novels. Within novels, content is hierarchically broken down into granular Chapters, enabling structured drafting.
2. **Dedicated Reference System:** In tandem with chapter drafting, users can build connected "Sketches"—profiles for characters, world-building lore, locations, and narrative arcs.
3. **Parallel Working Mode:** A standout productivity feature allowing a "split-screen" experience. Writers can load a sketch, historical chapter, imported `.docx` file or "Story Idea" on the left, and author fresh content on the right, removing the need to constantly flip between tabs.
4. **The "Idea Box":** A completely untethered repository (often referred to internally as `storyIdeas` or via the `DemosPage.tsx`) where fragmented, embryonic concepts can be stored, refined, and organized into folders before escalating into a full Novel.
5. **Robust Revision History:** Destructive edits are mitigated by automatic snapshotting. Authors can restore previous iterations of chapters.
6. **Cross-Format Exporting:** The platform supports exporting raw texts or richly formatted `.docx` outputs, giving writers portability for publishing.
7. **Offline-First Persistence:** Utilizing the Native File System Access API where supported, or robust local application state, all data is retained client-side without relying on continuous cloud connections or restrictive central databases.
8. **Customization & Accessibility:** Writers can tailor their physical workspace through highly configurable font sizes, line heights, translation/localizations, and ambient visual themes (e.g., standard "Dark" vs. warm "Book").

## Target Audience
Designed for serious amateurs to professional novelists managing sprawling, complex narratives that require significant organizational capabilities layered atop a focused writing interface.
