import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';

export default function GlobalAudio() {
  const [bgMusicFiles, setBgMusicFiles] = useState([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('chgk_volume');
    return saved !== null ? Number(saved) / 100 : 0.5;
  });
  const [isBgPlaying, setIsBgPlaying] = useState(false);

  const bgAudioRef = useRef(null);
  const sfxAudioRefs = useRef({});

  // Загружаем список треков из /api/music
  useEffect(() => {
    fetch('/api/music')
      .then(res => res.json())
      .then(data => {
        if (data.files && data.files.length > 0) {
          setBgMusicFiles(data.files);
        }
      })
      .catch(err => console.error('Failed to load music files', err));
  }, []);

  // Управление фоновой музыкой
  useEffect(() => {
    if (!bgMusicFiles.length) return;
    
    if (!bgAudioRef.current) {
      bgAudioRef.current = new Audio();
      bgAudioRef.current.volume = volume;
      bgAudioRef.current.addEventListener('ended', () => {
        setCurrentBgIndex(prev => (prev + 1) % bgMusicFiles.length);
      });
    }

    const currentTrack = `/assets/audio/project-music/${bgMusicFiles[currentBgIndex]}`;
    if (bgAudioRef.current.src && !bgAudioRef.current.src.endsWith(encodeURI(bgMusicFiles[currentBgIndex]))) {
      bgAudioRef.current.src = currentTrack;
      if (isBgPlaying) bgAudioRef.current.play().catch(e => console.warn(e));
    } else if (!bgAudioRef.current.src) {
        bgAudioRef.current.src = currentTrack;
    }

    bgAudioRef.current.volume = volume;
  }, [bgMusicFiles, currentBgIndex, volume]);

  useEffect(() => {
    if (bgAudioRef.current) {
      if (isBgPlaying) {
        bgAudioRef.current.play().catch(e => console.warn(e));
      } else {
        bgAudioRef.current.pause();
      }
    }
  }, [isBgPlaying]);

  // Прослушивание сокет-событий глобального аудио
  useEffect(() => {
    const handlePlayAudio = (audioName) => {
      if (audioName === 'start-bg-music' || audioName === 'resume-bg-music') {
        setIsBgPlaying(true);
        return;
      }
      if (audioName === 'pause-bg-music') {
        setIsBgPlaying(false);
        return;
      }

      // Если это спецэффект
      const sfx = new Audio(`/assets/audio/sound-effects/${audioName}.mp3`);
      sfx.volume = volume;
      
      // Сохраняем ссылку на проигрываемый звук, чтобы его можно было остановить
      sfxAudioRefs.current[audioName] = sfx;
      
      sfx.play().catch(e => console.warn('GlobalAudio play failed:', e));
    };

    const handleStopAudio = (audioName) => {
        if (sfxAudioRefs.current[audioName]) {
            sfxAudioRefs.current[audioName].pause();
            sfxAudioRefs.current[audioName].currentTime = 0;
            delete sfxAudioRefs.current[audioName];
        }
    };

    const handleTimerStarted = ({ timerEndsAt }) => {
      const timeLimitMs = timerEndsAt - Date.now();
      if (timeLimitMs <= 0) return;
      
      const tickAudio = new Audio('/assets/audio/sound-effects/timer-tick-1-minute.mp3');
      tickAudio.volume = volume;
      tickAudio.play().catch(e => console.warn(e));
      sfxAudioRefs.current['timer-tick-1-minute'] = tickAudio;

      const timeouts = [];

      if (timeLimitMs > 10000) {
          const bleepTimeout = setTimeout(() => {
            const bleep = new Audio('/assets/audio/sound-effects/short-bleep-10-seconds-left.mp3');
            bleep.volume = volume;
            bleep.play().catch(e => console.warn(e));
          }, timeLimitMs - 10000); // за 10 сек до конца
          timeouts.push(bleepTimeout);
      }

      const beepTimeout = setTimeout(() => {
        const beep = new Audio('/assets/audio/sound-effects/minute-finished-beep.mp3');
        beep.volume = volume;
        beep.play().catch(e => console.warn(e));
        
        if (sfxAudioRefs.current['timer-tick-1-minute']) {
           sfxAudioRefs.current['timer-tick-1-minute'].pause();
           delete sfxAudioRefs.current['timer-tick-1-minute'];
        }
      }, timeLimitMs);
      timeouts.push(beepTimeout);

      sfxAudioRefs.current.timerTimeouts = timeouts;
    };

    const handleRoomUpdated = (room) => {
        if (room && room.timerEndsAt && !room.timerSpent && !sfxAudioRefs.current['timer-tick-1-minute']) {
            if (room.timerEndsAt > Date.now()) {
                handleTimerStarted({ timerEndsAt: room.timerEndsAt });
            }
        }
    };

    const handleTimerStopped = () => {
       if (sfxAudioRefs.current['timer-tick-1-minute']) {
           sfxAudioRefs.current['timer-tick-1-minute'].pause();
           delete sfxAudioRefs.current['timer-tick-1-minute'];
       }
       if (sfxAudioRefs.current.timerTimeouts) {
           sfxAudioRefs.current.timerTimeouts.forEach(clearTimeout);
           delete sfxAudioRefs.current.timerTimeouts;
       }
    };

    socket.on('playAudioGlobal', handlePlayAudio);
    socket.on('stopAudioGlobal', handleStopAudio);
    socket.on('timerStarted', handleTimerStarted);
    socket.on('timerStopped', handleTimerStopped);
    socket.on('roomUpdated', handleRoomUpdated);

    // Глобальные слушатели интерфейса изменения громкости (могут отправляться через кастомный event)
    const handleVolumeChange = (e) => {
        setVolume(e.detail);
    };
    window.addEventListener('chgk-volume-change', handleVolumeChange);

    return () => {
      socket.off('playAudioGlobal', handlePlayAudio);
      socket.off('stopAudioGlobal', handleStopAudio);
      socket.off('timerStarted', handleTimerStarted);
      socket.off('timerStopped', handleTimerStopped);
      socket.off('roomUpdated', handleRoomUpdated);
      window.removeEventListener('chgk-volume-change', handleVolumeChange);
    };
  }, [volume]);

  return null; // Это невидимый компонент
}
