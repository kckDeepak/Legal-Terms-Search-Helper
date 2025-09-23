// src/components/FileUploader.js
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

const FileUploader = ({ onUpload, isLoading }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'text/plain') {
        onUpload(file);
      } else {
        toast.error('Please upload a .txt file.');
      }
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'] },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
      }`}
    >
      <input {...getInputProps()} />
      <p className="text-lg font-semibold text-gray-700">
        {isLoading ? 'Uploading and indexing...' : 'Drag & drop a .txt file here, or click to select'}
      </p>
      {!isLoading && <p className="text-sm text-gray-500 mt-2">Only .txt files are supported</p>}
      {isLoading && <div className="mt-4 loader"></div>}
    </div>
  );
};

export default FileUploader;