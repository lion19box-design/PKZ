import React, { useState } from 'react';
import { SERVER_URL } from '../socket';
import './DispatchModal.css';

export default function DispatchModal({ 
  isOpen, 
  onClose, 
  category = 'appeal', 
  gameContext = null,
  title = null
}) {
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text: '' }

  if (!isOpen) return null;

  const currentUsername = localStorage.getItem('chgk_username') || 'Анонимный Знаток';
  const modalTitle = title || (category === 'appeal' ? 'Апелляция к Распорядителю' : 'Депеша в Секретариат Клуба');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setStatus({ type: 'error', text: 'Извольте изложить суть казуса или замечания.' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const enrichedContext = {
      ...(gameContext || {}),
      route: window.location.pathname,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      submittedAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`${SERVER_URL}/api/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          contact: contact.trim(),
          category,
          message: message.trim(),
          gameContext: enrichedContext
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось передать депешу в Секретариат.');
      }

      setStatus({ 
        type: 'success', 
        text: 'Ваша депеша принята. Распорядитель Клуба уже уведомлен о произошедшем.' 
      });
      setMessage('');
      setContact('');

      setTimeout(() => {
        setStatus(null);
        onClose();
      }, 1800);
    } catch (err) {
      setStatus({ 
        type: 'error', 
        text: err.message || 'Связь с Секретариатом прервана. Попробуйте снова чуть позже.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dispatch-modal-overlay" onClick={onClose}>
      <div className="dispatch-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="dispatch-modal-header">
          <div className="dispatch-modal-title-wrap">
            <img src="/assets/skarabey.webp" alt="Скарабей" className="dispatch-scarab-icon" />
            <h3 className="dispatch-modal-title">{modalTitle}</h3>
          </div>
          <button 
            type="button" 
            className="dispatch-modal-close-btn" 
            onClick={onClose}
            aria-label="Закрыть"
          >
            &times;
          </button>
        </div>

        <div className="dispatch-modal-desc">
          Господа, если правила Клуба нарушились, волчок повел себя дерзко или механизм дал сбой — 
          изложите суть казуса. Распорядитель Клуба незамедлительно разберет вашу депешу.
        </div>

        {status && (
          <div className={`dispatch-status-alert ${status.type}`}>
            {status.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="dispatch-form-group">
            <label className="dispatch-form-label" htmlFor="dispatch-message">
              Суть казуса или пожелания
            </label>
            <textarea
              id="dispatch-message"
              className="dispatch-textarea"
              rows={4}
              placeholder="Опишите, что именно произошло за игровым столом или в чертогах Клуба..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="dispatch-form-group">
            <label className="dispatch-form-label" htmlFor="dispatch-contact">
              Контакт для ответа (Telegram или почта, по желанию)
            </label>
            <input
              id="dispatch-contact"
              type="text"
              className="dispatch-input"
              placeholder="@znatok или znatok@mail.ru"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {gameContext && (
            <div className="dispatch-context-badge">
              Служебная отметка: параметры текущего стола 
              {gameContext.roomId ? ` (Комната: ${gameContext.roomId}` : ''}
              {gameContext.round ? `, Раунд: ${gameContext.round}` : ''}
              {gameContext.score ? `, Счет: ${gameContext.score}` : ''}
              {gameContext.role ? `, Роль: ${gameContext.role}` : ''}
              {') '} 
              будут переданы автоматически для точного расследования.
            </div>
          )}

          <div className="dispatch-modal-actions">
            <button
              type="button"
              className="dispatch-btn dispatch-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Вернуться к игре
            </button>
            <button
              type="submit"
              className="dispatch-btn dispatch-btn-primary"
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? 'Отправка...' : 'Направить депешу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
