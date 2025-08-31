


import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { TAG_OPTIONS } from '../constants';
import { Novel } from '../types';
import { UploadIcon, BackIcon } from '../components/Icons';

const DRAFT_KEY = 'storyverse-novel-draft';

const CreateNovelPage: React.FC = () => {
    const { setProjectData, themeClasses } = useContext(ProjectContext);
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load draft from session storage on component mount
    useEffect(() => {
        try {
            const savedDraft = sessionStorage.getItem(DRAFT_KEY);
            if (savedDraft) {
                const draft = JSON.parse(savedDraft);
                setTitle(draft.title || '');
                setDescription(draft.description || '');
                setCoverImage(draft.coverImage || null);
                setSelectedTags(draft.selectedTags || []);
            }
        } catch (error) {
            console.error("Failed to load novel draft from session storage:", error);
            sessionStorage.removeItem(DRAFT_KEY); // Clear potentially corrupted data
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    // Save draft to session storage whenever form data changes
    useEffect(() => {
        const draft = { title, description, coverImage, selectedTags };
        try {
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (error) {
            console.error("Failed to save novel draft to session storage:", error);
        }
    }, [title, description, coverImage, selectedTags]);


    const placeholderClass = themeClasses.input.split(' ').find(c => c.startsWith('placeholder-')) || 'placeholder-gray-400';

    const handleTagClick = (tag: string) => {
        setSelectedTags(prev => {
            if (prev.includes(tag)) {
                return prev.filter(t => t !== tag);
            }
            if (prev.length < 6) {
                return [...prev, tag];
            }
            return prev;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        if (!title) return;
        const newChapterId = crypto.randomUUID();
        const now = new Date().toISOString();
        const newNovel: Novel = {
            id: crypto.randomUUID(),
            title,
            description,
            tags: selectedTags,
            chapters: [{
                id: newChapterId,
                title: 'Chapter 1',
                content: '',
                wordCount: 0,
                createdAt: now,
                updatedAt: now,
                history: [],
            }],
            sketches: [],
            createdAt: now,
            ...(coverImage && { coverImage }),
        };

        setProjectData(currentData => {
            if (!currentData) return null; // Should not happen if we are on this page
            return {
                ...currentData,
                novels: [...currentData.novels, newNovel],
            };
        });
        
        // Clear the draft from session storage after successful submission
        sessionStorage.removeItem(DRAFT_KEY);

        navigate(`/novel/${newNovel.id}/edit/${newChapterId}`);
    };

    return (
        <div className={`p-8 md:p-12 ${themeClasses.bg} min-h-screen`}>
            <button onClick={() => navigate(-1)} className={`flex items-center space-x-2 mb-8 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                <BackIcon className="w-5 h-5" />
                <span>Back to Home page</span>
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h2 className={`text-xl font-bold mb-2 ${themeClasses.text}`}>Cover Image</h2>
                    <div
                        className={`relative w-full aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer ${themeClasses.border} ${themeClasses.bgSecondary}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {coverImage ? (
                            <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover rounded-md" />
                        ) : (
                            <div className="text-center">
                                <UploadIcon className={`w-12 h-12 mx-auto ${themeClasses.textSecondary}`} />
                                <p className={`mt-2 font-semibold ${themeClasses.accentText}`}>Upload a cover</p>
                                <p className={`text-sm ${themeClasses.textSecondary}`}>A beautiful cover helps!</p>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full mt-4 py-2 px-4 rounded-lg font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-90`}
                    >
                        Upload File
                    </button>
                </div>
                <div className="lg:col-span-2">
                    <div className={`p-6 rounded-lg ${themeClasses.bgTertiary}`}>
                         <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Your Amazing Novel Title"
                            className={`text-5xl font-bold bg-transparent outline-none w-full mb-2 ${themeClasses.accentText} ${placeholderClass}`}
                        />
                         <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="A short, captivating description of your novel..."
                            className={`text-lg mt-1 bg-transparent outline-none w-full h-24 resize-none ${themeClasses.textSecondary} ${placeholderClass}`}
                            rows={3}
                        />
                    </div>
                    <div className={`p-6 mt-6 rounded-lg ${themeClasses.bgTertiary}`}>
                        <h3 className={`font-bold mb-3 ${themeClasses.accentText}`}>Tags (up to 6)</h3>
                        <div className="flex flex-wrap gap-2">
                            {TAG_OPTIONS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => handleTagClick(tag)}
                                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                        selectedTags.includes(tag)
                                            ? `${themeClasses.accent} ${themeClasses.accentText}`
                                            : `${themeClasses.bgSecondary} ${themeClasses.accentText} hover:opacity-80`
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end mt-8">
                        <button
                            onClick={handleSubmit}
                            disabled={!title}
                            className={`px-8 py-3 font-bold rounded-lg transition-colors ${themeClasses.accent} ${themeClasses.accentText} disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
                        >
                            Create & Write First Chapter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateNovelPage;