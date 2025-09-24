import React, { useEffect, useRef } from 'react';
import { Paper, Typography, Box, Fade, Avatar } from '@mui/material';
import { Person, SmartToy } from '@mui/icons-material';

const ChatWindow = ({ messages, isLoading }) => {
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const getAvatar = (type) => {
    return type === 'user' ? <Person sx={{ bgcolor: 'primary.main', color: 'white' }} /> : <SmartToy sx={{ bgcolor: 'grey.300' }} />;
  };

  return (
    <Paper elevation={2} sx={{ height: '400px', overflowY: 'auto', p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
      {messages.length === 0 && (
        <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
          No questions asked yet. Start by typing below!
        </Typography>
      )}
      {messages.map((msg, index) => (
        <Fade in key={index} timeout={500}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
              mb: 2,
              alignItems: 'flex-start',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
                gap: 2,
                maxWidth: '70%',
              }}
            >
              <Avatar sx={{ width: 32, height: 32, mt: 1 }}>
                {getAvatar(msg.type)}
              </Avatar>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  bgcolor: msg.type === 'user' ? 'primary.main' : 'grey.200',
                  color: msg.type === 'user' ? 'white' : 'text.primary',
                  boxShadow: 1,
                  '&:hover': {
                    bgcolor: msg.type === 'user' ? 'primary.dark' : 'grey.300',
                  },
                }}
              >
                <Typography variant="body1">{msg.text}</Typography>
              </Box>
            </Box>
          </Box>
        </Fade>
      ))}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, maxWidth: '70%' }}>
            <Avatar sx={{ width: 32, height: 32, mt: 1, bgcolor: 'grey.300' }}>
              <SmartToy />
            </Avatar>
            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'grey.200', boxShadow: 1 }}>
              <Typography variant="body1">Thinking...</Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default ChatWindow;