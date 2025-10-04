import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useProjectStore, useThemeClasses } from '../store/projectStore';
import { enhanceHtml, enhancePlainText } from '../constants';
import { BackIcon, Bars3Icon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../components/Icons';

const ChapterListModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    novel: { id: string; title: string; chapters: { id: string; title: string }[] };
}> = ({ isOpen, onClose, novel }) => {
    const themeClasses = useThemeClasses();
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 font-sans"
            onClick={onClose} role="dialog" aria-modal="true"
        >
            <div 
                className={`w-full max-w-md p-6 rounded-lg shadow-2xl ${themeClasses.bgSecondary} ${themeClasses.accentText} border ${themeClasses.border}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Chapters</h2>
                    <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <nav className="max-h-[60vh] overflow-y-auto -mr-2 pr-2">
                    <ul className="space-y-1">
                        {novel.chapters.map(chapter => (
                            <li key={chapter.id}>
                                <Link
                                    to={`/novel/${novel.id}/read/${chapter.id}`}
                                    onClick={onClose}
                                    className={`block w-full text-left px-3 py-2 rounded-md transition-colors ${themeClasses.accentText} hover:${themeClasses.bgTertiary}`}
                                >
                                    {enhancePlainText(chapter.title || 'Untitled Chapter')}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </div>
    );
};


const ReadNovelPage: React.FC = () => {
    const { novelId, chapterId } = useParams<{ novelId: string; chapterId?: string }>();
    const navigate = useNavigate();
    const { projectData } = useProjectStore();
    const themeClasses = useThemeClasses();

    const [isChapterListOpen, setIsChapterListOpen] = useState(false);
    const mainRef = useRef<HTMLElement>(null);

    const { novel, currentChapter, chapterIndex } = useMemo(() => {
        if (!projectData?.novels || !novelId) return { novel: null, currentChapter: null, chapterIndex: -1 };
        const n = projectData.novels.find(n => n.id === novelId) || null;
        if (!n) return { novel: null, currentChapter: null, chapterIndex: -1 };
        const cIndex = chapterId ? n.chapters.findIndex(c => c.id === chapterId) : (n.chapters.length > 0 ? 0 : -1);
        const c = cIndex !== -1 ? n.chapters[cIndex] : null;
        return { novel: n, currentChapter: c, chapterIndex: cIndex };
    }, [projectData, novelId, chapterId]);

    useEffect(() => {
        if (novel && !chapterId && novel.chapters.length > 0) {
            navigate(`/novel/${novelId}/read/${novel.chapters[0].id}`, { replace: true });
        }
    }, [novel, chapterId, novelId, navigate]);
    
    useEffect(() => {
        mainRef.current?.scrollTo(0, 0);
    }, [chapterId]);

    if (!novel || !currentChapter) {
        return (
            <div className={`flex h-screen items-center justify-center ${themeClasses.bg} ${themeClasses.text}`}>
                <p>Loading chapter...</p>
            </div>
        );
    }
    
    const prevChapter = chapterIndex > 0 ? novel.chapters[chapterIndex - 1] : null;
    const nextChapter = chapterIndex < novel.chapters.length - 1 ? novel.chapters[chapterIndex + 1] : null;
    
    return (
        <div className={`h-screen font-serif ${themeClasses.bg} ${themeClasses.text}`}>
             <ChapterListModal 
                isOpen={isChapterListOpen} 
                onClose={() => setIsChapterListOpen(false)} 
                novel={novel}
            />

            <main ref={mainRef} className="h-full overflow-y-auto relative">
                 <header className={`sticky top-0 z-10 p-4 flex items-center justify-between ${themeClasses.bg} bg-opacity-80 backdrop-blur-sm border-b ${themeClasses.border}`}>
                     <div className="flex items-center space-x-4">
                        <button onClick={() => setIsChapterListOpen(true)} className={`flex items-center space-x-2 p-2 rounded-md hover:${themeClasses.bgTertiary}`}>
                            <Bars3Icon className={`w-6 h-6 ${themeClasses.text}`} />
                            <span className="font-sans font-semibold">Chapters</span>
                        </button>
                     </div>
                    <button onClick={() => navigate(`/novel/${novelId}`)} className={`flex items-center space-x-2 font-sans ${themeClasses.text} opacity-70 hover:opacity-100`}>
                        <BackIcon className="w-5 h-5" />
                        <span>Back to Details</span>
                    </button>
                </header>
                
                <article
                    className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
                    style={{ fontSize: `${projectData?.settings.baseFontSize || 18}px` }}
                >
                     <section
                        key={currentChapter.id}
                        aria-labelledby={`chapter-title-${currentChapter.id}`}
                    >
                        <div className="text-center mb-12">
                            <h1 className="text-3xl font-bold">{enhancePlainText(novel.title)}</h1>
                            <h2 id={`chapter-title-${currentChapter.id}`} className="text-4xl font-bold mt-4">{enhancePlainText(currentChapter.title)}</h2>
                        </div>
                        
                        <div
                            className="prose-styles w-full leading-relaxed story-content"
                            dangerouslySetInnerHTML={{ __html: enhanceHtml(currentChapter.content || '') }}
                        />

                         <div className="mt-16 flex justify-between items-center font-sans">
                            {prevChapter ? (
                                <Link 
                                    to={`/novel/${novelId}/read/${prevChapter.id}`}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                    Previous Chapter
                                </Link>
                            ) : (<div />)}

                             {nextChapter ? (
                                <Link
                                    to={`/novel/${novelId}/read/${nextChapter.id}`}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}
                                >
                                    Next Chapter
                                    <ChevronRightIcon className="w-5 h-5" />
                                </Link>
                             ) : (<div />)}
                        </div>
                    </section>
                </article>
            </main>
        </div>
    );
};

export default ReadNovelPage;