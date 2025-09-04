


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

export const TAG_OPTIONS: string[] = [
  'Action', 'Adventure', 'Boy Love', 'Comedy', 'Drama', 'Fantasy', 'Girl Love', 'Harem',
  'Historical', 'Horror', 'Isekai', 'Josei', 'LitRPG', 'Martial Arts', 'Mecha', 'Military',
  'Mystery', 'Post-Apocalyptic', 'Psychological', 'Reverse Harem', 'Romance', 'School Life',
  'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Supernatural', 'Thriller',
  'Tragedy', 'Tsundere', 'Vampire', 'Yandere',
];

export const SKETCH_TAG_OPTIONS: string[] = [
    'Character', 'Plot Point', 'Location', 'Worldbuilding', 'Dialogue', 'Scene Idea', 'Research', 'Note', 'Outline'
];

/**
 * Core function to apply typographic replacements. This version is more robust
 * and handles common contractions and nested quotes more reliably.
 * @param text The input string.
 * @returns The typographically enhanced string.
 */
function applyTypographicReplacements(text: string): string {
    if (!text) return text;

    return text
        .replace(/\.\.\./g, '…')
        .replace(/--/g, '—')
        // Handle common English contractions and possessives first
        .replace(/(\w)'t\b/g, '$1’t')
        .replace(/(\w)'s\b/g, '$1’s')
        .replace(/(\w)'re\b/g, '$1’re')
        .replace(/(\w)'ll\b/g, '$1’ll')
        .replace(/(\w)'ve\b/g, '$1’ve')
        .replace(/(\w)'d\b/g, '$1’d')
        // Handle opening quotes. A quote is considered "opening" if it's at the
        // start of the string, or preceded by whitespace or certain punctuation.
        .replace(/(^|\s|[[({“‘])"/g, '$1“') // Double quotes
        .replace(/"/g, '”') // Any remaining double quotes are closing ones
        .replace(/(^|\s|[[({“‘])'/g, '$1‘') // Single quotes
        .replace(/'/g, '’'); // Any remaining single quotes are closing ones or apostrophes
}


/**
 * Applies typographic enhancements to a plain text string.
 * Replaces triple dots with ellipsis and straight quotes with curly "smart" quotes.
 * @param text The plain text to enhance.
 * @returns The enhanced text.
 */
export function enhancePlainText(text: string): string {
    if (!text) return '';
    return applyTypographicReplacements(text);
}

/**
 * Applies typographic enhancements to an HTML string by walking the DOM.
 * This is safe and won't affect HTML tags or attributes.
 * @param htmlString The HTML string to enhance.
 * @returns The enhanced HTML string.
 */
export function enhanceHtml(htmlString: string): string {
    if (!htmlString) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    
    // Normalize the DOM tree. This is the key fix: it merges adjacent text
    // nodes, which prevents the smart quote logic from failing when the browser
    // editor fragments text.
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
