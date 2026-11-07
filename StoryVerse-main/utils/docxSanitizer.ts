/**
 * docxSanitizer.ts
 * 
 * Sanitizes HTML content extracted from DOCX files (via Mammoth or similar parsers)
 * to provide a clean, flat, editor-friendly DOM structure:
 * 
 * 1. Flattens nested containers (div, blockquote, lists, tables, etc.) into standard <p> paragraphs.
 * 2. Preserves chapter headings (h1, h2, h3, h4, h5, h6) for chapter splitting and outline navigation.
 * 3. Keeps essential inline formatting: bold (<strong>/<b>), italic (<em>/<i>), underline (<u>/<ins>),
 *    strikethrough (<s>/<strike>/<del>), links (<a>), line breaks (<br>), and images (<img>).
 * 4. Strips font families, font sizes, text/background colors, margins, classes, IDs, and Word-specific mso attributes.
 * 5. Unwraps non-semantic wrapper elements like <span> and <font>, converting styling to semantic tags where applicable.
 * 6. Standardizes blank paragraphs to <p><br></p> and collapses consecutive blank lines into a single line break.
 * 7. Strictly preserves user text fidelity and original image binary/base64 data (RULE[AGENTS_md]).
 */

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

const CONTAINER_BLOCK_TAGS = new Set([
    'DIV', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'ASIDE', 'NAV', 'MAIN',
    'FIGURE', 'FIGCAPTION', 'PRE', 'ADDRESS', 'DETAILS', 'SUMMARY',
    'UL', 'OL', 'DL', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR'
]);

const LEAF_BLOCK_TAGS = new Set(['P', 'LI', 'DT', 'DD', 'TD', 'TH']);

const ALLOWED_INLINE_TAGS = new Set([
    'STRONG', 'B', 'EM', 'I', 'U', 'INS', 'S', 'STRIKE', 'DEL', 'A', 'IMG', 'BR', 'SUB', 'SUP'
]);

const DISALLOWED_TAGS = [
    'SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'SVG', 'CANVAS', 'IFRAME', 'NOSCRIPT', 'OBJECT', 'EMBED', 'APPLET', 'XML'
];

/**
 * Checks whether an element contains any child block element.
 */
function hasChildBlocks(el: Element): boolean {
    return Array.from(el.children).some(child => 
        HEADING_TAGS.has(child.tagName) ||
        CONTAINER_BLOCK_TAGS.has(child.tagName) ||
        LEAF_BLOCK_TAGS.has(child.tagName)
    );
}

/**
 * Checks whether a block element is effectively blank (empty or only whitespace/br).
 * Blocks containing <img> are never considered blank.
 */
function isBlankBlock(el: HTMLElement): boolean {
    if (el.querySelector('img')) {
        return false;
    }
    // Remove non-breaking spaces (\u00A0) and zero-width spaces (\u200B) for emptiness check
    const text = (el.textContent || '').replace(/[\s\u00A0\u200B]+/g, '');
    return text.length === 0;
}

/**
 * Unwraps an element by inserting all of its child nodes before it in its parent,
 * then removing the element itself.
 */
function unwrapElement(el: Element): void {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
}

/**
 * Cleans inline elements inside a block:
 * - Strips styles, classes, IDs from allowed inline tags.
 * - Retains image src/alt/title without alteration.
 * - Retains anchor href.
 * - Unwraps non-allowed inline elements while preserving their text/children.
 */
function cleanInlineNodes(parent: HTMLElement, doc: Document): void {
    // Process elements from deepest to shallowest to avoid DOM mutation conflicts
    const elements = Array.from(parent.querySelectorAll('*')).reverse();

    elements.forEach(node => {
        // Element might have been unwrapped already in a previous step
        if (!node.parentNode) return;

        const tagName = node.tagName.toUpperCase();

        if (tagName === 'IMG') {
            const img = node as HTMLImageElement;
            const src = img.getAttribute('src');
            const alt = img.getAttribute('alt');
            const title = img.getAttribute('title');

            // Strip all attributes to remove Word styling and layout constraints
            while (img.attributes.length > 0) {
                img.removeAttribute(img.attributes[0].name);
            }

            // Restore essential attributes with 100% data fidelity
            if (src) img.setAttribute('src', src);
            if (alt) img.setAttribute('alt', alt);
            if (title) img.setAttribute('title', title);
            return;
        }

        if (tagName === 'A') {
            const a = node as HTMLAnchorElement;
            const href = a.getAttribute('href');
            while (a.attributes.length > 0) {
                a.removeAttribute(a.attributes[0].name);
            }
            if (href) {
                a.setAttribute('href', href);
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            }
            return;
        }

        if (ALLOWED_INLINE_TAGS.has(tagName)) {
            // Strip any style, class, id, or Word-specific attributes
            while (node.attributes.length > 0) {
                node.removeAttribute(node.attributes[0].name);
            }
            return;
        }

        // Handle <span>, <font>, or other non-semantic wrappers
        const htmlNode = node as HTMLElement;
        const style = htmlNode.style;
        const isBold = style?.fontWeight === 'bold' || style?.fontWeight === '700' || style?.fontWeight === 'bolder';
        const isItalic = style?.fontStyle === 'italic' || style?.fontStyle === 'oblique';
        const isUnderline = style?.textDecoration?.includes('underline');
        const isStrike = style?.textDecoration?.includes('line-through');

        // If the wrapper had semantic styles, wrap its contents in semantic tags before unwrapping
        if (isBold || isItalic || isUnderline || isStrike) {
            let wrapper: HTMLElement | null = null;
            if (isStrike) {
                const s = doc.createElement('s');
                while (htmlNode.firstChild) s.appendChild(htmlNode.firstChild);
                htmlNode.appendChild(s);
                wrapper = s;
            }
            if (isUnderline) {
                const u = doc.createElement('u');
                const target = wrapper || htmlNode;
                while (target.firstChild) u.appendChild(target.firstChild);
                target.appendChild(u);
                wrapper = u;
            }
            if (isItalic) {
                const em = doc.createElement('em');
                const target = wrapper || htmlNode;
                while (target.firstChild) em.appendChild(target.firstChild);
                target.appendChild(em);
                wrapper = em;
            }
            if (isBold) {
                const strong = doc.createElement('strong');
                const target = wrapper || htmlNode;
                while (target.firstChild) strong.appendChild(target.firstChild);
                target.appendChild(strong);
            }
        }

        // Unwrap the element, preserving its children
        unwrapElement(htmlNode);
    });
}

