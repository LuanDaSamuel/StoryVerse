
import React, { useContext } from 'react';
// FIX: Changed react-router-dom import to namespace import to fix module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { enhancePlainText } from '../constants';
import { Novel } from '../types';

const HomePage: React.FC = () => {
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
            <div className="flex justify-between items-center mb-8 flex-shrink-0">
                <h1 className={`text-3xl font-bold ${themeClasses.text}`}>Home page</h1>
            </div>
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col space-y-4">
                    {novels.map((novel) => {
                        return (
                            <ReactRouterDOM.Link
                                to={`/novel/${novel.id}`}
                                key={novel.id}
                                className={`block p-4 rounded-lg transition-colors duration-200 ${themeClasses.bgSecondary} hover:${themeClasses.bgTertiary}`}
                            >
                                <div className="flex items-start space-x-4">
                                    <div className={`w-20 h-28 flex-shrink-0 rounded ${themeClasses.bgTertiary}`}>
                                        {novel.coverImage ? (
                                            <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover rounded" />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center p-2 text-center ${themeClasses.accentText} opacity-70 text-xs font-semibold`}>
                                                <span>{enhancePlainText(novel.title)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold text-xl truncate ${themeClasses.accentText}`} title={novel.title}>
                                            {enhancePlainText(novel.title)}
                                        </h3>
                                        <p className={`text-sm mt-1 ${themeClasses.textSecondary} overflow-hidden`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                            {enhancePlainText(novel.description) || (
                                                <span className="italic opacity-70">No description available.</span>
                                            )}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {novel.tags.slice(0, 4).map(tag => (
                                                <span key={tag} className={`px-2 py-1 text-xs rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>
                                                    {tag}
                                                </span>
                                            ))}
                                            {novel.tags.length > 4 && (
                                                <span className={`px-2 py-1 text-xs rounded-full font-semibold ${themeClasses.bg} ${themeClasses.text}`}>
                                                    +{novel.tags.length - 4}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </ReactRouterDOM.Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
