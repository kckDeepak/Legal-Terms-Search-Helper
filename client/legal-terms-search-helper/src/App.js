import React, { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, Container, Paper, Typography, Grid } from '@mui/material';
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
  const [fileName, setFileName] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="xl">
          <Paper elevation={6} sx={{ overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'primary.main', p: 4 }}>
              <Typography variant="h1">Legal Terms Search Helper</Typography>
              <Typography variant="body1" sx={{ color: 'white', mt: 1 }}>
                Upload a .txt legal document and ask questions about it.
              </Typography>
            </Box>
            
            <Box sx={{ p: 4 }}>
              <Grid container spacing={4} sx={{ minHeight: '70vh' }}>
                {/* Left Panel - File Uploader */}
                <Grid item xs={12} md={4} sx={{ height: '100%' }}>
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      p: 3,
                      borderRadius: 2 
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                      📁 Document Upload
                    </Typography>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <FileUploader
                        setIsFileUploaded={setIsFileUploaded}
                        setFileName={setFileName}
                        setMessages={setMessages}
                        setIsLoading={setIsLoading}
                        isLoading={isLoading}
                      />
                      {fileName && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            Uploaded file:
                          </Typography>
                          <Paper 
                            sx={{ 
                              p: 1.5, 
                              bgcolor: 'success.light', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1 
                            }}
                          >
                            <Typography variant="body2" fontWeight={500} color="success.dark">
                              ✅ {fileName}
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* Right Panel - Chat Interface */}
                <Grid item xs={12} md={8} sx={{ height: '100%' }}>
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      borderRadius: 2 
                    }}
                  >
                    <Typography variant="h6" sx={{ p: 3, pb: 1, fontWeight: 600, color: 'primary.main' }}>
                      💬 Chat with Document
                    </Typography>
                    
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ flex: 1, overflow: 'hidden' }}>
                        <ChatWindow messages={messages} isLoading={isLoading} />
                      </Box>
                      
                      {isFileUploaded ? (
                        <Box sx={{ p: 3, pt: 0, borderTop: 1, borderColor: 'divider' }}>
                          <QuestionInput
                            setMessages={setMessages}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                          />
                        </Box>
                      ) : (
                        <Box 
                          sx={{ 
                            flex: 1, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            p: 4,
                            bgcolor: 'grey.50'
                          }}
                        >
                          <Paper elevation={1} sx={{ p: 4, textAlign: 'center', maxWidth: 300 }}>
                            <Typography variant="h6" color="textSecondary" gutterBottom>
                              📄 No document loaded
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Upload a .txt file on the left to start asking questions about your document.
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;