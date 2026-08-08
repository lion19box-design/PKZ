import React, { useEffect, useState } from 'react';
import './GameStyles.css';

// 13 секторов
const NUM_SECTORS = 13;

export default function Roulette({ spinning, targetSector, playedSectors = [], onSectorSelected, isHost }) {
  const [actualAngle, setActualAngle] = useState(0);

  useEffect(() => {
    if (targetSector !== null) {
      // Когда мы получаем targetSector, мы добавляем дополнительные обороты (например, 5 оборотов = 1800 градусов)
      const baseAngle = (targetSector * 360) / NUM_SECTORS;
      const extraSpins = 360 * 5; // 5 полных оборотов
      setActualAngle(prev => prev + extraSpins + (baseAngle - (prev % 360)));
      
      // Через 7 секунд анимации сообщаем хосту, что стрелка остановилась (совпадает со звуком)
      if (isHost && onSectorSelected) {
        const timer = setTimeout(() => {
          onSectorSelected(targetSector);
        }, 7000); // 7s matches CSS transition
        return () => clearTimeout(timer);
      }
    }
  }, [targetSector, isHost, onSectorSelected]);

  // Для расстановки конвертов по кругу
  const renderSectors = () => {
    const sectors = [];
    for (let i = 0; i < NUM_SECTORS; i++) {
      const angle = (i * 360) / NUM_SECTORS;
      const isPlayed = playedSectors.includes(i);
      sectors.push(
        <div 
          key={i} 
          className={`sector ${isPlayed ? 'played' : ''}`}
          style={{ transform: `rotate(${angle}deg) translateY(-220px)` }}
        >
          {i + 1}
        </div>
      );
    }
    return sectors;
  };

  return (
    <div className="main-stage">
      <div className="roulette-table">
        {renderSectors()}
        
        {/* Волчок (стрелка) */}
        <div 
          className="roulette-center"
          style={{ 
            transition: spinning ? 'none' : 'transform 7s cubic-bezier(0.25, 0.1, 0.25, 1)',
            transform: spinning ? 'rotate(0deg)' : `rotate(${actualAngle}deg)`,
            animation: spinning ? 'spin 1s linear infinite' : 'none'
          }}
        >
          {/* Указатель (носик волчка) */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, 
            height: 0, 
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: '20px solid var(--accent-gold)'
          }}></div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
