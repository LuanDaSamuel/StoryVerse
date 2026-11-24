
import * as React from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { Novel } from '../types';
import { CloseIcon, LoadingIcon } from './Icons';
import { enhancePlainText } from '../constants';
import { useTranslations } from '../hooks/useTranslations';
import {
    buildExportDocx,
    buildExportHtml,
    buildExportMarkdown,
    buildExportPlainText,
} from '../utils/novelExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  novel: Novel;
}

const ExportModal = ({ isOpen, onClose, novel }: ExportModalProps) => {
    const { themeClasses } = React.useContext(ProjectContext);
    const t = useTranslations();

    // State for export scope selection
    const [exportScope, setExportScope] = React.useState<'full' | 'range'>('full');
    const [startChapterId, setStartChapterId] = React.useState<string>('');
    const [endChapterId, setEndChapterId] = React.useState<string>('');
    const [isExportingDocx, setIsExportingDocx] = React.useState(false);
    const [exportError, setExportError] = React.useState<string | null>(null);

    // Initialize dropdowns with first and last chapters when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setExportError(null);
            setIsExportingDocx(false);
            if (novel.chapters.length > 0) {
                setExportScope('full');
                setStartChapterId(novel.chapters[0].id);
                setEndChapterId(novel.chapters[novel.chapters.length - 1].id);
            }
        }
    }, [isOpen, novel]);

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

    const getBaseFilename = () => {
        const slug = novel.title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\p{L}\p{N}_-]+/gu, '');
        return slug || 'novel';
    };

    // Helper to filter chapters based on selection
    const getChaptersToExport = () => {
        if (exportScope === 'full') {
            return novel.chapters;
        }

        const startIndex = novel.chapters.findIndex(c => c.id === startChapterId);
        const endIndex = novel.chapters.findIndex(c => c.id === endChapterId);

        if (startIndex === -1 || endIndex === -1) {
            return novel.chapters;
        }

        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);

        return novel.chapters.slice(start, end + 1);
    };

    const handleExportDocx = async () => {
        if (isExportingDocx) return;
        setExportError(null);
        setIsExportingDocx(true);
        try {
            const chaptersToExport = getChaptersToExport();
            const blob = await buildExportDocx(novel, chaptersToExport);
            downloadFile(blob, `${getBaseFilename()}.docx`);
        } catch (err: any) {
            console.error('Failed to export DOCX:', err);
            setExportError(err?.message || 'Failed to generate Word document.');
        } finally {
            setIsExportingDocx(false);
        }
    };

    const handleExportHtml = () => {
        setExportError(null);
        const chaptersToExport = getChaptersToExport();
        const fullHtml = buildExportHtml(novel, chaptersToExport);
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        downloadFile(blob, `${getBaseFilename()}.html`);
    };

    const handleExportTxt = () => {
        setExportError(null);
        const chaptersToExport = getChaptersToExport();
        const textContent = buildExportPlainText(novel, chaptersToExport);
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        downloadFile(blob, `${getBaseFilename()}.txt`);
    };

    const handleExportMd = () => {
        setExportError(null);
        const chaptersToExport = getChaptersToExport();
        const markdownContent = buildExportMarkdown(novel, chaptersToExport);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        downloadFile(blob, `${getBaseFilename()}.md`);
    };

    const modalTextColor = themeClasses.accentText;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`p-8 rounded-lg shadow-2xl w-full max-w-lg m-4 ${themeClasses.bgSecondary} ${modalTextColor} border ${themeClasses.border} max-h-[90vh] overflow-y-auto`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">{t.exportNovelTitle}</h2>
                        <p className={`mt-1 mb-6 ${themeClasses.textSecondary}`}>
                            {t.exportNovelMessage(novel.title)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-1.5 rounded-lg transition-colors hover:${themeClasses.bgTertiary}`}
                        aria-label={t.close}
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Scope Selection */}
                {novel.chapters.length > 0 && (
                    <div className={`mb-6 p-4 rounded-lg border ${themeClasses.border} ${themeClasses.bgTertiary}`}>
                        <h3 className="font-semibold text-sm mb-3 opacity-80">{t.exportScope}</h3>

                        <div className="flex space-x-6 mb-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={exportScope === 'full'}
                                    onChange={() => setExportScope('full')}
                                    className={`form-radio ${themeClasses.accentText}`}
                                />
                                <span>{t.fullNovel}</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={exportScope === 'range'}
                                    onChange={() => setExportScope('range')}
                                    className={`form-radio ${themeClasses.accentText}`}
                                />
                                <span>{t.chapterRange}</span>
                            </label>
                        </div>

                        {exportScope === 'range' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1 opacity-75">{t.fromChapter}</label>
                                    <select
                                        value={startChapterId}
                                        onChange={(e) => setStartChapterId(e.target.value)}
                                        className={`w-full p-2 rounded-md border ${themeClasses.border} ${themeClasses.input} text-sm`}
                                    >
                                        {novel.chapters.map((chapter) => (
                                            <option key={chapter.id} value={chapter.id}>
                                                {enhancePlainText(chapter.title)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1 opacity-75">{t.toChapter}</label>
                                    <select
                                        value={endChapterId}
                                        onChange={(e) => setEndChapterId(e.target.value)}
                                        className={`w-full p-2 rounded-md border ${themeClasses.border} ${themeClasses.input} text-sm`}
                                    >
                                        {novel.chapters.map((chapter) => (
                                            <option key={chapter.id} value={chapter.id}>
                                                {enhancePlainText(chapter.title)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {exportError && (
                    <div className="mb-4 p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-400 text-sm">
                        {exportError}
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => { void handleExportDocx(); }}
                        disabled={isExportingDocx}
                        className={`w-full text-left p-4 rounded-lg border ${themeClasses.border} transition-colors ${themeClasses.bg} hover:opacity-90 disabled:opacity-60`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <h3 className={`font-bold text-lg ${themeClasses.text}`}>{t.exportDocxTitle}</h3>
                            {isExportingDocx && <LoadingIcon className={`w-5 h-5 animate-spin ${themeClasses.text}`} />}
                        </div>
                        <p className={`mt-1 text-sm ${themeClasses.text} text-opacity-75`}>
                            {t.exportDocxDesc}
                        </p>
                    </button>
                    <button
                        onClick={handleExportHtml}
                        className={`w-full text-left p-4 rounded-lg border ${themeClasses.border} transition-colors ${themeClasses.bg} hover:opacity-90`}
                    >
                        <h3 className={`font-bold text-lg ${themeClasses.text}`}>{t.exportHtmlTitle}</h3>
                        <p className={`mt-1 text-sm ${themeClasses.text} text-opacity-75`}>
                            {t.exportHtmlDesc}
                        </p>
                    </button>
                    <button
                        onClick={handleExportMd}
                        className={`w-full text-left p-4 rounded-lg border ${themeClasses.border} transition-colors ${themeClasses.bg} hover:opacity-90`}
                    >
                        <h3 className={`font-bold text-lg ${themeClasses.text}`}>{t.exportMdTitle}</h3>
                        <p className={`mt-1 text-sm ${themeClasses.text} text-opacity-75`}>
                            {t.exportMdDesc}
                        </p>
                    </button>
                    <button
                        onClick={handleExportTxt}
                        className={`w-full text-left p-4 rounded-lg border ${themeClasses.border} transition-colors ${themeClasses.bg} hover:opacity-90`}
                    >
                        <h3 className={`font-bold text-lg ${themeClasses.text}`}>{t.exportTxtTitle}</h3>
                        <p className={`mt-1 text-sm ${themeClasses.text} text-opacity-75`}>
                            {t.exportTxtDesc}
                        </p>
                    </button>
                </div>

                <div className="flex justify-end mt-8">
                    <button
                        onClick={onClose}
                        className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} ${modalTextColor} hover:opacity-80`}
                    >
                        {t.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
