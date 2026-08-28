import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
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
      <Analytics />
      <div className="app-container">
        {/* ЭЛТ фильтр поверх всего приложения */}
        <div className="crt-overlay"></div>

        {/* Предупреждение для портретной ориентации */}
        <div className="rotate-device-prompt">
          <div className="rotate-device-icon">🔄</div>
          <div className="rotate-device-title">Элитарный Клуб</div>
          <div className="rotate-device-desc">
            Пожалуйста, переверните устройство в горизонтальный режим (альбомная ориентация) для игры.
          </div>
        </div>
        
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
