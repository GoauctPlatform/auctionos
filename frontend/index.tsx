import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'leaflet/dist/leaflet.css';

// Auto hash route redirection for deep links (e.g., visiting /client/workbench directly)
if ((window.location.pathname.startsWith('/client') || 
     window.location.pathname.startsWith('/admin') || 
     window.location.pathname.startsWith('/properties') || 
     window.location.pathname.startsWith('/auctions')) && 
    !window.location.hash) {
  const path = window.location.pathname;
  const search = window.location.search || '';
  window.location.replace(window.location.origin + '/#' + path + search);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);