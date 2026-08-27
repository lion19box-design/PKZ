import React, { useState } from 'react';

export default function VolumeControl({ style, align = 'left' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('chgk_volume');
    return saved !== null ? Number(saved) : 50;
  });

  const handleVolumeChange = (e) => {
    const newVol = e.target.value;
    setVolume(newVol);
    localStorage.setItem('chgk_volume', newVol);
    // Dispatch custom event for GlobalAudio to pick up
    window.dispatchEvent(new CustomEvent('chgk-volume-change', { detail: newVol / 100 }));
  };

  return (
    <div style={{ position: 'relative', zIndex: 100, ...style }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="circle-icon-btn"
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1) rotate(45deg)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
        title="Настройки звука"
      >
        <img src="/assets/settings-wheel.svg" alt="Settings" style={{ width: '22px', height: '22px' }} />
      </button>

      {isOpen && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 998 }} 
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            bottom: '50px',
            ...(align === 'right' ? { right: '0' } : { left: '0' }),
            background: 'rgba(15, 15, 20, 0.95)',
            border: '1px solid var(--accent-gold)',
            borderRadius: '10px',
            padding: '12px 15px',
            width: '180px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            zIndex: 999
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-gold)', textAlign: 'center', fontSize: '0.9rem' }}>Громкость</h4>
            <input 
              id="volume-flyout-slider"
              name="volume"
              aria-label="Регулировка громкости"
              type="range" 
              min="0" 
              max="100" 
              value={volume} 
              onChange={handleVolumeChange} 
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
