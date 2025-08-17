
import React, { useMemo, useContext, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useMatch, useNavigate } from 'react-router-dom';
import { useProjectFile } from './hooks/useProjectFile';
import { ProjectContext } from './contexts/ProjectContext';
import WelcomeScreen from './components/WelcomeScreen';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import CreateNovelPage from './pages/CreateNovelPage';
import ChapterEditorPage from './pages/ChapterEditorPage';
import NovelDetailPage from './pages/NovelDetailPage';
import ReadNovelPage from './pages/ReadNovelPage';
import DemosPage from './pages/DemosPage';
import { THEME_CONFIG } from './constants';
import { LoadingIcon } from './components/Icons';

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
    const {
        projectData,
        setProjectData,
        status,
        saveStatus,
        createProject,
        openProject,
        saveProjectAs,
        unlinkFile,
        saveProject,
    } = useProjectFile();
    
    const navigate = useNavigate();
    const initialLoadHandled = useRef(false);

    // This effect handles redirecting to the home page on initial load or after import.
    useEffect(() => {
        if (status === 'ready' && !initialLoadHandled.current) {
            navigate('/', { replace: true });
            initialLoadHandled.current = true;
        }
    }, [status, navigate]);

    const themeClasses = useMemo(() => {
        const theme = projectData?.settings?.theme || 'book';
        return THEME_CONFIG[theme];
    }, [projectData]);

    const contextValue = useMemo(() => ({
        projectData,
        setProjectData,
        saveProjectAs,
        unlinkFile,
        saveProject,
        theme: projectData?.settings?.theme || 'book',
        themeClasses,
        saveStatus,
    }), [projectData, setProjectData, saveProjectAs, unlinkFile, saveProject, themeClasses, saveStatus]);

    const onEditPage = useMatch('/novel/:novelId/edit/:chapterId');
    const onReadPage = useMatch('/novel/:novelId/read/:chapterId?');
    const onDemosPage = useMatch('/demos');
    const isSidebarHiddenPage = !!onEditPage || !!onReadPage || !!onDemosPage;

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <div className={`flex items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                        <LoadingIcon className="w-12 h-12 animate-spin" />
                    </div>
                );
            case 'welcome':
                return (
                    <div className={`${themeClasses.bg} ${themeClasses.text}`}>
                        <WelcomeScreen onCreate={createProject} onOpen={openProject} />
                    </div>
                );
            case 'ready':
                if (!projectData) return null;
                return (
                    <div className={`flex h-screen ${themeClasses.bg} ${themeClasses.text}`}>
                        {!isSidebarHiddenPage && <Sidebar />}
                        <main className="flex-1 overflow-y-auto">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/create-novel" element={<CreateNovelPage />} />
                                <Route path="/demos" element={<DemosPage />} />
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
