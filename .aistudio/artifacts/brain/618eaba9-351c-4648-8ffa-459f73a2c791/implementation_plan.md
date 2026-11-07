# Implementation Plan - Include Title in Chapter Copy

This plan outlines the steps to modify the "Copy Chapter Text" feature so that it includes the chapter's title at the top of the copied content.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on the provided clarifications:
> - **Separator**: The title will be followed by two line breaks (`\n\n`) before the body text.
> - **Empty Title Handling**: If a chapter has no title, "Untitled Chapter" will be used as the header.

## 1. Overview & Core Concept

Currently, clicking "Copy Chapter Text" only copies the content inside the editor. The update will ensure that the title is also captured, making it easier for users to share or backup individual chapters with their headers intact.

## 2. Technical Architecture & Data Strategy

### Key Changes
- **File**: `/StoryVerse-main/pages/ChapterEditorPage.tsx`
- **Function**: `handleCopyContent`
- **Logic**:
  1. Retrieve `chapter.title` from the active state.
  2. Normalize title (default to "Untitled Chapter" if empty).
  3. Combine `title + "\n\n" + editorContent`.
  4. Write the result to `navigator.clipboard`.

### Component Diagram

```unicode
┌─────────────────────────────────┐
│       ChapterEditorPage         │
│ ┌─────────────────────────────┐ │
│ │      handleCopyContent      │ │
│ │  (Combines Title + Body)    │ │
│ └──────────────┬──────────────┘ │
└────────────────┼────────────────┘
                 │
        ┌────────▼────────┐
        │   Clipboard API │
        └─────────────────┘
```

## 3. Verification Plan

### Automated Tests
- **Linting**: Run `npm run lint` to ensure no syntax or type errors.
- **Compilation**: Run `npm run build` (via `compile_applet`) to verify the build.

### Manual Verification
1. Open a novel and enter the Chapter Editor.
2. Ensure the chapter has a title (e.g., "Chapter 1: The Beginning").
3. Click the sidebar menu and select "Copy Chapter Text".
4. Paste the content into a text editor and verify the title is at the top followed by two blank lines.
5. Repeat with a chapter that has an empty title and verify "Untitled Chapter" appears.
