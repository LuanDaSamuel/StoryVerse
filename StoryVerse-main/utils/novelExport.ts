import {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun,
    UnderlineType,
} from 'docx';
import { Chapter, Novel } from '../types';
import { enhanceHtml, enhancePlainText } from '../constants';

const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/**
 * Shifts any headings inside a chapter's body down by one level (h1 -> h2 ... h5 -> h6)
 * so Heading 1 (h1 / # / Word Heading1) is strictly reserved for chapter marks.
 */
export const demoteInBodyHeadings = (html: string): string => {
    if (!html) return '';
    const container = document.createElement('div');
    container.innerHTML = html;

    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5'));
    headings.forEach((heading) => {
        const currentLevel = parseInt(heading.tagName.substring(1), 10);
        const nextLevel = Math.min(6, currentLevel + 1);
        const replacement = document.createElement(`h${nextLevel}`);
        Array.from(heading.attributes).forEach((attr) => {
            replacement.setAttribute(attr.name, attr.value);
        });
        replacement.innerHTML = heading.innerHTML;
        heading.replaceWith(replacement);
    });

    return container.innerHTML;
};

export const buildExportHtml = (novel: Novel, chapters: Chapter[]): string => {
    const css = `
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1, h2, h3, h4, h5, h6 { color: #111; border: none !important; text-indent: 0; }
        h1 { font-size: 2.25em; }
        h2 { font-size: 1.75em; }
        h3 { font-size: 1.4em; }
        p { text-indent: 2em; margin-bottom: 1em; }
        blockquote { border-left: 3px solid #999; padding-left: 1em; margin: 1.2em 0; color: #555; font-style: italic; }
        blockquote p { text-indent: 0; }
        .novel-title { text-align: center; font-size: 3em; font-weight: 700; color: #111; margin-top: 0; margin-bottom: 0.25em; text-indent: 0; line-height: 1.2; }
        .description { text-align: center; color: #777; font-style: italic; margin-top: 10px; text-indent: 0; }
        .tags { text-align: center; margin-bottom: 40px; text-indent: 0; }
        .tag { display: inline-block; background-color: #eee; padding: 5px 10px; border-radius: 5px; font-size: 0.9em; margin: 2px; }
        .chapter-title { margin-top: 48px; margin-bottom: 32px; page-break-before: always; text-align: center; text-indent: 0; }
        .chapter-body div { text-indent: 2em; margin-bottom: 1em; }
    `;

    const chaptersHtml = chapters
        .map((chapter) => {
            const chapterTitle = escapeHtml(enhancePlainText(chapter.title || 'Untitled Chapter'));
            const safeBody = enhanceHtml(demoteInBodyHeadings(chapter.content || ''));
            return `<h1 class="chapter-title">${chapterTitle}</h1><div class="chapter-body">${safeBody}</div>`;
        })
        .join('');

    const safeNovelTitle = escapeHtml(enhancePlainText(novel.title || 'Untitled Novel'));
    const safeDescription = novel.description
        ? `<p class="description">${escapeHtml(enhancePlainText(novel.description))}</p>`
        : '';
    const safeTags =
        novel.tags.length > 0
            ? `<div class="tags">${novel.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`
            : '';

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${safeNovelTitle}</title><style>${css}</style></head><body><p class="novel-title">${safeNovelTitle}</p>${safeDescription}${safeTags}<hr>${chaptersHtml}</body></html>`;
};

interface InlineFormat {
    bold?: boolean;
    italics?: boolean;
    underline?: boolean;
    strike?: boolean;
}

const renderInlineMarkdown = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') return '\n';

    const inner = Array.from(el.childNodes).map(renderInlineMarkdown).join('');
    if (!inner) return '';

    if (tag === 'strong' || tag === 'b') return `**${inner}**`;
    if (tag === 'em' || tag === 'i') return `*${inner}*`;
    if (tag === 's' || tag === 'del' || tag === 'strike') return `~~${inner}~~`;
    if (tag === 'code') return `\`${inner}\``;

    return inner;
};

