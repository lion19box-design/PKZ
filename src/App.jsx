import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import Lobby from './components/Lobby';
import HostView from './components/HostView';
import ExpertView from './components/ExpertView';
import { EliteNotificationProvider } from './components/EliteNotification';
import GlobalAudio from './components/GlobalAudio';
import Profile from './components/Profile';

function App() {
  return (
    <EliteNotificationProvider>
      <GlobalAudio />
      <div className="app-container">
        {/* ЭЛТ фильтр поверх всего приложения */}
        <div className="crt-overlay"></div>
        
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/host/:roomId" element={<HostView />} />
          <Route path="/expert/:roomId" element={<ExpertView />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </EliteNotificationProvider>
  );
}

export default App;
