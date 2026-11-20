import { memo, useRef, useState } from 'react';
import type { Api } from '../services/api';
import type { RoomSession, SessionState } from '../features/room/RoomSession';
import { InsertMode, type PlaylistItem } from '../types/contracts';
import { Icon } from './Icon';

export const Playlist = memo(function Playlist({ api, session, state, active }: { api: Api; session: RoomSession; state: SessionState; active: boolean }) {
  const [url, setUrl] = useState(''); const [shuffle, setShuffle] = useState(false);
  const [adding, setAdding] = useState(false); const [shuffling, setShuffling] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null); const [dragOver, setDragOver] = useState<number | null>(null);
  const lastDrop = useRef(-Infinity); const addingLock = useRef(false); const shufflingLock = useRef(false);
  const add = async (insertMode: InsertMode) => {
    if (!url.trim() || addingLock.current) return;
    addingLock.current = true; setAdding(true);
    try { await api.addPlaylist(session.room.hash, { url: url.trim(), shuffle, insertMode }); setUrl(''); }
    catch { session.toast('Não foi possível adicionar o vídeo. Verifique o link e tente novamente.'); }
    finally { addingLock.current = false; setAdding(false); }
  };
  const shuffleNow = async () => {
    if (shufflingLock.current || state.playlist.length <= 1) return;
    shufflingLock.current = true; setShuffling(true);
    try { await api.shuffle(session.room.hash); } catch { session.toast('Não foi possível embaralhar a playlist agora.'); }
    finally { shufflingLock.current = false; setShuffling(false); }
  };
  const resetDrag = () => { setDragged(null); setDragOver(null); };
  const row = (item: PlaylistItem, index: number, current = false) => <div key={item.id} data-playlist-id={item.id} data-index={index}
    className={`playlist-item queue-row ${current ? 'queue-row--current' : ''} ${dragOver === index ? 'drop-target' : ''} ${dragged === item.id ? 'dragging-source' : ''}`}
    onDragOver={event => { event.preventDefault(); if (dragged) setDragOver(index); }}
    onDrop={event => { event.preventDefault(); lastDrop.current = Date.now(); if (dragged) void session.reorder(dragged, index); resetDrag(); }}>
    <button type="button" className="drag-handle" title="Arraste para reordenar" aria-label={`Arrastar ${item.title} para reordenar`} draggable={!state.reordering}
      onDragStart={event => { event.dataTransfer.setData('text/plain', item.id); event.dataTransfer.effectAllowed = 'move'; setDragged(item.id); }} onDragEnd={resetDrag}><Icon name="grip" /></button>
    <button type="button" className="playlist-select" title={item.title} aria-label={`Reproduzir ${item.title}`} aria-current={current ? 'true' : undefined}
      onClick={() => { if (Date.now() - lastDrop.current >= 250) void session.jump(index).catch(session.error); }}>
      <span className="queue-thumbnail"><img src={item.thumbnailUrl} alt="" loading="lazy" width="72" height="48" />{current && <span className="thumbnail-status"><Icon name={state.isPlaying ? 'volume' : 'pause'} /></span>}</span>
      <span className="queue-info"><strong>{item.title}</strong><small>{current ? 'YouTube' : `Vídeo ${index + 1}`} · {item.addedByDisplayName}</small></span>
    </button>
    <div className="queue-row-actions">
      <div className="reorder-actions"><button type="button" className="icon-button" aria-label={`Mover ${item.title} para cima`} title="Mover para cima" disabled={state.reordering || index === 0} onClick={() => { void session.reorder(item.id, index - 1); }}><Icon name="up" /></button><button type="button" className="icon-button" aria-label={`Mover ${item.title} para baixo`} title="Mover para baixo" disabled={state.reordering || index === state.playlist.length - 1} onClick={() => { void session.reorder(item.id, index + 1); }}><Icon name="down" /></button></div>
      <button type="button" className="icon-button queue-remove" aria-label={`Remover ${item.title}`} title="Remover vídeo" onClick={() => { void api.removeVideo(session.room.hash, item.id).catch(session.error); }}><Icon name="close" /></button>
    </div>
  </div>;
  const current = state.playlist[state.currentVideoIndex];
  const following = state.playlist.slice(state.currentVideoIndex + 1);
  return <section className="queue-panel" aria-label="Fila de reprodução">
    <div className="panel-heading"><div><h2>Fila de reprodução</h2><p>Boas escolhas para a sua sessão.</p></div><span className="panel-count" aria-label={`Playlist (${state.playlist.length} vídeos)`}>{state.playlist.length}</span></div>
    {current && <div className="queue-current"><div className="queue-current-label"><Icon name={state.isPlaying ? 'volume' : 'pause'} /><span>{state.isPlaying ? 'REPRODUZINDO AGORA' : 'SELECIONADO AGORA'}</span></div>{row(current, state.currentVideoIndex, true)}</div>}
    <div className="queue-list-heading"><span>A SEGUIR</span><span>{following.length} {following.length === 1 ? 'vídeo' : 'vídeos'}</span></div>
    <div className="queue-scroll" tabIndex={active ? 0 : -1} aria-label="Vídeos da fila">
      {following.map((item, offset) => row(item, state.currentVideoIndex + 1 + offset))}
      {!state.playlist.length ? <div className="panel-empty"><Icon name="queue" /><h3>O próximo play é seu</h3><p>Adicione um link do YouTube para começar a assistir junto.</p></div>
        : !following.length && <div className="queue-end"><Icon name="check" /><span>Você chegou ao fim da fila.</span></div>}
      {state.currentVideoIndex > 0 && <details className="queue-history"><summary>Vídeos anteriores ({state.currentVideoIndex})</summary>{state.playlist.slice(0, state.currentVideoIndex).map((item, index) => row(item, index))}</details>}
    </div>
    {!!state.playlist.length && <div className="queue-management">
      <button className="button button--quiet button--small" onClick={() => { void shuffleNow(); }} disabled={shuffling || state.playlist.length <= 1} title="Embaralhar próximos vídeos"><Icon name="shuffle" />{shuffling ? 'Embaralhando...' : 'Embaralhar'}</button>
      <button className="button button--quiet button--small queue-clear" onClick={() => { void api.clearPlaylist(session.room.hash).catch(session.error); }} title="Limpar playlist"><Icon name="trash" />Limpar</button>
    </div>}
    <form className="queue-add" onSubmit={event => { event.preventDefault(); void add(InsertMode.End); }}>
      <label className="field-label" htmlFor="youtube-url"><Icon name="plus" />Adicionar à fila</label>
      <div className="queue-add-input"><input id="youtube-url" className="text-input" value={url} onChange={event => setUrl(event.target.value)} placeholder="Cole o link do YouTube ou playlist..." aria-label="Link do YouTube ou playlist" disabled={adding} /><button className="button button--primary" disabled={adding} aria-label="+ Fila">{adding ? <span className="spinner" /> : <Icon name="plus" />}<span>{adding ? 'Carregando...' : '+ Fila'}</span></button></div>
      <div className="queue-add-options"><button type="button" className="button button--quiet button--small" title="Adiciona o vídeo logo após o que está tocando" onClick={() => { void add(InsertMode.AfterCurrent); }} disabled={adding}><Icon name="next" />Após atual</button><button type="button" className="button button--quiet button--small" title="Coloca o vídeo para tocar imediatamente" onClick={() => { void add(InsertMode.PlayNow); }} disabled={adding}><Icon name="play" />Ver agora</button></div>
      <button type="button" className={`shuffle-option ${shuffle ? 'is-active' : ''}`} title="Embaralha a ordem dos vídeos ao adicionar uma playlist" onClick={() => setShuffle(!shuffle)} disabled={adding} aria-pressed={shuffle}><Icon name="shuffle" /><span>Shuffle na adição: {shuffle ? 'ON' : 'OFF'}</span><span className="toggle-indicator" /></button>
      {adding && <p className="loading-message" role="status"><span className="spinner" />Buscando vídeo(s) no YouTube, aguarde...</p>}
    </form>
  </section>;
});
