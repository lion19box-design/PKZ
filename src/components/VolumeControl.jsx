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
    <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 100, ...style }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid var(--accent-gold)',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'all 0.3s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1) rotate(45deg)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
      >
        <img src="/assets/settings-wheel.svg" alt="Settings" style={{ width: '24px', height: '24px' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '60px',
          ...(align === 'right' ? { right: '0' } : { left: '0' }),
          background: 'rgba(0,0,0,0.8)',
          border: '1px solid var(--accent-gold)',
          borderRadius: '10px',
          padding: '15px',
          width: '200px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent-gold)', textAlign: 'center' }}>Громкость</h4>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={handleVolumeChange} 
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
      )}
    </div>
  );
}
