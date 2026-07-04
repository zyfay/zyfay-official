// components/VoiceNotePlayer.js
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

export default function VoiceNotePlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    function onLoaded() { setDuration(audio.duration || 0); setLoaded(true); }
    function onTime() { setCurrentTime(audio.currentTime); }
    function onEnd() { setPlaying(false); setCurrentTime(0); }
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [src]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(() => {}); setPlaying(true); }
  }

  function seek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  }

  function fmt(t) {
    if (!isFinite(t) || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 w-[190px] max-w-full py-0.5">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-black/15 flex items-center justify-center flex-shrink-0 hover:bg-black/25 transition-colors"
      >
        {playing
          ? <Pause size={13} fill="currentColor" />
          : <Play size={13} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div
          onClick={seek}
          className="h-1 bg-black/15 rounded-full cursor-pointer relative overflow-hidden"
        >
          <div className="h-full bg-current rounded-full opacity-80" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-1 text-[10px] opacity-70">
          <Mic size={9} />
          <span className="tabular-nums">{fmt(currentTime)} / {fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
