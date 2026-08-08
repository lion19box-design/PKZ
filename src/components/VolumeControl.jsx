import React, { useState } from 'react';

export default function VolumeControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [volume, setVolume] = useState(50); // 0 to 100

  const handleVolumeChange = (e) => {
    const newVol = e.target.value;
    setVolume(newVol);
    // Dispatch custom event for GlobalAudio to pick up
    window.dispatchEvent(new CustomEvent('chgk-volume-change', { detail: newVol / 100 }));
  };

  return (
    <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 100 }}>
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '60px',
          left: '0',
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
