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
  const [isTimerActive, setIsTimerActive] = useState(false);

  const bgAudioRef = useRef(null);
  const sfxAudioRefs = useRef({});
  const isBgPlayingRef = useRef(isBgPlaying);
  const isTimerActiveRef = useRef(isTimerActive);
  const volumeRef = useRef(volume);

  useEffect(() => {
    isBgPlayingRef.current = isBgPlaying;
  }, [isBgPlaying]);

  useEffect(() => {
    isTimerActiveRef.current = isTimerActive;
  }, [isTimerActive]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Загружаем список треков из /api/music
  useEffect(() => {
    fetch('/api/music')
      .then(res => res.json())
      .then(data => {
        if (data.files && data.files.length > 0) {
          const shuffled = [...data.files].sort(() => Math.random() - 0.5);
          setBgMusicFiles(shuffled);
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
    }

    bgAudioRef.current.onended = () => {
        if (currentBgIndex + 1 >= bgMusicFiles.length) {
            setBgMusicFiles(prevFiles => {
                const newShuffle = [...prevFiles].sort(() => Math.random() - 0.5);
                // Чтобы не играла одна и та же песня на стыке "альбомов"
                if (newShuffle[0] === prevFiles[prevFiles.length - 1] && newShuffle.length > 1) {
                    const temp = newShuffle[0];
                    newShuffle[0] = newShuffle[1];
                    newShuffle[1] = temp;
                }
                return newShuffle;
            });
            setCurrentBgIndex(0);
        } else {
            setCurrentBgIndex(prev => prev + 1);
        }
    };

    const currentTrack = `/assets/audio/project-music/${bgMusicFiles[currentBgIndex]}`;
    if (bgAudioRef.current.src && !bgAudioRef.current.src.endsWith(encodeURI(bgMusicFiles[currentBgIndex]))) {
      bgAudioRef.current.src = currentTrack;
      if (isBgPlaying) bgAudioRef.current.play().catch(e => console.warn(e));
    } else if (!bgAudioRef.current.src) {
        bgAudioRef.current.src = currentTrack;
    }

    if (bgAudioRef.current) {
        bgAudioRef.current.volume = isTimerActive ? volume * 0.1 : volume;
    }
  }, [bgMusicFiles, currentBgIndex, volume, isTimerActive]);

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
      sfx.volume = volumeRef.current;
      
      // Pause background music if round is won/lost or minute finished beep
      if (audioName === 'znatoki-won-round' || audioName === 'znatoki-lost-round' || audioName === 'minute-finished-beep') {
          setIsBgPlaying(false);
          sfx.addEventListener('ended', () => {
              setIsBgPlaying(true);
          });
      }

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

    const handleTimerStopped = () => {
       setIsTimerActive(false);
       if (sfxAudioRefs.current['timer-tick-1-minute']) {
           sfxAudioRefs.current['timer-tick-1-minute'].pause();
           sfxAudioRefs.current['timer-tick-1-minute'].currentTime = 0;
           delete sfxAudioRefs.current['timer-tick-1-minute'];
       }
       if (sfxAudioRefs.current['short-bleep-10-seconds-left']) {
           sfxAudioRefs.current['short-bleep-10-seconds-left'].pause();
           sfxAudioRefs.current['short-bleep-10-seconds-left'].currentTime = 0;
           delete sfxAudioRefs.current['short-bleep-10-seconds-left'];
       }
       if (sfxAudioRefs.current.timerTimeouts) {
           sfxAudioRefs.current.timerTimeouts.forEach(clearTimeout);
           delete sfxAudioRefs.current.timerTimeouts;
       }
    };

    const handleTimerStarted = ({ timerEndsAt }) => {
      const timeLimitMs = timerEndsAt - Date.now();
      if (timeLimitMs <= 0) return;
      
      handleTimerStopped();
      setIsTimerActive(true);

      const tickAudio = new Audio('/assets/audio/sound-effects/timer-tick-1-minute.mp3');
      tickAudio.volume = volumeRef.current;
      
      // Если минута урезана (например, 40 сек вместо 60), отрезаем первые 20 сек от начала
      const startOffset = Math.max(0, 60 - Math.round(timeLimitMs / 1000));
      if (startOffset > 0 && startOffset < 58) {
        tickAudio.currentTime = startOffset;
      }

      tickAudio.play().catch(e => console.warn(e));
      sfxAudioRefs.current['timer-tick-1-minute'] = tickAudio;

      const timeouts = [];

      if (timeLimitMs > 10000) {
          const bleepTimeout = setTimeout(() => {
            const bleep = new Audio('/assets/audio/sound-effects/short-bleep-10-seconds-left.mp3');
            bleep.volume = volumeRef.current;
            sfxAudioRefs.current['short-bleep-10-seconds-left'] = bleep;
            bleep.play().catch(e => console.warn(e));
          }, timeLimitMs - 10000); // за 10 сек до конца
          timeouts.push(bleepTimeout);
      }

      sfxAudioRefs.current.timerTimeouts = timeouts;
    };

    const handleRoomUpdated = (room) => {
        if (room && room.state === 'playing' && !isBgPlayingRef.current && !room.timerEndsAt) {
            setIsBgPlaying(true);
        }
        if (room && room.timerEndsAt && !room.timerSpent && !sfxAudioRefs.current['timer-tick-1-minute']) {
            if (room.timerEndsAt > Date.now()) {
                handleTimerStarted({ timerEndsAt: room.timerEndsAt });
            }
        }
        if (room && !room.timerEndsAt && isTimerActiveRef.current) {
            handleTimerStopped();
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
  }, []);

  return null; // Это невидимый компонент
}
