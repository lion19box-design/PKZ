import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isRoomCode, savePendingInvite } from '../utils/invite';

// /stol/1234 — запоминаем код стола и ведем гостя через вход в Зал Ожидания,
// где Lobby сам подставит код и постучится за стол
export default function InviteRedirect() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (isRoomCode(roomId)) savePendingInvite(roomId);
    const isLoggedIn = Boolean(localStorage.getItem('chgk_username'));
    navigate(isLoggedIn && isRoomCode(roomId) ? '/lobby' : '/', { replace: true });
  }, [roomId, navigate]);

  return null;
}
