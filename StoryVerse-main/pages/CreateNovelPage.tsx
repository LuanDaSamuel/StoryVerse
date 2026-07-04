import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../contexts/ProjectContext';
import { Novel } from '../types';
import { UploadIcon, BackIcon, CloseIcon, PlusIcon } from '../components/Icons';
import { useTranslations } from '../hooks/useTranslations';

const DRAFT_KEY = 'storyverse-novel-draft';

const CreateNovelPage = () => {
    const { setProjectData, themeClasses } = React.useContext(ProjectContext);
    const t = useTranslations();
    const navigate = useNavigate();
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [coverImage, setCoverImage] = React.useState<string | null>(null);
    const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
    const [newTag, setNewTag] = React.useState('');
    const [isAddingTag, setIsAddingTag] = React.useState(false);
    
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const descriptionTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const tagInputRef = React.useRef<HTMLInputElement>(null);

    // Load draft from session storage on component mount
    React.useEffect(() => {
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
    }, []);

    // Save draft to session storage whenever form data changes
    React.useEffect(() => {
        const draft = { title, description, coverImage, selectedTags };
        try {
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (error) {
            console.error("Failed to save novel draft to session storage:", error);
        }
    }, [title, description, coverImage, selectedTags]);

    // Autosize the description textarea to fit its content.
    React.useEffect(() => {
        if (descriptionTextareaRef.current) {
            const textarea = descriptionTextareaRef.current;
            textarea.style.height = 'auto'; // Reset height to allow shrinking
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [description]);

    React.useEffect(() => {
        if (isAddingTag) {
            tagInputRef.current?.focus();
        }
    }, [isAddingTag]);

    const placeholderClass = themeClasses.input.split(' ').find(c => c.startsWith('placeholder-')) || 'placeholder-gray-400';
    
    const handleAddTag = () => {
        const trimmedTag = newTag.trim();
        if (trimmedTag && !selectedTags.includes(trimmedTag) && selectedTags.length < 6) {
            setSelectedTags([...selectedTags, trimmedTag]);
        }
        setNewTag('');
        setIsAddingTag(false);
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setNewTag('');
            setIsAddingTag(false);
        }
    };
    
    const handleTagInputBlur = () => {
        handleAddTag();
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
            if (!currentData) return null;
            return {
                ...currentData,
                novels: [...currentData.novels, newNovel],
            };
        });
        
        sessionStorage.removeItem(DRAFT_KEY);

        navigate(`/novel/${newNovel.id}/edit/${newChapterId}`);
    };

    return (
        <div className={`p-4 sm:p-8 md:p-12 ${themeClasses.bg} min-h-screen`}>
            <button onClick={() => navigate(-1)} className={`flex items-center space-x-2 mb-8 ${themeClasses.text} opacity-70 hover:opacity-100`}>
                <BackIcon className="w-5 h-5" />
                <span>{t.backTo} {t.homePage}</span>
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h2 className={`text-xl font-bold mb-2 ${themeClasses.text}`}>{t.coverImage}</h2>
                    <div
                        className={`relative w-full aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer ${themeClasses.border} ${themeClasses.bgSecondary}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {coverImage ? (
                            <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover rounded-md" />
                        ) : (
                            <div className="text-center">
                                <UploadIcon className={`w-12 h-12 mx-auto ${themeClasses.textSecondary}`} />
                                <p className={`mt-2 font-semibold ${themeClasses.accentText}`}>{t.uploadCover}</p>
                                <p className={`text-sm ${themeClasses.textSecondary}`}>{t.uploadCoverHint}</p>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full mt-4 py-2 px-4 rounded-lg font-semibold transition-colors ${themeClasses.bgTertiary} ${themeClasses.accentText} hover:opacity-90`}
                    >
                        {t.uploadFile}
                    </button>
                </div>
                <div className="lg:col-span-2">
                    <div className={`p-6 rounded-lg ${themeClasses.bgTertiary}`}>
                         <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t.novelTitlePlaceholder}
                            className={`text-5xl font-bold bg-transparent outline-none w-full mb-2 ${themeClasses.accentText} ${placeholderClass}`}
                        />
                         <textarea
                            ref={descriptionTextareaRef}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t.novelDescriptionPlaceholder}
                            className={`text-lg mt-1 bg-transparent outline-none w-full resize-none min-h-[6rem] max-h-96 ${themeClasses.textSecondary} ${placeholderClass}`}
                        />
                    </div>
                    <div className={`p-6 mt-6 rounded-lg ${themeClasses.bgTertiary}`}>
                        <h3 className={`font-bold mb-2 ${themeClasses.accentText}`}>{t.tags}</h3>
                        <p className={`text-sm mb-4 ${themeClasses.textSecondary}`}>{t.tagsHint}</p>
                        <div className="flex flex-wrap gap-2 items-center min-h-[2.5rem]">
                            {selectedTags.map(tag => (
                                <div key={tag} className={`flex items-center space-x-2 px-3 py-1 text-sm rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>
                                    <span>{tag}</span>
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="-mr-1 p-0.5 rounded-full hover:bg-black/10"
                                        aria-label={t.removeTag(tag)}
                                    >
                                        <CloseIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {selectedTags.length < 6 && (
                                isAddingTag ? (
                                    <input
                                        ref={tagInputRef}
                                        type="text"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyDown={handleTagInputKeyDown}
                                        onBlur={handleTagInputBlur}
                                        placeholder={t.addTagPlaceholder}
                                        className={`text-sm px-3 py-1 rounded-full ${themeClasses.input} border ${themeClasses.border} outline-none`}
                                    />
                                ) : (
                                    <button
                                        onClick={() => setIsAddingTag(true)}
                                        className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-full transition-colors ${themeClasses.bgSecondary} ${themeClasses.accentText} hover:opacity-80`}
                                    >
                                        <span>{t.addTag}</span>
                                        <PlusIcon className="w-4 h-4" />
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end mt-8">
                        <button
                            onClick={handleSubmit}
                            disabled={!title}
                            className={`px-8 py-3 font-bold rounded-lg transition-colors ${themeClasses.accent} ${themeClasses.accentText} disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
                        >
                            {t.createAndWrite}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateNovelPage;