// src/components/ChatWindow.js
import React, { useEffect, useRef } from 'react';

const ChatWindow = ({ messages, isLoading }) => {
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="h-96 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-4" ref={chatRef}>
      {messages.length === 0 && (
        <p className="text-center text-gray-500">No questions asked yet. Start by typing below!</p>
      )}
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-xs px-4 py-2 rounded-lg ${
              msg.type === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="max-w-xs px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
            Thinking...
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;