export const HAT_CONFIG = {
  // Базовая конфигурация для обычных шапок (уменьшена, чтобы не закрывать лицо)
  default: { width: '55%', top: '-13%', left: '22.5%' },
  
  // 1: Цилиндр (высокий, узкий)
  'hat_1.png': { width: '50%', top: '-19%', left: '25%' },
  // 2: Кепка Шерлока (Deerstalker)
  'hat_2.png': { width: '60%', top: '-13%', left: '20%' },
  // 3: Треуголка
  'hat_3.png': { width: '70%', top: '-10%', left: '15%' },
  // 5: Синий берет
  'hat_5.png': { width: '60%', top: '-8%', left: '20%' },
  // 6: Кубанка
  'hat_6.png': { width: '55%', top: '-17%', left: '20%' },
  // 7: Пробковый шлем
  'hat_7.png': { width: '60%', top: '-13%', left: '20%' },
  // 8: Черная фуражка
  'hat_8.png': { width: '55%', top: '-7%', left: '22.5%' },
  // 9: Ковбойская шляпа
  'hat_9.png': { width: '70%', top: '-18%', left: '15%' },
  // 10: Канотье (соломенная шляпа)
  'hat_10.png': { width: '60%', top: '-13%', left: '20%' },
  // 11: Кепка Шерлока 2
  'hat_11.png': { width: '60%', top: '-13%', left: '20%' },
  // 12: Феска (высокая, узкая)
  'hat_12.png': { width: '40%', top: '-12%', left: '30%' },
  // 13: Серая ушанка
  'hat_13.png': { width: '45%', top: '-11%', left: '27.5%' },
  // 14: Азиатская коническая шляпа
  'hat_14.png': { width: '75%', top: '-14%', left: '12.5%' },
  // 15: Зеленая тирольская шляпа
  'hat_15.png': { width: '55%', top: '-12%', left: '22.5%' },
  // 16: Треуголка 2
  'hat_16.png': { width: '70%', top: '-10%', left: '15%' },
  // 17: Котелок
  'hat_17.png': { width: '55%', top: '-13%', left: '22.5%' },
  // 18: Серая федора
  'hat_18.png': { width: '60%', top: '-18%', left: '20%' },
  // 19: Белая федора
  'hat_19.png': { width: '60%', top: '-18%', left: '20%' },
  // 20: Шапочка магистра (квадратная)
  'hat_20.png': { width: '75%', top: '-13%', left: '12.5%' },
  // 21: Ортодоксальная шляпа с пейсами
  'hat_21.png': { width: '70%', top: '-12%', left: '15%' },
  // 22: Белая капитанская фуражка
  'hat_22.png': { width: '60%', top: '-15%', left: '20%' },
  // 24: Зеленая шляпа
  'hat_24.png': { width: '60%', top: '-10%', left: '20%' },
  // 25: Казахский колпак
  'hat_25.png': { width: '45%', top: '-12%', left: '27.5%' },
  // 26: Тюбетейка
  'hat_26.png': { width: '50%', top: '-8%', left: '25%' },
  // 27: Тюрбан (чалма)
  'hat_27.png': { width: '65%', top: '-7%', left: '17.5%' }
};

export const getHatStyle = (hatName) => {
  if (!hatName) return {};
  
  const config = HAT_CONFIG[hatName] || HAT_CONFIG.default;
  
  return {
    position: 'absolute',
    width: config.width,
    top: config.top,
    left: config.left,
    transform: config.transform || 'none',
    pointerEvents: 'none',
    zIndex: 2,
    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))'
  };
};
