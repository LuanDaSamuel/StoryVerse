/**
 * On-demand DOCX parser using dynamic import of mammoth.
 * Ensures mammoth is only loaded into browser memory when a user actively imports a docx file.
 */

export async function parseDocxToHtml(arrayBuffer: ArrayBuffer, customStyleMap?: string[]): Promise<string> {
    const mammothModule = await import('mammoth');
    const mammothLib = (mammothModule as any).default || mammothModule;

    if (!mammothLib || typeof mammothLib.convertToHtml !== 'function') {
        throw new Error("The DOCX processing library could not be loaded.");
    }

    const defaultStyleMap = [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
    ];

    const styleMap = customStyleMap || defaultStyleMap;
    const { value: html } = await mammothLib.convertToHtml({ arrayBuffer }, { styleMap });
    return html;
}
