import React from 'react';
import { useEliteNotification } from './EliteNotification';
import { shareOrCopy } from '../utils/invite';

const SITE_URL = 'https://www.pochemu-kuda-zachem.club/';

const resultText = ({ experts, viewers }) => {
  if (experts === 6) return `Знатоки обыграли телезрителей со счётом ${experts}:${viewers} в Элитарном Клубе «Почему? Куда? Зачем?». Кто следующий за столом?`;
  if (viewers === 6) return `Телезрители оказались сильнее — ${experts}:${viewers}. Элитарный Клуб «Почему? Куда? Зачем?» ждёт реванша!`;
  return `Партия в Элитарном Клубе «Почему? Куда? Зачем?» завершена со счётом ${experts}:${viewers}.`;
};

// Блок «Поделиться результатом» на экране окончания игры
export default function ShareResult({ score }) {
  const { showAlert } = useEliteNotification();

  const handleShare = async () => {
    const result = await shareOrCopy({ title: 'Почему? Куда? Зачем?', text: resultText(score), url: SITE_URL });
    if (result === 'copied') showAlert('Результат скопирован — осталось вставить его в чат с друзьями.', 'Хроника Клуба');
    if (result === 'failed') showAlert('Не удалось скопировать результат. Попробуйте ещё раз.', 'Хроника Клуба');
  };

  return (
    <div style={{ margin: '0 0 22px', padding: '14px', border: '1px solid var(--accent-gold)', borderRadius: 'var(--border-radius)', background: 'rgba(212, 175, 55, 0.06)' }}>
      <p style={{ margin: '0 0 10px', fontFamily: 'var(--font-question)', color: 'var(--text-main)', lineHeight: 1.45 }}>
        {resultText(score)}
      </p>
      <button className="premium-btn" style={{ fontSize: '0.95rem', padding: '8px 18px' }} onClick={handleShare}>
        Поделиться результатом
      </button>
    </div>
  );
}
