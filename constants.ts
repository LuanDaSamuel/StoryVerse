

import { Theme, ThemeConfig } from './types';

export const THEME_CONFIG: Record<Theme, ThemeConfig> = {
  dark: {
    bg: 'bg-[#0F172A]',
    bgSecondary: 'bg-slate-800',
    bgTertiary: 'bg-slate-700',
    text: 'text-slate-200',
    textSecondary: 'text-slate-400',
    accent: 'bg-cyan-500',
    accentText: 'text-cyan-950',
    accentBorder: 'border-cyan-500',
    border: 'border-slate-700',
    input: 'bg-slate-900 border-slate-600 placeholder-slate-500',
    logoColor: 'text-cyan-400',
  },
  light: {
    bg: 'bg-gray-100',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-gray-200',
    text: 'text-gray-800',
    textSecondary: 'text-gray-500',
    accent: 'bg-sky-600',
    accentText: 'text-white',
    accentBorder: 'border-sky-500',
    border: 'border-gray-300',
    input: 'bg-white border-gray-300 placeholder-gray-400',
    logoColor: 'text-sky-600',
  },
  sakura: {
    bg: 'bg-[#FFF5F7]',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-pink-100',
    text: 'text-pink-900',
    textSecondary: 'text-pink-500',
    accent: 'bg-rose-500',
    accentText: 'text-white',
    accentBorder: 'border-rose-500',
    border: 'border-pink-200',
    input: 'bg-white border-pink-200 placeholder-pink-300',
    logoColor: 'text-rose-400',
  },
  book: {
    bg: 'bg-[#5D4C40]',
    bgSecondary: 'bg-[#FDF6E3]',
    bgTertiary: 'bg-[#EAE0D1]',
    text: 'text-[#F5EADD]',
    textSecondary: 'text-[#8B7B71]',
    accent: 'bg-amber-600',
    accentText: 'text-amber-100',
    accentBorder: 'border-amber-800',
    border: 'border-[#D2B48C]',
    input: 'bg-[#EAE0D1] border-[#D2B48C] placeholder-amber-700 text-amber-900',
    logoColor: 'text-amber-500',
  },
  jungle: {
    bg: 'bg-green-900',
    bgSecondary: 'bg-green-800',
    bgTertiary: 'bg-green-700',
    text: 'text-yellow-100',
    textSecondary: 'text-green-300',
    accent: 'bg-amber-500',
    accentText: 'text-amber-950',
    accentBorder: 'border-amber-500',
    border: 'border-green-700',
    input: 'bg-green-950 border-green-600 placeholder-green-400',
    logoColor: 'text-amber-400',
  },
};

export const TAG_OPTIONS: string[] = [
  'Action', 'Adventure', 'Boy Love', 'Comedy', 'Drama', 'Fantasy', 'Girl Love', 'Harem',
  'Historical', 'Horror', 'Isekai', 'Josei', 'LitRPG', 'Martial Arts', 'Mecha', 'Military',
  'Mystery', 'Post-Apocalyptic', 'Psychological', 'Reverse Harem', 'Romance', 'School Life',
  'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Supernatural', 'Thriller',
  'Tragedy', 'Tsundere', 'Vampire', 'Yandere',
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