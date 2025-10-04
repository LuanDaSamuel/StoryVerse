import React, { useState, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useMatch } from 'react-router-dom';
import { useProjectStore, useTheme, useThemeClasses } from './store/projectStore';
import WelcomeScreen from './components/WelcomeScreen';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import CreateNovelPage from './pages/CreateNovelPage';
import ChapterEditorPage from './pages/ChapterEditorPage';
import NovelDetailPage from './pages/NovelDetailPage';
import ReadNovelPage from './pages/ReadNovelPage';
import DemosPage from './pages/DemosPage';
import StoryIdeaEditorPage from './pages/StoryIdeaEditorPage';
import SketchesPage from './pages/SketchesPage';
import SketchEditorPage from './pages/SketchEditorPage';
import { LoadingIcon, Bars3Icon, DocumentPlusIcon, UploadIcon, CloudIcon } from './components/Icons';

const NovelEditRedirect = () => {
    const { novelId } = useParams<{ novelId: string }>();
    const novels = useProjectStore(state => state.projectData?.novels);

    if (!novels || !novelId) {
        return <Navigate to="/" replace />; 
    }

    const novel = novels.find(n => n.id === novelId);
    
    if (!novel) {
        return <Navigate to="/" replace />;
    }

    if (novel.chapters.length === 0) {
        return <Navigate to={`/novel/${novelId}`} replace />;
    }

    const firstChapterId = novel.chapters[0].id;
    return <Navigate to={`/novel/${novelId}/edit/${firstChapterId}`} replace />;
};

const AppContent = () => {
    const status = useProjectStore(state => state.status);
    const userProfile = useProjectStore(state => state.userProfile);
    const themeClasses = useThemeClasses();
    const { createProjectOnDrive, uploadProjectToDrive, signOut, overwriteDriveProject, loadDriveProjectAndDiscardLocal } = useProjectStore();
    
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    
    const onEditPage = useMatch('/novel/:novelId/edit/:chapterId');
    const onReadPage = useMatch('/novel/:novelId/read/:chapterId?');
    const onIdeaEditPage = useMatch('/idea/:ideaId/edit');
    const onSketchEditPage = useMatch('/novel/:novelId/sketch/:sketchId/edit');
    const isSidebarPermanentlyHidden = !!onEditPage || !!onReadPage || !!onIdeaEditPage || !!onSketchEditPage;

    switch (status) {
        case 'loading':
            return (
                <div className={`flex items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                    <LoadingIcon className="w-12 h-12 animate-spin" />
                </div>
            );
        case 'welcome':
            return <WelcomeScreen />;
        case 'drive-no-project':
            return (
                 <div className={`flex flex-col items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                    <div className={`w-full max-w-lg p-8 text-center rounded-lg ${themeClasses.bgSecondary}`}>
                        <h2 className={`text-2xl font-bold mb-2 ${themeClasses.accentText}`}>Welcome, {userProfile?.email}!</h2>
                        <p className={`${themeClasses.accentText} opacity-80 mb-6`}>
                        No StoryVerse project was found on your Google Drive. Get started by creating a new project or uploading an existing one.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={createProjectOnDrive}
                            className={`flex items-center justify-center w-full sm:w-auto px-6 py-3 text-lg font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
                        >
                            <DocumentPlusIcon className="w-6 h-6 mr-3" />
                            Create New Project
                        </button>
                        <button
                            onClick={uploadProjectToDrive}
                            className={`flex items-center justify-center w-full sm:w-auto px-6 py-3 text-lg font-semibold rounded-lg ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-80`}
                        >
                            <UploadIcon className="w-6 h-6 mr-3" />
                            Upload Local Project
                        </button>
                        </div>
                        <div className="mt-8 text-center">
                            <button onClick={signOut} className={`text-sm ${themeClasses.textSecondary} hover:underline`}>
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
                                onClick={overwriteDriveProject}
                                className={`flex flex-col items-center justify-center w-full px-6 py-4 text-lg font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90`}
                            >
                                <div className="flex items-center">
                                    <UploadIcon className="w-6 h-6 mr-3" />
                                    <span>Upload Local Project</span>
                                </div>
                                <span className="text-sm font-normal opacity-80 mt-1">This will overwrite the project on Google Drive.</span>
                            </button>
                            <button
                                onClick={loadDriveProjectAndDiscardLocal}
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
                            <button onClick={signOut} className={`text-sm ${themeClasses.textSecondary} hover:underline`}>
                                Sign Out & Cancel
                            </button>
                        </div>
                    </div>
                </div>
            );
        case 'ready':
            return (
                <div className={`flex h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                    {!isSidebarPermanentlyHidden && (
                        <>
                            <div className="hidden md:block flex-shrink-0"><Sidebar /></div>
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
                        {!isSidebarPermanentlyHidden && (
                            <header className={`sticky top-0 z-10 flex items-center justify-between p-4 md:hidden ${themeClasses.bgSecondary} border-b ${themeClasses.border}`}>
                                <button onClick={() => setIsMobileSidebarOpen(true)} className={themeClasses.accentText}>
                                    <span className="sr-only">Open Menu</span>
                                    <Bars3Icon className="h-6 w-6" />
                                </button>
                                <span className={`font-bold ${themeClasses.accentText}`}>StoryVerse</span>
                                <div className="w-6" />
                            </header>
                        )}

                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/create-novel" element={<CreateNovelPage />} />
                            <Route path="/demos" element={<DemosPage />} />
                            <Route path="/idea/:ideaId/edit" element={<StoryIdeaEditorPage />} />
                            <Route path="/sketches" element={<SketchesPage />} />
                            <Route path="/novel/:novelId/sketch/:sketchId/edit" element={<SketchEditorPage />} />
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

function App(): React.ReactNode {
  return (
      <HashRouter>
        <div className="font-sans">
            <AppContent />
        </div>
      </HashRouter>
  );
}

export default App;