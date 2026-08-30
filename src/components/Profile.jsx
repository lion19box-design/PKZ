import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../socket';
import './Profile.css';
import { getHatStyle } from '../utils/hatConfig';

const AWARDS_CONFIG = {
  1: {
    title: 'Орден Хрустальной Совы',
    desc: 'За первую победу в элитарном клубе.',
    ceremonyImg: '/assets/awards/crystal-owl-awards-ceremony.png',
    iconImg: '/assets/awards/orden-crystal-owl-2d-asset.png',
  },
  3: {
    title: 'Хрустальная Сова',
    desc: 'За 3 победы.',
    ceremonyImg: '/assets/awards/crystal-owl-figurine-ceremony.png',
    iconImg: '/assets/awards/crystal-owl-2d-asset.png',
  },
  5: {
    title: 'Орден Бриллиантовой Совы',
    desc: 'За 5 побед.',
    ceremonyImg: '/assets/awards/diamond-owl-awards-ceremony.png',
    iconImg: '/assets/awards/orden-diamond-owl-2d-asset.png',
  },
  10: {
    title: 'Бриллиантовая Сова',
    desc: 'За 10 побед. Выдающееся достижение.',
    ceremonyImg: '/assets/awards/diamond-owl-figurine-ceremony.png',
    iconImg: '/assets/awards/diamond-owl-2d-asset.png',
  }
};

const AVAILABLE_AVATARS = [
  'avatar_businesswoman.jpg', 'avatar_coach.jpg', 'avatar_cop.jpg',
  'avatar_hacker.jpg', 'avatar_healer.jpg', 'avatar_hero.jpg',
  'avatar_intergirl.jpg', 'avatar_katala.jpg', 'avatar_kommers.jpg',
  'avatar_new_russian.jpg', 'avatar_politician.jpg', 'avatar_professor.jpg',
  'avatar_punk.jpg', 'avatar_roker.jpg', 'avatar_schemer.jpg',
  'avatar_showman.jpg', 'avatar_socialite.jpg', 'avatar_thug.jpg',
  'avatar_veteran.jpg', 'avatar_videosalon.jpg'
];
const AVAILABLE_HATS = Array.from({length: 27}, (_, i) => `hat_${i+1}.png`).filter(h => h !== 'hat_4.png' && h !== 'hat_23.png');


