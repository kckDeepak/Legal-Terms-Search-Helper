import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paper, Typography, CircularProgress, Box, Alert } from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const FileUploader = ({ setIsFileUploaded, setFileName, setMessages, setIsLoading, isLoading }) => {
  const [backendStatus, setBackendStatus] = useState('unknown');
  const [uploadAttempted, setUploadAttempted] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'text/plain') {
        handleFileUpload(file);
      } else {
        toast.error('Please upload a .txt file.');
      }
    }
  }, []);

  const handleFileUpload = async (file) => {
    setUploadAttempted(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      if (response.status === 200) {
        setIsFileUploaded(true);
        setFileName(file.name);
        setBackendStatus('healthy');
        toast.success('File uploaded and indexed successfully!');
        setMessages([]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setBackendStatus('unreachable');
      if (error.response?.status === 404) {
        toast.error('Upload endpoint not found (404). Please check if the backend /upload route is correctly set up.');
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        toast.error(`Cannot connect to backend server at ${API_BASE_URL}. Please ensure the server is running on port 5000.`);
      } else if (error.response) {
        toast.error(error.response?.data?.error || `Upload failed with status ${error.response.status}`);
      } else {
        toast.error(error.message || 'Failed to upload file. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'] },
    multiple: false,
    disabled: isLoading,
  });

  const renderStatusIndicator = () => {
    if (backendStatus === 'healthy') {
      return (
        <Alert 
          severity="success" 
          sx={{ mb: 2, '& .MuiAlert-icon': { alignItems: 'flex-start' } }}
          icon={false}
        >
          <Typography variant="body2" fontWeight={500}>File uploaded successfully ✅</Typography>
        </Alert>
      );
    } else if (backendStatus === 'unreachable' && uploadAttempted) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          Backend server is not reachable at {API_BASE_URL}. Please start your server! ❌
        </Alert>
      );
    }
    return null;
  };

  return (
    <Box sx={{ flex: 1 }}>
      {renderStatusIndicator()}
      
      <Paper
        elevation={2}
        {...getRootProps()}
        sx={{
          p: 3,
          textAlign: 'center',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          border: isDragActive ? '2px dashed #1976d2' : '2px dashed #e0e0e0',
          bgcolor: isDragActive ? 'primary.light' : 'background.paper',
          transition: 'all 0.3s ease',
          borderRadius: 1,
          '&:hover': { 
            borderColor: isLoading ? '#e0e0e0' : '#1976d2', 
            boxShadow: isLoading ? 1 : 2 
          },
          opacity: isLoading ? 0.7 : 1,
          minHeight: 150,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <input {...getInputProps()} />
        <Typography variant="body1" color="textPrimary" sx={{ mb: 1 }}>
          {isLoading ? 'Uploading and indexing...' : 'Drag & drop a .txt file here, or click to select'}
        </Typography>
        {!isLoading && (
          <Typography variant="caption" color="textSecondary">
            Only .txt files are supported
          </Typography>
        )}
        {isLoading && <CircularProgress size={24} sx={{ mt: 1 }} />}
      </Paper>
      
      {!isLoading && backendStatus === 'unreachable' && uploadAttempted && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1, maxHeight: 100, overflow: 'auto' }}>
          <Typography variant="caption" color="error.dark" sx={{ lineHeight: 1.3 }}>
            <strong>Troubleshooting:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '16px', fontSize: '0.75rem' }}>
              <li>Make sure your backend server is running on port 5000</li>
              <li>Check if the server is accessible from your browser</li>
              <li>Verify the API_BASE_URL in your .env file</li>
            </ul>
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default FileUploader;