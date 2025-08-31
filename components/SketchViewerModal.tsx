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
    const { themeClasses } = useContext(ProjectContext);
    const [processedContent, setProcessedContent] = useState('');
    const [numberedTags, setNumberedTags] = useState<number[]>([]);

    useEffect(() => {
        if (!sketch) return;

        const tempDiv = document.createElement('div');
        // Use enhanceHtml to ensure typographic correctness before processing
        tempDiv.innerHTML = enhanceHtml(sketch.content);
        const uniqueTags = new Set<number>();
        const tagRegex = /#(\d+)/g;

        const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode as Text);
        }

        textNodes.forEach(node => {
            // Early exit if the node's content doesn't contain a pattern match
            if (!node.textContent || !tagRegex.test(node.textContent)) return;
            
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            
            // Reset regex state before executing on a new string
            tagRegex.lastIndex = 0;

            while ((match = tagRegex.exec(node.textContent)) !== null) {
                const tagNumber = parseInt(match[1], 10);
                uniqueTags.add(tagNumber);
                
                // Append text preceding the current match
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex, match.index)));
                }

                // Create a styled, interactive anchor for the tag
                const anchor = document.createElement('a');
                anchor.id = `sketch-tag-ref-${tagNumber}`;
                anchor.className = `p-1 rounded font-semibold ${themeClasses.accent} ${themeClasses.accentText} no-underline cursor-pointer`;
                anchor.href = `#sketch-tag-nav-${tagNumber}`;
                anchor.textContent = match[0];
                anchor.onclick = (e) => {
                    e.preventDefault();
                    const navEl = document.getElementById(`sketch-tag-nav-${tagNumber}`);
                    navEl?.focus();
                };
                fragment.appendChild(anchor);

                lastIndex = tagRegex.lastIndex;
            }

            // Append any text remaining after the last match
            if (lastIndex < node.textContent.length) {
                fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex)));
            }
            
            // Replace the original text node with the new fragment containing styled tags
            node.parentNode?.replaceChild(fragment, node);
        });

        setProcessedContent(tempDiv.innerHTML);
        setNumberedTags(Array.from(uniqueTags).sort((a, b) => a - b));

    }, [sketch, themeClasses]);

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
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex font-sans" onClick={onClose} role="dialog" aria-modal="true">
            <div className="flex-1 min-w-0" />
            <main className={`relative flex-1 h-full w-full max-w-7xl flex ${themeClasses.bgSecondary} shadow-2xl`} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className={`absolute top-4 right-4 z-20 p-2 rounded-full hover:${themeClasses.bgTertiary} transition-colors`}>
                    <CloseIcon className="w-6 h-6" />
                </button>
                
                <div className="flex-1 h-full overflow-y-auto p-8 md:p-12">
                    <div className={`text-sm font-semibold uppercase tracking-wider mb-2 ${themeClasses.textSecondary}`}>{enhancePlainText(sketch.novelTitle)}</div>
                    <h1 className={`text-4xl font-bold mb-4 ${themeClasses.accentText}`}>{enhancePlainText(sketch.title)}</h1>
                    <div className="flex flex-wrap gap-2 mb-8">
                        {sketch.tags.map(tag => (
                            <span key={tag} className={`px-3 py-1 text-xs rounded-full font-semibold ${themeClasses.accent} ${themeClasses.accentText}`}>{tag}</span>
                        ))}
                    </div>
                    <div className="story-content prose-styles text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: processedContent }} />
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
                                        className={`flex items-center justify-center aspect-square rounded-md font-bold text-xl transition-colors ${themeClasses.bg} ${themeClasses.text} hover:opacity-80 focus:ring-2 ${themeClasses.accentBorder}`}
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
            <div className="flex-1 min-w-0" />
        </div>
    );
};

export default SketchViewerModal;