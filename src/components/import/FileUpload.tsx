'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import type { ParsedData } from '@/types/import';
import { parseFile, formatFileSize, isSupportedFileType, isWithinSizeLimit } from '@/lib/file-parser';

interface FileUploadProps {
  onFileSelected: (file: File, data: ParsedData) => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

export default function FileUpload({
  onFileSelected,
  acceptedTypes = ['.csv', '.xlsx', '.xls'],
  maxSizeMB = 5,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setSelectedFile(null);

      // Validate file type
      if (!isSupportedFileType(file)) {
        setError('Unsupported file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
        return;
      }

      // Validate file size
      if (!isWithinSizeLimit(file, maxSizeMB)) {
        setError(`File is too large. Maximum size is ${maxSizeMB}MB`);
        return;
      }

      setIsProcessing(true);
      setSelectedFile(file);

      try {
        const data = await parseFile(file);

        if (data.rows.length === 0) {
          setError('The file appears to be empty or contains no data rows');
          setSelectedFile(null);
          return;
        }

        onFileSelected(file, data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file');
        setSelectedFile(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [maxSizeMB, onFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={clearFile}
              className="text-red-600 text-sm underline mt-1 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragging
            ? 'border-[var(--ecbs-teal)] bg-teal-50'
            : 'border-gray-300 hover:border-[var(--ecbs-teal)] hover:bg-gray-50'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-[var(--ecbs-teal)] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Processing file...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center">
            <FileSpreadsheet className="w-12 h-12 text-[var(--ecbs-teal)] mb-4" />
            <p className="text-gray-900 font-medium">{selectedFile.name}</p>
            <p className="text-gray-500 text-sm">{formatFileSize(selectedFile.size)}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="mt-3 text-sm text-gray-500 hover:text-red-500 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">
              <span className="text-[var(--ecbs-teal)] font-medium">Click to upload</span> or drag
              and drop
            </p>
            <p className="text-gray-400 text-sm">
              CSV or Excel files up to {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Expected columns:</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'Date of lock in',
            'Company',
            'Meter No',
            'Previous Supplier',
            'Gas/Electric',
            'Supplier Name',
            'Comms SC',
            'Comms UR',
            'CSD',
            'CED',
            'Contract Value',
          ].map((col) => (
            <span key={col} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">
              {col}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Column names don&apos;t need to match exactly - you&apos;ll map them in the next step.
        </p>
      </div>
    </div>
  );
}
