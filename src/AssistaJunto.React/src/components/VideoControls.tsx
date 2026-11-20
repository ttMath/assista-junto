import { useEffect, useState, type CSSProperties } from 'react';
import type { RoomSession } from '../features/room/RoomSession';
import { Icon } from './Icon';

export function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const value = Math.floor(seconds); const hours = Math.floor(value / 3600);
  return `${hours ? hours + ':' : ''}${hours ? String(Math.floor(value / 60) % 60).padStart(2, '0') : Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
interface Props {
  session: RoomSession; isPlaying: boolean; ready: boolean; volume: number; muted: boolean;
  cinema: boolean; onCinema: () => void; fullscreen: boolean; onFullscreen: () => void;
}
export function VideoControls({ session, isPlaying, ready, volume, muted, cinema, onCinema, fullscreen, onFullscreen }: Props) {
  const [clock, setClock] = useState({ time: 0, duration: 0 });
  const [scrub, setScrub] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => { const value = session.playback(); setClock(previous => previous.time === value.time && previous.duration === value.duration ? previous : value); };
    tick(); const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [session]);
  const current = scrub ?? clock.time;
  const seek = () => {
    if (scrub === null) return;
    void session.seekTo(scrub).catch(session.error); setScrub(null);
  };
  return <div className="player-controls" aria-label="Controles de reprodução">
    <div className="playback-track"><input type="range" min={0} max={clock.duration || 1} step="0.1" value={Math.min(current, clock.duration || 1)} aria-label="Posição do vídeo" aria-valuetext={`${formatPlaybackTime(current)} de ${clock.duration ? formatPlaybackTime(clock.duration) : 'duração indisponível'}`} disabled={!ready || !clock.duration}
      onChange={event => setScrub(Number(event.target.value))} onPointerUp={seek} onKeyUp={seek} onBlur={seek}
      style={{ '--range-progress': `${clock.duration ? current / clock.duration * 100 : 0}%` } as CSSProperties} /></div>
    <div className="player-controls-row"><div className="transport-controls">
      <button className="icon-button" onClick={() => { void session.previous().catch(session.error); }} title="Anterior" aria-label="Anterior"><Icon name="previous" /></button>
      <button className="play-button" onClick={isPlaying ? session.pause : session.play} title={isPlaying ? 'Pausar' : 'Reproduzir'} aria-label={isPlaying ? 'Pausar' : 'Reproduzir'} disabled={!ready}><Icon name={isPlaying ? 'pause' : 'play'} /></button>
      <button className="icon-button" onClick={() => { void session.next().catch(session.error); }} title="Próximo" aria-label="Próximo"><Icon name="next" /></button>
    </div><div className="volume-controls"><button className="icon-button" onClick={session.toggleMute} title={muted ? 'Ativar som do vídeo' : 'Silenciar vídeo'} aria-label={muted ? 'Ativar som do vídeo' : 'Silenciar vídeo'}><Icon name={muted || !volume ? 'muted' : 'volume'} /></button><input type="range" min="0" max="100" value={volume} onChange={event => session.setVolume(Number(event.target.value))} aria-label="Volume" style={{ '--range-progress': `${volume}%` } as CSSProperties} /><span className="sr-only">{volume}%</span></div>
    <span className="playback-time"><span>{formatPlaybackTime(current)}</span><span className="time-separator">/</span><span>{clock.duration ? formatPlaybackTime(clock.duration) : '—:—'}</span></span>
    <div className="view-controls"><button className={`icon-button ${cinema ? 'is-active' : ''}`} title={cinema ? 'Sair do modo cinema' : 'Modo cinema'} aria-label={cinema ? 'Sair do modo cinema' : 'Modo cinema'} aria-pressed={cinema} onClick={onCinema}><Icon name="cinema" /></button><button className="icon-button" title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'} aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'} onClick={onFullscreen}><Icon name={fullscreen ? 'collapse' : 'expand'} /></button></div>
    </div>
  </div>;
}
