import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paper, Typography, CircularProgress, Box, Alert } from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const FileUploader = ({ setIsFileUploaded, setMessages, setIsLoading, isLoading }) => {
  const [backendStatus, setBackendStatus] = useState('unknown');

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
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 second timeout
      });
      if (response.status === 200) {
        setIsFileUploaded(true);
        toast.success('File uploaded and indexed successfully!');
        setMessages([]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        toast.error(`Cannot connect to backend server at ${API_BASE_URL}. Please ensure the server is running on port 5000.`);
        setBackendStatus('error');
      } else if (error.response) {
        toast.error(error.response?.data?.error || `Upload failed with status ${error.response.status}`);
      } else {
        toast.error(error.message || 'Failed to upload file. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check backend status on component mount
  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
        if (response.status === 200) {
          setBackendStatus('healthy');
        }
      } catch (error) {
        console.error('Backend health check failed:', error);
        setBackendStatus('unreachable');
      }
    };

    checkBackend();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'] },
    multiple: false,
    disabled: isLoading,
  });

  const renderStatusIndicator = () => {
    if (backendStatus === 'healthy') {
      return <Alert severity="success" sx={{ mb: 2 }}>Backend server is running ✅</Alert>;
    } else if (backendStatus === 'unreachable') {
      return <Alert severity="error" sx={{ mb: 2 }}>Backend server is not reachable at {API_BASE_URL}. Please start your server! ❌</Alert>;
    }
    return null;
  };

  return (
    <Box>
      {renderStatusIndicator()}
      <Paper
        elevation={3}
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          border: isDragActive ? '2px dashed #1976d2' : '2px dashed #bdbdbd',
          bgcolor: isDragActive ? 'primary.light' : 'background.paper',
          transition: 'all 0.3s ease',
          '&:hover': { 
            borderColor: isLoading ? '#bdbdbd' : '#1976d2', 
            boxShadow: isLoading ? 1 : 3 
          },
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        <input {...getInputProps()} />
        <Typography variant="h6" color="textPrimary">
          {isLoading ? 'Uploading and indexing...' : 'Drag & drop a .txt file here, or click to select'}
        </Typography>
        {!isLoading && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Only .txt files are supported
          </Typography>
        )}
        {isLoading && <CircularProgress sx={{ mt: 2 }} />}
      </Paper>
      {!isLoading && backendStatus === 'unreachable' && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">
            <strong>Troubleshooting:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
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