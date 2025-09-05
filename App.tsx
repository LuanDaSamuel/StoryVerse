
import React, { useMemo, useContext, useEffect, useRef } from 'react';
// FIX: Changed react-router-dom import to namespace import to fix module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
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
import StoryIdeaEditorPage from './pages/StoryIdeaEditorPage';
import { THEME_CONFIG } from './constants';
import { LoadingIcon } from './components/Icons';
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
    const {
        projectData,
        setProjectData,
        status,
        saveStatus,
        projectName,
        createProject,
        openProject,
        downloadProject,
        closeProject,
    } = useProjectFile();
    
    const navigate = ReactRouterDOM.useNavigate();
    const initialLoadHandled = useRef(false);

    // This effect handles redirecting to the home page on initial load or after import.
    useEffect(() => {
        if (status === 'ready' && !initialLoadHandled.current) {
            navigate('/', { replace: true });
            initialLoadHandled.current = true;
        }
    }, [status, navigate]);

    const theme = useMemo(() => {
        const projectTheme = projectData?.settings?.theme || 'book';
        // Fallback to 'book' theme if the saved theme from a project file is no longer valid.
        return (projectTheme in THEME_CONFIG) ? projectTheme as Theme : 'book';
    }, [projectData]);

    const themeClasses = useMemo(() => {
        return THEME_CONFIG[theme];
    }, [theme]);

    const contextValue = useMemo(() => ({
        projectData,
        setProjectData,
        downloadProject,
        closeProject,
        theme,
        themeClasses,
        saveStatus,
        projectName,
    }), [projectData, setProjectData, downloadProject, closeProject, theme, themeClasses, saveStatus, projectName]);

    const onEditPage = ReactRouterDOM.useMatch('/novel/:novelId/edit/:chapterId');
    const onReadPage = ReactRouterDOM.useMatch('/novel/:novelId/read/:chapterId?');
    const onIdeaEditPage = ReactRouterDOM.useMatch('/idea/:ideaId/edit');
    const isSidebarHiddenPage = !!onEditPage || !!onReadPage || !!onIdeaEditPage;

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
