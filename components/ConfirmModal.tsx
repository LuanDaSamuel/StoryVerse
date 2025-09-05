import React, { useContext } from 'react';
import { ProjectContext } from '../contexts/ProjectContext';
import { CloseIcon } from './Icons';
import { enhancePlainText } from '../constants';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmButtonClass?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmButtonClass }) => {
    const { themeClasses } = useContext(ProjectContext);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        await onConfirm();
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity" 
            aria-modal="true" 
            role="dialog"
            aria-labelledby="confirm-modal-title"
        >
          <div className={`p-6 rounded-lg shadow-2xl w-full max-w-md m-4 ${themeClasses.bgSecondary} ${themeClasses.text} border ${themeClasses.border}`} role="document">
            <div className="flex justify-between items-center mb-4">
              <h2 id="confirm-modal-title" className="text-xl font-bold">{enhancePlainText(title)}</h2>
              <button onClick={onClose} className={`p-1 rounded-full hover:${themeClasses.bgTertiary}`} aria-label="Close">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
            <div className={`${themeClasses.textSecondary} mb-6`}>
                {typeof message === 'string' ? enhancePlainText(message) : message}
            </div>
            <div className="flex justify-end space-x-4">
                <button
                  onClick={onClose}
                  className={`px-6 py-2 font-semibold rounded-lg ${themeClasses.bgTertiary} hover:opacity-80 transition-opacity`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className={confirmButtonClass || "px-6 py-2 font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"}
                >
                  Confirm
                </button>
            </div>
          </div>
        </div>
    );
};

export default ConfirmModal;