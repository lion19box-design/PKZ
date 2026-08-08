import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import Roulette from './Roulette';
import GameLobby from './GameLobby';
import VolumeControl from './VolumeControl';
import { useEliteNotification } from './EliteNotification';
import './GameStyles.css';

export default function HostView() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useEliteNotification();

  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing', 'finished'
  const [room, setRoom] = useState(null);
  const [playedQuestionsText, setPlayedQuestionsText] = useState('');
  const [penaltiesOpen, setPenaltiesOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [playerSelectModal, setPlayerSelectModal] = useState({ isOpen: false, type: null });
  const [joinRequestsModal, setJoinRequestsModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const pendingRequests = room?.joinRequests || [];
  const hasPending = pendingRequests.length > 0;

  useEffect(() => {
    let timer;
    if (room && room.timerEndsAt) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((room.timerEndsAt - Date.now()) / 1000));
        setTimeLeft(remaining);
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setTimeLeft(null);
    }
    return () => clearInterval(timer);
  }, [room?.timerEndsAt]);

  const formatTime = (seconds) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const username = localStorage.getItem('chgk_username');
    if (!username) {
      navigate('/');
      return;
    }

    socket.emit('joinRoom', { roomId, username, isHost: true }, (res) => {
      if (!res || !res.success) {
        showAlert((res && res.error) || 'Ошибка подключения');
        navigate('/');
      } else {
        setRoom(res.room);
        setPlayedQuestionsText(res.room.playedQuestionsIds.join(', '));
        setGameState(res.room.state === 'waiting' ? 'setup' : res.room.state);
      }
    });

    const handleRoomUpdate = (updatedRoom) => {
      setRoom(updatedRoom);
      setGameState(updatedRoom.state === 'waiting' ? 'setup' : updatedRoom.state);
    };

    const handleActionUndone = () => {
      showAlert('Действие успешно отменено!');
    };

    const handleJoinRequestNotification = ({ isTimerActive, username }) => {
      if (isTimerActive) {
        showAlert(`Пока знатоки раздумывают над ответом - в элитарный клуб нагрянул гость (${username}). Проверьте почту, не отвлекая знатоков от процесса обсуждения.`);
      } else {
        showAlert(`В двери элитарного клуба кто-то стучит (${username}). Проверьте почту, возможно это новый Знаток готов присоединиться к столу!`);
      }
    };

    socket.on('roomUpdated', handleRoomUpdate);
    socket.on('actionUndone', handleActionUndone);
    socket.on('joinRequestNotification', handleJoinRequestNotification);

    return () => {
      socket.off('roomUpdated', handleRoomUpdate);
      socket.off('actionUndone', handleActionUndone);
      socket.off('joinRequestNotification', handleJoinRequestNotification);
    };
  }, [roomId, navigate]);

  const handleStartGame = () => {
    socket.emit('startGame', { roomId }, (res) => {
        if (res && !res.success) {
            showAlert(res.error);
        }
    });
  };

  const handlePlayedQuestionsChange = (e) => {
    setPlayedQuestionsText(e.target.value);
    socket.emit('updatePlayedQuestions', { roomId, playedQuestionsText: e.target.value });
  };

  const handleCancelRound = () => {
    showConfirm('Вы уверены, что хотите аннулировать раунд?', () => {
      socket.emit('cancelRound', { roomId });
    });
  };

  const adjustScore = (team, delta) => {
    if (delta > 0 && ((team === 'experts' && room.score.experts === 5) || (team === 'viewers' && room.score.viewers === 5))) {
      showConfirm(`Внимание! Это победное очко команде "${team === 'experts' ? 'Знатоки' : 'Зрители'}". Завершить игру?`, () => {
        socket.emit('adjustScore', { roomId, team, delta });
      });
    } else {
      socket.emit('adjustScore', { roomId, team, delta });
    }
  };

  const spinRoulette = () => {
    if (room.currentQuestion) {
      return showAlert('Сначала начислите балл за текущий вопрос или аннулируйте его!');
    }
    socket.emit('spinRoulette', { roomId });
  };

  const startTimer = () => {
    if (!room.currentQuestion) {
      return showAlert('Вы не можете запустить минуту, пока не запущен волчок и не выбран вопрос от телезрителя!');
    }
    socket.emit('startTimer', { roomId });
    showAlert('Время пошло!');
  };

  const stopTimer = () => {
    socket.emit('stopTimer', { roomId });
  };

  const undoLastAction = () => {
    socket.emit('undoLastAction', { roomId });
  };

  const setQuestion = (sectorIndex) => {
      socket.emit('setQuestion', {roomId, sectorIndex});
  }

  const finishGame = () => {
    showConfirm('Вы уверены, что хотите завершить игру?', () => {
      socket.emit('finishGame', { roomId });
    });
  };

  const handlePenaltySelect = (player) => {
    setPlayerSelectModal({ isOpen: false, type: null });
    socket.emit('applyPenalty', { roomId, targetUsername: player.username, penaltyType: playerSelectModal.type });
  };

  if (!room) {
    return (
      <div className="loading-screen" style={{height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#111', color: '#ccc'}}>
        <div>Подключение к комнате...</div>
        <button className="premium-btn" style={{marginTop: '30px'}} onClick={() => navigate('/')}>
          Вернуться в Главное Меню
        </button>
      </div>
    );
  } if (gameState === 'setup') {
    return <GameLobby 
      role="host" 
      roomId={roomId} 
      room={room}
      playedQuestionsText={playedQuestionsText}
      onPlayedQuestionsChange={handlePlayedQuestionsChange}
      onStart={handleStartGame} 
    />;
  }

  if (gameState === 'finished') {
    return (
      <div className="game-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-box" style={{ width: '500px', textAlign: 'center', padding: '30px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: 'var(--accent-gold)' }}>Игра завершена</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Счет: Знатоки {room.score.experts} - {room.score.viewers} Зрители</p>
          
          <h3 style={{ borderBottom: 'none' }}>Список отыгранных вопросов</h3>
          <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '10px' }}>Скопируйте этот список и сохраните для следующей игры.</p>
          <textarea 
            className="premium-input" 
            style={{ width: '100%', height: '100px', marginBottom: '20px', resize: 'none' }}
            value={room.playedQuestionsIds.join(', ')}
            readOnly
          />
          
          <button className="premium-btn" style={{ width: '100%', padding: '15px', fontSize: '1.2rem' }} onClick={() => navigate('/')}>
            Вернуться в Главное Меню
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container" style={{ backgroundImage: "url('/assets/krupie-room.png')" }}>
      {/* Header */}
      <div className="game-header" style={{ paddingTop: 0, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button className="control-btn danger" onClick={handleCancelRound}>Аннулировать раунд</button>
          <button className="control-btn danger" onClick={undoLastAction}>Отменить последнее действие</button>
          <button className="control-btn danger" onClick={finishGame}>Завершить игру</button>
        </div>
        

        <div className="scoreboard">
          <div className="score-panel experts">
            <span className="score-label">Знатоки</span>
            <span className="score-value">{room.score.experts}</span>
            <div className="score-controls">
              <button onClick={() => adjustScore('experts', 1)}>+</button>
              <button onClick={() => adjustScore('experts', -1)}>-</button>
            </div>
          </div>
          <div className="score-panel viewers">
            <span className="score-label">Зрители</span>
            <span className="score-value">{room.score.viewers}</span>
            <div className="score-controls">
              <button onClick={() => adjustScore('viewers', 1)}>+</button>
              <button onClick={() => adjustScore('viewers', -1)}>-</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '20px' }}>
          {room.timerPenalty && <span style={{ color: '#f44336', fontWeight: 'bold' }}>⚠️ Минута урезана</span>}
          {room.timerSpent && <span style={{ color: '#ff9800', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px' }}>⚠️ БАЗОВАЯ МИНУТА ПОТРАЧЕНА</span>}
          {timeLeft !== null && (
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: timeLeft <= 10 ? '#f44336' : '#4caf50', minWidth: '80px', textAlign: 'center', fontFamily: 'monospace' }}>
              {formatTime(timeLeft)}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="control-btn" onClick={startTimer}>Время пошло</button>
            <button className="control-btn" onClick={stopTimer}>Остановить время</button>
          </div>
          <button className="control-btn" onClick={spinRoulette}>Запустить рулетку</button>
        </div>
      </div>

      {/* Body */}
      <div className="game-body">
        
        {/* Левая панель */}
        <div className="side-panel">
          <div className="glass-box">
            <h3 onClick={() => setPenaltiesOpen(!penaltiesOpen)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
              Панель штрафов <span>{penaltiesOpen ? '▲' : '▼'}</span>
            </h3>
            {penaltiesOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <button className="control-btn danger" style={{ fontSize: '0.8rem' }} onClick={() => socket.emit('applyPenalty', { roomId, penaltyType: 'time' })}>Урезать время (-20 сек)</button>
                <button className="control-btn danger" style={{ fontSize: '0.8rem' }} onClick={() => setPlayerSelectModal({ isOpen: true, type: 'remove_1_round' })}>Удалить игрока (1 раунд)</button>
                <button className="control-btn danger" style={{ fontSize: '0.8rem' }} onClick={() => setPlayerSelectModal({ isOpen: true, type: 'remove_hat' })}>Лишить знатока шапки</button>
              </div>
            )}
          </div>

          <div className="glass-box">
            <h3 onClick={() => setHintsOpen(!hintsOpen)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: '#4caf50', borderColor: '#4caf50' }}>
              Палочки-выручалочки <span>{hintsOpen ? '▲' : '▼'}</span>
            </h3>
            {hintsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <button className={`control-btn ${room.hints.credit ? 'disabled' : ''}`} disabled={room.hints.credit} style={{ fontSize: '0.8rem' }} onClick={() => socket.emit('activateHint', { roomId, hintType: 'credit' })}>Выдать "Минуту в кредит"</button>
                <button className={`control-btn ${room.hints.club || (room.score.experts === 5 && room.score.viewers === 5) ? 'disabled' : ''}`} disabled={room.hints.club || (room.score.experts === 5 && room.score.viewers === 5)} style={{ fontSize: '0.8rem' }} onClick={() => socket.emit('activateHint', { roomId, hintType: 'club' })}>Активировать "Помощь клуба"</button>
                <button className={`control-btn ${room.hints.host || (room.score.experts === 5 && room.score.viewers === 5) ? 'disabled' : ''}`} disabled={room.hints.host || (room.score.experts === 5 && room.score.viewers === 5)} style={{ fontSize: '0.8rem' }} onClick={() => socket.emit('activateHint', { roomId, hintType: 'host' })}>Выдать "Помощь Крупье"</button>
              </div>
            )}
          </div>

          <div className="glass-box" style={{ padding: '10px', textAlign: 'center', cursor: 'pointer', border: hasPending ? '2px solid #f44336' : '1px solid var(--accent-gold)' }} onClick={() => setJoinRequestsModal(true)}>
             <span style={{ fontSize: '1.5rem', filter: hasPending ? 'none' : 'grayscale(1)', position: 'relative' }}>
                ✉️
                {hasPending && <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', width: '10px', height: '10px', borderRadius: '50%' }}></div>}
             </span>
             <span style={{ marginLeft: '10px', color: hasPending ? '#fff' : '#aaa' }}>Заявки на вход ({pendingRequests.length})</span>
          </div>

          <div className="glass-box" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <h3 style={{ borderBottom: 'none', marginBottom: '5px' }}>Вопрос</h3>
            <p style={{ color: '#ccc', fontStyle: 'italic', marginBottom: '15px' }}>
              {room.currentQuestion ? room.currentQuestion.questionText : "Вопрос не выбран. Крутите рулетку."}
            </p>
            <h3 style={{ borderBottom: 'none', marginBottom: '5px', color: '#ff9800' }}>Правильный ответ</h3>
            <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '15px' }}>
              {room.currentQuestion ? room.currentQuestion.answerText : ""}
            </p>
            {room.currentQuestion && room.currentQuestion.clubHint && (
               <>
                 <h3 style={{ borderBottom: 'none', marginBottom: '5px', color: '#2196f3' }}>Подсказка клуба</h3>
                 <p style={{ color: '#fff', fontWeight: 'normal', fontStyle: 'italic' }}>
                   {room.currentQuestion.clubHint}
                 </p>
               </>
            )}
          </div>
        </div>

        {/* Центр */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Roulette 
            spinning={false} // Host view doesn't need to see the spinning animation, or we can make it sync
            targetSector={room.targetSector} 
            playedSectors={room.playedSectors} 
            onSectorSelected={setQuestion}
            isHost={true}
          />
        </div>

        {/* Профиль Зрителя (для Крупье) */}
        <div className="glass-box" style={{ 
          position: 'absolute', 
          right: '20px', 
          top: '100px', 
          width: '200px', 
          padding: '0', 
          overflow: 'hidden', 
          textAlign: 'center',
          zIndex: 5
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

      </div>

      {/* Модальное окно выбора игрока для штрафа */}
      {playerSelectModal.isOpen && (
        <div className="elite-modal-overlay">
          <div className="elite-modal-content">
            <h3 className="elite-modal-title">Выберите знатока</h3>
            <p className="elite-modal-message">
              {playerSelectModal.type === 'remove_1_round' ? 'Кого удалить на 1 раунд?' : 'Кого лишить шапки?'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {room.players.map(p => (
                <button 
                  key={p.username} 
                  className="premium-btn" 
                  style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
                  onClick={() => handlePenaltySelect(p)}
                >
                  {p.username}
                </button>
              ))}
              {room.players.length === 0 && <span style={{color: '#ccc'}}>Нет знатоков</span>}
            </div>
            <button className="premium-btn elite-modal-btn cancel" onClick={() => setPlayerSelectModal({ isOpen: false, type: null })}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {joinRequestsModal && (
        <div className="elite-modal-overlay" onClick={() => setJoinRequestsModal(false)}>
          <div className="elite-modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="elite-modal-title">Стук в дверь клуба</h3>
            <p className="elite-modal-message">
              Эти знатоки хотят присоединиться к игре.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {pendingRequests.map(req => (
                <div key={req.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `url(/assets/avatars/${req.active_avatar}) center/cover` }}></div>
                      <span>{req.username}</span>
                   </div>
                   <div style={{ display: 'flex', gap: '10px' }}>
                      {room.players.length >= 5 ? (
                         <span style={{ color: '#aaa', fontSize: '0.8rem', maxWidth: '100px' }} title="В комнате уже заняты все стулья, а садить знатока на пол запрещают законы клуба">
                            Мест нет
                         </span>
                      ) : (
                         <button className="control-btn primary" style={{ padding: '5px 10px' }} onClick={() => {
                            socket.emit('resolveJoinRequest', { roomId, username: req.username, action: 'accept' });
                         }}>Впустить</button>
                      )}
                      <button className="control-btn danger" style={{ padding: '5px 10px' }} onClick={() => {
                          socket.emit('resolveJoinRequest', { roomId, username: req.username, action: 'reject' });
                      }}>Прогнать</button>
                   </div>
                </div>
              ))}
              {pendingRequests.length === 0 && <span style={{color: '#ccc'}}>Нет новых заявок</span>}
            </div>
            <button className="premium-btn elite-modal-btn cancel" onClick={() => setJoinRequestsModal(false)}>
              Закрыть
            </button>
          </div>
        </div>
      )}

      <div className="room-code-display" style={{
        position: 'absolute', 
        bottom: '20px', 
        left: '70px',
        color: 'var(--accent-gold)',
        fontSize: '1.2rem',
        textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
        background: 'rgba(0,0,0,0.5)',
        padding: '5px 15px',
        borderRadius: '5px',
        border: '1px solid var(--accent-gold)',
        zIndex: 100
      }}>
        Код комнаты: {roomId}
      </div>

      <VolumeControl />
    </div>
  );
}
