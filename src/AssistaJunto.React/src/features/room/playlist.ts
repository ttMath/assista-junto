import type { PlaylistItem } from '../../types/contracts';

export function reorderPlaylist(playlist: PlaylistItem[], currentIndex: number, id: string, target: number) {
  const source = playlist.findIndex(item => item.id === id);
  if (source < 0) return { playlist, currentIndex };
  const currentId = playlist[currentIndex]?.id;
  const reordered = [...playlist];
  const [item] = reordered.splice(source, 1);
  reordered.splice(Math.max(0, Math.min(target, reordered.length)), 0, item);
  return { playlist: reordered, currentIndex: Math.max(0, reordered.findIndex(item => item.id === currentId)) };
}
export function sameOrder(a: PlaylistItem[], b: PlaylistItem[]) {
  return a.length === b.length && a.every((item, index) => item.id === b[index].id);
}
