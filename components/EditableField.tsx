import React, { useState } from 'react';
import { EditIcon } from './icons/EditIcon';
import { SaveIcon } from './icons/SaveIcon';
import { CancelIcon } from './icons/CancelIcon';

interface EditableFieldProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  isTextarea?: boolean;
  className?: string;
  inputClassName?: string;
}

export const EditableField: React.FC<EditableFieldProps> = ({ 
    initialValue, 
    onSave, 
    isTextarea = false, 
    className = '', 
    inputClassName = '' 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);

    const handleSave = () => {
        onSave(value);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setValue(initialValue);
        setIsEditing(false);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isTextarea && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            handleCancel();
        }
    }

    if (isEditing) {
        return (
            <div className={`flex w-full items-start gap-2 ${className}`}>
                {isTextarea ? (
                    <textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`flex-grow p-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm leading-relaxed ${inputClassName}`}
                        rows={5}
                        autoFocus
                    />
                ) : (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`flex-grow p-2 border border-primary-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:outline-none w-full ${inputClassName}`}
                        autoFocus
                    />
                )}
                <div className="flex flex-col gap-2 no-print">
                    <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-100 rounded-full" aria-label="Save"><SaveIcon className="w-5 h-5" /></button>
                    <button onClick={handleCancel} className="p-1 text-red-600 hover:bg-red-100 rounded-full" aria-label="Cancel"><CancelIcon className="w-5 h-5" /></button>
                </div>
            </div>
        );
    }

    return (
        <div className={`group flex items-start justify-between gap-2 min-h-[24px] ${className}`}>
            <div className={`flex-grow whitespace-pre-wrap pt-0.5 ${!initialValue ? 'text-gray-400 italic' : ''}`}>{initialValue || 'Not specified'}</div>
            <button
                onClick={() => {
                    setValue(initialValue);
                    setIsEditing(true);
                }}
                className="no-print flex-shrink-0 p-1.5 text-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 hover:text-primary-600 hover:bg-gray-100"
                aria-label="Edit field"
            >
                <EditIcon className="w-4 h-4" />
            </button>
        </div>
    );
};