export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fitting'); // 'fitting', 'achievements'
  
  const [currentAwardObj, setCurrentAwardObj] = useState(null);
  
  const audioRef = useRef(new Audio("/assets/audio/elitist-music/Le Cercle de l'Elite.mp3"));
  const awardAudioRef = useRef(new Audio("/assets/audio/sound-effects/awarding-of-the-prize.mp3"));
  
  const navigate = useNavigate();
  const username = localStorage.getItem('chgk_username');

  useEffect(() => {
    const isGuest = localStorage.getItem('chgk_is_guest') === 'true';
    if (!username || isGuest) {
      navigate('/');
      return;
    }
    
    const savedVol = localStorage.getItem('chgk_volume');
    const initVol = savedVol !== null ? Number(savedVol) / 100 : 0.5;
    
    audioRef.current.loop = true;
    audioRef.current.volume = initVol;
    awardAudioRef.current.volume = initVol;
    
    const handleVolumeChange = (e) => {
        audioRef.current.volume = e.detail;
        awardAudioRef.current.volume = e.detail;
    };
    window.addEventListener('chgk-volume-change', handleVolumeChange);

    // Пытаемся включить музыку при маунте
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        if (error.name !== 'AbortError') {
          console.log("Audio autoplay prevented", error);
        }
      });
    }

    fetchProfile();

    return () => {
      audioRef.current.pause();
      awardAudioRef.current.pause();
      window.removeEventListener('chgk-volume-change', handleVolumeChange);
    };
  }, [username, navigate]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/profile/${username}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        checkPendingAwards(data.profile.pending_awards);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkPendingAwards = (pending) => {
    if (pending && pending.length > 0) {
      // Показываем первую награду в очереди
      const awardId = pending[0];
      setCurrentAwardObj({ id: awardId, ...AWARDS_CONFIG[awardId] });
      
      // Приглушаем фоновую и играем торжественную
      const savedVol = localStorage.getItem('chgk_volume');
      const baseVol = savedVol !== null ? Number(savedVol) / 100 : 0.5;
      
      audioRef.current.volume = baseVol * 0.2;
      awardAudioRef.current.currentTime = 0;
      awardAudioRef.current.play().catch(e => console.log('Audio error:', e));
    } else {
      setCurrentAwardObj(null);
      const savedVol = localStorage.getItem('chgk_volume');
      const baseVol = savedVol !== null ? Number(savedVol) / 100 : 0.5;
      audioRef.current.volume = baseVol;
    }
  };

  const claimAward = async () => {
    if (!currentAwardObj) return;
    
    try {
      const res = await fetch(`${SERVER_URL}/api/profile/claim-award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, awardId: currentAwardObj.id })
      });
      const data = await res.json();
      if (data.success) {
        setProfile(prev => ({ ...prev, unlocked_owls: data.unlocked, pending_awards: data.pending }));
        checkPendingAwards(data.pending);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEquip = async (type, itemId) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/profile/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, type, itemId })
      });
      if (res.ok) {
        setProfile(prev => ({
          ...prev,
          [type === 'avatar' ? 'active_avatar' : 'active_hat']: itemId
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !profile) {
    return <div className="profile-container"><div className="glass-panel">Загрузка...</div></div>;
  }

  return (
    <div className="profile-container">
      {currentAwardObj && (
        <div className="award-modal-overlay">
          <div className="award-modal-content">
            <h2 className="award-title">Церемония Вручения</h2>
            <img src={currentAwardObj.ceremonyImg} alt="Вручение" className="award-ceremony-img" />
            <h3 className="award-name">{currentAwardObj.title}</h3>
            <p className="award-desc">Уважаемый господин {username}, решением Совета Старейшин клуба Вы награждаетесь за Ваши выдающиеся интеллектуальные заслуги. {currentAwardObj.desc}</p>
            <button className="premium-btn" onClick={claimAward}>Принять награду с честью</button>
          </div>
        </div>
      )}

      <div className="glass-panel profile-panel">
        <div className="profile-header">
          <h2>Профиль: <span className="highlight-gold">{username}</span></h2>
          <button className="icon-btn back-btn" onClick={() => navigate('/')}>← В Меню</button>
        </div>

        <div className="profile-tabs">
          <button className={`tab-btn ${activeTab === 'fitting' ? 'active' : ''}`} onClick={() => setActiveTab('fitting')}>Примерочная</button>
          <button className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`} onClick={() => setActiveTab('achievements')}>Достижения</button>
        </div>

        {activeTab === 'fitting' && (
          <div className="fitting-room">
            <div className="avatar-preview-section">
               <div className="avatar-preview">
                 {/* Аватар */}
                 <div className="avatar-circle" style={{ backgroundImage: `url("/assets/avatars/${profile.active_avatar || 'avatar_businesswoman.jpg'}")` }}></div>
                 {/* Наложенная шапка */}
                 {profile.active_hat && (
                   <img key={profile.active_hat} className="hat-overlay" src={`/assets/hats/${profile.active_hat}`} alt="hat" style={getHatStyle(profile.active_hat)} />
                 )}
               </div>
            </div>

            <div className="inventory-section">
               <h3>Аватары</h3>
               <div className="items-grid">
                 {AVAILABLE_AVATARS.map(avatar => (
                   <div 
                     key={avatar} 
                     className={`inventory-item ${profile.active_avatar === avatar ? 'equipped' : ''}`}
                     onClick={() => handleEquip('avatar', avatar)}
                   >
                     <img src={`/assets/avatars/${avatar}`} alt="avatar" />
                   </div>
                 ))}
               </div>

               <h3>Шапки</h3>
               <div className="items-grid">
                 <div 
                   className={`inventory-item ${!profile.active_hat ? 'equipped' : ''}`}
                   onClick={() => handleEquip('hat', null)}
                 >
                   <div className="no-hat">Без шапки</div>
                 </div>
                 {AVAILABLE_HATS.map(hat => (
                   <div 
                     key={hat} 
                     className={`inventory-item ${profile.active_hat === hat ? 'equipped' : ''}`}
                     onClick={() => handleEquip('hat', hat)}
                   >
                     <img src={`/assets/hats/${hat}`} alt="hat" />
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="achievements-room">
            <div className="stats-panel">
              <div className="stat-box">Сыграно: <span>{profile.games_played}</span></div>
              <div className="stat-box">Побед: <span className="highlight-gold">{profile.wins}</span></div>
              <div className="stat-box">Поражений: <span>{profile.losses}</span></div>
              <div className="stat-box">Штрафов: <span>{profile.penalties}</span></div>
            </div>

            <h3 className="awards-title">Зал Славы</h3>
            <div className="awards-grid">
              {[1, 3, 5, 10].map(tier => {
                const isUnlocked = profile.unlocked_owls.includes(tier);
                const conf = AWARDS_CONFIG[tier];
                return (
                  <div key={tier} className={`award-item ${isUnlocked ? 'unlocked' : 'locked'}`} title={conf.title + ' - ' + conf.desc}>
                    <img src={conf.iconImg} alt={conf.title} />
                    <p>{conf.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
