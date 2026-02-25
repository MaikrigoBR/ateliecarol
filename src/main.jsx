
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './css/variables.css';
import './css/global.css';
import './css/layout.css';
import './css/components.css';
import './css/modal.css';


// Force unregister of any legacy service workers to clear cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('Old Service Worker Unregistered forcefully due to major update.');
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
