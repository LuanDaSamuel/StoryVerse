# Agent Custom Instructions

Welcome to the StoryVerse codebase! This project manages complex state and rich-text editing for a single-page application focused on creative writing.

## Important Rule: Reference Documentation
To prevent regressions and ensure consistency whenever implementing new features or making significant updates, you **MUST** consult the Markdown specifications located in the `/docs/` directory before proceeding:

1. **`docs/ARCHITECTURE.md`**: Read to understand the high-level code structure and data flow.
2. **`docs/DATA_SCHEMAS.md`**: Read before modifying `types.ts`, `ProjectData`, or any state-saving mechanisms.
3. **`docs/COMPONENTS_AND_PAGES.md`**: Read before creating new components or views to reuse existing patterns.
4. **`docs/OVERVIEW.md`**: Read for context on the core product vision.
5. **`docs/SPECS.md`**: Read for technical limitations, styling rules, and bundler/port configurations.

By reading these documents whenever a complex request is made, you will ensure subsequent updates adhere perfectly to the established design patterns and state lifecycles.
