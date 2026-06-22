# Technical Specifications

## Framework & Tooling
-   **Core React:** React 18+ utilizing Function Components and React Hooks exclusively.
-   **Bundler:** Vite
-   **Language:** TypeScript (Strict typing utilized heavily on data-layer representations).
-   **Styling:** Tailwind CSS embedded as CSS Custom Properties for dynamic dynamic palette swapping.

## Persistent Environment Behaviors
- **Port:** The local dev server restricts to `3000` via container reverse proxies. Do not modify default port numbers within Vite unless explicitly bound.
- **Node Environment:** Standard local Node 22 build pipeline execution. 

## Storage & File Systems
-   **State Artifact:** A consolidated `.json` data file (adhering strictly to the schemas defined in `DATA_SCHEMAS.md`).
-   **Images:** Any embedded images are structurally mapped as optimized `base64` strings within the JSON rather than as distinct physical file attachments (though standard image-handling restrictions apply regarding sizes to prevent catastrophic JSON bloating).

## Interaction Specifications

### Editors (Rich Text Capabilities)
The `contentEditable` engines must support:
1.  Standard rich formatting (Bold, Italic, Underline).
2.  Semantic Heading hierarchies (`h1` through `h3`).
3.  List structures (Unordered generic lists and ordered numeric sequences).
4.  Blockquotes for dialogue segmentation.
5.  Text indentation standardizations utilizing CSS `text-indent` applied to paragraph blocks rather than trailing `<span>` spacers.
6.  *Smart Typography Features*: Dynamically shifting standard dashes (`-`) to Em dashes (`—`) or En dashes intuitively.

### Styling System (Tailwind + CSS Custom Properties)
Theme toggles drive global state configuration parameters inside `SettingsModal`, which push updates to the `root` wrapper.
- The `book` theme relies on warm, low-contrast palettes (typically `#F5EADD` bounds) simulating paper.
- The `dark` theme relies on strict utilitarian dark gray (`#111111`) or deep blue backgrounds for eye safety under extended author sessions.

### File Ingestion (The Docx Pipeline)
1. User drops or initiates upload for `.docx`.
2. Utilizing the `mammoth` library natively. 
3. The buffer translates underlying `.docx` XML nodes strictly into semantic HTML strings.
4. If pushed into Parallel Working, it displays in the left view and initializes independent editable states for temporary drafting unlinked from the main project tree.

## Localization (i18n)
All hardcoded strings inside views must route through `t` via the `useTranslations` hook, scaling dynamically across distinct dictionary structures (`en`, `vi`, `fi`, `sv`).
