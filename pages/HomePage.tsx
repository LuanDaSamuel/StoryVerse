
import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { enhancePlainText } from '../constants';
import { Novel } from '../types';

const HomePage: React.FC = () => {
    const { projectData, themeClasses } = useContext(ProjectContext);
    const [hoveredNovel, setHoveredNovel] = useState<Novel | null>(null);

    const novels = projectData?.novels || [];

    if (novels.length === 0) {
        return (
            <div className={`p-8 md:p-12 ${themeClasses.bg} h-full flex flex-col items-center justify-center`}>
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
        <div className={`p-8 md:p-12 ${themeClasses.bg} h-full overflow-y-auto`}>
            <div className="flex justify-between items-center mb-8">
                <h1 className={`text-3xl font-bold ${themeClasses.text}`}>Home page</h1>
            </div>
            <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                onMouseLeave={() => setHoveredNovel(null)}
            >
                {novels.map((novel) => {
                    const isHovered = hoveredNovel?.id === novel.id;
                    const isBlurred = hoveredNovel && !isHovered;

                    return (
                        <div
                            key={novel.id}
                            onMouseEnter={() => setHoveredNovel(novel)}
                            className={`transition-all duration-300 ease-in-out ${isBlurred ? 'blur-sm scale-95 opacity-60' : ''}`}
                        >
                            <Link
                                to={`/novel/${novel.id}`}
                                className={`group relative block rounded-lg shadow-lg overflow-hidden transition-transform duration-300 ${themeClasses.bgSecondary} ${isHovered ? 'transform -translate-y-2' : ''}`}
                            >
                                <div className={`relative aspect-[3/4] w-full ${themeClasses.bgTertiary}`}>
                                    {novel.coverImage ? (
                                        <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center p-4 text-center ${themeClasses.accentText} opacity-70`}>
                                            <span className="font-semibold">{enhancePlainText(novel.title)}</span>
                                        </div>
                                    )}
                                    {/* Description overlay */}
                                    <div className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                                        <p className="text-white text-sm overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical' }}>
                                            {enhancePlainText(novel.description) || (
                                                <span className="italic opacity-70">No description available.</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col justify-between min-h-[10rem]">
                                   <div>
                                        <h3 className={`font-bold text-xl leading-tight ${themeClasses.accentText}`} title={novel.title}>
                                            {enhancePlainText(novel.title)}
                                        </h3>
                                   </div>
                                    <div className="flex flex-wrap gap-2 mt-auto pt-2">
                                        {novel.tags.map(tag => (
                                            <span key={tag} className={`px-3 py-1 text-xs rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HomePage;
