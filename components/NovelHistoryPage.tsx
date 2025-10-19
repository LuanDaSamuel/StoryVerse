import * as React from 'react';
import { Novel } from '../types';
import { ProjectContext } from '../contexts/ProjectContext';
import { enhancePlainText } from '../constants';
import { useTranslations } from '../hooks/useTranslations';

interface NovelHistoryPageProps {
  novel: Novel;
}

const NovelHistoryPage = ({ novel }: NovelHistoryPageProps) => {
    const { themeClasses } = React.useContext(ProjectContext);
    const t = useTranslations();

    const historyLog = React.useMemo(() => {
        if (!novel || !novel.chapters) return [];

        const allHistory = novel.chapters.flatMap(chapter => 
            (chapter.history || []).map(entry => ({
                ...entry,
                chapterTitle: chapter.title,
                chapterId: chapter.id,
            }))
        );

        return allHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [novel]);

    if (historyLog.length === 0) {
        return (
            <div className="pt-6 text-center">
                <h2 className={`text-xl font-bold mb-4 ${themeClasses.accentText}`}>{t.history}</h2>
                <p className={themeClasses.textSecondary}>{t.noHistory}</p>
            </div>
        );
    }
    
    return (
        <div className="pt-6">
            <h2 className={`text-xl font-bold mb-4 ${themeClasses.accentText}`}>{t.history}</h2>
            <div className="space-y-4">
                {historyLog.map((entry, index) => (
                    <div key={`${entry.chapterId}-${entry.timestamp}-${index}`} className={`p-4 rounded-lg ${themeClasses.bgTertiary}`}>
                        <p className={`font-semibold ${themeClasses.accentText}`}>
                            {t.changeRecordedFor} <span className="font-bold">{enhancePlainText(entry.chapterTitle)}</span>
                        </p>
                        <p className={themeClasses.textSecondary}>
                           {new Date(entry.timestamp).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NovelHistoryPage;
