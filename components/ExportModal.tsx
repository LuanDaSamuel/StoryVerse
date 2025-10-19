import * as React from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { Novel } from '../types';
import { CloseIcon } from './Icons';
import { enhancePlainText, enhanceHtml } from '../constants';
import { useTranslations } from '../hooks/useTranslations';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  novel: Novel;
}

const ExportModal = ({ isOpen, onClose, novel }: ExportModalProps) => {
    const { themeClasses } = React.useContext(ProjectContext);
    const t = useTranslations();

    if (!isOpen) return null;

    const downloadFile = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onClose();
    };
    
    const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    const handleExportHtml = () => {
        const css = `
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1, h2, h3 { color: #111; }
            h1 { font-size: 2.5em; } h2 { font-size: 1.8em; } h3 { font-size: 1.5em; }
            .novel-title { text-align: center; font-size: 3em; margin-bottom: 0; }
            .description { text-align: center; color: #777; font-style: italic; margin-top: 10px; }
            .tags { text-align: center; margin-bottom: 40px; }
            .tag { display: inline-block; background-color: #eee; padding: 5px 10px; border-radius: 5px; font-size: 0.9em; margin: 2px; }
            .chapter-title { margin-top: 40px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        `;
        let chaptersHtml = '';
        novel.chapters.forEach(chapter => {
            chaptersHtml += `<h2 class="chapter-title">${enhancePlainText(chapter.title)}</h2><div>${enhanceHtml(chapter.content)}</div>`;
        });

        const fullHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${novel.title}</title><style>${css}</style></head><body><h1 class="novel-title">${enhancePlainText(novel.title)}</h1><p class="description">${enhancePlainText(novel.description)}</p><div class="tags">${novel.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div><hr>${chaptersHtml}</body></html>`;
        
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        downloadFile(blob, `${slugify(novel.title)}.html`);
    };

    const handleExportTxt = () => {
        const tempDiv = document.createElement('div');
        let textContent = `Title: ${novel.title}\n\nDescription: ${novel.description}\n\nTags: ${novel.tags.join(', ')}\n\n---\n\n`;

        novel.chapters.forEach(chapter => {
            tempDiv.innerHTML = chapter.content;
            textContent += `## ${chapter.title}\n\n${tempDiv.textContent || ''}\n\n---\n\n`;
        });
        
        const blob = new Blob([enhancePlainText(textContent)], { type: 'text/plain;charset=utf-8' });
        downloadFile(blob, `${slugify(novel.title)}.txt`);
    };

    const htmlToMarkdown = (html: string): string => {
        let markdown = html
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n\n')
            .replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i>(.*?)<\/i>/gi, '*$1*')
            .replace(/<[^>]+>/g, ''); // Strip remaining tags

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = markdown;
        return (tempDiv.textContent || "").trim();
    };

    const handleExportMd = () => {
        let markdownContent = `# ${novel.title}\n\n_${novel.description}_\n\n`;
        novel.tags.forEach(tag => { markdownContent += `\`${tag}\` `; });
        markdownContent += '\n\n---\n\n';

        novel.chapters.forEach(chapter => {
            markdownContent += `## ${chapter.title}\n\n${htmlToMarkdown(chapter.content)}\n\n---\n\n`;
        });
        
        const blob = new Blob([enhancePlainText(markdownContent)], { type: 'text/markdown;charset=utf-8' });
        downloadFile(blob, `${slugify(novel.title)}.md`);
    };

    const modalTextColor = themeClasses.accentText;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
            <div 
                className={`p-8 rounded-lg shadow-2xl w-full max-w-lg m-4 ${themeClasses.bgSecondary} ${modalTextColor} border ${themeClasses.border}`}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold">{t.exportNovelTitle}</h2>
                <p className={`mt-1 mb-6 ${themeClasses.textSecondary}`}>
                    {t.exportNovelMessage(novel.title)}
                </p>
                
                <div className="space-y-4">
                    <button onClick={handleExportHtml} className={`w-full text-left p-4 rounded-lg transition-colors ${themeClasses.bg} hover:opacity-90`}>
                        <h3 className={`font-bold text-lg ${themeClasses.text}`}>{t.exportHtmlTitle}</h3>
                        <p className={`mt-1 text-sm ${themeClasses.text} text-opacity-70`}>
                            {t.exportHtmlDesc}
                        </p>
                    </button>
                    <button onClick={handleExportTxt} className={`w-full text-left p-4 rounded-lg transition-colors ${themeClasses.bg} hover:opacity-90`}>
                        <h3 className={`font-bold text-lg ${themeClasses.text}`}>{t.exportTxtTitle}</h3>
                        <p className={`mt-1 text-sm ${themeClasses.text} text-opacity-70`}>
                            {t.exportTxtDesc}
                        </p>
                    </button>
                    <button onClick={handleExportMd} className={`w-full text-left p-4 rounded-lg transition-colors ${themeClasses.bg} hover:opacity-90`}>
                        <h3 className={`font-bold text-lg ${themeClasses.text}`}>{t.exportMdTitle}</h3>
                        <p className={`mt-1 text-sm ${themeClasses.text} text-opacity-70`}>
                            {t.exportMdDesc}
                        </p>
                    </button>
                </div>

                <div className="flex justify-end mt-8">
                    <button onClick={onClose} className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} ${modalTextColor} hover:opacity-80`}>
                        {t.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;