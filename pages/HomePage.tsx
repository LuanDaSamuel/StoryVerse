import React from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore, useThemeClasses } from '../store/projectStore';
import { enhancePlainText } from '../constants';

const HomePage = () => {
    const novels = useProjectStore(state => state.projectData?.novels || []);
    const themeClasses = useThemeClasses();

    if (novels.length === 0) {
        return (
            <div className={`p-4 sm:p-8 md:p-12 ${themeClasses.bg} h-full flex flex-col items-center justify-center`}>
                <div className={`w-full max-w-3xl p-8 text-center rounded-lg ${themeClasses.bgSecondary}`}>
                    <h2 className={`text-2xl font-bold mb-2 ${themeClasses.accentText}`}>You haven't created any novels yet.</h2>
                    <p className={`${themeClasses.accentText} opacity-80`}>
                        Click on "Create Novel" in the sidebar to get started!
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`p-4 sm:p-8 md:p-12 ${themeClasses.bg}`}>
            <div className="flex justify-between items-center mb-8">
                <h1 className={`text-3xl font-bold ${themeClasses.text}`}>Home page</h1>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {novels.map((novel) => {
                    const latestChapter = novel.chapters.length > 0
                        ? novel.chapters.reduce((latest, current) => new Date(current.updatedAt) > new Date(latest.updatedAt) ? current : latest)
                        : null;
                    
                    const linkTo = latestChapter ? `/novel/${novel.id}/edit/${latestChapter.id}` : `/novel/${novel.id}`;

                    return (
                        <Link
                            to={linkTo}
                            key={novel.id}
                            className={`group relative flex flex-col rounded-lg overflow-hidden transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl ${themeClasses.bgSecondary}`}
                        >
                            <div className={`relative w-full aspect-[3/4] flex-shrink-0 ${themeClasses.bgTertiary}`}>
                                {novel.coverImage ? (
                                    <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center p-4 text-center ${themeClasses.accentText} opacity-70 text-sm font-semibold`}>
                                        <span>{enhancePlainText(novel.title)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className={`font-bold text-xl ${themeClasses.accentText} min-h-[3.5rem]`} title={novel.title}>
                                    {enhancePlainText(novel.title)}
                                </h3>
                                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                                    {novel.tags.map(tag => (
                                        <span key={tag} className={`px-2 py-0.5 text-xs rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {novel.description && (
                                <div className="absolute inset-0 p-6 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-center">
                                    <p className="text-white text-base line-clamp-[12]">
                                        {enhancePlainText(novel.description)}
                                    </p>
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default HomePage;