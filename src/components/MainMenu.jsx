import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainMenu.css';

export default function MainMenu() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem('chgk_username');
    if (storedUsername) {
      setUsername(storedUsername);
      setIsLoggedIn(true);
    }
  }, []);
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'rules', 'settings', 'donate', 'authors', 'customization', null
  
  // Settings state
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('chgk_volume');
    return saved !== null ? Number(saved) : 50;
  });
  const [difficulty, setDifficulty] = useState(100);
  const [crtEnabled, setCrtEnabled] = useState(true);

  // Rules tab state
  const [rulesTab, setRulesTab] = useState('short'); // 'short', 'extended'

  // Easter egg state
  const [owlClicks, setOwlClicks] = useState(0);
  const [isDisturbed, setIsDisturbed] = useState(false);
  const clickTimeoutRef = useRef(null);

  // Audio refs
  const mainAudioRef = useRef(new Audio("/assets/audio/elitist-music/The Owl's Lounge.mp3"));
  const modalAudioRef = useRef(new Audio("/assets/audio/elitist-music/Ode alla Mente.mp3"));
  const customAudioRef = useRef(new Audio("/assets/audio/elitist-music/Le Cercle de l'Elite.mp3"));
  const flightAudioRef = useRef(new Audio("/assets/audio/elitist-music/Flight with the Crystal Owl.mp3"));
  const lightningAudioRef = useRef(new Audio("/assets/audio/sound-effects/owl-disturbed-lightning.mp3"));

  const navigate = useNavigate();

  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    mainAudioRef.current.loop = true;
    modalAudioRef.current.loop = true;
    customAudioRef.current.loop = true;
    flightAudioRef.current.loop = true;
    
    const handleInteract = () => {
      setHasInteracted(true);
      document.removeEventListener('click', handleInteract);
    };
    document.addEventListener('click', handleInteract);

    
    return () => {
      document.removeEventListener('click', handleInteract);
      mainAudioRef.current.pause();
      modalAudioRef.current.pause();
      customAudioRef.current.pause();
      flightAudioRef.current.pause();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('chgk_volume', volume);
    window.dispatchEvent(new CustomEvent('chgk-volume-change', { detail: volume / 100 }));
    
    mainAudioRef.current.volume = volume / 100;
    modalAudioRef.current.volume = volume / 100;
    customAudioRef.current.volume = volume / 100;
    flightAudioRef.current.volume = volume / 100;
    lightningAudioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    if (!hasInteracted) return;

    if (isDisturbed) {
        mainAudioRef.current.pause();
        modalAudioRef.current.pause();
        customAudioRef.current.pause();
        return; 
    }

    if (activeModal === 'rules' || activeModal === 'settings' || activeModal === 'authors') {
      mainAudioRef.current.pause();
      customAudioRef.current.pause();
      modalAudioRef.current.play().catch(()=>{});
    } else if (activeModal === 'customization') {
      mainAudioRef.current.pause();
      modalAudioRef.current.pause();
      customAudioRef.current.play().catch(()=>{});
    } else {
      modalAudioRef.current.pause();
      customAudioRef.current.pause();
      // Resume main menu audio
      mainAudioRef.current.play().catch(()=>{});
    }
  }, [activeModal, isDisturbed, hasInteracted]);

  const handleOwlClick = () => {
    if (isDisturbed) return;
    
    setOwlClicks(prev => prev + 1);
    
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    
    clickTimeoutRef.current = setTimeout(() => {
      setOwlClicks(0);
    }, 1500);
    
    if (owlClicks + 1 >= 10) {
      setIsDisturbed(true);
      lightningAudioRef.current.play().catch(()=>{});
      mainAudioRef.current.pause();
      flightAudioRef.current.play().catch(()=>{});
    }
  };

  const performAuth = async () => {
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      let res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      let data = await res.json();
      
      if (!res.ok) {
         alert(data.error || 'Ошибка авторизации');
         return false;
      }
      
      localStorage.setItem('chgk_username', username);
      return true;
    } catch (err) {
      console.error(err);
      alert('Ошибка соединения с сервером');
      return false;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (await performAuth()) {
      setIsLoggedIn(true);
    }
  };

  const handleProfileClick = async () => {
    if (!username || !password) {
      alert('Пожалуйста, введите Никнейм и Пароль для доступа к профилю.');
      return;
    }
    if (await performAuth()) {
      navigate('/profile');
    }
  };

  const handleDifficultyChange = (e) => {
    setDifficulty(e.target.value);
    setTimeout(() => setDifficulty(100), 400);
  };

  const closeModal = () => setActiveModal(null);

  const handleCrtToggle = (e) => {
    const isEnabled = e.target.checked;
    setCrtEnabled(isEnabled);
    const crtOverlay = document.querySelector('.crt-overlay');
    if (crtOverlay) {
      crtOverlay.style.display = isEnabled ? 'block' : 'none';
    }
  };

  const owlSrc = isDisturbed ? "/assets/the-crystal-owl-disturbed.png" : "/assets/the-crystal-owl.png";

  return (
    <div className="main-menu">
      <div className="glass-panel" style={{position: 'relative', zIndex: 2}}>
        <div className="owl-avatar-container">
          <img 
            src={owlSrc} 
            alt="Хрустальная сова" 
            onClick={handleOwlClick}
            className={`owl-avatar ${isDisturbed ? 'disturbed' : ''}`}
          />
        </div>
        <h1 className="game-title">Почему? Куда? Зачем?</h1>
        <h2 className="game-subtitle">Элитарный клуб</h2>

        {isLoggedIn ? (
          <div className="logged-in-menu">
            <h3 className="welcome-greeting">Добро пожаловать, {username}</h3>
            <button 
              className="premium-btn play-btn"
              onClick={() => navigate('/lobby')}
            >
              ИГРАТЬ
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="login-form">
            {isRegistering && (
               <div style={{color: '#ffc107', fontSize: '0.85rem', marginBottom: '10px', textShadow: '1px 1px 2px black', lineHeight: '1.2'}}>
                 Знатоки характеризуются отличной памятью, в связи с чем забытие пароля равняется потере учетной записи. Впрочем, аккаунт всегда можно создать заново уже с новым именем, и заново покорить Интеллектуальный клуб!
               </div>
            )}
            <input 
              id="main-username"
              name="username"
              type="text" 
              placeholder="Никнейм" 
              aria-label="Никнейм игрока"
              autoComplete="username"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="premium-input"
              required
            />
            <input 
              id="main-password"
              name="password"
              type="password" 
              placeholder="Пароль" 
              aria-label="Пароль"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="premium-input"
              required
            />
            <button type="submit" className="premium-btn">
               {isRegistering ? 'Зарегистрироваться' : 'Войти в клуб'}
            </button>
            <button 
               type="button" 
               className="icon-btn" 
               style={{marginTop: '10px', fontSize: '0.9rem'}}
               onClick={() => setIsRegistering(!isRegistering)}
            >
               {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать'}
            </button>
          </form>
        )}

        {isLoggedIn && (
          <div className="menu-footer">
            <button onClick={() => setActiveModal('rules')} className="icon-btn">
              <img src="/assets/icons/scroll.svg" alt="rules" className="menu-icon" /> Правила
            </button>
            <button onClick={() => setActiveModal('settings')} className="icon-btn">
              <img src="/assets/icons/gear.svg" alt="settings" className="menu-icon" /> Настройки
            </button>
            <button onClick={() => setActiveModal('authors')} className="icon-btn">
              <img src="/assets/icons/pen.svg" alt="authors" className="menu-icon" /> Авторы
            </button>
            <button onClick={() => navigate('/profile')} className="icon-btn" style={{color: '#fff', textShadow: '0 0 5px var(--accent-gold)'}}>
              <img src="/assets/icons/top-hat.svg" alt="profile" className="menu-icon" /> Профиль
            </button>
            <button onClick={() => setActiveModal('donate')} className="icon-btn donate-btn">
              <img src="/assets/icons/money-bag.svg" alt="donate" className="menu-icon" /> Донат
            </button>
          </div>
        )}
      </div>

      {/* MODALS */}
      {activeModal && (
        <div className="modal-overlay" onClick={closeModal} style={{zIndex: 10}}>
          <div 
            className={`modal-content ${activeModal === 'donate' ? 'donate-modal' : ''}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeModal}>×</button>

            {activeModal === 'customization' && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <h2 style={{color: 'var(--accent-gold)', marginBottom: '20px'}}>Кастомизация профиля</h2>
                <div style={{fontSize: '4rem', marginBottom: '20px'}}>🎩</div>
                <p style={{fontSize: '1.2rem', color: '#ccc'}}>
                  Скоро здесь будет доступен выбор элитарных аватаров и коллекционных шапок. 
                  Настоящие знатоки готовят свой гардероб заранее!
                </p>
              </div>
            )}

            {activeModal === 'rules' && (
              <div style={{ paddingBottom: '20px' }}>
                <h2>Свод Правил Элитарного Клуба</h2>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button 
                    className={`premium-btn ${rulesTab === 'short' ? '' : 'inactive'}`} 
                    style={{ flex: 1, fontSize: '1rem', padding: '8px', filter: rulesTab === 'short' ? 'none' : 'grayscale(1) opacity(0.6)' }}
                    onClick={() => setRulesTab('short')}
                  >
                    Краткие правила
                  </button>
                  <button 
                    className={`premium-btn ${rulesTab === 'extended' ? '' : 'inactive'}`} 
                    style={{ flex: 1, fontSize: '1rem', padding: '8px', filter: rulesTab === 'extended' ? 'none' : 'grayscale(1) opacity(0.6)' }}
                    onClick={() => setRulesTab('extended')}
                  >
                    Расширенный устав
                  </button>
                </div>

                {rulesTab === 'short' && (
                  <ul className="rules-list">
                    <li>В игре соревнуется команда Знатоков (от 2 до 5 человек) против команды телезрителей.</li>
                    <li>Игра идет до 6 очков.</li>
                    <li>В проекте нет случайного подбора игроков и встроенной голосовой связи. Команда и Крупье собираются заранее в стороннем приложении (например, Discord).</li>
                    <li>Ведущий (Крупье) - фигура беспристрастная. Его задача - следить за соблюдением законов Клуба и наказывать за их нарушение.</li>
                    <li>Знатокам дается ровно 1 минута на обсуждение вопроса.</li>
                    <li><strong>Запрещено</strong> использование интернета, телефонов и любых сторонних источников знаний. Смысл Клуба - меряться интеллектом и эрудицией. Жульничество бессмысленно и карается презрением (а также штрафами от Крупье).</li>
                    <li>Доступны "Палочки-выручалочки" (Минута в кредит, Подсказка Клуба, Подсказка Ведущего), которые можно использовать лишь 1 раз за игру. Запрашивать их может только Капитан.</li>
                  </ul>
                )}

                {rulesTab === 'extended' && (
                  <div style={{ fontSize: '1.05rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                    <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>Введение: Подготовка к игре</h3>
                    <p>Проект представляет собой виртуальный интерфейс для проведения интеллектуальной игры. <strong>Важно:</strong> в игре нет системы случайного поиска оппонентов (матчмейкинга) и нет встроенной голосовой связи. Взаимодействие происходит голосом. Поэтому перед началом игры соберитесь с друзьями в приложении для голосового общения (например, Discord).</p>
                    <p><strong>Как начать игру:</strong></p>
                    <ol style={{ paddingLeft: '20px', marginTop: '10px' }}>
                      <li>Один игрок решает стать Ведущим (Крупье), создает комнату (стол) и получает уникальный 4-значный код.</li>
                      <li>Остальные игроки (Знатоки) входят в лобби и вводят этот 4-значный код, чтобы присоединиться к созданному столу.</li>
                      <li>Все игроки нажимают "Готов", и Крупье начинает игру.</li>
                    </ol>
                    
                    <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>1. Роли: Крупье (Ведущий)</h3>
                    <p>Крупье - это царь и бог за игровым столом. Он не играет за Знатоков и не помогает им. Его задачи:</p>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '10px' }}>
                      <li>Зачитывать вопросы (с интонацией и загадкой).</li>
                      <li>Запускать таймер "Минуты обсуждения".</li>
                      <li>Выслушивать ответ Капитана Знатоков и сверять его с правильным (ответ видит только Крупье).</li>
                      <li>Мануально начислять очко Знатокам (если ответили верно) или Телезрителям (если ошиблись).</li>
                      <li>Раздавать штрафы. Если Крупье слышит стук клавиатуры или подозревает гугление, он имеет право выдать штраф (от урезания времени до удаления игрока).</li>
                    </ul>

                    <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>2. Роли: Знатоки и Капитан</h3>
                    <p>Команда Знатоков состоит из 2-5 человек. Перед началом первой раздачи Знатоки обязаны устно (в Discord) выбрать <strong>Капитана</strong>. Роль Капитана критически важна:</p>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '10px' }}>
                      <li>Только Капитан имеет право сказать: "Отвечать будет [Имя Знатока]" или "Я отвечу сам".</li>
                      <li>Только Капитан имеет право запросить у Крупье любую из подсказок (Палочек-выручалочек).</li>
                      <li>Во время обсуждения все накидывают версии, но финальное слово всегда за Капитаном. Если разные Знатоки кричат разные ответы после окончания минуты, Крупье принимает только тот, который утвердил Капитан.</li>
                    </ul>

                    <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>3. Логика рулетки и выбор вопроса</h3>
                    <p>На игровом столе расположены 15 конвертов с вопросами от телезрителей, а также один особый "зеленый" сектор (Зеро). В начале каждого раунда Крупье запускает рулетку. Наш безупречный алгоритм всегда безошибочно выбирает один из еще не сыгранных секторов, поэтому никаких архаичных "перескоков" стрелки не бывает.</p>
                    <p style={{ marginTop: '10px' }}><strong>Сектор Зеро ("Черный ящик"):</strong> Если рулетка останавливается на нулевом секторе, разыгрывается особый вопрос. В зал под интригующую музыку "выносится" Черный ящик. Задача Знатоков — путем логики и обсуждения за одну минуту точно определить предмет, который в нем находится.</p>
                    
                    <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>4. Ход раунда и минута обсуждения</h3>
                    <p>Крупье зачитывает текст вопроса. Как только он говорит "Время пошло", он запускает таймер. У Знатоков есть ровно 60 секунд. По истечении таймера звучит гонг. С этого момента Знатоки обязаны замолчать. Капитан сразу же называет того, кто будет давать ответ. Задержки и продолжение обсуждения после гонга караются штрафами от Крупье.</p>

                    <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>5. Распределение очков и Финал (5:5)</h3>
                    <p>Игра продолжается до тех пор, пока Знатоки или Телезрители не наберут 6 очков. Если счет доходит до напряженного момента <strong>5:5</strong>, наступает Финальный Раунд. Это игра "на смерть". В этот момент аннулируются все неиспользованные подсказки (Помощь Клуба и Помощь Ведущего). Единственное, что можно использовать - это "Минуту в кредит", если она осталась.</p>
                    
                    <h3 style={{ color: 'var(--accent-gold)', marginTop: '15px' }}>6. Палочки-выручалочки (Подсказки)</h3>
                    <p>Каждая из этих подсказок может быть применена только 1 раз за всю игру. Их запрашивает Капитан у Крупье:</p>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '10px' }}>
                      <li><strong>Минута в кредит</strong>: Дает дополнительные 60 секунд на обсуждение текущего вопроса. Но помните - это кредит! В одном из следующих раундов (когда Крупье посчитает нужным) команда будет обязана ответить на вопрос <i>досрочно</i>, вообще без минуты на обсуждение.</li>
                      <li><strong>Помощь Клуба</strong>: Капитан просит эту подсказку во время основной минуты. Крупье отправляет им текст подсказки на экран и накидывает сверху еще 60 секунд.</li>
                      <li><strong>Помощь Ведущего</strong>: Применяется только <i>после</i> того, как основная минута истекла. Ведущий (Крупье) дает устную наводку (из своего интерфейса), но дополнительного времени не дает - Капитан должен назначить отвечающего и дать ответ моментально.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeModal === 'settings' && (
              <>
                <h2>Настройки</h2>
                <div className="settings-group">
                  <label htmlFor="settings-volume">Громкость (Глобально)</label>
                  <input 
                    id="settings-volume" 
                    name="volume" 
                    aria-label="Громкость глобально"
                    type="range" 
                    min="0" 
                    max="100" 
                    value={volume} 
                    onChange={(e) => setVolume(e.target.value)} 
                  />
                </div>
                <div className="settings-group">
                  <label htmlFor="settings-difficulty">Сложность вопросов</label>
                  <input 
                    id="settings-difficulty" 
                    name="difficulty" 
                    aria-label="Сложность вопросов"
                    type="range" 
                    min="0" 
                    max="100" 
                    value={difficulty} 
                    onChange={handleDifficultyChange} 
                  />
                  <div className="setting-desc">В элитарном клубе соревнуются лучшие умы, торг за сложность неуместен.</div>
                </div>
                <div className="settings-group">
                  <label className="toggle-switch" htmlFor="settings-crt">
                    <input 
                      id="settings-crt" 
                      name="crtEnabled" 
                      aria-label="ЭЛТ-фильтр"
                      type="checkbox" 
                      checked={crtEnabled} 
                      onChange={handleCrtToggle} 
                    />
                    ЭЛТ-фильтр (Эффект старого ТВ)
                  </label>
                </div>
                <div className="settings-group" style={{ opacity: 0.5, pointerEvents: 'none' }}>
                  <label>Качество графики</label>
                  <select className="premium-input" style={{ width: '100%' }} disabled>
                    <option>Ультра / Элитарное</option>
                  </select>
                  <div className="setting-desc">Ухудшение картинки недопустимо, когда на кону стоит визуальный престиж клуба.</div>
                </div>
              </>
            )}

            {activeModal === 'authors' && (
              <>
                <h2>Авторы Проекта</h2>
                <div className="authors-content">
                  <p style={{marginBottom: '30px'}}>Проект создан и разработан творческим дуэтом:</p>
                  <div className="authors-flex">
                    <div className="author-card">
                      <img src="/assets/authors/spalah.png" alt="Yehor Kudin" className="author-avatar" onError={(e) => e.target.src = 'https://via.placeholder.com/150/111/D68B52?text=YK'} />
                      <p><strong>Yehor Kudin</strong></p>
                    </div>
                    <div className="authors-amp">&</div>
                    <div className="author-card">
                      <img 
                        src="/assets/authors/gemini.png" 
                        alt="Gemini 3.1 Pro" 
                        className="author-avatar" 
                        style={{ objectPosition: '47% 50%' }}
                        onError={(e) => e.target.src = 'https://via.placeholder.com/150/111/D68B52?text=G3'} 
                      />
                      <p><strong>Gemini 3.1 Pro</strong></p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '40px' }}>Добро пожаловать в элитарный клуб.</p>
                </div>
              </>
            )}

            {activeModal === 'donate' && (
              <>
                <h2>Донат</h2>
                <p className="donate-text">
                  Полагаете, что звон монет способен смягчить правила Элитарного Клуба?<br/><br/>
                  Оставьте эти иллюзии за дверями. За этим столом истинную ценность имеет лишь острота вашего ума, а не толщина кошелька.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {isLoggedIn && (
        <button 
          className="circle-icon-btn main-menu-exit-btn"
          onClick={() => {
            localStorage.removeItem('chgk_username');
            setIsLoggedIn(false);
            setUsername('');
            setPassword('');
          }}
          title="Выйти из аккаунта"
        >
          <img src="/assets/door-exit.svg" alt="Выйти" />
        </button>
      )}
    </div>
  );
}
