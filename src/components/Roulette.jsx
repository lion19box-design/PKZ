import React, { useEffect, useState } from 'react';
import './GameStyles.css';

// 16 секторов
const NUM_SECTORS = 16;
// Расстояние от центра для конвертов (чтобы подогнать под нужный радиус на картинке)
const ENVELOPE_RADIUS = 219; // Можно менять это значение!

// Массив углов (в градусах) для каждого из 16 секторов. 
// Заполнен примерными значениями (360 / 16), но теперь их можно 
// вручную подкорректировать (плюс-минус пара градусов), чтобы они идеально 
// совпадали с нарисованными секторами на несимметричной рулетке.
const SECTOR_ANGLES = [
  0,      // Сектор 1 (верхний)
  22.3,   // Сектор 2
  44.2,   // Сектор 3
  66.3,   // Сектор 4
  88.8,  // Сектор 5
  111.8,  // Сектор 6
  135.0,  // Сектор 7
  157.8,  // Сектор 8
  181.2,  // Сектор 9
  204.0,  // Сектор 10
  225.8,  // Сектор 11
  248.5,  // Сектор 12
  271.0,  // Сектор 13
  293.5,  // Сектор 14
  316.0,  // Сектор 15
  338.5   // Сектор 16
];

export default function Roulette({ targetSector, playedSectors = [], onSectorSelected, isHost, onSpinStart, onSpinEnd }) {
  const [actualAngle, setActualAngle] = useState(0);
  const lastTargetRef = React.useRef(null);
  const onSectorSelectedRef = React.useRef(onSectorSelected);
  const onSpinStartRef = React.useRef(onSpinStart);
  const onSpinEndRef = React.useRef(onSpinEnd);

  useEffect(() => {
    onSectorSelectedRef.current = onSectorSelected;
    onSpinStartRef.current = onSpinStart;
    onSpinEndRef.current = onSpinEnd;
  }, [onSectorSelected, onSpinStart, onSpinEnd]);

  useEffect(() => {
    if (targetSector !== null && targetSector !== lastTargetRef.current) {
      lastTargetRef.current = targetSector;
      // Берем точный угол сектора из массива вместо равномерного деления
      const baseAngle = SECTOR_ANGLES[targetSector] || 0;
      const extraSpins = 360 * 5; // 5 полных оборотов
      setActualAngle(prev => prev + extraSpins + (baseAngle - (prev % 360)));
      
      if (onSpinStartRef.current) onSpinStartRef.current();
      
      // Через 7 секунд анимации сообщаем хосту, что стрелка остановилась (совпадает со звуком)
      const timer = setTimeout(() => {
        if (onSpinEndRef.current) onSpinEndRef.current();
        if (isHost && onSectorSelectedRef.current) {
          onSectorSelectedRef.current(targetSector);
        }
      }, 7000); // 7s matches CSS transition
      return () => clearTimeout(timer);
    }
  }, [targetSector, isHost]);

  // Для расстановки конвертов по кругу
  const renderSectors = () => {
    const sectors = [];
    for (let i = 0; i < NUM_SECTORS; i++) {
      const angle = SECTOR_ANGLES[i] || 0;
      const isPlayed = playedSectors.includes(i);
      const isBlackBoxSector = (i === 0);
      sectors.push(
        <div 
          key={i} 
          className={`sector ${isPlayed ? 'played' : ''} ${isBlackBoxSector ? 'black-box-sector' : ''}`}
          style={{ transform: `rotate(${angle}deg) translateY(-${ENVELOPE_RADIUS}px)` }}
        >
          <img 
            src={isPlayed ? "/assets/envelope-opened.svg" : "/assets/envelope-closed.svg"} 
            alt={`Сектор ${i}`} 
            style={{ 
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain',
              filter: isBlackBoxSector && !isPlayed ? 'drop-shadow(0 0 6px #4caf50)' : 'none'
            }} 
          />
          <span style={{ 
            position: 'relative', zIndex: 3, 
            fontSize: isBlackBoxSector ? '1.4rem' : '1.5rem', 
            fontFamily: 'Arial, sans-serif',
            color: isPlayed ? 'rgba(0,0,0,0.5)' : (isBlackBoxSector ? '#ffffff' : '#111'),
            textShadow: isBlackBoxSector ? '1px 1px 3px rgba(0,0,0,0.8)' : '0px 0px 1px rgba(0,0,0,0.3)',
            fontWeight: '900',
            display: 'inline-block'
          }}>{isBlackBoxSector ? 'ЧЯ' : i}</span>
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
            transition: 'transform 7s cubic-bezier(0.25, 0.1, 0.25, 1)',
            transform: `rotate(${actualAngle}deg)`,
            animation: 'none'
          }}
        >
          <img src="/assets/arrow-with-hippo.png" alt="Стрелка" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
