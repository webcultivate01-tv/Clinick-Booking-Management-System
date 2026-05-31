import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';

import App from './App.jsx';
import { store } from './store/index.js';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' },
            success: { iconTheme: { primary: '#8fa88a', secondary: '#faf7f2' } },
            error:   { iconTheme: { primary: '#c0392b', secondary: '#faf7f2' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
