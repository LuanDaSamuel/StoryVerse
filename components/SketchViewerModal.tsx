
import React, { useContext, useEffect, useState } from 'react';
import { AggregatedSketch } from '../types';
import { ProjectContext } from '../contexts/ProjectContext';
import { CloseIcon } from './Icons';
import { enhanceHtml, enhancePlainText } from '../constants';

interface SketchViewerModalProps {
  sketch: AggregatedSketch | null;
  onClose: () => void;
}

const SketchViewerModal: React.FC<SketchViewerModalProps> = ({ sketch, onClose }) => {
    const { theme, themeClasses } = useContext(ProjectContext);
    const [processedContent, setProcessedContent] = useState('');
    const [numberedTags, setNumberedTags] = useState<number[]>([]);
    const [activeTag, setActiveTag] = useState<number | null>(null);

    useEffect(() => {
        if (!sketch) return;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = enhanceHtml(sketch.content);
        const uniqueTags = new Set<number>();
        const tagRegex = /#(\d+)/g;

        const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode as Text);
        }

        textNodes.forEach(node => {
            if (!node.textContent || !tagRegex.test(node.textContent)) return;
            
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            
            tagRegex.lastIndex = 0;

            while ((match = tagRegex.exec(node.textContent)) !== null) {
                const tagNumber = parseInt(match[1], 10);
                uniqueTags.add(tagNumber);
                
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex, match.index)));
                }

                const styledSpan = document.createElement('span');
                styledSpan.id = `sketch-tag-ref-${tagNumber}`;
                styledSpan.className = `p-1 rounded font-semibold ${themeClasses.accent} ${themeClasses.accentText}`;
                styledSpan.textContent = match[0];
                fragment.appendChild(styledSpan);
                
                lastIndex = tagRegex.lastIndex;
            }

            if (lastIndex < node.textContent.length) {
                fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex)));
            }
            
            node.parentNode?.replaceChild(fragment, node);
        });

        setProcessedContent(tempDiv.innerHTML);
        setNumberedTags(Array.from(uniqueTags).sort((a, b) => a - b));
        setActiveTag(null);

    }, [sketch, themeClasses]);

    useEffect(() => {
        if (!sketch || numberedTags.length === 0 || !processedContent) return;

        const contentElement = document.querySelector('.sketch-viewer-content');
        if (!contentElement) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleTags = entries
                    .filter(entry => entry.isIntersecting)
                    .map(entry => ({
                        tag: parseInt(entry.target.id.replace('sketch-tag-ref-', ''), 10),
                        pos: entry.boundingClientRect.top,
                    }))
                    .sort((a, b) => a.pos - b.pos);
                
                if (visibleTags.length > 0) {
                    setActiveTag(visibleTags[0].tag);
                }
            },
            {
                root: contentElement,
                threshold: 0,
                rootMargin: "-50% 0px -50% 0px"
            }
        );

        const elements = numberedTags.map(tag => document.getElementById(`sketch-tag-ref-${tag}`)).filter(Boolean);
        elements.forEach(el => observer.observe(el!));

        return () => elements.forEach(el => observer.unobserve(el!));
    }, [processedContent, sketch, numberedTags]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    if (!sketch) return null;
    
    const scrollToTag = (tagNumber: number) => {
        const el = document.getElementById(`sketch-tag-ref-${tagNumber}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setActiveTag(tagNumber);
    };
    
    const textColor = theme === 'book' ? themeClasses.accentText : themeClasses.text;

    return (
        <div className={`fixed inset-0 z-50 font-sans ${themeClasses.bgSecondary}`} role="dialog" aria-modal="true">
            <main className="relative h-full w-full flex">
                <button onClick={onClose} className={`absolute top-4 right-4 z-20 p-2 rounded-full hover:${themeClasses.bgTertiary} transition-colors ${textColor}`}>
                    <CloseIcon className="w-6 h-6" />
                </button>
                
                <div className={`sketch-viewer-content flex-1 h-full overflow-y-auto p-8 md:p-16 ${textColor}`}>
                    <div className="max-w-3xl mx-auto">
                        <div className={`text-sm font-semibold uppercase tracking-wider mb-2 ${themeClasses.textSecondary}`}>{enhancePlainText(sketch.novelTitle)}</div>
                        <h1 className={`text-4xl font-bold mb-4 ${themeClasses.accentText}`}>{enhancePlainText(sketch.title)}</h1>
                        <div className="flex flex-wrap gap-2 mb-8">
                            {sketch.tags.map(tag => (
                                <span key={tag} className={`px-3 py-1 text-xs rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>{tag}</span>
                            ))}
                        </div>
                        <div className="story-content prose-styles text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: processedContent }} />
                    </div>
                </div>

                {numberedTags.length > 0 && (
                    <aside className={`w-48 flex-shrink-0 h-full border-l ${themeClasses.border} ${themeClasses.bgTertiary} flex flex-col`}>
                        <h3 className={`text-sm font-bold uppercase p-4 border-b ${themeClasses.border} ${themeClasses.textSecondary}`}>Numbered Tags</h3>
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-3 gap-2">
                                {numberedTags.map(tag => (
                                    <button
                                        key={tag}
                                        id={`sketch-tag-nav-${tag}`}
                                        onClick={() => scrollToTag(tag)}
                                        className={`flex items-center justify-center aspect-square rounded-md font-bold text-xl transition-colors hover:opacity-80 focus:ring-2 ${themeClasses.accentBorder} ${activeTag === tag ? `${themeClasses.accent} ${themeClasses.accentText}` : `${themeClasses.bg} ${themeClasses.text}`}`}
                                        title={`Jump to tag #${tag}`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>
                )}
            </main>
        </div>
    );
};

export default SketchViewerModal;
