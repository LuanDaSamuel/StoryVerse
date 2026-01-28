
import { Theme, ThemeConfig } from './types';

export const THEME_CONFIG: Record<Theme, ThemeConfig> = {
  dark: {
    bg: 'bg-[#0F172A]',
    bgSecondary: 'bg-slate-800',
    bgTertiary: 'bg-slate-700',
    text: 'text-slate-200',
    textSecondary: 'text-slate-400',
    accent: 'bg-indigo-600',
    accentText: 'text-white',
    accentBorder: 'border-indigo-500',
    border: 'border-slate-700',
    input: 'bg-slate-900 border-slate-600 placeholder-slate-500',
    logoColor: 'text-indigo-400',
  },
  book: {
    bg: 'bg-[#5D4C40]',
    bgSecondary: 'bg-[#FDF6E3]',
    bgTertiary: 'bg-[#EAE0D1]',
    text: 'text-[#F5EADD]',
    textSecondary: 'text-[#8B7B71]',
    accent: 'bg-[#C7A985]',
    accentText: 'text-[#3B2F27]',
    accentBorder: 'border-[#3B2F27]',
    border: 'border-[#D2B48C]',
    input: 'bg-[#EAE0D1] border-[#D2B48C] placeholder-amber-700 text-amber-900',
    logoColor: 'text-[#C7A985]',
  },
};

export const SKETCH_TAG_OPTIONS: string[] = [
    'Character', 'Plot Point', 'Location', 'Worldbuilding', 'Dialogue', 'Scene Idea', 'Research', 'Note', 'Outline'
];

/**
 * Core function to apply typographic replacements.
 */
function applyTypographicReplacements(text: string): string {
    if (!text) return text;

    return text
        .replace(/\.\.\./g, '…')
        .replace(/--/g, '—')
        // Handle common English contractions and possessives first to ensure apostrophes are curly.
        // We use a broader range for word characters to support accented languages.
        .replace(/([a-zA-Z\u00C0-\u017F])'([strmldv]\b)/gi, '$1’$2')
        .replace(/([a-zA-Z\u00C0-\u017F])'(\s|$)/g, '$1’$2')
        // Handle opening quotes. 
        // A quote is "opening" if it follows whitespace, specific brackets, or start of string.
        .replace(/(^|[\s\[\(\{\u200B])"/g, '$1“')
        .replace(/"/g, '”')
        .replace(/(^|[\s\[\(\{\u200B])'/g, '$1‘')
        .replace(/'/g, '’');
}


/**
 * Applies typographic enhancements to a plain text string.
 */
export function enhancePlainText(text: string): string {
    if (!text) return '';
    return applyTypographicReplacements(text);
}

/**
 * Applies typographic enhancements to an HTML string by walking the DOM.
 */
export function enhanceHtml(htmlString: string): string {
    if (!htmlString) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    
    tempDiv.normalize();

    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = applyTypographicReplacements(node.textContent || '');
        } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
            for (let i = 0; i < node.childNodes.length; i++) {
                walk(node.childNodes[i]);
            }
        }
    };

    walk(tempDiv);
    return tempDiv.innerHTML;
}
