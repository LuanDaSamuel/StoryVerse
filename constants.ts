

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
  light: {
    bg: 'bg-gray-100',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-gray-200',
    text: 'text-gray-800',
    textSecondary: 'text-gray-500',
    accent: 'bg-indigo-600',
    accentText: 'text-white',
    accentBorder: 'border-indigo-500',
    border: 'border-gray-300',
    input: 'bg-white border-gray-300 placeholder-gray-400',
    logoColor: 'text-indigo-600',
  },
  sakura: {
    bg: 'bg-[#FFF5F7]',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-pink-100',
    text: 'text-pink-900',
    textSecondary: 'text-pink-500',
    accent: 'bg-pink-500',
    accentText: 'text-white',
    accentBorder: 'border-pink-500',
    border: 'border-pink-200',
    input: 'bg-white border-pink-200 placeholder-pink-300',
    logoColor: 'text-pink-400',
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
  jungle: {
    bg: 'bg-green-900',
    bgSecondary: 'bg-green-800',
    bgTertiary: 'bg-green-700',
    text: 'text-yellow-100',
    textSecondary: 'text-green-300',
    accent: 'bg-lime-500',
    accentText: 'text-green-900',
    accentBorder: 'border-lime-500',
    border: 'border-green-700',
    input: 'bg-green-950 border-green-600 placeholder-green-400',
    logoColor: 'text-lime-400',
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
 * Core function to apply typographic replacements.
 * @param text The input string.
 * @returns The typographically enhanced string.
 */
function applyTypographicReplacements(text: string): string {
    if (!text) return text;
    // The order of these replacements is important.
    return text
        // Ellipsis and em-dash
        .replace(/\.\.\./g, '…')
        .replace(/--/g, '—')
        
        // Straight single quotes to curly
        // Apostrophes in contractions, e.g., "don't", "we've"
        .replace(/(\w)'(\w)/g, '$1’$2')
        // Special case for years, e.g., "'90s"
        .replace(/'(\d\ds)\b/g, '’$1')
        // Common starting contractions, e.g., "'em", "'tis"
        .replace(/(^|\s)'(em|tis|twas|til|cause)\b/gi, '$1’$2')
        
        // Opening single quotes
        .replace(/(^|\s|["(\[{“])'/g, '$1‘')
        
        // Opening double quotes
        .replace(/(^|\s|[(\[{‘])"/g, '$1“')

        // Any remaining quotes are closing ones
        .replace(/"/g, '”')
        .replace(/'/g, '’');
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
