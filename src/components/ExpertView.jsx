import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { getHatStyle } from '../utils/hatConfig';
import Roulette from './Roulette';
import GameLobby from './GameLobby';
import VolumeControl from './VolumeControl';
import { useEliteNotification } from './EliteNotification';
import './GameStyles.css';

export default function ExpertView() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useEliteNotification();
  
  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing'
  const [room, setRoom] = useState(null);
  const [showClubHint, setShowClubHint] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  useEffect(() => {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
      setNeedsAudioUnlock(true);
    }
  }, []);

  const handleAudioUnlock = () => {
    setNeedsAudioUnlock(false);
    socket.emit('playAudio', { roomId, audioName: 'bell-ding' });
  };

  useEffect(() => {
    const username = localStorage.getItem('chgk_username');
    if (!username) {
      navigate('/');
      return;
    }

    socket.emit('joinRoom', { roomId, username, isHost: false }, (res) => {
      if (!res || !res.success) {
        showAlert((res && res.error) || 'Ошибка подключения');
        navigate('/');
      } else {
        setRoom(res.room);
        setGameState(res.room.state === 'waiting' ? 'setup' : res.room.state);
      }
    });

    const handleRoomUpdate = (updatedRoom) => {
      setRoom(updatedRoom);
      setGameState(updatedRoom.state === 'waiting' ? 'setup' : updatedRoom.state);
    };

    const handleHintActivated = (hintType) => {
      const hintNames = { credit: 'Минута в кредит', club: 'Помощь клуба', host: 'Господин Крупье соблаговолил дать клубу подсказку!' };
      if (hintType === 'club') {
         setShowClubHint(true);
      } else {
         showAlert(hintType === 'host' ? hintNames.host : `Активирована подсказка: ${hintNames[hintType]}!`);
      }
    };

    const handlePenaltyApplied = ({ targetUsername, penaltyType }) => {
      if (penaltyType === 'time') {
        showAlert('Внимание! Следующая минута обсуждения урезана (-20 секунд)!');
      } else if (penaltyType === 'remove_1_round') {
        showAlert(`Внимание! Знаток ${targetUsername} удален на 1 раунд!`);
      } else if (penaltyType === 'remove_hat') {
        showAlert(`Внимание! Знаток ${targetUsername} лишен шапки!`);
      }
    };

    const handleFinalRound = () => {
      showAlert('Внимание! Счет 4:4. Приближается ФИНАЛЬНЫЙ РАУНД!');
    };

    const handleRoomDestroyed = () => {
      showAlert('Клуб был расформирован крупье!');
      setTimeout(() => navigate('/'), 3000);
    };

    const handleKickedOut = () => {
      showAlert('Крупье изгнал вас из клуба!');
      setTimeout(() => navigate('/'), 3000);
    };

    socket.on('roomUpdated', handleRoomUpdate);
    socket.on('hintActivated', handleHintActivated);
    socket.on('penaltyApplied', handlePenaltyApplied);
    socket.on('finalRoundIncoming', handleFinalRound);
    socket.on('roomDestroyed', handleRoomDestroyed);
    socket.on('kickedOut', handleKickedOut);

    return () => {
      socket.off('roomUpdated', handleRoomUpdate);
      socket.off('hintActivated', handleHintActivated);
      socket.off('penaltyApplied', handlePenaltyApplied);
      socket.off('finalRoundIncoming', handleFinalRound);
      socket.off('roomDestroyed', handleRoomDestroyed);
      socket.off('kickedOut', handleKickedOut);
    };
  }, [roomId, navigate]);

  if (!room) {
    return (
      <div className="loading-screen" style={{height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#111', color: '#ccc'}}>
        <div>Подключение к комнате...</div>
        <button className="premium-btn" style={{marginTop: '30px'}} onClick={() => navigate('/')}>
          Вернуться в Главное Меню
        </button>
      </div>
    );
  }

  if (gameState === 'setup') {
    return <GameLobby role="expert" roomId={roomId} room={room} />;
  }

  return (
    <div className="game-container" style={{ backgroundImage: "url('/assets/chgk-asset-background-16on9.png')" }}>
      
      {needsAudioUnlock && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
          cursor: 'pointer'
        }} onClick={handleAudioUnlock}>
          <h1 style={{ color: 'var(--accent-gold)', marginBottom: '20px', textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>
            Добро пожаловать за стол
          </h1>
          <p style={{ color: 'white', fontSize: '1.2rem' }}>
            Нажмите в любое место (или на свой аватар), чтобы дать клубу понять, что вы вернулись.
          </p>
          <p style={{ color: '#ccc', fontSize: '1rem', fontStyle: 'italic', marginTop: '20px' }}>
            (Это также разблокирует звуки гонга и таймера)
          </p>
        </div>
      )}
      
      {showClubHint && (
        <div style={{
          position: 'absolute', top: '150px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(33, 150, 243, 0.95)', color: 'white', padding: '20px 40px',
          borderRadius: '10px', zIndex: 100, border: '2px solid var(--accent-gold)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)', textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Крупье активировал "Помощь Клуба"!</h2>
          <p style={{ margin: 0, fontSize: '1.2rem' }}>Слушайте внимательно, клуб диктует свой ответ.</p>
          <button 
            className="premium-btn" 
            style={{ marginTop: '15px', background: '#d32f2f' }}
            onClick={() => setShowClubHint(false)}
          >
            Закрыть [X]
          </button>
        </div>
      )}

      {/* Левая панель - Знатоки */}
      <div style={{
        position: 'absolute',
        left: '40px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
        zIndex: 10
      }}>
        {room.players.map((exp, i) => {
          const colors = ['#1976d2', '#388e3c', '#d32f2f', '#7b1fa2', '#f57c00', '#0097a7', '#689f38', '#c2185b'];
          const colorHash = exp.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const userColor = colors[colorHash % colors.length];
          const isRemoved = exp.removedForRound;
          const isHatless = exp.lostHat;

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', opacity: isRemoved ? 0.3 : 1 }} title={`Профиль: ${exp.username}`}>
              <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: userColor,
                  backgroundImage: exp.active_avatar ? `url(/assets/avatars/${exp.active_avatar})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `3px solid ${isHatless ? '#f44336' : 'var(--accent-gold)'}`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  color: exp.active_avatar ? 'transparent' : 'white'
                }}>
                  {exp.username[0].toUpperCase()}
                </div>
                {!isHatless && exp.active_hat && (
                     <img src={`/assets/hats/${exp.active_hat}`} alt="hat" style={getHatStyle(exp.active_hat)} />
                )}
              </div>
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '5px 15px',
                borderRadius: '20px',
                border: '1px solid var(--accent-gold)',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}>
                {exp.username} {isHatless && <span style={{fontSize: '0.8rem', color: '#f44336'}}>(Без шапки)</span>}
                {isRemoved && <span style={{fontSize: '0.8rem', color: '#f44336', marginLeft: '5px'}}>(Удален)</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Верхнее табло (по центру) */}
      <div style={{ position: 'absolute', top: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
        {room.timerPenalty && (
          <div style={{ background: '#f44336', color: 'white', padding: '5px 20px', borderRadius: '0 0 10px 10px', fontWeight: 'bold' }}>
            ВНИМАНИЕ: СЛЕДУЮЩАЯ МИНУТА УРЕЗАНА (-20 СЕКУНД)
          </div>
        )}
        <div className="scoreboard" style={{ marginTop: room.timerPenalty ? '10px' : '20px' }}>
          <div className="score-panel experts" style={{ minWidth: '150px' }}>
            <span className="score-label">Знатоки</span>
            <span className="score-value">{room.score.experts}</span>
            <div style={{ position: 'absolute', bottom: '-25px', display: 'flex', gap: '5px' }}>
              <span className={`hint-icon ${room.hints.credit ? 'used' : ''}`} title="Минута в кредит">⏳</span>
              <span className={`hint-icon ${room.hints.club ? 'used' : ''}`} title="Помощь клуба">👨‍👩‍👧‍👦</span>
              <span className={`hint-icon ${room.hints.host ? 'used' : ''}`} title="Помощь Крупье">🗣️</span>
            </div>
          </div>
          <div className="score-panel viewers" style={{ minWidth: '150px' }}>
            <span className="score-label">Зрители</span>
            <span className="score-value">{room.score.viewers}</span>
          </div>
        </div>
      </div>

      {/* Центр - Игровой стол */}
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', transform: 'scale(1.1)' }}>
         <Roulette 
            spinning={room.targetSector === null && room.state === 'playing'} // Заглушка: крутится пока таргет не выбран
            targetSector={room.targetSector} 
            playedSectors={room.playedSectors} 
            isHost={false}
         />
      </div>

      {/* Правая панель - Зритель и подсказки */}
      <div style={{
        position: 'absolute',
        right: '40px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
        width: '280px',
        zIndex: 10
      }}>
        
        {/* Карточка Зрителя */}
        <div className="glass-box" style={{ 
          width: '200px', 
          padding: '0', 
          overflow: 'hidden', 
          textAlign: 'center',
          alignSelf: 'flex-end'
        }}>
          <div style={{ 
            height: '240px', 
            background: `url(${room.currentQuestion ? room.currentQuestion.photoUrl : '/assets/chgk-asset-horse.PNG'}) center/cover`, 
            borderBottom: '2px solid var(--accent-gold)' 
          }}></div>
          <div style={{ padding: '10px' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1rem' }}>
                {room.currentQuestion ? room.currentQuestion.authorName : "Неизвестный Зритель"}
            </h4>
            <p style={{ margin: '5px 0 0 0', color: '#ccc', fontSize: '0.8rem' }}>
                {room.currentQuestion ? `${room.currentQuestion.job}, г. ${room.currentQuestion.city}` : "Профессия, Город N"}
            </p>
          </div>
        </div>

        {/* Палочки-выручалочки */}
        <div className="glass-box">
          <h3 style={{ textAlign: 'center', fontSize: '1rem', marginBottom: '15px' }}>Палочки-выручалочки</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
            {/* Минута в кредит */}
            <div title="Минута в кредит" style={{
              width: '50px', height: '50px', borderRadius: '50%', background: '#4caf50',
              display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem',
              border: '2px solid var(--accent-gold)', cursor: 'help',
              filter: !room.hints?.credit ? 'none' : 'grayscale(1) opacity(0.5)'
            }}>⏳</div>
            
            {/* Помощь клуба */}
            <div title="Помощь клуба" style={{
              width: '50px', height: '50px', borderRadius: '50%', background: '#2196f3',
              display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem',
              border: '2px solid var(--accent-gold)', cursor: 'help',
              filter: !room.hints?.club ? 'none' : 'grayscale(1) opacity(0.5)'
            }}>👥</div>
            
            {/* Помощь ведущего */}
            <div title="Помощь ведущего" style={{
              width: '50px', height: '50px', borderRadius: '50%', background: '#ff9800',
              display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem',
              border: '2px solid var(--accent-gold)', cursor: 'help',
              filter: !room.hints?.host ? 'none' : 'grayscale(1) opacity(0.5)'
            }}>🗣️</div>
          </div>
        </div>

      </div>
      
      <button 
        className="control-btn danger"
        style={{
          position: 'absolute', top: '20px', left: '20px',
          opacity: 0.2, transition: 'opacity 0.2s', zIndex: 10
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.2'}
        onClick={() => {
           showConfirm('Вы точно хотите подвести весь стол своим внезапным уходом?', () => {
             socket.emit('leaveRoom', { roomId });
             navigate('/');
           });
        }}
      >
        Покинуть стол
      </button>

      <VolumeControl />
    </div>
  );
}
