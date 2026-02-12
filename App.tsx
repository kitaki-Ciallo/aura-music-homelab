
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PlayerProvider } from './context/PlayerContext';
import { useToast } from './hooks/useToast'; // Keep toast if needed, or move to context

// Layouts & Pages
import MainLayout from './components/layout/MainLayout';
import Library from './pages/Library';
import CloudMusic from './pages/CloudMusic';
import Artists from './pages/Artists';
import Albums from './pages/Albums';
import Playlist from './pages/Playlist';
import FullPlayer from './components/FullPlayer';
import GlobalBackground from './components/GlobalBackground';

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <PlayerProvider>
        <GlobalBackground />
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Library />} />
              <Route path="playlist/:name" element={<Playlist />} />
              <Route path="artists" element={<Artists />} />
              <Route path="albums" element={<Albums />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>

          {/* Full Player Overlay */}
          <FullPlayer />

        </Router>
      </PlayerProvider>
    </React.StrictMode>
  );
};

export default App;
