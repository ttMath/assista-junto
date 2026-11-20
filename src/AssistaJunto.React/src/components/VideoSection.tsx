import { memo, useEffect, useRef, useState } from 'react';
import type { RoomSession } from '../features/room/RoomSession';
import type { PlaylistItem } from '../types/contracts';
import type { ConnectionStatus as Status } from '../services/realtime';
import { YouTubePlayer } from '../features/player/YouTubePlayer';
import { VideoControls } from './VideoControls';
import { ConnectionStatus } from './ConnectionStatus';
import { Icon } from './Icon';

const Player = memo(function Player({ session }: { session: RoomSession }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = document.createElement('div'); element.id = 'yt-player'; host.current?.append(element);
    const player = new YouTubePlayer(element, { ready: session.ready, state: session.onPlayerState, seek: session.onPlayerSeek, error: session.toast });
    session.attachPlayer(player);
    return () => { player.destroy(); element.remove(); };
  }, [session]);
  return <div className="video-embed" ref={host} />;
});

interface Props {
  session: RoomSession; current?: PlaylistItem; isPlaying: boolean; connection: Status; ready: boolean;
  volume: number; muted: boolean; cinema: boolean; onCinema: () => void; onAddVideo: () => void;
}
export const VideoSection = memo(function VideoSection({ session, current, isPlaying, connection, ready, volume, muted, cinema, onCinema, onAddVideo }: Props) {
  const frame = useRef<HTMLDivElement>(null); const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (frame.current?.requestFullscreen) await frame.current.requestFullscreen();
      else session.toast('Use o controle de tela cheia do player neste navegador.');
    } catch { session.toast('Não foi possível abrir a tela cheia. Use o controle do player.'); }
  };
  return <section className="video-section" aria-label="Reprodução da sala">
    <div className="room-intro"><p className="eyebrow">SALA ATIVA</p><h1>{session.room.name}<span className="title-spark" aria-hidden="true">✦</span></h1><p className="room-subtitle">Uma sala para compartilhar histórias, reações e bons momentos.</p></div>
    <div className="video-frame" ref={frame}>
      <div className="video-stage"><Player session={session} />
        {!current && <div className="video-empty"><span className="empty-projector"><Icon name="film" /></span><h2>Sua sessão começa aqui</h2><p>Um vídeo, boas companhias e o mesmo momento.</p><button className="button button--primary" onClick={onAddVideo}><Icon name="plus" />Adicionar o primeiro vídeo</button></div>}
        {current && !ready && <div className="video-loading" role="status"><span className="spinner" />Preparando seu vídeo...</div>}
      </div>
      <VideoControls session={session} isPlaying={isPlaying} ready={ready} volume={volume} muted={muted} cinema={cinema} onCinema={onCinema} fullscreen={fullscreen} onFullscreen={() => { void toggleFullscreen(); }} />
    </div>
    <div className="video-information"><div className="video-caption"><span className="section-kicker">{current ? isPlaying ? 'REPRODUZINDO AGORA' : 'PRONTO PARA O PLAY' : 'SUA PRÓXIMA HISTÓRIA'}{current && <span className="provider-label">YouTube</span>}</span><h2>{current?.title ?? 'Escolha um vídeo para assistir junto'}</h2>{current && <p>Adicionado por <strong>{current.addedByDisplayName}</strong></p>}</div><ConnectionStatus status={connection} /></div>
    {cinema && <p className="cinema-hint">Seu chat e sua fila continuam conectados. <button onClick={onCinema}>Mostrar painel</button><span>Esc para sair do modo cinema.</span></p>}
  </section>;
});
