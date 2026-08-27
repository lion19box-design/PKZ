import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Lobby.css';

export default function Lobby() {
  const [username, setUsername] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const storedName = localStorage.getItem('chgk_username');
    if (!storedName) {
      navigate('/');
    } else {
      setUsername(storedName);
    }
  }, [navigate]);

  const handleCreateRoom = () => {
    socket.emit('createRoom', { username }, (response) => {
      if (response && response.roomId) {
        navigate(`/host/${response.roomId}`);
      } else {
        setError('Не удалось создать комнату');
      }
    });
  };

  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const handleApproved = (room) => {
      setIsPending(false);
      navigate(`/expert/${room.id}`);
    };
    const handleRejected = () => {
      setIsPending(false);
      setError('Господин крупье постановил не пущать');
    };
    
    socket.on('joinRequestApproved', handleApproved);
    socket.on('joinRequestRejected', handleRejected);
    
    return () => {
      socket.off('joinRequestApproved', handleApproved);
      socket.off('joinRequestRejected', handleRejected);
    };
  }, [navigate]);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (joinCode.length !== 4) {
      setError('Код комнаты должен состоять из 4 цифр');
      return;
    }
    
    socket.emit('joinRoom', { roomId: joinCode, username }, (response) => {
      if (response && response.success) {
        if (response.status === 'pending') {
           setIsPending(true);
        } else if (response.isHost) {
           navigate(`/host/${joinCode}`);
        } else {
           navigate(`/expert/${joinCode}`);
        }
      } else {
        setError(response.error || 'Ошибка подключения');
      }
    });
  };

  return (
    <div className="lobby-container">
      <div className="glass-panel lobby-panel">
        <div className="lobby-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="lobby-title">Зал Ожидания</h2>
        </div>
        <p className="welcome-text">Добро пожаловать, <span className="highlight-gold">{username}</span></p>

        {error && <div className="error-message">{error}</div>}

        <div className="lobby-actions">
          <div className="action-card">
            <h3>Роль: Ведущий (Крупье)</h3>
            <p>Вы будете полностью управлять игрой, зачитывать вопросы и следить за правилами.</p>
            <button className="premium-btn create-btn" onClick={handleCreateRoom}>Создать Стол</button>
          </div>

          <div className="action-divider">ИЛИ</div>

          <div className="action-card">
            <h3>Роль: Знаток</h3>
            {isPending ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#ff9800', fontWeight: 'bold' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px', animation: 'pulse 1.5s infinite' }}>⏳</div>
                Игра уже идет. Ожидаем решения Крупье...
              </div>
            ) : (
              <>
                <p>Присоединитесь к существующему столу по 4-значному коду от Крупье.</p>
                <form onSubmit={handleJoinRoom} className="join-form">
                  <input 
                    id="lobby-join-code"
                    name="roomCode"
                    aria-label="4-значный код комнаты"
                    type="text" 
                    placeholder="Код (4 цифры)" 
                    value={joinCode} 
                    onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                    className="premium-input code-input"
                    maxLength="4"
                  />
                  <button type="submit" className="premium-btn join-btn">Войти за Стол</button>
                </form>
              </>
            )}
          </div>
        </div>

        <button className="icon-btn back-btn" onClick={() => navigate('/')}>← Вернуться в меню</button>
      </div>
    </div>
  );
}
