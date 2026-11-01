# Implementation Plan: Fix Enter Key Cursor Revert in DOCX-Imported Chapters

## Problem Summary
When editing chapters uploaded via DOCX files, pressing the Enter key causes the cursor to immediately undo the line break and jump back to the previous paragraph.

### Root Cause Analysis
1. **Destructive Style Inheritance**: In `ChapterEditorPage.tsx`, the `handleKeyDown` handler for `Enter` detects differences between the previous block's inline styles and default styles (which commonly exist in DOCX imports). It replaces the new line's contents with a `<span style="...">&#8203;</span>` (zero-width space).
2. **Immediate Deletion by Editor Cleanup**: 10 milliseconds later, `cleanupEditor()` executes and strips any inline element containing `\u200B` or empty text. This removes the `<span>`, leaving the block as `<p></p>` (without even a placeholder `<br>`).
3. **DOM Normalization & Caret Collapse**: Browsers cannot place a cursor inside an empty `<p></p>` without a `<br>`. When `editor.normalize()` runs or the browser repaints, the empty block collapses, the cursor is ejected, and the editor snaps the caret back to the previous block, creating an "automatic undo" effect.
4. **State / DOM Divergence**: DOCX content often has differing whitespace or un-normalized markup, triggering re-sync loops in the programmatic change effect if the editor innerHTML differs from state.

---

## Proposed Changes

### 1. Robust Paragraph Creation & Clean Line Breaks on Enter
- In `ChapterEditorPage.tsx`:
  - When Enter is pressed, ensure newly created blocks retain a valid `<br>` placeholder so the browser's caret engine never collapses the block.
  - Per user preference ("Inherit standard chapter text style with a clean line break"), ensure new paragraphs inherit paragraph-level block styling (such as text indent, line height, and margin) while keeping the content clean without temporary zero-width inline spans that get purged.
  - If a placeholder `<br>` is needed for an empty paragraph, ensure `<p><br></p>` is preserved and not stripped by cleanup passes.

### 2. Safeguard Editor Cleanup
- In `cleanupEditor()`:
  - Ensure empty block elements (`<p>`, `<div>`) retain `<br>` if they have no text content so they remain focusable and maintain visual height.
  - Prevent cleanup from stripping elements that are currently the active cursor container.
  - Ensure zero-width spaces are only cleaned when non-whitespace text exists around them, without destroying active cursor targets.

### 3. DOCX Import Sanitization & Normalization
- In `NovelDetailPage.tsx` (or import handling):
  - Ensure imported DOCX chapter content is cleanly wrapped in semantic `<p>` tags with consistent block structure.
  - Remove empty orphan spans and redundant inline style overrides from Word exports that confuse contenteditable caret positioning.

---

## Verification Plan

### Automated Build & Lint
- Run `compile_applet` to verify compilation and type safety.
- Run `lint_applet` to ensure no lint regressions.

### Manual Verification Scenarios
1. **Enter Key Behavior in DOCX Chapters**:
   - Open a chapter imported from a DOCX file with formatted text.
   - Press Enter in the middle and at the end of paragraphs.
   - Confirm a new line is created cleanly, the cursor stays on the new line, and does not jump back or undo.
2. **Text Typing on New Line**:
   - Immediately start typing on the newly created line.
   - Confirm text appears as expected without disappearing or resetting.
3. **Formatting & Indentation**:
   - Verify that paragraph indentation and spacing match standard novel settings.
