import { useRef } from 'react';

// Один Audio на весь жизненный цикл компонента. В отличие от useRef(new Audio(src)),
// не создает новый объект на каждом рендере, а preload="none" не дает браузеру
// скачивать мегабайты музыки, пока она не понадобится.
export function useAudio(src) {
  const ref = useRef(null);
  if (ref.current === null) {
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = src;
    ref.current = audio;
  }
  return ref;
}
