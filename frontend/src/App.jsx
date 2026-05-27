import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import History from './pages/History';
import './index.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-layout">
          {/* Hamburger for mobile */}
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>

          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
