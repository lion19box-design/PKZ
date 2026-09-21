import React, { useState, useEffect } from 'react';
import { SERVER_URL } from '../socket';
import './ChancelleryModal.css';

export default function ChancelleryModal({ isOpen, onClose }) {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'new' | 'reviewed'
  const [expandedContexts, setExpandedContexts] = useState({});

  const loadDispatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/dispatches`);
      if (res.status === 404) {
        throw new Error('Канцелярия Клуба доступна исключительно при локальном запуске.');
      }
      if (!res.ok) {
        throw new Error('Не удалось получить реестр депеш.');
      }
      const data = await res.json();
      setDispatches(data.dispatches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDispatches();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'new' ? 'reviewed' : 'new';
    try {
      const res = await fetch(`${SERVER_URL}/api/dispatches/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error('Ошибка обновления статуса');
      
      setDispatches(prev => prev.map(d => d.id === item.id ? { ...d, status: nextStatus } : d));
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleContext = (id) => {
    setExpandedContexts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredDispatches = dispatches.filter(d => {
    if (filter === 'new') return d.status === 'new';
    if (filter === 'reviewed') return d.status === 'reviewed';
    return true;
  });

  return (
    <div className="chancellery-overlay" onClick={onClose}>
      <div className="chancellery-card" onClick={(e) => e.stopPropagation()}>
        <div className="chancellery-header">
          <div className="chancellery-title-wrap">
            <img src="/assets/skarabey.png" alt="Скарабей" style={{ width: '32px', height: '32px' }} />
            <div>
              <h3 className="chancellery-title">Канцелярия Клуба: Реестр депеш</h3>
              <div className="chancellery-subtitle">Служебный архив обращений, замечаний и казусов (Локальный доступ)</div>
            </div>
          </div>
          <div className="chancellery-header-actions">
            <button 
              type="button" 
              className="chancellery-btn-refresh" 
              onClick={loadDispatches}
              disabled={loading}
            >
              {loading ? 'Обновление...' : 'Обновить'}
            </button>
            <button 
              type="button" 
              className="chancellery-close-btn" 
              onClick={onClose}
              aria-label="Закрыть"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="chancellery-toolbar">
          <button 
            type="button" 
            className={`chancellery-tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Все обращения ({dispatches.length})
          </button>
          <button 
            type="button" 
            className={`chancellery-tab-btn ${filter === 'new' ? 'active' : ''}`}
            onClick={() => setFilter('new')}
          >
            Новые ({dispatches.filter(d => d.status === 'new').length})
          </button>
          <button 
            type="button" 
            className={`chancellery-tab-btn ${filter === 'reviewed' ? 'active' : ''}`}
            onClick={() => setFilter('reviewed')}
          >
            Изученные ({dispatches.filter(d => d.status === 'reviewed').length})
          </button>
        </div>

        <div className="chancellery-body">
          {error && (
            <div style={{ color: '#ffb4b4', background: 'rgba(180,40,40,0.2)', padding: '12px', borderRadius: '4px' }}>
              {error}
            </div>
          )}

          {loading && !error && (
            <div className="chancellery-empty">Секретарь извлекает свитки из архива...</div>
          )}

          {!loading && !error && filteredDispatches.length === 0 && (
            <div className="chancellery-empty">
              В данном разделе депеш не обнаружено.
            </div>
          )}

          {!loading && !error && filteredDispatches.length > 0 && (
            <div className="chancellery-list">
              {filteredDispatches.map(item => {
                let contextObj = null;
                if (item.game_context) {
                  try {
                    contextObj = typeof item.game_context === 'string' 
                      ? JSON.parse(item.game_context) 
                      : item.game_context;
                  } catch (e) {
                    contextObj = item.game_context;
                  }
                }

                const isNew = item.status === 'new';
                const formattedDate = new Date(item.created_at).toLocaleString('ru-RU');

                return (
                  <div key={item.id} className={`dispatch-item-card ${isNew ? 'is-new' : ''}`}>
                    <div className="dispatch-item-top">
                      <div className="dispatch-item-meta">
                        <span className="dispatch-item-author">{item.username || 'Аноним'}</span>
                        <span className="dispatch-item-date">{formattedDate}</span>
                        {item.contact && (
                          <span className="dispatch-item-contact">Связь: {item.contact}</span>
                        )}
                      </div>
                      <span className={`dispatch-status-tag ${isNew ? 'new' : 'reviewed'}`}>
                        {isNew ? 'Новое' : 'Изучено'}
                      </span>
                    </div>

                    <div className="dispatch-item-message">{item.message}</div>

                    {contextObj && (
                      <div className="dispatch-item-context-wrap">
                        <button 
                          type="button" 
                          className="dispatch-context-toggle" 
                          onClick={() => toggleContext(item.id)}
                        >
                          {expandedContexts[item.id] ? 'Скрыть технический контекст' : 'Показать технический контекст стола'}
                        </button>
                        {expandedContexts[item.id] && (
                          <pre className="dispatch-context-pre">
                            {JSON.stringify(contextObj, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}

                    <div className="dispatch-item-footer">
                      <button 
                        type="button" 
                        className="dispatch-action-btn"
                        onClick={() => handleToggleStatus(item)}
                      >
                        {isNew ? 'Отметить как изученное' : 'Вернуть в новые'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