const htmlToCleanMarkdown = (rawHtml: string): string => {
    const normalizedHtml = enhanceHtml(demoteInBodyHeadings(rawHtml || ''));
    const container = document.createElement('div');
    container.innerHTML = normalizedHtml;

    const blocks: string[] = [];

    const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const trimmed = (node.textContent || '').trim();
            if (trimmed) blocks.push(trimmed);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (/^h[1-6]$/.test(tag)) {
            const level = Math.max(2, parseInt(tag.substring(1), 10));
            const text = Array.from(el.childNodes).map(renderInlineMarkdown).join('').trim();
            if (text) blocks.push(`${'#'.repeat(level)} ${text}`);
            return;
        }

        if (tag === 'blockquote') {
            const text = Array.from(el.childNodes).map(renderInlineMarkdown).join('').trim();
            if (text) {
                blocks.push(
                    text
                        .split(/\n+/)
                        .map((line) => `> ${line.trim()}`)
                        .join('\n')
                );
            }
            return;
        }

        if (tag === 'ul' || tag === 'ol') {
            const items = Array.from(el.children)
                .filter((child) => child.tagName.toLowerCase() === 'li')
                .map((li, index) => {
                    const text = Array.from(li.childNodes).map(renderInlineMarkdown).join('').trim();
                    const prefix = tag === 'ol' ? `${index + 1}. ` : '- ';
                    return `${prefix}${text}`;
                })
                .filter(Boolean);
            if (items.length > 0) {
                blocks.push(items.join('\n'));
            }
            return;
        }

        if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
            const hasNestedBlock = Array.from(el.children).some((child) =>
                ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol'].includes(
                    child.tagName.toLowerCase()
                )
            );
            if (hasNestedBlock) {
                Array.from(el.childNodes).forEach(processNode);
                return;
            }
            const text = Array.from(el.childNodes).map(renderInlineMarkdown).join('').trim();
            if (text) blocks.push(text);
            return;
        }

        const fallback = renderInlineMarkdown(el).trim();
        if (fallback) blocks.push(fallback);
    };

    Array.from(container.childNodes).forEach(processNode);
    return blocks.join('\n\n');
};

export const buildExportMarkdown = (novel: Novel, chapters: Chapter[]): string => {
    const titleLine = `**${enhancePlainText(novel.title || 'Untitled Novel')}**`;
    const descLine = novel.description ? `\n\n_${enhancePlainText(novel.description)}_` : '';
    const tagsLine =
        novel.tags.length > 0 ? `\n\n${novel.tags.map((tag) => `\`${tag}\``).join(' ')}` : '';

    let markdownContent = `${titleLine}${descLine}${tagsLine}\n\n---\n\n`;

    chapters.forEach((chapter) => {
        const chapterHeading = enhancePlainText(chapter.title || 'Untitled Chapter');
        const body = htmlToCleanMarkdown(chapter.content || '');
        markdownContent += `# ${chapterHeading}\n\n${body ? `${body}\n\n` : ''}---\n\n`;
    });

    return markdownContent.trimEnd() + '\n';
};

const htmlToPlainParagraphs = (rawHtml: string): string => {
    const normalizedHtml = enhanceHtml(demoteInBodyHeadings(rawHtml || ''));
    const container = document.createElement('div');
    container.innerHTML = normalizedHtml;

    const blocks: string[] = [];

    const extractTextWithLineBreaks = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || '';
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const el = node as HTMLElement;
        if (el.tagName.toLowerCase() === 'br') return '\n';
        return Array.from(el.childNodes).map(extractTextWithLineBreaks).join('');
    };

    const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent || '').trim();
            if (text) blocks.push(text);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'ul' || tag === 'ol') {
            const lines = Array.from(el.children)
                .filter((child) => child.tagName.toLowerCase() === 'li')
                .map((li, idx) => {
                    const lineText = extractTextWithLineBreaks(li).trim();
                    return tag === 'ol' ? `${idx + 1}. ${lineText}` : `• ${lineText}`;
                })
                .filter(Boolean);
            if (lines.length > 0) blocks.push(lines.join('\n'));
            return;
        }

        const hasNestedBlock = Array.from(el.children).some((child) =>
            ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol'].includes(
                child.tagName.toLowerCase()
            )
        );
        if (hasNestedBlock) {
            Array.from(el.childNodes).forEach(processNode);
            return;
        }

        const text = extractTextWithLineBreaks(el).trim();
        if (text) blocks.push(text);
    };

    Array.from(container.childNodes).forEach(processNode);
    return blocks.join('\n\n');
};

