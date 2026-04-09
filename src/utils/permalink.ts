export function emojiToCodepoints(emoji: string): string {
  return [...emoji]
    .map(c => c.codePointAt(0)!.toString(16))
    .filter(cp => cp !== 'fe0f')
    .join('-');
}

export function codepointsToEmoji(cp: string): string {
  return cp.split('-').map(h => String.fromCodePoint(parseInt(h, 16))).join('');
}

export interface PermalinkState {
  emoji?: string;
  group?: string;
  u?: number;
  v?: number;
}

export function encodePermalink(state: PermalinkState): string {
  const params = new URLSearchParams();
  if (state.emoji) params.set('emoji', emojiToCodepoints(state.emoji));
  if (state.group) params.set('group', state.group);
  if (state.u != null) params.set('u', state.u.toFixed(3));
  if (state.v != null) params.set('v', state.v.toFixed(3));
  return `${window.location.pathname}?${params.toString()}`;
}

export function decodePermalink(): PermalinkState {
  const params = new URLSearchParams(window.location.search);
  const result: PermalinkState = {};
  const emojiCp = params.get('emoji');
  if (emojiCp) result.emoji = codepointsToEmoji(emojiCp);
  const group = params.get('group');
  if (group) result.group = group;
  const u = params.get('u');
  if (u) result.u = parseFloat(u);
  const v = params.get('v');
  if (v) result.v = parseFloat(v);
  return result;
}