/**
 * Recursively extracts block elements from a container node, grouping loose inline
 * nodes into <p> paragraphs and converting all block containers into standard <p> elements.
 */
function extractBlocks(node: Node, doc: Document): HTMLElement[] {
    const blocks: HTMLElement[] = [];

    // Helper to flush accumulated inline child nodes into a <p>
    const flushInlineBuffer = (buffer: Node[]) => {
        if (buffer.length === 0) return;
        const p = doc.createElement('p');
        buffer.forEach(n => p.appendChild(n));
        cleanInlineNodes(p, doc);
        blocks.push(p);
        buffer.length = 0;
    };

    const inlineBuffer: Node[] = [];

    Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
            // Keep text nodes in inline buffer
            inlineBuffer.push(child);
            return;
        }

        if (child.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        const el = child as HTMLElement;
        const tagName = el.tagName.toUpperCase();

        if (HEADING_TAGS.has(tagName)) {
            flushInlineBuffer(inlineBuffer);
            const heading = doc.createElement(tagName.toLowerCase());
            while (el.firstChild) {
                heading.appendChild(el.firstChild);
            }
            cleanInlineNodes(heading, doc);
            blocks.push(heading);
            return;
        }

        const isBlockContainer = CONTAINER_BLOCK_TAGS.has(tagName);
        const isLeafBlock = LEAF_BLOCK_TAGS.has(tagName);

        if (isBlockContainer || isLeafBlock) {
            flushInlineBuffer(inlineBuffer);

            if (hasChildBlocks(el)) {
                // If it has nested child blocks, unwrap it recursively
                const childBlocks = extractBlocks(el, doc);
                blocks.push(...childBlocks);
            } else {
                // If it contains only inline children, convert directly to a <p>
                const p = doc.createElement('p');
                while (el.firstChild) {
                    p.appendChild(el.firstChild);
                }
                cleanInlineNodes(p, doc);
                blocks.push(p);
            }
            return;
        }

        // If it's an inline element directly under the container, accumulate it
        inlineBuffer.push(child);
    });

    flushInlineBuffer(inlineBuffer);
    return blocks;
}

/**
 * Sanitizes imported HTML from DOCX files into a clean, flat paragraph structure.
 * 
 * @param rawHtml The raw HTML generated by mammoth or other DOCX conversion libraries.
 * @returns Sanitized HTML string ready for the StoryVerse chapter editor.
 */
export function sanitizeImportedContent(rawHtml: string): string {
    if (!rawHtml || typeof rawHtml !== 'string') {
        return '<p><br></p>';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const body = doc.body;

    if (!body) {
        return '<p><br></p>';
    }

    // 1. Remove dangerous or non-content tags
    DISALLOWED_TAGS.forEach(tag => {
        const elements = body.querySelectorAll(tag.toLowerCase());
        elements.forEach(el => el.remove());
    });

    // 2. Extract and flatten all blocks into top-level <h1-h6> and <p> elements
    const extractedBlocks = extractBlocks(body, doc);

    if (extractedBlocks.length === 0) {
        return '<p><br></p>';
    }

    // 3. Normalize blank lines and collapse consecutive blank lines
    const finalBlocks: HTMLElement[] = [];
    let previousWasBlank = false;

    extractedBlocks.forEach(block => {
        const tagName = block.tagName.toUpperCase();
        const isHeading = HEADING_TAGS.has(tagName);
        const isBlank = isBlankBlock(block);

        if (isHeading) {
            // Drop empty/blank headings
            if (isBlank) return;
            // Clean attributes from heading
            while (block.attributes.length > 0) {
                block.removeAttribute(block.attributes[0].name);
            }
            finalBlocks.push(block);
            previousWasBlank = false;
            return;
        }

        // Paragraph handling
        while (block.attributes.length > 0) {
            block.removeAttribute(block.attributes[0].name);
        }

        if (isBlank) {
            // Standardize empty paragraph to <p><br></p>
            block.innerHTML = '<br>';

            // Collapse consecutive blank paragraphs into a single line break
            if (previousWasBlank) {
                return; // Skip consecutive blank line
            }

            finalBlocks.push(block);
            previousWasBlank = true;
        } else {
            finalBlocks.push(block);
            previousWasBlank = false;
        }
    });

    // 4. Clean leading and trailing blank lines if the document has other content
    while (finalBlocks.length > 1 && isBlankBlock(finalBlocks[0])) {
        finalBlocks.shift();
    }
    while (finalBlocks.length > 1 && isBlankBlock(finalBlocks[finalBlocks.length - 1])) {
        finalBlocks.pop();
    }

    if (finalBlocks.length === 0) {
        return '<p><br></p>';
    }

    // 5. Serialize to HTML string
    return finalBlocks.map(b => b.outerHTML).join('');
}