export const buildExportPlainText = (novel: Novel, chapters: Chapter[]): string => {
    const title = enhancePlainText(novel.title || 'Untitled Novel');
    const description = enhancePlainText(novel.description || '');
    const tags = novel.tags.join(', ');

    let textContent = `Title: ${title}\n\n`;
    if (description) textContent += `Description: ${description}\n\n`;
    if (tags) textContent += `Tags: ${tags}\n\n`;
    textContent += `---\n\n`;

    chapters.forEach((chapter) => {
        const chapterHeading = enhancePlainText(chapter.title || 'Untitled Chapter');
        const body = htmlToPlainParagraphs(chapter.content || '');
        textContent += `# ${chapterHeading}\n\n${body ? `${body}\n\n` : ''}---\n\n`;
    });

    return textContent.trimEnd() + '\n';
};

const collectTextRuns = (node: Node, format: InlineFormat = {}): TextRun[] => {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (!text) return [];
        return [
            new TextRun({
                text,
                bold: format.bold,
                italics: format.italics,
                underline: format.underline ? { type: UnderlineType.SINGLE } : undefined,
                strike: format.strike,
            }),
        ];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return [];

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
        return [new TextRun({ break: 1 })];
    }

    const style = el.style;
    const nextFormat: InlineFormat = {
        bold: format.bold || tag === 'strong' || tag === 'b' || style?.fontWeight === 'bold',
        italics: format.italics || tag === 'em' || tag === 'i' || style?.fontStyle === 'italic',
        underline:
            format.underline ||
            tag === 'u' ||
            (style?.textDecoration ? style.textDecoration.includes('underline') : false),
        strike:
            format.strike ||
            tag === 's' ||
            tag === 'del' ||
            tag === 'strike' ||
            (style?.textDecoration ? style.textDecoration.includes('line-through') : false),
    };

    return Array.from(el.childNodes).flatMap((child) => collectTextRuns(child, nextFormat));
};

const mapHeadingLevel = (level: number) => {
    switch (level) {
        case 2:
            return HeadingLevel.HEADING_2;
        case 3:
            return HeadingLevel.HEADING_3;
        case 4:
            return HeadingLevel.HEADING_4;
        case 5:
            return HeadingLevel.HEADING_5;
        default:
            return HeadingLevel.HEADING_6;
    }
};

const htmlToDocxParagraphs = (rawHtml: string): Paragraph[] => {
    const normalizedHtml = enhanceHtml(demoteInBodyHeadings(rawHtml || ''));
    const container = document.createElement('div');
    container.innerHTML = normalizedHtml;

    const paragraphs: Paragraph[] = [];

    const pushParagraphRuns = (
        runs: TextRun[],
        options: {
            heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
            isQuote?: boolean;
            bulletLevel?: number;
        } = {}
    ) => {
        if (runs.length === 0) return;

        if (options.heading) {
            paragraphs.push(
                new Paragraph({
                    heading: options.heading,
                    children: runs,
                    spacing: { before: 240, after: 140 },
                })
            );
            return;
        }

        if (options.isQuote) {
            paragraphs.push(
                new Paragraph({
                    children: runs.map(
                        (run) => run
                    ),
                    indent: { left: 720, right: 360 },
                    border: {
                        left: {
                            color: '888888',
                            space: 12,
                            style: BorderStyle.SINGLE,
                            size: 12,
                        },
                    },
                    spacing: { before: 160, after: 160, line: 340 },
                })
            );
            return;
        }

        if (typeof options.bulletLevel === 'number') {
            paragraphs.push(
                new Paragraph({
                    children: runs,
                    bullet: { level: options.bulletLevel },
                    spacing: { after: 120, line: 340 },
                })
            );
            return;
        }

        paragraphs.push(
            new Paragraph({
                children: runs,
                indent: { firstLine: 400 },
                spacing: { after: 180, line: 360 },
            })
        );
    };

    const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent || '').trim();
            if (text) {
                pushParagraphRuns([new TextRun(text)]);
            }
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (/^h[1-6]$/.test(tag)) {
            const level = Math.max(2, parseInt(tag.substring(1), 10));
            const runs = collectTextRuns(el);
            pushParagraphRuns(runs, { heading: mapHeadingLevel(level) });
            return;
        }

        if (tag === 'blockquote') {
            const hasChildrenBlocks = Array.from(el.children).some((c) =>
                ['p', 'div'].includes(c.tagName.toLowerCase())
            );
            if (hasChildrenBlocks) {
                Array.from(el.children).forEach((child) => {
                    const runs = collectTextRuns(child, { italics: true });
                    pushParagraphRuns(runs, { isQuote: true });
                });
            } else {
                const runs = collectTextRuns(el, { italics: true });
                pushParagraphRuns(runs, { isQuote: true });
            }
            return;
        }

        if (tag === 'ul' || tag === 'ol') {
            const items = Array.from(el.children).filter(
                (child) => child.tagName.toLowerCase() === 'li'
            );
            items.forEach((li, idx) => {
                const runs = collectTextRuns(li);
                if (runs.length === 0) return;
                if (tag === 'ol') {
                    pushParagraphRuns([new TextRun({ text: `${idx + 1}. ` }), ...runs]);
                } else {
                    pushParagraphRuns(runs, { bulletLevel: 0 });
                }
            });
            return;
        }

        if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
            const hasNestedBlock = Array.from(el.children).some((child) =>
                ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol'].includes(
                    child.tagName.toLowerCase()
                )
            );
            if (hasNestedBlock) {
                Array.from(el.childNodes).forEach(processNode);
                return;
            }
            const runs = collectTextRuns(el);
            pushParagraphRuns(runs);
            return;
        }

        const fallbackRuns = collectTextRuns(el);
        pushParagraphRuns(fallbackRuns);
    };

    Array.from(container.childNodes).forEach(processNode);
    return paragraphs;
};

