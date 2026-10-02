// Ссылки-приглашения за стол (/stol/1234) и общий «поделиться»

const INVITE_KEY = 'chgk_pending_invite';

export const isRoomCode = (code) => /^\d{4}$/.test(String(code || ''));

export const inviteUrl = (roomId) => `${window.location.origin}/stol/${roomId}`;

// Код стола из ссылки-приглашения живет до входа за стол (или до закрытия вкладки)
export const savePendingInvite = (code) => {
  try { sessionStorage.setItem(INVITE_KEY, code); } catch { /* хранилище недоступно */ }
};

export const peekPendingInvite = () => {
  try {
    const code = sessionStorage.getItem(INVITE_KEY);
    return isRoomCode(code) ? code : null;
  } catch {
    return null;
  }
};

export const clearPendingInvite = () => {
  try { sessionStorage.removeItem(INVITE_KEY); } catch { /* хранилище недоступно */ }
};

// Системное меню «Поделиться» на телефонах, копирование в буфер на компьютерах.
// Возвращает 'shared' | 'copied' | 'cancelled' | 'failed'.
export async function shareOrCopy({ title, text, url }) {
  const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
  if (navigator.share && isTouch) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(text ? `${text}\n${url}` : url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
