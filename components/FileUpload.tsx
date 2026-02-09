
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  disabled: boolean;
  placeholder?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, disabled, placeholder }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File | null) => {
    if (file && (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword')) {
      onFileChange(file);
    } else {
      onFileChange(null);
      alert('Please upload a valid PDF or Word document.');
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    e.target.value = '';
  };

  const id = `file-upload-${placeholder?.replace(/\s+/g, '-').toLowerCase() || 'default'}`;

  return (
    <div className="flex justify-center w-full">
      <label
        htmlFor={id}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative block w-full p-6 text-center border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 
          isDragging ? 'border-primary-500 bg-primary-50 scale-[1.02]' : 'border-gray-300 hover:border-primary-400 bg-white hover:bg-gray-50'
        }`}
      >
        <div className="flex flex-col items-center">
          <UploadIcon className="w-10 h-10 text-gray-400 mb-2" />
          <span className="font-semibold text-sm text-gray-700">
            {placeholder || 'Click to upload or drag and drop'}
          </span>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">PDF or DOCX (max 10MB)</p>
        </div>
        <input
          id={id}
          name={id}
          type="file"
          className="sr-only"
          accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
          disabled={disabled}
        />
      </label>
    </div>
  );
};
