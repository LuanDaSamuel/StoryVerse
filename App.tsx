import React, { useMemo, useContext, useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate, useMatch } from 'react-router-dom';
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
import SketchesPage from './pages/SketchesPage'; // Import the new Sketches page
import { THEME_CONFIG } from './constants';
import { LoadingIcon, Bars3Icon, DocumentPlusIcon, UploadIcon, CloudIcon } from './components/Icons';
import { Theme } from './types';

const NovelEditRedirect = () => {
    const { novelId } = useParams<{ novelId: string }>();
    const { projectData } = useContext(ProjectContext);

    if (!projectData || !novelId) {
        return <Navigate to="/" replace />; 
    }

    const novel = projectData.novels.find(n => n.id === novelId);
    
    if (!novel) {
        // Novel was not found, safely redirect to home.
        return <Navigate to="/" replace />;
    }

    if (novel.chapters.length === 0) {
        // If novel has no chapters, redirect to novel detail page.
        return <Navigate to={`/novel/${novelId}`} replace />;
    }

    const firstChapterId = novel.chapters[0].id;
    return <Navigate to={`/novel/${novelId}/edit/${firstChapterId}`} replace />;
};

const AppContent = () => {
    const project = useProject();
    
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const navigate = useNavigate();
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

    const onEditPage = useMatch('/novel/:novelId/edit/:chapterId');
    const onReadPage = useMatch('/novel/:novelId/read/:chapterId?');
    const onIdeaEditPage = useMatch('/idea/:ideaId/edit');
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
            case 'drive-conflict':
                 return (
                    <div className={`flex flex-col items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                        <div className={`w-full max-w-xl p-8 text-center rounded-lg ${themeClasses.bgSecondary}`}>
                            <h2 className={`text-2xl font-bold mb-2 ${themeClasses.accentText}`}>Project Conflict</h2>
                            <p className={`${themeClasses.accentText} opacity-80 mb-6`}>
                                You have a project saved locally and another on Google Drive. How would you like to proceed?
                            </p>
                            <div className="space-y-4">
                                <button
                                    onClick={project.overwriteDriveProject}
                                    className={`flex flex-col items-center justify-center w-full px-6 py-4 text-lg font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
                                >
                                    <div className="flex items-center">
                                        <UploadIcon className="w-6 h-6 mr-3" />
                                        <span>Upload Local Project</span>
                                    </div>
                                    <span className="text-sm font-normal opacity-80 mt-1">This will overwrite the project on Google Drive.</span>
                                </button>
                                <button
                                    onClick={project.loadDriveProjectAndDiscardLocal}
                                    className={`flex flex-col items-center justify-center w-full px-6 py-4 text-lg font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}
                                >
                                    <div className="flex items-center">
                                        <CloudIcon className="w-6 h-6 mr-3" />
                                        <span>Use Cloud Project</span>
                                    </div>
                                    <span className="text-sm font-normal opacity-80 mt-1">Your local changes will not be uploaded.</span>
                                </button>
                            </div>
                             <div className="mt-8 text-center">
                                <button onClick={project.signOut} className={`text-sm ${themeClasses.textSecondary} hover:underline`}>
                                    Sign Out & Cancel
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

                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/create-novel" element={<CreateNovelPage />} />
                                <Route path="/demos" element={<DemosPage />} />
                                <Route path="/sketches" element={<SketchesPage />} />
                                <Route path="/idea/:ideaId/edit" element={<StoryIdeaEditorPage />} />
                                <Route path="/novel/:novelId" element={<NovelDetailPage />} />
                                <Route path="/novel/:novelId/read/:chapterId?" element={<ReadNovelPage />} />
                                <Route path="/novel/:novelId/edit" element={<NovelEditRedirect />} />
                                <Route path="/novel/:novelId/edit/:chapterId" element={<ChapterEditorPage />} />
                            </Routes>
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
      <HashRouter>
        <AppContent />
      </HashRouter>
    </React.StrictMode>
  );
}

export default App;