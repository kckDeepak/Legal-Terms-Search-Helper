// src/index.js (assuming create-react-app setup)
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Add Tailwind imports here
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
