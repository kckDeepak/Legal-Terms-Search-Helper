import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const QuestionInput = ({ setMessages, isLoading, setIsLoading }) => {
  const [question, setQuestion] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (question.trim()) {
      setMessages((prev) => [...prev, { type: 'user', text: question }]);
      setIsLoading(true);

      try {
        const response = await axios.post(`${API_BASE_URL}/query`, { question }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000, // 30 second timeout
        });
        const { answer } = response.data;
        setMessages((prev) => [...prev, { type: 'bot', text: answer }]);
      } catch (error) {
        console.error('Query error:', error);
        
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          toast.error(`Cannot connect to backend server at ${API_BASE_URL}. Please ensure the server is running.`);
        } else if (error.response) {
          toast.error(error.response?.data?.error || `Query failed with status ${error.response.status}`);
        } else {
          toast.error(error.message || 'Failed to get answer. Please try again.');
        }
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
        setQuestion('');
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <TextField
        fullWidth
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question about the document..."
        variant="outlined"
        disabled={isLoading}
        sx={{ 
          '& .MuiOutlinedInput-root': { borderRadius: '8px' },
          '& .MuiInputBase-input': {
            '&::placeholder': {
              color: isLoading ? 'text.disabled' : 'text.secondary',
            },
          },
        }}
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isLoading || !question.trim()}
        sx={{ px: 4, py: 1.5 }}
      >
        {isLoading ? 'Asking...' : 'Ask'}
      </Button>
    </Box>
  );
};

export default QuestionInput;