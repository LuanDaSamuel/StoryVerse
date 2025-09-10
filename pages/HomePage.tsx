
import React, { useContext } from 'react';
// FIX: Changed react-router-dom import to namespace import to fix module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { enhancePlainText } from '../constants';
import { Novel } from '../types';

const HomePage = () => {
    const { projectData, themeClasses } = useContext(ProjectContext);
    const novels = projectData?.novels || [];

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
                {novels.map((novel) => (
                    <ReactRouterDOM.Link
                        to={`/novel/${novel.id}`}
                        key={novel.id}
                        className={`group flex flex-col rounded-lg overflow-hidden transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl ${themeClasses.bgSecondary}`}
                    >
                        {/* Cover Image */}
                        <div className={`relative w-full aspect-[3/4] flex-shrink-0 ${themeClasses.bgTertiary}`}>
                            {novel.coverImage ? (
                                <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center p-4 text-center ${themeClasses.accentText} opacity-70 text-sm font-semibold`}>
                                    <span>{enhancePlainText(novel.title)}</span>
                                </div>
                            )}
                        </div>
                        {/* Novel Details */}
                        <div className="p-4 flex flex-col flex-grow">
                            <h3 className={`font-bold text-xl truncate ${themeClasses.accentText}`} title={novel.title}>
                                {enhancePlainText(novel.title)}
                            </h3>
                            <div className="flex flex-wrap gap-2 my-2">
                                {novel.tags.map(tag => (
                                    <span key={tag} className={`px-2 py-0.5 text-xs rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                             {novel.description && (
                                <p className={`mt-2 text-sm ${themeClasses.textSecondary}`}>
                                    {enhancePlainText(novel.description)}
                                </p>
                            )}
                        </div>
                    </ReactRouterDOM.Link>
                ))}
            </div>
        </div>
    );
};

export default HomePage;
