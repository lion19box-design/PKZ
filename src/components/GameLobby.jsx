import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useEliteNotification } from './EliteNotification';
import { getHatStyle } from '../utils/hatConfig';
import './GameLobby.css';

export default function GameLobby({ role, roomId, room, playedQuestionsText, onPlayedQuestionsChange, onStart }) {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useEliteNotification();
  
  const myUsername = localStorage.getItem('chgk_username');
  const players = room?.players || [];
  const myPlayer = players.find(p => p.username === myUsername);
  const isReady = myPlayer ? myPlayer.ready : false;

  // Audio refs
  const lobbyMusicRef = useRef(new Audio("/assets/audio/elitist-music/A Znatok Knows....mp3"));
  const triumphSoundRef = useRef(new Audio("/assets/audio/sound-effects/hey-triumph.mp3"));

  useEffect(() => {
    const savedVol = localStorage.getItem('chgk_volume');
    const initVol = savedVol !== null ? Number(savedVol) / 100 : 0.5;
    lobbyMusicRef.current.volume = initVol;
    triumphSoundRef.current.volume = initVol;

    lobbyMusicRef.current.loop = true;
    lobbyMusicRef.current.play().catch(() => {});

    // Listen for global audio
    const handlePlayAudio = (audioName) => {
        if (audioName === 'hey-triumph') {
            triumphSoundRef.current.currentTime = 0;
            triumphSoundRef.current.play().catch(() => {});
        }
    };
    socket.on('playAudioGlobal', handlePlayAudio);

    const handleVolumeChange = (e) => {
        lobbyMusicRef.current.volume = e.detail;
        triumphSoundRef.current.volume = e.detail;
    };
    window.addEventListener('chgk-volume-change', handleVolumeChange);

    return () => {
      lobbyMusicRef.current.pause();
      lobbyMusicRef.current.currentTime = 0;
      socket.off('playAudioGlobal', handlePlayAudio);
      window.removeEventListener('chgk-volume-change', handleVolumeChange);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(playedQuestionsText);
    showAlert('Номера скопированы!');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (onPlayedQuestionsChange) {
         onPlayedQuestionsChange({ target: { value: text } });
      }
    } catch (err) {
      showAlert('Вставьте текст вручную');
    }
  };

  const handleTriumph = () => {
    socket.emit('playAudio', { roomId, audioName: 'hey-triumph' });
    const username = localStorage.getItem('chgk_username');
    socket.emit('declareTriumph', { roomId, username });
  };

  const toggleReadyLocal = () => {
      socket.emit('toggleReady', { roomId });
  };

  const handleExit = () => {
    const isHost = role === 'host';
    const message = isHost 
      ? 'Вы уверены, что хотите покинуть клуб? Уходя, вы позволяете своему лобби рассыпаться, словно финансовая пирамида МММ, оставляя знатоков в неведении.' 
      : 'Вы уверены, что хотите покинуть Элитарный Клуб?';
      
    showConfirm(message, () => {
      if (isHost) {
        socket.emit('destroyRoom', { roomId });
      }
      navigate('/');
    });
  };

  const handleStart = () => {
    if (players.length === 0) {
      return showAlert('В клубе нет знатоков! Некому играть.');
    }
    if (!players.every(p => p.ready)) {
      return showAlert('Не все знатоки подтвердили готовность!');
    }
    onStart();
  };

  return (
    <div className="lobby-fullscreen">
      <h1 className="lobby-header-title">Лобби</h1>

      {/* Волшебное поле - видно только Ведущему */}
      {role === 'host' && (
        <div className="lobby-magic-field glass-box">
          <h3 style={{ borderBottom: 'none', marginBottom: '5px' }}>Волшебное поле</h3>
          <p style={{ fontSize: '0.85rem', color: '#ccc', marginBottom: '10px' }}>Вставьте коды игравших ранее вопросов (через запятую):</p>
          <textarea
            className="premium-input"
            value={playedQuestionsText || ''}
            onChange={onPlayedQuestionsChange}
            placeholder="Например: 12, 45, 108"
          />
          <div className="magic-field-controls">
            <button className="control-btn" onClick={handleCopy}>Копировать</button>
            <button className="control-btn" onClick={handlePaste}>Вставить</button>
          </div>
        </div>
      )}

      {/* Центральный список знатоков */}
      <div className="lobby-experts-list glass-box">
        <h3 style={{ textAlign: 'center' }}>Список знатоков (Код: {roomId})</h3>
        <div className="experts-grid">
          {players.map((exp, i) => (
            <div key={i} className="expert-item">
              <div className="expert-avatar-container" style={{ position: 'relative', width: '50px', height: '50px' }}>
                <div className="expert-avatar" style={{ 
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundImage: exp.active_avatar ? `url(/assets/avatars/${exp.active_avatar})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: exp.active_avatar ? 'transparent' : 'white'
                 }}>
                  {exp.username[0].toUpperCase()}
                </div>
                {exp.active_hat && (
                   <img src={`/assets/hats/${exp.active_hat}`} alt="hat" style={getHatStyle(exp.active_hat)} />
                )}
              </div>
              <span className="expert-name">{exp.username}</span>
              <span className="expert-status" title={exp.ready ? "Готов" : "Не готов"}>
                {exp.ready ? '✅' : '⏳'}
              </span>
              {role === 'host' && (
                <button 
                  className="premium-btn kick-btn"
                  style={{ padding: '2px 8px', fontSize: '0.8rem', marginLeft: '10px' }}
                  onClick={() => {
                    showConfirm(`Вы собираетесь изгнать знатока ${exp.username} из клуба. Это повлечет за собой 30-секундный тайм-аут для данного господина, чтобы у него было время "спланировать тактику предстоящей игры". Вы уверены?`, () => {
                      socket.emit('kickPlayer', { roomId, username: exp.username });
                    });
                  }}
                  title="Изгнать знатока"
                >
                  Изгнать
                </button>
              )}
            </div>
          ))}
          {players.length === 0 && <div style={{textAlign: 'center', width: '100%', color: '#aaa', marginTop: '20px'}}>Ожидание знатоков...</div>}
        </div>
      </div>

      {/* Профиль Ведущего */}
      <div className="lobby-host-profile glass-box">
        <div className="host-photo"></div>
        <h4 className="host-name">Господин Крупье</h4>
      </div>

      {/* Триумф */}
      <div className="lobby-triumph" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {role === 'host' ? (
           <button className="premium-btn triumph-btn" disabled title="Вы видите, кто из знатоков нажал кнопку" style={{opacity: 0.7}}>
             Кто из знатоков уверен в триумфе?
           </button>
        ) : (
           <button 
             className="premium-btn triumph-btn" 
             onClick={handleTriumph} 
             disabled={room?.triumphDeclaredBy?.includes(localStorage.getItem('chgk_username'))}
             title="Заявить о своей уверенности в победе"
           >
             Заявить о грядущем Триумфе
           </button>
        )}
        {role === 'host' && room?.triumphDeclaredBy && room.triumphDeclaredBy.length > 0 && (
            <div style={{marginTop: '10px', color: 'var(--accent-gold)', fontWeight: 'bold', animation: 'pulse 1.5s infinite', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                {room.triumphDeclaredBy.map((user, i) => (
                    <span key={i}>🐘 {user} заявил о Триумфе!</span>
                ))}
            </div>
        )}
      </div>

      {/* Кнопки готовности / старта */}
      <div className="lobby-ready">
        {role === 'expert' ? (
          <button 
            className={`premium-btn ${isReady ? 'ready' : ''}`} 
            onClick={toggleReadyLocal}
          >
            {isReady ? 'Отозвать готовность' : 'Готов!'}
          </button>
        ) : (
          <button 
            className={`premium-btn start-game-btn ${players.length > 0 && players.every(p => p.ready) ? 'ready' : ''}`} 
            onClick={handleStart}
          >
            Начать игру
          </button>
        )}
      </div>

      {/* Кнопка выхода */}
      <button className="control-btn danger exit-btn" onClick={handleExit}>
        Покинуть Клуб
      </button>

    </div>
  );
}
