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
    return type === 'user' ? (
      <Person sx={{ bgcolor: 'primary.main', color: 'white', width: 28, height: 28 }} />
    ) : (
      <SmartToy sx={{ bgcolor: 'grey.300', width: 28, height: 28 }} />
    );
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        height: '100%', 
        overflowY: 'auto', 
        bgcolor: 'grey.50', 
        borderRadius: 0,
        p: 2,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'grey.400',
          borderRadius: '3px',
        },
      }}
      ref={chatRef}
    >
      {messages.length === 0 && !isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <Typography color="textSecondary" align="center">
            No questions asked yet. Start by typing below!
          </Typography>
        </Box>
      )}
      
      {messages.map((msg, index) => (
        <Fade in key={index} timeout={500}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
              mb: 1.5,
              alignItems: 'flex-start',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
                gap: 1.5,
                maxWidth: '80%',
              }}
            >
              <Avatar sx={{ width: 32, height: 32, mt: 0.5 }}>
                {getAvatar(msg.type)}
              </Avatar>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '12px',
                  bgcolor: msg.type === 'user' ? 'primary.main' : 'white',
                  color: msg.type === 'user' ? 'white' : 'text.primary',
                  boxShadow: msg.type === 'user' ? 2 : 1,
                  maxWidth: '100%',
                  wordWrap: 'break-word',
                  '&:hover': {
                    bgcolor: msg.type === 'user' ? 'primary.dark' : 'grey.100',
                  },
                }}
              >
                <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                  {msg.text}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Fade>
      ))}
      
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5, alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5, maxWidth: '80%' }}>
            <Avatar sx={{ width: 32, height: 32, mt: 0.5, bgcolor: 'grey.300' }}>
              <SmartToy />
            </Avatar>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'white', boxShadow: 1 }}>
              <Typography variant="body2">Thinking...</Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default ChatWindow;