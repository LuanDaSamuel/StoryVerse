# Architecture

## High-Level Architecture
StoryVerse employs a strictly client-side Single Page Application (SPA) architecture engineered around React. All application logic runs entirely within the web browser. 

The architecture purposely avoids heavy server-side backends or network-dependent databases. 

1.  **View Layer (React):** The UI is declarative and broken down into isolated components and explicit page routes using `react-router-dom`. Tailwind CSS is used heavily for unified structural styling and theming.
2.  **State Management (React Context):** Instead of using Redux or Zustand, the state of the user's entire library is lifted into a single monolithic provider (`ProjectContext`).
3.  **Persistence Layer:** The core differentiator. Data relies strictly on local storage mechanisms. The primary aim is generating a massive, serialized JSON structure `data.json` reflecting the `ProjectContext`, saving securely offline.

## Core Modules & Data Flow

### The Project Context Lifecycle
1.  **Initialization:** On boot (`App.tsx`), `ProjectContext` mounts and checks for locally stored configurations or attempts to reconnect with a persisted file handle. 
2.  **State Mutability:** Context pushes the `projectData` downward. All mutations (adding a chapter, updating a word count, moving an idea) occur via pure function updates passed into `setProjectData`. 
3.  **Autosave:** Mutations to `projectData` trigger debounced writes back to the physical file system asynchronously. This protects against data loss.

### Editors & Content Handling
The application uses highly customized implementations of `contentEditable` `div`s rather than encapsulating heavy external rich-text editors. This provides maximum control over DOM sanitization (`enhanceHtml()`), semantic HTML mapping, and specific keyboard bindings.

-   **HTML Content:** Chapters, Sketches, and Ideas are structurally stored within the JSON tree as sanitized stringified HTML (not Markdown or proprietary abstract syntax trees).
-   **Parallel Processing:** The `WorkingModelPage` uniquely instantiates two concurrent panes. Left-pane loads read-only or distinct reference data states. Right-pane acts as a standard editor block linked to active drafting data, managing focus state securely. 

## Dependency Strategy
To ensure maximum availability, external dependencies are extremely slim. 
-   **Lucide / Custom SVGs:** Icons are baked in as React components to prevent dynamic fetch failures.
-   **Exports:** `.docx` exports dynamically load `html-docx-js` to mitigate bundler restrictions regarding complex dependency webs inherent in traditional node-targeted document builders.
-   **Date Handling:** Uses native `Date.now()` tracking. No heavy libraries like `moment`.

## Deployment model
It builds to static assets (`index.html`, JavaScript bundles, static CSS arrays) making it trivially deployable to standard edge endpoints, CDNs, or Cloud Run as a stateless container serving static assets.
