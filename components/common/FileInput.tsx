import React, { useRef, useState } from 'react';
import Icon from './Icon';

interface FileInputProps {
  accept?: string;
  multiple?: boolean;
  onChange: (files: FileList | null) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  maxSize?: number; // in MB
  showPreview?: boolean;
  currentFile?: string | null;
  previewAlt?: string;
}

const FileInput: React.FC<FileInputProps> = ({
  accept,
  multiple = false,
  onChange,
  className = '',
  disabled = false,
  placeholder = 'Choose file...',
  maxSize,
  showPreview = false,
  currentFile,
  previewAlt = 'Preview'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    // Validate files if maxSize is specified
    if (maxSize) {
      for (let i = 0; i < files.length; i++) {
        const error = validateFile(files[i]);
        if (error) {
          alert(error);
          return;
        }
      }
    }

    setSelectedFiles(files);
    onChange(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const clearFiles = () => {
    setSelectedFiles(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange(null);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'document-text';
      case 'doc':
      case 'docx': return 'document';
      case 'xls':
      case 'xlsx': return 'table-cells';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg': return 'photo';
      case 'mp4':
      case 'avi':
      case 'mov': return 'video-camera';
      default: return 'document';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Styled file input area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
          ${dragActive 
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800' 
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="p-6 text-center">
          {selectedFiles && selectedFiles.length > 0 ? (
            // Show selected files
            <div className="space-y-3">
              {Array.from(selectedFiles).map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <Icon name={getFileIcon(file.name)} className="w-5 h-5 text-indigo-500" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFiles();
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                    disabled={disabled}
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // Show upload area
            <div>
              <Icon name="cloud-upload" className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {placeholder}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {multiple ? 'Drop files here or click to browse' : 'Drop file here or click to browse'}
                {maxSize && ` (max ${maxSize}MB)`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current file preview */}
      {showPreview && currentFile && !selectedFiles && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {currentFile.startsWith('data:image') ? (
                <img 
                  src={currentFile} 
                  alt={previewAlt} 
                  className="w-10 h-10 object-cover rounded border"
                />
              ) : (
                <Icon name="document" className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Current {previewAlt.toLowerCase()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Click to replace
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileInput;