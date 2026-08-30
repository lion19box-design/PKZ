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
  const [isSpinning, setIsSpinning] = useState(false);
  const [rulebookOpen, setRulebookOpen] = useState(false);
  const [playerSelectModal, setPlayerSelectModal] = useState({ isOpen: false, type: null });
  const [joinRequestsModal, setJoinRequestsModal] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [bbControlsOpen, setBbControlsOpen] = useState(false);
  const [zoomQuestionModalOpen, setZoomQuestionModalOpen] = useState(false);

  const pendingRequests = room?.joinRequests || [];
  const hasPending = pendingRequests.length > 0;

  useEffect(() => {
    let timer;
    if (room && room.timerEndsAt && room.timerEndsAt > Date.now()) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((room.timerEndsAt - Date.now()) / 1000));
        setTimeLeft(remaining);
      };
      updateTimer();
      timer = setInterval(updateTimer, 500);
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

    const isGuest = localStorage.getItem('chgk_is_guest') === 'true';
    const joinAsHost = () => {
      socket.emit('joinRoom', { roomId, username, isHost: true, isGuest }, (res) => {
        if (!res || !res.success) {
          showAlert((res && res.error) || 'Ошибка подключения');
          navigate('/');
        } else {
          if (res.assignedUsername && res.assignedUsername !== username) {
            localStorage.setItem('chgk_username', res.assignedUsername);
          }
          setRoom(res.room);
          setPlayedQuestionsText(res.room.playedQuestionsIds.join(', '));
          setGameState(res.room.state === 'waiting' ? 'setup' : res.room.state);
        }
      });
    };

    if (socket.connected) {
      joinAsHost();
    }
    socket.on('connect', joinAsHost);

    const handleRoomUpdate = (updatedRoom) => {
      setRoom(updatedRoom);
      setGameState(updatedRoom.state === 'waiting' ? 'setup' : updatedRoom.state);
    };

    const handleJoinRequestNotification = ({ isTimerActive, username }) => {
      if (isTimerActive) {
        showAlert(`Пока знатоки раздумывают над ответом - в элитарный клуб нагрянул гость (${username}). Проверьте почту, не отвлекая знатоков от процесса обсуждения.`);
      } else {
        showAlert(`В двери элитарного клуба кто-то стучит (${username}). Проверьте почту, возможно это новый Знаток готов присоединиться к столу!`);
      }
    };

    const handlePenaltyApplied = ({ targetUsername, penaltyType }) => {
      if (penaltyType === 'time') {
        showAlert('Внимание! Следующая минута обсуждения урезана (-20 секунд)!');
      } else if (penaltyType === 'remove_1_round') {
        showAlert(`Внимание! Игрок ${targetUsername} удаляется из-за стола до конца раунда!`);
      } else if (penaltyType === 'remove_hat') {
         showAlert(`Игрок ${targetUsername} лишается магической шляпы!`);
      }
    };

    socket.on('roomUpdated', handleRoomUpdate);
    socket.on('penaltyApplied', handlePenaltyApplied);
    socket.on('joinRequestNotification', handleJoinRequestNotification);

    return () => {
      socket.off('connect', joinAsHost);
      socket.off('roomUpdated', handleRoomUpdate);
      socket.off('penaltyApplied', handlePenaltyApplied);
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
    showConfirm("Вы уверены, что хотите аннулировать раунд? Стрелка волчка вернется на исходную, а этот конфуз останется в анналах истории.", () => {
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
    if (room.timerEndsAt) return;
    socket.emit('startTimer', { roomId });
  };

  const stopTimer = () => {
    if (!room.timerEndsAt) return;
    showConfirm("Вы точно хотите остановить время? Господин Крупье, неужели знатоки сдались досрочно?", () => {
      socket.emit('stopTimer', { roomId });
    });
  };


  const setQuestion = (sectorIndex) => {
      socket.emit('setQuestion', {roomId, sectorIndex});
  }

  const finishGame = () => {
    showConfirm('Вы точно хотите завершить игру и закрыть стол? Зрители не простят вам такого раннего ухода!', () => {
      socket.emit('finishGame', { roomId });
    });
  };

  const handlePenaltySelect = (player) => {
    setPlayerSelectModal({ isOpen: false, type: null });
    let msg = "";
    if (playerSelectModal.type === 'remove_1_round') {
        msg = `Удалить господина/госпожу ${player.username} на один раунд? Красная карточка за неспортивное поведение!`;
    } else if (playerSelectModal.type === 'remove_hat') {
        msg = `Лишить господина/госпожу ${player.username} магической шляпы? Пусть думает своей головой!`;
    }
    showConfirm(msg, () => {
      socket.emit('applyPenalty', { roomId, targetUsername: player.username, penaltyType: playerSelectModal.type });
    });
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
    const getPlayedIds = () => {
      const ids = [...room.playedQuestionsIds, ...room.playedSectors.map(s => room.gameQuestions[s]?.id)]
        .filter(id => typeof id === 'number')
        .filter((v, i, a) => a.indexOf(v) === i);
      return ids.join(', ');
    };

    return (
      <div className="game-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-box" style={{ width: '500px', textAlign: 'center', padding: '30px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: 'var(--accent-gold)' }}>ИГРА ОКОНЧЕНА</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Счет: Знатоки {room.score.experts} - {room.score.viewers} Зрители</p>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <textarea 
              id="host-played-ids"
              name="playedQuestions"
              aria-label="Сыгранные вопросы"
              className="premium-input" 
              style={{ flex: 1, height: '80px', resize: 'none', marginBottom: 0 }}
              value={getPlayedIds()}
              readOnly
            />
            <button 
              className="premium-btn" 
              style={{ width: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              onClick={() => {
                try {
                  navigator.clipboard.writeText(getPlayedIds());
                  showAlert('Скопировано!');
                } catch(e) {
                  showAlert('Ошибка копирования. Сделайте скриншот!');
                }
              }}
              title="Скопировать"
            >
              📋
            </button>
          </div>
          
          <button className="premium-btn" style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }} onClick={() => navigate('/')}>
            Вернуться в Главное Меню
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container" style={{ backgroundImage: "url('/assets/krupie-room.png')" }}>
      {/* Header */}
      <div className="game-header">
        <div className="host-header-actions">
          <button 
            className={`control-btn danger ${(room.canceledRounds >= 2) ? 'disabled' : ''}`} 
            style={{ filter: (room.canceledRounds >= 2) ? 'brightness(0.5)' : 'none' }}
            disabled={room.canceledRounds >= 2}
            title={(room.canceledRounds >= 2) ? 'Лимит аннуляций, доступных крупье - исчерпан. Если данный матч зашел в тупик - просим проследовать в лобби для начала новой игры' : ''}
            onClick={handleCancelRound}
          >
            Аннулировать
          </button>
          <button className="control-btn warning" onClick={() => setHistoryModalOpen(true)}>История</button>
          <button className="control-btn danger" onClick={finishGame}>Завершить</button>
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

        <div className="host-header-controls">
          {room.timerPenalty && <span style={{ color: '#f44336', fontWeight: 'bold', fontSize: '0.8rem' }}>⚠️ -20с</span>}
          {room.timerSpent && !room.timerEndsAt && <span style={{ color: '#ff9800', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '3px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>⚠️ БАЗОВАЯ МИНУТА</span>}
          {timeLeft !== null && (
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: timeLeft <= 10 ? '#f44336' : '#4caf50', minWidth: '60px', textAlign: 'center', fontFamily: 'monospace' }}>
              {formatTime(timeLeft)}
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className={`control-btn ${(!room.currentQuestion || !!room.timerEndsAt) ? 'disabled' : ''}`} 
              disabled={!room.currentQuestion || !!room.timerEndsAt} 
              onClick={startTimer}
            >
              Время пошло
            </button>
            <button 
              className={`control-btn ${!room.timerEndsAt ? 'disabled' : ''}`} 
              disabled={!room.timerEndsAt} 
              onClick={stopTimer}
            >
              Стоп
            </button>
          </div>
          <button 
            className={`control-btn ${(!!room.currentQuestion || isSpinning) ? 'disabled' : ''}`} 
            disabled={!!room.currentQuestion || isSpinning} 
            onClick={spinRoulette}
          >
            Рулетка
          </button>

          {(room.currentQuestion?.id?.toString().startsWith('BB') || room.currentQuestion?.assetUrl || room.currentQuestion?.bbItemAsset) && (
            <div className="host-bb-controls">
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{color: '#4caf50', fontWeight: 'bold', fontSize: '0.8rem'}}>ЧЯ:</span>
                <button 
                  className={`control-btn ${room.blackBoxState !== 'hidden' ? 'disabled' : ''}`}
                  disabled={room.blackBoxState !== 'hidden'}
                  onClick={() => {
                    socket.emit('showBlackBox', { roomId });
                    showAlert('Черный ящик внесен на стол!');
                  }}
                >
                  Внести
                </button>
                <button 
                  className={`control-btn ${room.blackBoxState !== 'closed' ? 'disabled' : ''}`}
                  disabled={room.blackBoxState !== 'closed'}
                  onClick={() => {
                    socket.emit('openBlackBox', { roomId });
                    showAlert('Черный ящик открыт!');
                  }}
                >
                  Открыть
                </button>
                <button 
                  className={`control-btn danger ${room.blackBoxState === 'hidden' ? 'disabled' : ''}`}
                  disabled={room.blackBoxState === 'hidden'}
                  onClick={() => socket.emit('endBlackBox', { roomId })}
                >
                  Унести
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="game-body">
        {/* Левая панель - Управление раундом */}
        <div className="side-panel">
          <div className="glass-box">
            <h3 onClick={() => setPenaltiesOpen(!penaltiesOpen)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: '#f44336', borderColor: '#f44336' }}>
              Панель штрафов <span>{penaltiesOpen ? '▲' : '▼'}</span>
            </h3>
            {penaltiesOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <button className="control-btn danger" style={{ fontSize: '0.8rem' }} onClick={() => showConfirm("Урезать минуту до 40 секунд? Жестоко, но правила есть правила.", () => socket.emit('applyPenalty', { roomId, penaltyType: 'time' }))}>Урезать время (-20 сек)</button>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <button className={`control-btn success ${room.hints.credit ? 'disabled' : ''}`} disabled={room.hints.credit} style={{ fontSize: '0.8rem' }} onClick={() => showConfirm("Выдаем минуту в кредит? Помните, долг платежом красен.", () => socket.emit('activateHint', { roomId, hintType: 'credit' }))}>Выдать "Минуту в кредит"</button>
                <button className={`control-btn success ${room.hints.club || (room.score.experts === 5 && room.score.viewers === 5) ? 'disabled' : ''}`} disabled={room.hints.club || (room.score.experts === 5 && room.score.viewers === 5)} style={{ fontSize: '0.8rem' }} onClick={() => showConfirm("Клуб готов помочь! Активировать Помощь Клуба? Знатоки уверены, что зал не подведет?", () => socket.emit('activateHint', { roomId, hintType: 'club' }))}>Активировать "Помощь клуба"</button>
                <button className={`control-btn success ${room.hints.host || (room.score.experts === 5 && room.score.viewers === 5) ? 'disabled' : ''}`} disabled={room.hints.host || (room.score.experts === 5 && room.score.viewers === 5)} style={{ fontSize: '0.8rem' }} onClick={() => showConfirm("Господин Ведущий снисходит до подсказки? Уверены, что хотите использовать 'Помощь Крупье'?", () => socket.emit('activateHint', { roomId, hintType: 'host' }))}>Выдать "Помощь Крупье"</button>
              </div>
            )}
          </div>

          <div className="glass-box" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ borderBottom: 'none', margin: 0 }}>Вопрос</h3>
                {room.currentQuestion && (
                  <button 
                    className="circle-icon-btn"
                    style={{ width: '24px', height: '24px', padding: '3px', cursor: 'pointer' }}
                    title="Увеличить текст вопроса"
                    onClick={() => setZoomQuestionModalOpen(true)}
                  >
                    <img src="/assets/magnifying-glass.svg" alt="Лупа" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </button>
                )}
              </div>
            </div>
            <p style={{ color: '#ccc', fontStyle: 'italic', marginBottom: '10px' }}>
              {room.currentQuestion ? room.currentQuestion.questionText : "Вопрос не выбран. Крутите рулетку."}
            </p>
            <h3 style={{ borderBottom: 'none', marginBottom: '4px', color: '#ff9800' }}>Правильный ответ</h3>
            <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>
              {room.currentQuestion ? room.currentQuestion.answerText : ""}
            </p>
            {room.currentQuestion && room.currentQuestion.clubHint && (
               <>
                 <h3 style={{ borderBottom: 'none', marginBottom: '4px', color: '#2196f3' }}>Подсказка клуба</h3>
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
            targetSector={room.targetSector} 
            playedSectors={room.playedSectors} 
            onSectorSelected={setQuestion}
            isHost={true}
            onSpinStart={() => setIsSpinning(true)}
            onSpinEnd={() => setIsSpinning(false)}
          />
        </div>

        {/* Профиль Зрителя (для Крупье) */}
        <div className="glass-box host-viewer-card">
          <div 
            className="host-viewer-photo"
            style={{ 
              backgroundImage: `url("${(room.currentQuestion && !isSpinning) ? room.currentQuestion.photoUrl : '/assets/zaglushka.png'}")`
            }}
          ></div>
          <div style={{ padding: '8px' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1rem', lineHeight: '1.2' }}>
                {(room.currentQuestion && !isSpinning) ? room.currentQuestion.authorName : (room.playedSectors.length > 0 ? "Раунд завершен" : "Ожидание")}
            </h4>
            <p style={{ margin: '4px 0 0 0', color: '#ccc', fontSize: '0.8rem' }}>
                {(room.currentQuestion && !isSpinning) ? `${room.currentQuestion.job}, г. ${room.currentQuestion.city}` : (room.playedSectors.length > 0 ? "Очко начислено. Запускайте рулетку для продолжения игры." : "Игра началась. Запускайте рулетку.")}
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
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `url("/assets/avatars/${req.active_avatar}") center / cover` }}></div>
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

      {rulebookOpen && (
        <div className="elite-modal-overlay">
          <div className="elite-modal" style={{ maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              onClick={() => setRulebookOpen(false)} 
              style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '1.5rem', cursor: 'pointer' }}
              title="Закрыть"
            >
              ✖
            </button>
            <h2 style={{ color: 'var(--accent-gold)' }}>Справочник Крупье</h2>
            <div style={{ textAlign: 'left', lineHeight: '1.6', color: 'var(--text-muted)' }}>
              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Цель и Ход Игры</h3>
              <p>Главная цель — довести счет игры до <strong>6 очков</strong> в пользу любой из команд. В начале каждого раунда вы запускаете рулетку, читаете выпавший вопрос и запускаете таймер. После ответа Знатоков вы решаете, чей ответ верен, и начисляете балл. Как только счет достигает отметки 6 — игра завершается. Через пару секунд после начисления финального балла автоматически заиграет музыкальная композиция, соответствующая исходу игры. Пока звучит музыка, все остаются за столом — это ваше время поздравить победителей и подвести краткие итоги. После завершения трека система автоматически вернет всех участников в лобби для дальнейшего обсуждения.</p>

              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Аннулирование Раунда</h3>
              <p>На столе 16 секторов: 14 основных и 2 запасных. Поэтому <strong>не рекомендуется аннулировать более 2 раундов</strong> за игру, иначе вопросов попросту не хватит для выявления победителя. Кнопка аннулирования — это экстренный "стоп-кран", а не инструмент ведения игры. Используйте её исключительно в случаях неопровержимо доказанной некорректности вопроса, либо при явном вскрытии факта жульничества со стороны Знатоков. Аннулировать вопрос из-за того, что он "не понравился", или потому что Знатоки не знают ответа — категорически неприемлемо в нашем элитарном обществе.</p>

              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Ваша Роль</h3>
              <p>Вы — голос справедливости. Вы не играете против Знатоков, но строго следите за тем, чтобы правила Клуба соблюдались. Ваша цель — создать атмосферу элитарного напряжения и следить за честностью поединка умов.</p>

              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Ход Минуты</h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Минута дается Знатокам на обсуждение <strong>и на формулировку</strong> ответа. Дополнительного времени "подумать, как правильно сказать" после сирены не дается.</li>
                <li>Минута запускается только после полного прочтения вопроса. Вы <strong>обязаны вслух объявить</strong> «Время пошло» в момент запуска таймера, чтобы это не стало для Знатоков неожиданностью.</li>
                <li>За 10 секунд до конца звучит сигнал — знак того, что команде пора сводить версии воедино.</li>
                <li>После финального гонга любое обсуждение должно быть прекращено.</li>
                <li>После гонга вы еще раз зачитываете вопрос и спрашиваете Капитана: «Кто отвечает?». Капитан имеет право <strong>назначить отвечать абсолютно любого знатока, в том числе и самого себя</strong>.</li>
                <li>Только назначенный игрок имеет право озвучить ответ. Выкрики от других игроков игнорируются, а за продолжение обсуждения после гонга выписывается штраф.</li>
              </ul>
              
              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Специальные Сектора</h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.5' }}>
                <li><strong>Черный ящик (Зеленый сектор):</strong> Если на рулетке выпадает Зеленый Сектор, в студию "выносится" Черный Ящик. Вы зачитываете вопрос о содержимом ящика, после чего дается стандартная минута на обсуждение. После ответа ящик вскрывается, и его содержимое демонстрируется. Очко присуждается по обычным правилам.</li>
              </ul>

              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Подсказки (Палочки-выручалочки)</h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li>В рамках <strong>одного раунда</strong> команда имеет право взять только <strong>одну</strong> подсказку.</li>
                <li><strong>Минута в кредит:</strong> Вы активируете ее в своей панели. Это дает знатокам +60 секунд прямо сейчас, но в будущем (когда вы решите) вы обяжете их ответить на один из вопросов досрочно, вообще без минуты.</li>
                <li><strong>Помощь Клуба:</strong> Если Капитан просит ее, вы нажимаете кнопку в панели подсказок. Знатокам на экран выводится текст, а таймеру добавляется 60 секунд.</li>
                <li><strong>Помощь Ведущего:</strong> Запрашивается Капитаном. Если команда берет эту подсказку, вы <strong>нажимаете кнопку в своем интерфейсе</strong> (это спишет её и заблокирует другие подсказки на текущий раунд), после чего даете <strong>устную наводку от себя</strong> (или перефразируете "Подсказку Клуба", делая ее недоступной в интерфейсе). Наводка должна лишь направить ход мыслей, но не быть откровенным подыгрыванием. Дополнительного времени при этом не дается.</li>
              </ul>

              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>FAQ: Частые Спорные Ситуации</h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li><strong>Знатоки дали синонимичный ответ:</strong> Если суть передана абсолютно верно и не искажает логику вопроса, ответ засчитывается. Элитарный клуб ценит интеллект, а не зубрёжку словарей.</li>
                <li><strong>Ответ выкрикнул не тот, кого назначил Капитан:</strong> Ответ не принимается. Вы вправе дать штраф, либо дать команде шанс ответить назначенному игроку.</li>
                <li><strong>Гениальная версия, не совпадающая с вашей:</strong> Если версия логична, красива и не противоречит фактам, Крупье имеет право засчитать её. Вы — судья, а не бездушный компьютер.</li>
                <li><strong>Крупье случайно или вынужденно аннулировал больше двух вопросов:</strong> Лимит исчерпан и кнопка заблокируется. Вопросов на столе больше не хватит для корректного завершения игры. В таком случае - единственный известный клубу вариант - завершить матч и проследовать в лобби для начала новой игры.</li>
              </ul>
              
              <div style={{ marginTop: '25px', padding: '15px', border: '1px solid var(--accent-gold)', borderRadius: '5px', backgroundColor: 'rgba(255, 215, 0, 0.05)' }}>
                <p style={{ fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
                  «Истинное мастерство Крупье состоит не только в том, чтобы зачитывать вопросы и подсказки, но и в умении виртуозно вести игру, следить за соблюдением элитарных правил, справедливо наказывать за проступки и главное — принимать тяжелые ситуационные решения. Вы — вершитель судеб за этим столом.»
                </p>
              </div>
            </div>
            <button className="premium-btn elite-modal-btn cancel" onClick={() => setRulebookOpen(false)} style={{ marginTop: '20px' }}>
              Закрыть Справочник
            </button>
          </div>
        </div>
      )}

      <div className="host-bottom-bar">
        <div className="room-code-display">
          Код комнаты: {roomId}
        </div>
        
        <button 
          onClick={() => setRulebookOpen(true)}
          className="circle-icon-btn"
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Справочник Крупье"
        >
          <img src="/assets/book-with-rules.svg" alt="Rulebook" style={{ width: '24px', height: '24px' }} />
        </button>

        <VolumeControl align="right" style={{ position: 'relative', bottom: 'auto', left: 'auto', right: 'auto', zIndex: 100 }} />

        <button 
          onClick={() => setJoinRequestsModal(true)}
          className="circle-icon-btn"
          style={{
            border: hasPending ? '2px solid #f44336' : '1px solid var(--accent-gold)',
            position: 'relative'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title={`Заявки на вход (${pendingRequests.length})`}
        >
          <img src="/assets/mail.svg" alt="Mail" style={{ width: '22px', height: '22px', filter: hasPending ? 'none' : 'opacity(0.6)' }} />
          {hasPending && <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#f44336', width: '10px', height: '10px', borderRadius: '50%' }}></div>}
        </button>
      </div>
      {/* Модальное окно истории вопросов */}
      {historyModalOpen && (
        <div className="elite-modal-overlay">
          <div className="elite-modal-content" style={{ maxWidth: '95vw', width: '1600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '40px' }}>
            <button 
              onClick={() => setHistoryModalOpen(false)}
              style={{
                position: 'absolute', top: '15px', right: '20px', background: 'transparent', color: '#f44336', 
                border: 'none', fontSize: '2.5rem', cursor: 'pointer', lineHeight: 1, padding: 0
              }}
              title="Закрыть"
            >
              &times;
            </button>
            <h2 className="elite-modal-title" style={{ fontSize: '2rem', marginBottom: '30px' }}>История сыгранных вопросов</h2>
            {room.playedSectors && room.playedSectors.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {room.playedSectors.map((sectorIndex, idx) => {
                  const q = room.gameQuestions[sectorIndex];
                  if (!q) return null;
                  return (
                    <div key={idx} style={{ 
                      display: 'flex', gap: '30px', background: 'rgba(0,0,0,0.6)', padding: '25px', borderRadius: '12px', border: '1px solid var(--accent-gold)'
                    }}>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <h3 style={{ color: 'var(--accent-gold)', marginTop: 0, fontSize: '1.4rem' }}>Вопрос {q.id} (Сектор {sectorIndex === 0 ? 'ЧЯ' : sectorIndex})</h3>
                        <p style={{ color: '#ccc', fontSize: '1.1rem', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '20px' }}>{q.questionText}</p>
                        <h3 style={{ color: 'var(--accent-gold)', marginBottom: '10px', fontSize: '1.2rem' }}>Правильный ответ</h3>
                        <p style={{ color: '#fff', fontSize: '1.1rem', marginTop: 0, fontWeight: 'bold' }}>{q.answerText}</p>
                        {q.clubHint && (
                           <div style={{ marginTop: '20px' }}>
                             <h3 style={{ color: '#2196f3', marginBottom: '5px', fontSize: '1.2rem' }}>Подсказка клуба</h3>
                             <p style={{ color: '#fff', fontSize: '1rem', fontStyle: 'italic', marginTop: 0 }}>{q.clubHint}</p>
                           </div>
                        )}
                      </div>
                      <div style={{ width: '220px', textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ 
                          height: '220px', 
                          background: `url("${q.photoUrl}") center / cover`, 
                          border: '2px solid var(--accent-gold)',
                          borderRadius: '10px',
                          marginBottom: '15px'
                        }}></div>
                        <h3 style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1.2rem' }}>{q.authorName}</h3>
                        <p style={{ margin: '8px 0 0 0', color: '#ccc', fontSize: '0.9rem' }}>{q.job}, г. {q.city}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#ccc', fontSize: '1.2rem' }}>Сыгранных вопросов пока нет.</p>
            )}
            
            <div className="modal-buttons" style={{ marginTop: '30px', justifyContent: 'center' }}>
              <button className="control-btn" onClick={() => setHistoryModalOpen(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно увеличения текста вопроса (Лупа) */}
      {zoomQuestionModalOpen && room?.currentQuestion && (
        <div className="elite-modal-overlay" onClick={() => setZoomQuestionModalOpen(false)}>
          <div 
            className="elite-modal-content" 
            style={{ 
              maxWidth: '800px', 
              width: '92vw', 
              maxHeight: '90vh', 
              maxHeight: '90dvh',
              overflowY: 'auto',
              position: 'relative',
              padding: '20px 25px',
              textAlign: 'left'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomQuestionModalOpen(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '15px',
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-gold)',
                fontSize: '1.6rem',
                cursor: 'pointer',
                lineHeight: 1
              }}
              title="Закрыть"
            >
              ✕
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', borderBottom: '1px solid rgba(212,175,55,0.4)', paddingBottom: '8px' }}>
              <img src="/assets/magnifying-glass.svg" alt="Лупа" style={{ width: '28px', height: '28px' }} />
              <h2 style={{ margin: 0, color: 'var(--accent-gold)', fontFamily: 'var(--font-serif)', fontSize: '1.35rem' }}>
                Вопрос {room.currentQuestion.id ? `(${room.currentQuestion.id})` : ''} — Сектор {room.targetSector === 0 ? 'ЧЯ' : room.targetSector}
              </h2>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.6)',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(212,175,55,0.3)',
              marginBottom: '16px',
              maxHeight: '45vh',
              overflowY: 'auto'
            }}>
              <p style={{
                fontSize: '1.25rem',
                lineHeight: '1.55',
                color: '#fff',
                fontFamily: 'var(--font-serif)',
                margin: 0
              }}>
                {room.currentQuestion.questionText}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ color: '#ff9800', fontWeight: 'bold', fontSize: '1.05rem' }}>
                Правильный ответ: <span style={{ color: '#fff', fontWeight: 'bold' }}>{room.currentQuestion.answerText}</span>
              </div>
              {room.currentQuestion.clubHint && (
                <div style={{ color: '#2196f3', fontWeight: 'bold', fontSize: '0.95rem' }}>
                  Подсказка клуба: <span style={{ color: '#ccc', fontWeight: 'normal', fontStyle: 'italic' }}>{room.currentQuestion.clubHint}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
              <button 
                className="premium-btn" 
                style={{ minWidth: '160px', padding: '10px 24px', fontSize: '1rem' }}
                onClick={() => setZoomQuestionModalOpen(false)}
              >
                Закрыть [X]
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