export const buildExportDocx = async (novel: Novel, chapters: Chapter[]): Promise<Blob> => {
    const children: Paragraph[] = [];

    // Novel Title uses Word's "Title" style only (never Heading 1)
    children.push(
        new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            children: [
                new TextRun({
                    text: enhancePlainText(novel.title || 'Untitled Novel'),
                }),
            ],
        })
    );

    if (novel.description) {
        children.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200, line: 320 },
                children: [
                    new TextRun({
                        text: enhancePlainText(novel.description),
                        italics: true,
                        color: '555555',
                    }),
                ],
            })
        );
    }

    if (novel.tags.length > 0) {
        children.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 480 },
                children: [
                    new TextRun({
                        text: novel.tags.join('  ·  '),
                        size: 20,
                        color: '666666',
                    }),
                ],
            })
        );
    }

    chapters.forEach((chapter, index) => {
        // Every chapter mark is saved as Word's native Heading 1 style ("Heading1")
        children.push(
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                pageBreakBefore: index > 0,
                spacing: { before: 240, after: 320 },
                children: [
                    new TextRun({
                        text: enhancePlainText(chapter.title || 'Untitled Chapter'),
                    }),
                ],
            })
        );

        const bodyParagraphs = htmlToDocxParagraphs(chapter.content || '');
        if (bodyParagraphs.length > 0) {
            children.push(...bodyParagraphs);
        } else {
            children.push(new Paragraph({ text: '' }));
        }
    });

    const doc = new Document({
        title: enhancePlainText(novel.title || 'Untitled Novel'),
        description: enhancePlainText(novel.description || ''),
        styles: {
            default: {
                document: {
                    run: {
                        font: 'Georgia',
                        size: 24, // 12pt
                        color: '1F2937',
                    },
                },
                title: {
                    run: {
                        font: 'Georgia',
                        size: 56, // 28pt
                        bold: true,
                        color: '111827',
                    },
                    paragraph: {
                        spacing: { before: 400, after: 200 },
                    },
                },
                heading1: {
                    run: {
                        font: 'Georgia',
                        size: 36, // 18pt
                        bold: true,
                        color: '111827',
                    },
                    paragraph: {
                        spacing: { before: 240, after: 320 },
                    },
                },
                heading2: {
                    run: {
                        font: 'Georgia',
                        size: 28, // 14pt
                        bold: true,
                        color: '1F2937',
                    },
                },
                heading3: {
                    run: {
                        font: 'Georgia',
                        size: 26, // 13pt
                        bold: true,
                        color: '374151',
                    },
                },
            },
        },
        sections: [
            {
                properties: {},
                children,
            },
        ],
    });

    return Packer.toBlob(doc);
};
