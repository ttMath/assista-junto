import { useEffect } from 'react';
export function Metadata({ room = false, title = room ? 'Sala — Assista Junto' : 'Assista Junto' }: { room?: boolean; title?: string }) {
  useEffect(() => {
    document.title = title;
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robots) robots.content = room ? 'noindex,nofollow,noarchive' : 'index,follow';
    let googlebot = document.querySelector<HTMLMetaElement>('meta[name="googlebot"]');
    if (room) {
      if (!googlebot) { googlebot = document.createElement('meta'); googlebot.name = 'googlebot'; document.head.append(googlebot); }
      googlebot.content = 'noindex,nofollow,noarchive';
    } else googlebot?.remove();
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = new URL('/', location.origin).href;
  }, [room, title]);
  return null;
}
