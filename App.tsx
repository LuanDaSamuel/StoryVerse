

import React, { useMemo, useContext, useEffect, useRef, useState } from 'react';
// FIX: Changed react-router-dom import to namespace import to fix module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { useProject } from './hooks/useProjectFile';
import { ProjectContext } from './contexts/ProjectContext';
import WelcomeScreen from './components/WelcomeScreen';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import CreateNovelPage from './pages/CreateNovelPage';
import ChapterEditorPage from './pages/ChapterEditorPage';
import NovelDetailPage from './pages/NovelDetailPage';
import ReadNovelPage from './pages/ReadNovelPage';
import DemosPage from './pages/DemosPage';
import StoryIdeaEditorPage from './pages/StoryIdeaEditorPage';
import { THEME_CONFIG } from './constants';
import { LoadingIcon, Bars3Icon, DocumentPlusIcon, UploadIcon } from './components/Icons';
import { Theme } from './types';

const NovelEditRedirect = () => {
    const { novelId } = ReactRouterDOM.useParams<{ novelId: string }>();
    const { projectData } = useContext(ProjectContext);

    if (!projectData || !novelId) {
        return <ReactRouterDOM.Navigate to="/" replace />; 
    }

    const novel = projectData.novels.find(n => n.id === novelId);
    
    if (!novel) {
        // Novel was not found, safely redirect to home.
        return <ReactRouterDOM.Navigate to="/" replace />;
    }

    if (novel.chapters.length === 0) {
        // If novel has no chapters, redirect to novel detail page.
        return <ReactRouterDOM.Navigate to={`/novel/${novelId}`} replace />;
    }

    const firstChapterId = novel.chapters[0].id;
    return <ReactRouterDOM.Navigate to={`/novel/${novelId}/edit/${firstChapterId}`} replace />;
};

