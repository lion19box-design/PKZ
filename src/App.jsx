import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import MainMenu from './components/MainMenu';
import { EliteNotificationProvider } from './components/EliteNotification';
import GlobalAudio from './components/GlobalAudio';
import InviteRedirect from './components/InviteRedirect';

// Игровые экраны грузятся по требованию: главному меню они не нужны
const Lobby = lazy(() => import('./components/Lobby'));
const HostView = lazy(() => import('./components/HostView'));
const ExpertView = lazy(() => import('./components/ExpertView'));
const Profile = lazy(() => import('./components/Profile'));

function App() {
  return (
    <EliteNotificationProvider>
      <GlobalAudio />
      <Analytics />
      <div className="app-container">
        {/* ЭЛТ фильтр поверх всего приложения */}
        <div className="crt-overlay"></div>

        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/host/:roomId" element={<HostView />} />
            <Route path="/expert/:roomId" element={<ExpertView />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/stol/:roomId" element={<InviteRedirect />} />
          </Routes>
        </Suspense>
      </div>
    </EliteNotificationProvider>
  );
}

export default App;
