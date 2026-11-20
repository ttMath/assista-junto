// Same two-tone envelope as the original chat-notifications.js.
let context: AudioContext | undefined;
export async function playChatAlert() {
  const ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ctor) return;
  context ??= new ctor();
  if (context.state === 'suspended') { try { await context.resume(); } catch { return; } }
  const now = context.currentTime;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.21, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  const tones = [[880, 0, 0.1], [1175, 0.09, 0.2]];
  let remaining = tones.length;
  for (const [frequency, start, stop] of tones) {
    const tone = context.createOscillator();
    tone.type = 'sine'; tone.frequency.setValueAtTime(frequency, now + start);
    tone.connect(gain); tone.start(now + start); tone.stop(now + stop);
    tone.onended = () => { tone.disconnect(); if (--remaining === 0) gain.disconnect(); };
  }
}