const AppContent = () => {
    const project = useProject();
    
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const navigate = ReactRouterDOM.useNavigate();
    const initialLoadHandled = useRef(false);

    // This effect handles redirecting to the home page on initial load or after import.
    useEffect(() => {
        if (project.status === 'ready' && !initialLoadHandled.current) {
            navigate('/', { replace: true });
            initialLoadHandled.current = true;
        }
    }, [project.status, navigate]);

    const theme = useMemo(() => {
        const projectTheme = project.projectData?.settings?.theme || 'book';
        // Fallback to 'book' theme if the saved theme from a project file is no longer valid.
        return (projectTheme in THEME_CONFIG) ? projectTheme as Theme : 'book';
    }, [project.projectData]);

    const themeClasses = useMemo(() => {
        return THEME_CONFIG[theme];
    }, [theme]);

    const contextValue = useMemo(() => ({
        ...project,
        theme,
        themeClasses,
    }), [project, theme, themeClasses]);

    const onEditPage = ReactRouterDOM.useMatch('/novel/:novelId/edit/:chapterId');
    const onReadPage = ReactRouterDOM.useMatch('/novel/:novelId/read/:chapterId?');
    const onIdeaEditPage = ReactRouterDOM.useMatch('/idea/:ideaId/edit');
    const isSidebarPermanentlyHidden = !!onEditPage || !!onReadPage || !!onIdeaEditPage;

    const renderContent = () => {
        switch (project.status) {
            case 'loading':
                return (
                    <div className={`flex items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                        <LoadingIcon className="w-12 h-12 animate-spin" />
                    </div>
                );
            case 'welcome':
                return (
                    <WelcomeScreen 
                        onGoogleSignIn={project.signInWithGoogle}
                        onCreateLocalProject={project.createLocalProject}
                        onOpenLocalProject={project.openLocalProject}
                    />
                );
            case 'drive-no-project':
                return (
                     <div className={`flex flex-col items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                        <div className={`w-full max-w-lg p-8 text-center rounded-lg ${themeClasses.bgSecondary}`}>
                            <h2 className={`text-2xl font-bold mb-2 ${themeClasses.accentText}`}>Welcome, {project.userProfile?.email}!</h2>
                            <p className={`${themeClasses.accentText} opacity-80 mb-6`}>
                            No StoryVerse project was found on your Google Drive. Get started by creating a new project or uploading an existing one.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                // FIX: Wrapped project.createProjectOnDrive in an arrow function to prevent passing the click event as an argument, which caused a type mismatch.
                                onClick={() => project.createProjectOnDrive()}
                                className={`flex items-center justify-center w-full sm:w-auto px-6 py-3 text-lg font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
                            >
                                <DocumentPlusIcon className="w-6 h-6 mr-3" />
                                Create New Project
                            </button>
                            <button
                                onClick={project.uploadProjectToDrive}
                                className={`flex items-center justify-center w-full sm:w-auto px-6 py-3 text-lg font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}
                            >
                                <UploadIcon className="w-6 h-6 mr-3" />
                                Upload Local Project
                            </button>
                            </div>
                            <div className="mt-8 text-center">
                                <button onClick={project.signOut} className={`text-sm ${themeClasses.textSecondary} hover:underline`}>
                                    Sign Out & Use Local File
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'ready':
                if (!project.projectData) return null;
                return (
                    <div className={`flex h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                        {/* Desktop Sidebar */}
                        {!isSidebarPermanentlyHidden && (
                            <div className="hidden md:block flex-shrink-0">
                                <Sidebar />
                            </div>
                        )}

                        {/* Mobile Sidebar & Overlay */}
                        {!isSidebarPermanentlyHidden && (
                            <>
                                <div 
                                    className={`fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    aria-hidden="true"
                                />
                                <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out md:hidden ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                                    <Sidebar onLinkClick={() => setIsMobileSidebarOpen(false)} />
                                </div>
                            </>
                        )}
                        
                        <main className="flex-1 overflow-y-auto">
                            {/* Mobile Header with Hamburger */}
                            {!isSidebarPermanentlyHidden && (
                                <header className={`sticky top-0 z-10 flex items-center justify-between p-4 md:hidden ${themeClasses.bgSecondary} border-b ${themeClasses.border}`}>
                                    <button onClick={() => setIsMobileSidebarOpen(true)} className={themeClasses.accentText}>
                                        <span className="sr-only">Open Menu</span>
                                        <Bars3Icon className="h-6 w-6" />
                                    </button>
                                    <span className={`font-bold ${themeClasses.accentText}`}>StoryVerse</span>
                                    <div className="w-6" /> {/* Spacer to center title */}
                                </header>
                            )}

                            <ReactRouterDOM.Routes>
                                <ReactRouterDOM.Route path="/" element={<HomePage />} />
                                <ReactRouterDOM.Route path="/create-novel" element={<CreateNovelPage />} />
                                <ReactRouterDOM.Route path="/demos" element={<DemosPage />} />
                                <ReactRouterDOM.Route path="/idea/:ideaId/edit" element={<StoryIdeaEditorPage />} />
                                <ReactRouterDOM.Route path="/novel/:novelId" element={<NovelDetailPage />} />
                                <ReactRouterDOM.Route path="/novel/:novelId/read/:chapterId?" element={<ReadNovelPage />} />
                                <ReactRouterDOM.Route path="/novel/:novelId/edit" element={<NovelEditRedirect />} />
                                <ReactRouterDOM.Route path="/novel/:novelId/edit/:chapterId" element={<ChapterEditorPage />} />
                            </ReactRouterDOM.Routes>
                        </main>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <ProjectContext.Provider value={contextValue}>
            <div className="font-sans">
                {renderContent()}
            </div>
        </ProjectContext.Provider>
    );
};


function App(): React.ReactNode {
  return (
    <React.StrictMode>
      <ReactRouterDOM.HashRouter>
        <AppContent />
      </ReactRouterDOM.HashRouter>
    </React.StrictMode>
  );
}

export default App;