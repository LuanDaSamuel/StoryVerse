import React, { useState, useContext, useEffect } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { CloseIcon } from './Icons';
import { enhancePlainText } from '../constants';

interface SelectNovelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (novelId: string) => void;
  novels: { id: string, title: string }[];
}

const SelectNovelModal: React.FC<SelectNovelModalProps> = ({ isOpen, onClose, onConfirm, novels }) => {
    const { themeClasses } = useContext(ProjectContext);
    const [selectedNovelId, setSelectedNovelId] = useState('');

    useEffect(() => {
        if (novels.length > 0) {
            setSelectedNovelId(novels[0].id);
        }
    }, [novels]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (selectedNovelId) {
            onConfirm(selectedNovelId);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className={`p-6 rounded-lg shadow-2xl w-full max-w-md m-4 ${themeClasses.bgSecondary} ${themeClasses.text} border ${themeClasses.border}`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">New Sketch</h2>
                    <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`} aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <label htmlFor="novel-select" className="block text-sm font-semibold mb-2">
                    Which novel does this sketch belong to?
                </label>
                <select
                    id="novel-select"
                    value={selectedNovelId}
                    onChange={(e) => setSelectedNovelId(e.target.value)}
                    className={`w-full p-3 rounded-md border ${themeClasses.border} ${themeClasses.input}`}
                >
                    {novels.map(n => (
                        <option key={n.id} value={n.id}>{enhancePlainText(n.title)}</option>
                    ))}
                </select>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} hover:opacity-80 transition-opacity`}>
                        Cancel
                    </button>
                    <button onClick={handleConfirm} disabled={!selectedNovelId} className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.accent} ${themeClasses.accentText} hover:opacity-90 disabled:opacity-50`}>
                        Create & Edit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectNovelModal;