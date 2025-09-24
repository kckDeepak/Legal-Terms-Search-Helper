import React, { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, Container, Paper, Typography } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import FileUploader from './components/FileUploader';
import QuestionInput from './components/QuestionInput';
import ChatWindow from './components/ChatWindow';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
  typography: {
    h1: { fontSize: '2.5rem', fontWeight: 700, color: '#ffffff' },
    body1: { color: '#424242' },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { padding: '24px', borderRadius: '16px' } } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: '8px' } } },
  },
});

const App = () => {
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [fileName, setFileName] = useState(''); // New state for file name
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="lg">
          <Paper elevation={6} sx={{ overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'primary.main', p: 4 }}>
              <Typography variant="h1">Legal Terms Search Helper</Typography>
              <Typography variant="body1" sx={{ color: 'white', mt: 1 }}>
                Upload a .txt legal document and ask questions about it.
              </Typography>
            </Box>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <FileUploader
                setIsFileUploaded={setIsFileUploaded}
                setFileName={setFileName} // Pass setFileName callback
                setMessages={setMessages}
                setIsLoading={setIsLoading}
                isLoading={isLoading}
              />
              {fileName && (
                <Typography variant="body2" color="textSecondary">
                  Uploaded file: <strong>{fileName}</strong>
                </Typography>
              )}
              {isFileUploaded && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <ChatWindow messages={messages} isLoading={isLoading} />
                  <QuestionInput
                    setMessages={setMessages}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                  />
                </Box>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;