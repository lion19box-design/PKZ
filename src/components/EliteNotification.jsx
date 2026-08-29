import React, { createContext, useContext, useState } from 'react';
import './EliteNotification.css';

const EliteNotificationContext = createContext();

export const useEliteNotification = () => useContext(EliteNotificationContext);

export const EliteNotificationProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert', // 'alert' | 'confirm'
    title: 'Внимание',
    message: '',
    confirmText: 'Понятно',
    cancelText: 'Нет',
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = (message, title = 'Внимание', confirmText = 'Понятно') => {
    setModalState({
      isOpen: true,
      type: 'alert',
      title: title || 'Внимание',
      message,
      confirmText: confirmText || 'Понятно',
      cancelText: 'Нет',
      onConfirm: null,
      onCancel: null,
    });
  };

  const showConfirm = (message, onConfirm, onCancel, title = 'Внимание', confirmText = 'Да', cancelText = 'Нет') => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: title || 'Внимание',
      message,
      confirmText: confirmText || 'Да',
      cancelText: cancelText || 'Нет',
      onConfirm,
      onCancel,
    });
  };

  const handleClose = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (modalState.type === 'confirm' && modalState.onCancel) {
      modalState.onCancel();
    }
  };

  const handleConfirm = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (modalState.onConfirm) {
      modalState.onConfirm();
    }
  };

  return (
    <EliteNotificationContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modalState.isOpen && (
        <div className="elite-modal-overlay" onClick={handleClose}>
          <div className="elite-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="elite-modal-title">{modalState.title || 'Внимание'}</h3>
            <p className="elite-modal-message">{modalState.message}</p>
            <div className="elite-modal-actions">
              <button className="premium-btn elite-modal-btn confirm" onClick={handleConfirm}>
                {modalState.confirmText || (modalState.type === 'confirm' ? 'Да' : 'Понятно')}
              </button>
              {modalState.type === 'confirm' && (
                <button className="premium-btn elite-modal-btn cancel" onClick={handleClose}>
                  {modalState.cancelText || 'Нет'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </EliteNotificationContext.Provider>
  );
};
