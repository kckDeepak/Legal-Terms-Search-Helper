// src/App.js
import React, { useState } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import FileUploader from './components/FileUploader';
import QuestionInput from './components/QuestionInput';
import ChatWindow from './components/ChatWindow';

const API_BASE_URL = 'http://localhost:5000'; // Change if backend is on a different port/domain

function App() {
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [messages, setMessages] = useState([]); // Array of { type: 'user' | 'bot', text: string }
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.status === 200) {
        setIsFileUploaded(true);
        toast.success('File uploaded and indexed successfully!');
        setMessages([]); // Clear previous messages for new document
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskQuestion = async (question) => {
    if (!isFileUploaded) {
      toast.error('Please upload a document first.');
      return;
    }

    setMessages((prev) => [...prev, { type: 'user', text: question }]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/query`, { question }, {
        headers: { 'Content-Type': 'application/json' },
      });
      const { answer } = response.data;
      setMessages((prev) => [...prev, { type: 'bot', text: answer }]);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to get answer.');
      setMessages((prev) => prev.slice(0, -1)); // Remove the failed user message
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <header className="bg-blue-600 text-white p-6">
          <h1 className="text-3xl font-bold">Legal Terms Search Helper</h1>
          <p className="mt-2 text-blue-100">Upload a .txt legal document and ask questions about it.</p>
        </header>
        <div className="p-6 space-y-6">
          <FileUploader onUpload={handleFileUpload} isLoading={isLoading} />
          {isFileUploaded && (
            <>
              <ChatWindow messages={messages} isLoading={isLoading} />
              <QuestionInput onSubmit={handleAskQuestion} isLoading={isLoading} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;