import { useRef, useState } from 'react';
import { Api } from '../services/api';
import type { RoomSession, SessionState } from '../features/room/RoomSession';
import { InsertMode } from '../types/contracts';

export function Playlist({ api, session, state }: { api: Api; session: RoomSession; state: SessionState }) {
  const [url, setUrl] = useState(''); const [shuffle, setShuffle] = useState(false);
  const [adding, setAdding] = useState(false); const [shuffling, setShuffling] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null); const [dragOver, setDragOver] = useState<number | null>(null);
  const lastDrop = useRef(-Infinity); const addingLock = useRef(false);
  const add = async (insertMode: InsertMode) => {
    if (!url.trim() || addingLock.current) return;
    addingLock.current = true; setAdding(true);
    try { await api.addPlaylist(session.room.hash, { url: url.trim(), shuffle, insertMode }); setUrl(''); }
    catch { session.toast('Não foi possível adicionar o vídeo. Verifique o link e tente novamente.'); }
    finally { addingLock.current = false; setAdding(false); }
  };
  const shuffleNow = async () => {
    if (shuffling || state.playlist.length <= 1) return;
    setShuffling(true);
    try { await api.shuffle(session.room.hash); } catch { session.toast('Não foi possível embaralhar a playlist agora.'); }
    finally { setShuffling(false); }
  };
  return <>
    <div className="side-panel add-video-panel"><div className="input-group">
      <input className="form-control add-video-input" value={url} onChange={event => setUrl(event.target.value)} placeholder="Cole o link do YouTube ou playlist..." aria-label="Link do YouTube ou playlist" disabled={adding} />
      <button className="btn btn-primary add-video-button" onClick={() => { void add(InsertMode.End); }} disabled={adding}>{adding ? <><span className="spinner-border spinner-border-sm me-1" />Carregando...</> : '+ Fila'}</button>
    </div><div className="add-video-actions mt-2">
      <button className="btn btn-sm btn-outline-info add-action-btn" title="Adiciona o vídeo logo após o que está tocando" onClick={() => { void add(InsertMode.AfterCurrent); }} disabled={adding}><i className="bi bi-skip-forward me-1" />Após atual</button>
      <button className="btn btn-sm btn-outline-warning add-action-btn" title="Coloca o vídeo para tocar imediatamente" onClick={() => { void add(InsertMode.PlayNow); }} disabled={adding}><i className="bi bi-play-circle me-1" />Ver agora</button>
      <button className={`btn btn-sm add-shuffle-toggle ${shuffle ? 'active' : ''}`} title="Embaralha a ordem dos vídeos ao adicionar uma playlist" onClick={() => setShuffle(!shuffle)} disabled={adding} aria-pressed={shuffle}><i className="bi bi-shuffle me-1" />Shuffle na adição: {shuffle ? 'ON' : 'OFF'}</button>
    </div>{adding && <div className="adding-info mt-2" role="alert"><div className="spinner-border spinner-border-sm text-info me-2" /><small>Buscando vídeo(s) no YouTube, aguarde...</small></div>}</div>
    <div className="side-panel playlist-panel"><div className="d-flex justify-content-between align-items-center mb-2">
      <h5 className="text-white fw-bold mb-0"><i className="bi bi-music-note-list me-2" />Playlist ({state.playlist.length} vídeos)</h5><div className="playlist-actions">
        {state.playlist.length > 1 && <button className="btn btn-outline-info btn-sm" onClick={() => { void shuffleNow(); }} disabled={shuffling} title="Embaralhar próximos vídeos">{shuffling ? <><span className="spinner-border spinner-border-sm me-1" />Embaralhando</> : <><i className="bi bi-shuffle me-1" />Embaralhar</>}</button>}
        {!!state.playlist.length && <button className="btn btn-outline-danger btn-sm" onClick={() => { void api.clearPlaylist(session.room.hash).catch(session.error); }} title="Limpar playlist">🗑 Limpar</button>}
      </div>
    </div><div className="playlist-scroll">
      {state.playlist.map((item, index) => <div key={item.id} className={`playlist-item d-flex align-items-center ${index === state.currentVideoIndex ? 'active' : ''} ${dragOver === index ? 'drop-target' : ''} ${dragged === item.id ? 'dragging-source' : ''}`}
        onDragOver={event => { event.preventDefault(); if (dragged) setDragOver(index); }}
        onDrop={event => { event.preventDefault(); lastDrop.current = Date.now(); if (dragged) void session.reorder(dragged, index); setDragged(null); setDragOver(null); }}>
        <button type="button" className="drag-handle me-2" title="Arraste para reordenar" aria-label={`Arrastar ${item.title} para reordenar`} draggable onDragStart={event => { event.dataTransfer.setData('text/plain', item.id); setDragged(item.id); }} onDragEnd={() => { setDragged(null); setDragOver(null); }}><i className="bi bi-grip-vertical drag-handle-icon" aria-hidden="true" /></button>
        <button type="button" className="playlist-select d-flex align-items-center flex-grow-1 text-start" onClick={() => { if (Date.now() - lastDrop.current >= 250) void session.jump(index).catch(session.error); }}>
          <img src={item.thumbnailUrl} alt="" width="88" className="playlist-thumb me-3" /><span className="flex-grow-1 text-start"><strong>{item.title}</strong><br /><small className={index === state.currentVideoIndex ? '' : 'text-muted'}>Adicionado por {item.addedByDisplayName}</small></span>
        </button>
        <button type="button" className="btn btn-sm btn-outline-danger ms-2" aria-label={`Remover ${item.title}`} onClick={() => { void api.removeVideo(session.room.hash, item.id).catch(session.error); }}>✕</button>
      </div>)}
    </div></div>
  </>;
}
