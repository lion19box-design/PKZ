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
  
  const [playerSelectModal, setPlayerSelectModal] = useState({ isOpen: false, type: '' });
  const [isSpinning, setIsSpinning] = useState(false);
  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing'
  const [room, setRoom] = useState(null);
  const [showClubHint, setShowClubHint] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [rulebookOpen, setRulebookOpen] = useState(false);

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

    const isGuest = localStorage.getItem('chgk_is_guest') === 'true';
    const joinAsExpert = () => {
      socket.emit('joinRoom', { roomId, username, isHost: false, isGuest }, (res) => {
        if (!res || !res.success) {
          showAlert((res && res.error) || 'Ошибка подключения');
          navigate('/');
        } else {
          if (res.assignedUsername && res.assignedUsername !== username) {
            localStorage.setItem('chgk_username', res.assignedUsername);
          }
          setRoom(res.room);
          setGameState(res.room.state === 'waiting' ? 'setup' : res.room.state);
        }
      });
    };

    if (socket.connected) {
      joinAsExpert();
    }
    socket.on('connect', joinAsExpert);

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
      showAlert('Внимание! Счет 5:5. Приближается ФИНАЛЬНЫЙ РАУНД!');
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
      socket.off('connect', joinAsExpert);
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
          
          <h3 style={{ borderBottom: 'none' }}>Пул сыгранных вопросов</h3>
          <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '10px' }}>
            Скопируйте этот текст и вставьте в настройках для следующей игры.<br/>
            <strong style={{color: '#ff9800'}}>Внимание:</strong> Если кнопка не сработала, обязательно сфотографируйте или сделайте скриншот этих чисел!
          </p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <textarea 
              id="expert-played-ids"
              name="playedQuestions"
              aria-label="Сыгранные вопросы"
              className="premium-input" 
              style={{ flex: 1, height: '100px', resize: 'none', marginBottom: 0 }}
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
          
          <button className="premium-btn" style={{ width: '100%', padding: '15px', fontSize: '1.2rem' }} onClick={() => navigate('/')}>
            Вернуться в Главное Меню
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container expert-view" style={{ backgroundImage: "url('/assets/chgk-asset-background-16on9.png')" }}>
      
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
          <p style={{ margin: 0, fontSize: '1.2rem', fontStyle: 'italic' }}>
            {room.currentQuestion?.clubHint || "Клуб не смог найти подсказку..."}
          </p>
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
      <div className="expert-left-panel">
        {room.players.map((exp, i) => {
          const colors = ['#1976d2', '#388e3c', '#d32f2f', '#7b1fa2', '#f57c00', '#0097a7', '#689f38', '#c2185b'];
          const colorHash = exp.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const userColor = colors[colorHash % colors.length];
          const isRemoved = exp.removedForRound;
          const isHatless = exp.lostHat;

          return (
            <div key={i} className="expert-player-item" style={{ opacity: isRemoved ? 0.3 : 1 }} title={`Профиль: ${exp.username}`}>
              <div className="expert-avatar-wrap">
                <div 
                  className="expert-avatar-circle"
                  style={{
                    backgroundColor: userColor,
                    backgroundImage: exp.active_avatar ? `url("/assets/avatars/${exp.active_avatar}")` : 'none',
                    border: `3px solid ${isHatless ? '#f44336' : 'var(--accent-gold)'}`,
                    color: exp.active_avatar ? 'transparent' : 'white'
                  }}
                >
                  {exp.username[0].toUpperCase()}
                </div>
                {!isHatless && exp.active_hat && (
                     <img src={`/assets/hats/${exp.active_hat}`} alt="hat" style={getHatStyle(exp.active_hat)} />
                )}
              </div>
              <div className="expert-name-badge">
                {exp.username} {isHatless && <span style={{fontSize: '0.75rem', color: '#f44336'}}>(Без шапки)</span>}
                {isRemoved && <span style={{fontSize: '0.75rem', color: '#f44336', marginLeft: '5px'}}>(Удален)</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Рендер Черного Ящика */}
      {room.blackBoxState && room.blackBoxState !== 'hidden' && (
        <>
          {/* Световой луч */}
          <div style={{
            position: 'absolute', top: 0, right: '35%', width: '400px', height: '100%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,200,0.15) 60%, transparent 100%)',
            clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
            pointerEvents: 'none', zIndex: 4, transform: 'translateX(50%)',
            animation: 'beamFlicker 3s infinite alternate ease-in-out'
          }}></div>

          <div className="black-box-container">
            {/* Стол */}
            <img src="/assets/blackbox/useful-table-asset.svg" alt="Table" style={{
               width: '540px', position: 'relative', zIndex: 5, marginTop: '40px'
            }} />
            
            {/* Ящик */}
            {room.blackBoxState === 'closed' && (
               <img src="/assets/blackbox/closed-box-asset.svg" alt="Closed Box" style={{
                  position: 'absolute', bottom: '290px', width: '243px', zIndex: 10,
                  transition: 'all 0.5s ease'
               }} />
            )}

            {room.blackBoxState === 'opened' && (
               <>
                 <img src="/assets/blackbox/sparkle-asset.png" alt="Aura" style={{
                    position: 'absolute', bottom: '315px', width: '360px', zIndex: 9,
                    animation: 'spinPulse 4s infinite linear'
                 }} />
                 <img src="/assets/blackbox/open-box-asset.svg" alt="Open Box" style={{
                    position: 'absolute', bottom: '290px', width: '243px', zIndex: 10
                 }} />
                 {(room.currentQuestion?.assetUrl || room.currentQuestion?.bbItemAsset) && (
                   <img 
                     src={room.currentQuestion.assetUrl || room.currentQuestion.bbItemAsset} 
                     alt="Item" 
                     style={{
                        position: 'absolute', bottom: '360px', width: '270px', maxHeight: '270px', objectFit: 'contain', zIndex: 11,
                        animation: 'bbItemRise 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
                     }} 
                   />
                 )}
               </>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes bbAppear {
          0% { opacity: 0; transform: translate(50%, -40%) scale(0.6); }
          100% { opacity: 1; transform: translate(50%, -50%) scale(1); }
        }
        @keyframes bbItemRise {
          0% { opacity: 0; transform: translateY(30px) scale(0.4); }
          100% { opacity: 1; transform: translateY(0) scale(1.1); }
        }
      `}</style>

      {/* Верхнее табло (по центру) */}
      <div className="expert-top-scoreboard">
        {room.timerPenalty && (
          <div style={{ background: '#f44336', color: 'white', padding: '3px 15px', borderRadius: '0 0 10px 10px', fontWeight: 'bold', fontSize: '0.8rem' }}>
            ВНИМАНИЕ: СЛЕДУЮЩАЯ МИНУТА УРЕЗАНА (-20 СЕКУНД)
          </div>
        )}
        <div className="scoreboard">
          <div className="score-panel experts">
            <span className="score-label">Знатоки</span>
            <span className="score-value">{room.score.experts}</span>
          </div>
          <div className="score-panel viewers">
            <span className="score-label">Зрители</span>
            <span className="score-value">{room.score.viewers}</span>
          </div>
        </div>
      </div>

      {/* Центр - Игровой стол */}
      <div style={{ 
          width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', 
          transform: room.blackBoxState && room.blackBoxState !== 'hidden' ? 'scale(1.05) translateX(-20%)' : 'scale(1.05)',
          transition: 'transform 1s ease'
      }}>
         <Roulette 
            targetSector={room.targetSector} 
            playedSectors={room.playedSectors} 
            isHost={false}
            onSpinStart={() => setIsSpinning(true)}
            onSpinEnd={() => setIsSpinning(false)}
         />
      </div>

      {/* Правая панель - Зритель и подсказки */}
      <div className="expert-right-panel">
        
        {/* Карточка Зрителя */}
        <div className="glass-box expert-viewer-card">
          <div 
            className="expert-viewer-photo"
            style={{ 
              backgroundImage: `url("${(room.currentQuestion && !isSpinning) ? room.currentQuestion.photoUrl : '/assets/zaglushka.png'}")`
            }}
          ></div>
          <div style={{ padding: '8px' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1rem', lineHeight: '1.2' }}>
                {(room.currentQuestion && !isSpinning) ? room.currentQuestion.authorName : (room.playedSectors.length > 0 ? "Раунд завершен" : "Ожидание")}
            </h4>
            <p style={{ margin: '4px 0 0 0', color: '#ccc', fontSize: '0.8rem' }}>
                {(room.currentQuestion && !isSpinning) ? `${room.currentQuestion.job}, г. ${room.currentQuestion.city}` : (room.playedSectors.length > 0 ? "Очко начислено. Ожидайте запуска рулетки." : "Игра началась. Ожидайте запуска рулетки.")}
            </p>
          </div>
        </div>

        {/* Палочки-выручалочки */}
        <div className="glass-box expert-hints-box">
          <h3 style={{ textAlign: 'center', fontSize: '1rem', marginBottom: '12px' }}>Палочки-выручалочки</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px' }}>
            {/* Минута в кредит */}
            <div 
              className="expert-hint-icon"
              title="Дополнительная минута на обсуждение, которую знатоки обязаны вернуть, ответив досрочно на один из следующих вопросов." 
              style={{
                background: '#4caf50',
                filter: !room.hints?.credit ? 'none' : 'grayscale(1) opacity(0.5)'
              }}
            >
              <img src="/assets/clockwork-icon.svg" style={{ width: '85%', height: '85%' }} alt="Минута в кредит" />
            </div>
            
            {/* Помощь клуба */}
            <div 
              className="expert-hint-icon"
              title="Подсказка от знатоков в зале. Активируется ведущим по запросу капитана. Знатокам озвучивается правильное направление мысли." 
              style={{
                background: '#2196f3',
                filter: !room.hints?.club ? 'none' : 'grayscale(1) opacity(0.5)'
              }}
            >
              <img src="/assets/znatoki-icon.svg" style={{ width: '85%', height: '85%' }} alt="Помощь клуба" />
            </div>
            
            {/* Помощь ведущего */}
            <div 
              className="expert-hint-icon"
              title="Подсказка от самого Господина Крупье. Используется в крайнем случае, чтобы направить знатоков." 
              style={{
                background: '#ff9800',
                filter: !room.hints?.host ? 'none' : 'grayscale(1) opacity(0.5)'
              }}
            >
              <img src="/assets/krupie-icon.svg" style={{ width: '85%', height: '85%' }} alt="Помощь ведущего" />
            </div>
          </div>
        </div>

      </div>
      
      <button 
        className="control-btn danger"
        style={{
          position: 'absolute', top: '15px', left: '15px',
          opacity: 0.35, transition: 'opacity 0.2s', zIndex: 10
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.35'}
        onClick={() => {
           showConfirm('Вы точно хотите подвести весь стол своим внезапным уходом?', () => {
             socket.emit('leaveRoom', { roomId });
             navigate('/');
           });
        }}
      >
        Покинуть стол
      </button>

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
            <h2 style={{ color: 'var(--accent-gold)' }}>Справочник Знатока</h2>
            <div style={{ textAlign: 'left', lineHeight: '1.6', color: 'var(--text-muted)' }}>
              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Добро пожаловать в Элитарный Клуб!</h3>
              <p>Ваша цель — объединить умы за этим столом и дать <strong>6 правильных ответов</strong> быстрее, чем зрители наберут свои 6 очков. Учтите: каждый ваш неверный ответ — это бесценный балл в копилку телезрителей. Поэтому распоряжайтесь каждой выданной вам минутой с хирургической точностью, полируя до блеска свои итоговые формулировки. Помните: вы соревнуетесь не с Господином Крупье, а со зрителями, Крупье же — ваш строгий, но абсолютно беспристрастный арбитр.</p>

              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Ваши Инструменты</h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li><strong>Рулетка:</strong> Выбирает один из 16 конвертов с вопросами.</li>
                <li><strong>Табло:</strong> Показывает текущий счет. Игра идет до 6.</li>
                <li><strong>Индикаторы Подсказок (внизу справа):</strong> Показывают, какие из трех "палочек-выручалочек" еще доступны вашей команде.</li>
              </ul>

              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Ход Раунда</h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Внимательно слушайте вопрос. Минута на обсуждение запускается только после команды Крупье "Время пошло".</li>
                <li>Вам дается ровно <strong>60 секунд</strong> на обсуждение <strong>и формирование</strong> итогового ответа. Дополнительного времени не будет.</li>
                <li>За 10 секунд до конца вы услышите звуковой сигнал — пора согласовывать финальную версию.</li>
                <li>После гонга обсуждение прекращается. Капитан выбирает отвечающего. Выкрики с места наказываются штрафом.</li>
              </ul>

              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Специальные Сектора</h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.5' }}>
                <li><strong>Черный ящик (Зеленый сектор):</strong> Если на рулетке выпадает Зеленый Сектор, в студию "выносится" Черный Ящик. Крупье зачитывает вопрос, связанный с его содержимым, после чего дается классическая минута на обсуждение. После ответа ящик вскрывается, и его содержимое становится достоянием глаз всех присутствующих.</li>
              </ul>

              <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Подсказки (Палочки-выручалочки)</h3>
              <p>За всю игру каждую подсказку можно взять лишь один раз, и <strong>не более одной подсказки за раунд</strong>.</p>
              <ul style={{ paddingLeft: '20px' }}>
                <li><strong>Минута в кредит:</strong> Берите, если совсем чуть-чуть не хватает времени докрутить хорошую версию. Но помните: в будущем Крупье обяжет вас ответить на один вопрос досрочно (без обсуждения).</li>
                <li><strong>Помощь Клуба:</strong> Запрашивайте во время минуты обсуждения. На экран выведется текст-подсказка из базы, и вам дадут еще 60 секунд.</li>
                <li><strong>Помощь Ведущего:</strong> Запрашивайте, когда команда в глухом тупике. Крупье даст устную наводку от себя, но дополнительного времени не накинет — ответ придется давать сразу.</li>
              </ul>
              
              <div style={{ marginTop: '25px', padding: '15px', border: '1px solid var(--accent-gold)', borderRadius: '5px', backgroundColor: 'rgba(255, 215, 0, 0.05)' }}>
                <p style={{ fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
                  «Строго запрещено пользоваться интернетом, смартфонами и любыми сторонними источниками. Смысл Клуба — померяться эрудицией и логикой. Нарушители покрываются позором.»
                </p>
              </div>
            </div>
            <button className="premium-btn elite-modal-btn cancel" onClick={() => setRulebookOpen(false)} style={{ marginTop: '20px' }}>
              Вернуться за стол
            </button>
          </div>
        </div>
      )}

      <div className="game-bottom-controls-left">
        <button 
          onClick={() => setRulebookOpen(true)}
          className="circle-icon-btn"
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Справочник Знатока"
        >
          <img src="/assets/book-with-rules.svg" alt="Rulebook" style={{ width: '24px', height: '24px' }} />
        </button>

        <VolumeControl style={{ position: 'relative', bottom: 'auto', left: 'auto', zIndex: 'auto' }} />
      </div>
    </div>
  );
}
