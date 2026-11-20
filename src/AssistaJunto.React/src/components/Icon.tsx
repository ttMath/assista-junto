import type { SVGProps } from 'react';

const paths = {
  play: 'm9 5 11 7-11 7V5Z', pause: 'M8 5v14M16 5v14',
  previous: 'M5 5v14m14-14L8 12l11 7V5Z', next: 'M19 5v14M5 5l11 7-11 7V5Z',
  volume: 'M4 9v6h4l5 4V5L8 9H4Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'M4 9v6h4l5 4V5L8 9H4Zm13 0 5 6m0-6-5 6',
  queue: 'M8 6h13M8 12h13M8 18h9M3 6h.01M3 12h.01M3 18h.01',
  chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 2V11.5A8.5 8.5 0 0 1 9.5 3h3a8.5 8.5 0 0 1 8.5 8.5Z',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  plus: 'M12 5v14M5 12h14', close: 'm6 6 12 12M6 18 18 6', check: 'm5 12 4 4L19 6',
  link: 'M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  edit: 'm15 5 4 4M4 20l4-1L21 6l-4-4L4 15v5Z',
  logout: 'M9 4H4v16h5m5-13 5 5-5 5m-5-5h10',
  cinema: 'M3 5h18v14H3V5Zm4 3v8m10-8v8',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  collapse: 'M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5',
  shuffle: 'M3 6h3l12 12h3M3 18h3l4-4m4-4 4-4h3m-3-3 3 3-3 3m0 6 3 3-3 3',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  grip: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01',
  up: 'm6 15 6-6 6 6', down: 'm6 9 6 6 6-6',
  lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5V11Zm7 4v2',
  film: 'M3 3h18v18H3V3Zm4 0v18M17 3v18M3 8h4m10 0h4M3 16h4m10 0h4',
  send: 'm21 3-7 18-4-7-7-4 18-7Zm0 0L10 14',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  crown: 'm3 6 4 4 5-6 5 6 4-4-2 13H5L3 6Z',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>;
}
export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M9 5.5 20 12 9 18.5v-13Z" fill="currentColor" /><path d="M4 7v10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg></span>;
}
